-- INROCOMPRAS · 0061 · Huecos de pagos que encontró la construcción de los Hitos 4–5

-- 1) Finanzas era «área» para programar y observar (y en te_toca y los botones) pero «área O rol FINANZAS» para marcar
--    pagado: alguien con el rol en otra área podía pagar sin poder programar. Se alinea al área, como el resto.
-- 2) programar no bloqueaba la fila y aceptaba una fecha pasada.
-- 3) pagado aceptaba como voucher cualquier documento (de otra orden o de otro tipo).
-- 4) subsanar dejaba la fecha programada y la observación anteriores, y no volvía a avisar a InroPay.
-- 5) dividir dos veces la misma cuota repetía el número (1.1 y 1.1) y el remanente quedaba sin fecha límite.

create or replace function public.ac_pago_programar(p_id uuid, p_fecha date) returns jsonb language plpgsql security definer set search_path = public as $$
declare yo uuid := app.exigir_usuario(); g public.pagos; hoy date := (now() at time zone 'America/Lima')::date;
begin
  select * into g from public.pagos where id = p_id for update;
  perform app.exigir(case when g.id is null then 'No existe la cuota.'
                          when coalesce(app.mi_area(), '') <> 'Finanzas' then 'Lo programa Finanzas.'
                          when g.estado_pago <> 'Solicitado' then 'La cuota no está solicitada.'
                          when p_fecha < hoy then 'La fecha de pago no puede ser anterior a hoy.' end);
  update public.pagos set estado_pago = 'Programado', fecha_programada = coalesce(p_fecha, hoy), aprobado_fin_por = yo where id = p_id;
  perform app.log('pagos', p_id, 'programar', 'Solicitado', 'Programado', null, jsonb_build_object('fecha', coalesce(p_fecha, hoy)));
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.ac_pago_pagado(p_id uuid, p_n_operacion text, p_voucher uuid default null) returns jsonb language plpgsql security definer set search_path = public as $$
declare yo uuid := app.exigir_usuario(); g public.pagos;
begin
  select * into g from public.pagos where id = p_id for update;
  perform app.exigir(case when g.id is null then 'No existe la cuota.'
                          when coalesce(app.mi_area(), '') <> 'Finanzas' then 'Lo marca Finanzas.'
                          when g.estado_pago <> 'Programado' then 'La cuota no está programada.'
                          when coalesce(trim(p_n_operacion), '') = '' then 'Escribe el número de operación.'
                          when p_voucher is not null and not exists (select 1 from public.documentos d where d.id = p_voucher and d.orden_id = g.orden_id and d.tipo_doc = 'Voucher de pago')
                            then 'El voucher debe ser un «Voucher de pago» subido a esta orden.' end);
  update public.pagos set estado_pago = 'Pagado', fecha_pago = now(), n_operacion = trim(p_n_operacion), voucher_doc = p_voucher where id = p_id returning * into g;
  perform app.oc_sync_estatus(g.orden_id);
  perform app.log('pagos', p_id, 'pagado', 'Programado', 'Pagado', p_n_operacion);
  perform app.notificar(array[(select comprador_id from public.ordenes where id = g.orden_id)], 'Pago hecho: cuota ' || g.n_cuota, p_n_operacion, 'pagos', p_id);
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.ac_pago_observar(p_id uuid, p_motivo text, p_detalle text default null) returns jsonb language plpgsql security definer set search_path = public as $$
declare yo uuid := app.exigir_usuario(); g public.pagos; antes text;
begin
  select * into g from public.pagos where id = p_id for update;
  perform app.exigir(case when g.id is null then 'No existe la cuota.'
                          when coalesce(app.mi_area(), '') <> 'Finanzas' then 'Lo observa Finanzas.'
                          when g.estado_pago not in ('Solicitado','Programado') then 'Solo se observa una cuota solicitada o programada.'
                          when p_motivo is null then 'Elige el motivo.' end);
  antes := g.estado_pago;
  update public.pagos set estado_pago = 'Observado Finanzas', motivo_obs_fin = p_motivo, detalle_obs_fin = p_detalle where id = p_id returning * into g;
  perform app.log('pagos', p_id, 'observar', antes, 'Observado Finanzas', p_motivo);
  perform app.notificar(array[(select comprador_id from public.ordenes where id = g.orden_id)], 'Finanzas observó un pago', p_motivo || coalesce(': ' || p_detalle, ''), 'pagos', p_id);
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.ac_pago_subsanar(p_id uuid) returns jsonb language plpgsql security definer set search_path = public as $$
declare yo uuid := app.exigir_usuario(); g public.pagos;
begin
  select * into g from public.pagos where id = p_id for update;
  perform app.exigir(case when g.id is null then 'No existe la cuota.'
                          when not coalesce(app.es_compras(), false) then 'Lo subsana Compras o Importaciones.'
                          when g.estado_pago <> 'Observado Finanzas' then 'La cuota no está observada.' end);
  update public.pagos set estado_pago = 'Solicitado', factura_id = coalesce(factura_id, app.factura_libre(id)),
         fecha_programada = null, motivo_obs_fin = null, detalle_obs_fin = null
   where id = p_id;
  perform app.calcular_retencion(p_id);
  perform app.encolar('inropay_solicitar', 'pagos', p_id);
  perform app.log('pagos', p_id, 'subsanar', 'Observado Finanzas', 'Solicitado', g.motivo_obs_fin);
  perform app.notificar(app.usuarios_de_area('Finanzas'), 'Pago subsanado', null, 'pagos', p_id);
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.ac_pago_dividir(p_id uuid, p_monto numeric) returns jsonb language plpgsql security definer set search_path = public as $$
declare yo uuid := app.exigir_usuario(); g public.pagos; nuevo numeric;
begin
  select * into g from public.pagos where id = p_id for update;
  perform app.exigir(case when g.id is null then 'No existe la cuota.'
                          when not coalesce(app.es_compras(), false) then 'Lo hace Compras o Importaciones.'
                          when g.estado_pago <> 'Plan' then 'Solo se divide una cuota en plan.'
                          when p_monto is null or p_monto <= 0 or p_monto >= g.monto_pago then 'El monto debe ser mayor que cero y menor que el de la cuota.' end);
  -- El siguiente número libre del mismo grupo: 1 → 1.1, 1.2… (numeric(6,1): hasta .9)
  select floor(g.n_cuota) + coalesce(max(n_cuota - floor(g.n_cuota)), 0) + 0.1 into nuevo
    from public.pagos where orden_id = g.orden_id and floor(n_cuota) = floor(g.n_cuota);
  perform app.exigir(case when nuevo - floor(g.n_cuota) > 0.9 then 'Esta cuota ya se dividió demasiadas veces: junta las partes con el administrador.' end);
  update public.pagos set monto_pago = p_monto, tipo_pago = 'Pago parcial' where id = p_id;
  insert into public.pagos (orden_id, n_cuota, hito, tipo_pago, monto_pago, dias_credito, es_letra, estado_pago, fecha_limite_pago, comentario)
  values (g.orden_id, nuevo, g.hito, 'Saldo', g.monto_pago - p_monto, g.dias_credito, g.es_letra, 'Plan', g.fecha_limite_pago, 'Remanente de la cuota ' || g.n_cuota);
  perform app.log('pagos', p_id, 'dividir', g.monto_pago::text, p_monto::text, null, jsonb_build_object('remanente', nuevo));
  return jsonb_build_object('ok', true, 'remanente', nuevo);
end $$;

do $$ declare f text; begin
  foreach f in array array['public.ac_pago_programar(uuid, date)', 'public.ac_pago_pagado(uuid, text, uuid)', 'public.ac_pago_observar(uuid, text, text)',
                           'public.ac_pago_subsanar(uuid)', 'public.ac_pago_dividir(uuid, numeric)'] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;
