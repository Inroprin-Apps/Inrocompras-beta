-- INROCOMPRAS · 0003 · Acciones (las reglas del AppSheet, una por una)
--
-- Patrón: por cada acción hay
--   app.p_<accion>(id, ...)  → NULL si el usuario actual PUEDE hacerla; si no, el motivo en español.
--   public.ac_<accion>(...)  → la ejecuta (vuelve a validar con p_, bloquea la fila, cambia, deja historial,
--                              encola correos/PDF/Drive). SECURITY DEFINER.
--   public.acciones_disponibles(tabla, id) → la lista de acciones que la UI debe mostrar como botones.
-- La UI NUNCA repite una regla: pregunta a acciones_disponibles() y llama a ac_*().
-- Cada condición lleva al lado la fórmula original del AppSheet v2 (Application Documentation v2.pdf).

-- ───────────────────────── Utilidades ─────────────────────────
create or replace function app.exigir(p_motivo text) returns void language plpgsql as $$
begin
  if p_motivo is not null then raise exception '%', p_motivo using errcode = 'P0001'; end if;
end $$;

create or replace function app.cfg(p_clave text, p_defecto jsonb) returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce((select valor from public.config where clave = p_clave), p_defecto)
$$;

create or replace function app.log(p_tabla text, p_id uuid, p_accion text, p_de text, p_a text, p_motivo text default null, p_datos jsonb default null)
returns void language sql security definer set search_path = public as $$
  insert into public.historial (tabla, registro_id, accion, de, a, motivo, datos, usuario_id)
  values (p_tabla, p_id, p_accion, p_de, p_a, p_motivo, p_datos, auth.uid())
$$;

create or replace function app.encolar(p_tipo text, p_tabla text, p_id uuid, p_payload jsonb default '{}')
returns void language sql security definer set search_path = public as $$
  insert into public.cola_trabajos (tipo, ref_tabla, ref_id, payload) values (p_tipo, p_tabla, p_id, p_payload)
$$;

create or replace function app.notificar(p_usuarios uuid[], p_titulo text, p_cuerpo text, p_tabla text, p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare u uuid; n bigint;
begin
  foreach u in array coalesce(p_usuarios, '{}') loop
    if u is not null and u is distinct from auth.uid() then
      insert into public.notificaciones (usuario_id, titulo, cuerpo, ref_tabla, ref_id)
      values (u, p_titulo, p_cuerpo, p_tabla, p_id) returning id into n;
      perform app.encolar('notificar', 'notificaciones', null, jsonb_build_object('notificacion_id', n));
    end if;
  end loop;
end $$;

create or replace function app.usuarios_con_rol(p_rol text) returns uuid[] language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(u.id), '{}') from public.usuarios u join public.usuario_roles r on r.usuario_id = u.id
  where r.rol = p_rol and r.activo and u.activo
$$;

create or replace function app.usuarios_de_area(p_area text) returns uuid[] language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(id), '{}') from public.usuarios where area = p_area and activo
$$;

create or replace function app.siguiente(p_empresa text, p_proc text, p_anio int) returns int
language sql security definer set search_path = public as $$
  insert into public.series (empresa_id, procedencia, anio, ultimo) values (p_empresa, p_proc, p_anio, 1)
  on conflict (empresa_id, procedencia, anio) do update set ultimo = public.series.ultimo + 1
  returning ultimo
$$;

create or replace function app.correlativo(p_prefijo text) returns text language plpgsql security definer set search_path = public as $$
declare n int; a int := extract(year from now())::int;
begin
  insert into public.correlativos (prefijo, anio, ultimo) values (p_prefijo, a, 1)
  on conflict (prefijo, anio) do update set ultimo = public.correlativos.ultimo + 1 returning ultimo into n;
  return p_prefijo || '-' || a || '-' || lpad(n::text, 4, '0');
end $$;

create or replace function app.romano(n int) returns text language sql immutable as $$
  select (array['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIV','XV','XVI','XVII','XVIII','XIX','XX'])[n]
$$;

-- Validación del RUC peruano (módulo 11). La usa también el lector de cotizaciones.
create or replace function public.ruc_valido(p_ruc text) returns boolean language plpgsql immutable as $$
declare f int[] := array[5,4,3,2,7,6,5,4,3,2]; s int := 0; i int; d int;
begin
  if p_ruc !~ '^(10|15|16|17|20)[0-9]{9}$' then return false; end if;
  for i in 1..10 loop s := s + substr(p_ruc, i, 1)::int * f[i]; end loop;
  d := 11 - (s % 11); if d = 10 then d := 0; elsif d = 11 then d := 1; end if;
  return d = substr(p_ruc, 11, 1)::int;
end $$;

-- ───────────────────────── Cálculos de la OC ─────────────────────────
create or replace function app.oc_tipo_compra(o public.ordenes) returns text language sql stable security definer set search_path = public as $$
  -- [_Tipo_Compra] = IF(Procedencia="Importación","Importación", Solicitudes.Tipo_Solicitud del requerimiento)
  select case when o.procedencia = 'Importación' then 'Importación'
    else coalesce((select s.tipo from public.oc_lineas l join public.requerimiento_items i on i.id = l.item_id
                   join public.requerimientos r on r.id = i.requerimiento_id join public.solicitudes s on s.id = r.solicitud_id
                   where l.orden_id = o.id limit 1),
                  case when o.proyecto_id is not null then 'Proyecto' else 'Administrativa' end) end
$$;

create or replace function app.oc_tipo_aprobacion(o public.ordenes) returns text language sql stable security definer set search_path = public as $$
  -- [Tipo de aprobación]
  select case
    when o.monto_soles is null or o.monto_soles = 0 then null
    when o.aprobacion_ppto = 'Pre Aprobado' then 'Pre Aprobado'
    when o.aprobacion_ppto in ('No presupuestado','Excede Presupuesto') then 'Aprobación Conjunta'
    else (select r.ruta from public.reglas_aprobacion r
          where (r.tipo_compra = 'Todos' or r.tipo_compra = app.oc_tipo_compra(o))
            and o.monto_soles >= r.monto_desde and (r.monto_hasta is null or o.monto_soles < r.monto_hasta)
          order by (r.tipo_compra = 'Todos'), r.monto_desde desc limit 1)
  end
$$;

create or replace function app.oc_estado_aprobacion(o public.ordenes) returns text language sql immutable as $$
  -- [Estado de Aprobación3]
  select case
    when 'Observado' in (coalesce(o.aprobacion_ppto,''), coalesce(o.aprobacion_gop,''), coalesce(o.aprobacion_gaf,'')) then
      'Observado por ' || trim(concat(case when o.aprobacion_ppto = 'Observado' then 'Ppto ' end,
                                      case when o.aprobacion_gop = 'Observado' then 'GOP ' end,
                                      case when o.aprobacion_gaf = 'Observado' then 'GAF' end))
    when o.aprobacion_ppto = 'Anular OC' or o.aprobacion_gop = 'Rechazado' or o.aprobacion_gaf = 'Rechazado' then 'Rechazado'
    when o.aprobacion_ppto = 'Pre Aprobado' then 'Aprobado para Compra'
    when o.tipo_aprobacion is null then null
    when o.cg_por is null or o.aprobacion_ppto = 'Subsanado' then 'Falta Aprobación'   -- sin VB de CG no hay aprobación (ver docs/11 B-04)
    when o.tipo_aprobacion = 'Aprobación Única' and 'Aprobado' in (coalesce(o.aprobacion_gop,''), coalesce(o.aprobacion_gaf,'')) then 'Aprobado para Compra'
    when o.tipo_aprobacion = 'Aprobación Conjunta' and o.aprobacion_gop = 'Aprobado' and o.aprobacion_gaf = 'Aprobado' then 'Aprobado para Compra'
    else 'Falta Aprobación'
  end
$$;

create or replace function app.oc_etapa(o public.ordenes) returns text language sql immutable as $$
  -- [_Etapa] = IFS(Estatus<>"Pendiente de aprobación","", OR(ISBLANK(CG_Por), Ppto="Subsanado"),"CG", TRUE,"GERENCIA")
  select case when o.estatus <> 'Pendiente de aprobación' then null
              when o.cg_por is null or o.aprobacion_ppto = 'Subsanado' then 'CG'
              else 'GERENCIA' end
$$;

create or replace function app.oc_total_pagado(p_oc uuid) returns numeric language sql stable security definer set search_path = public as $$
  select coalesce(sum(monto_pago), 0) from public.pagos where orden_id = p_oc and estado_pago = 'Pagado'
$$;

create or replace function app.oc_demasia_pend(p_oc uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.oc_lineas where orden_id = p_oc and es_demasia and demasia_estado = 'Pendiente')
$$;

-- Saldo por comprar de una línea del plan (C-15): cantidad requerida − lo que ya está en órdenes vivas (sin demasías).
create or replace function public.saldo_item(p_item uuid) returns numeric language sql stable security definer set search_path = public as $$
  select i.cantidad - coalesce((select sum(l.cantidad) from public.oc_lineas l join public.ordenes o on o.id = l.orden_id
                                where l.item_id = i.id and not l.es_demasia and o.estatus not in ('Anulada','Rechazada')), 0)
  from public.requerimiento_items i where i.id = p_item
$$;

create or replace function app.oc_recalcular(p_oc uuid) returns void language plpgsql security definer set search_path = public as $$
declare o public.ordenes; s numeric; tasa numeric;
begin
  select coalesce(sum(subtotal), 0) into s from public.oc_lineas
   where orden_id = p_oc and not (es_demasia and demasia_estado = 'Rechazada');
  select tasa_a_soles into tasa from public.monedas m join public.ordenes x on x.moneda = m.id where x.id = p_oc;
  update public.ordenes set subtotal = s,
         igv = case when tipo_impuesto = 'IGV 18%' then round(s * 0.18, 2) else 0 end,
         monto = s + case when tipo_impuesto = 'IGV 18%' then round(s * 0.18, 2) else 0 end
   where id = p_oc;
  update public.ordenes set monto_soles = round(monto * coalesce(tasa, 1), 2) where id = p_oc;
  select * into o from public.ordenes where id = p_oc;
  o.tipo_aprobacion := app.oc_tipo_aprobacion(o);
  update public.ordenes set tipo_aprobacion = o.tipo_aprobacion, estado_aprobacion = app.oc_estado_aprobacion(o) where id = p_oc;
end $$;

-- Cuotas según la forma de pago (lo que en el AppSheet hacía el trabajo «recalcular_cuotas» de Apps Script).
create or replace function app.generar_cuotas(p_oc uuid, p_comentario text default null) returns void
language plpgsql security definer set search_path = public as $$
declare o public.ordenes; base numeric; restante numeric; n numeric;
begin
  select * into o from public.ordenes where id = p_oc;
  update public.pagos set estado_pago = 'Anulado', comentario = 'Reemplazada por cambio de condiciones de pago'
   where orden_id = p_oc and estado_pago = 'Plan';
  select coalesce(sum(monto_pago), 0), coalesce(max(n_cuota), 0) into base, n
    from public.pagos where orden_id = p_oc and estado_pago <> 'Anulado';
  restante := o.monto - base;
  if restante <= 0.01 then return; end if;
  n := floor(n) + 1;
  if o.forma_pago = 'Adelanto' and base = 0 then
    insert into public.pagos (orden_id, n_cuota, hito, porcentaje, tipo_pago, monto_pago, fecha_limite_pago, comentario)
    values (p_oc, n, 'A la aprobación', o.pct_adelanto, 'Adelanto', round(o.monto * o.pct_adelanto, 2), current_date, p_comentario),
           (p_oc, n + 1, coalesce(o.hito_saldo, 'Contra entrega'), 1 - o.pct_adelanto, 'Saldo', o.monto - round(o.monto * o.pct_adelanto, 2), null, p_comentario);
  else
    insert into public.pagos (orden_id, n_cuota, hito, porcentaje, tipo_pago, monto_pago, dias_credito, es_letra, fecha_limite_pago, comentario)
    values (p_oc, n, case o.forma_pago when 'Crédito' then 'Crédito ' || o.dias_credito || ' días'
                                       when 'Letra' then 'Letra ' || o.dias_credito || ' días' else o.forma_pago end,
            round(restante / nullif(o.monto, 0), 4),
            case when o.forma_pago = 'Caja chica' then 'Caja chica' when base > 0 then 'Saldo' else 'Pago total' end,
            restante, o.dias_credito, o.forma_pago = 'Letra',
            case when o.forma_pago in ('Crédito','Letra') then null else current_date end, p_comentario);
  end if;
end $$;

-- Retención del 3 % (agente de retención): nacional, proveedor ni agente ni buen contribuyente, comprobante > S/ 700.
create or replace function app.calcular_retencion(p_pago uuid) returns void language plpgsql security definer set search_path = public as $$
declare aplica boolean; tasa numeric := (app.cfg('retencion_tasa', '0.03'))::text::numeric;
begin
  select o.procedencia = 'Nacional' and not p.es_agente_retencion and not p.es_buen_contribuyente
         and coalesce(d.monto_doc, g.monto_pago) * m.tasa_a_soles > (app.cfg('retencion_umbral_soles', '700'))::text::numeric
    into aplica
    from public.pagos g join public.ordenes o on o.id = g.orden_id join public.proveedores p on p.id = o.proveedor_id
    join public.monedas m on m.id = o.moneda left join public.documentos d on d.id = g.factura_id
   where g.id = p_pago;
  update public.pagos set aplica_retencion = coalesce(aplica, false),
         monto_retencion = case when aplica then round(monto_pago * tasa, 2) else 0 end,
         neto_referencial = monto_pago - case when aplica then round(monto_pago * tasa, 2) else 0 end
   where id = p_pago;
end $$;

-- Estatus Compra: une «Action for Estatus» (tras aprobar) y «_ActualizarEstadoPago» (tras pagos).
create or replace function app.oc_sync_estatus(p_oc uuid) returns void language plpgsql security definer set search_path = public as $$
declare o public.ordenes; nuevo text; pagado numeric; legajo boolean;
begin
  perform app.oc_recalcular(p_oc);
  select * into o from public.ordenes where id = p_oc;
  if o.estatus in ('Borrador','Anulada','Anulación solicitada','En modificación','Observado por Finanzas','OC cerrada','Rechazada') then
    return;
  end if;
  if o.estado_aprobacion like 'Observado por%' then nuevo := o.estado_aprobacion;
  elsif o.estado_aprobacion = 'Rechazado' then nuevo := 'Anulada';
  elsif o.estado_aprobacion is distinct from 'Aprobado para Compra' then nuevo := 'Pendiente de aprobación';
  else
    if o.fecha_aprobacion is null then
      update public.ordenes set fecha_aprobacion = current_date where id = p_oc;
      perform app.generar_cuotas(p_oc);
      perform app.encolar('pdf_oc', 'ordenes', p_oc, '{"version":"proveedor"}');
      perform app.notificar(array[o.comprador_id], 'Orden aprobada: ' || o.numero, 'Ya puedes enviarla al proveedor.', 'ordenes', p_oc);
    end if;
    pagado := app.oc_total_pagado(p_oc);
    legajo := o.legajo_para_pago or exists (select 1 from public.pagos where orden_id = p_oc and estado_pago in ('Solicitado','Programado','Pagado'));
    if legajo and not o.legajo_para_pago then
      update public.ordenes set legajo_para_pago = true, fecha_legajo = current_date where id = p_oc;
    end if;
    nuevo := case
      when o.monto > 0 and pagado >= o.monto - 0.01 then 'OC pagada'
      when pagado > 0 then 'Saldo pendiente'
      when legajo then case o.forma_pago when 'Adelanto' then 'Adelanto pendiente' when 'Crédito' then 'Crédito'
                         when 'Letra' then 'Crédito letra' when 'Tarjeta de crédito' then 'Tarjeta de crédito'
                         when 'Caja chica' then 'Caja chica' else 'Pago pendiente' end
      else 'Legajo incompleto' end;
  end if;
  if nuevo is distinct from o.estatus then
    update public.ordenes set estatus = nuevo where id = p_oc;
    perform app.log('ordenes', p_oc, 'estatus', o.estatus, nuevo);
    if nuevo = 'Anulada' then
      update public.pagos set estado_pago = 'Anulado' where orden_id = p_oc and estado_pago in ('Plan','Solicitado','Observado Finanzas','Programado');
    end if;
  end if;
end $$;

-- ═════════════════════════ PROYECTOS ═════════════════════════
create or replace function app.p_proyecto_resultado(p_id uuid) returns text language sql stable security definer set search_path = public as $$
  select case
    when p.estado <> 'Estudio de mercado' then 'El proyecto ya no está en estudio de mercado.'      -- [Estado]="Estudio de mercado"
    when not (app.mi_area() in ('Comercial','Control de Gestión','Gerencia') or p.gerente_id = auth.uid() or app.es_admin())
      then 'Lo marca Comercial, Control de Gestión, Gerencia o el gerente del proyecto.'             -- AppSheet: sin control (B-01)
  end from public.proyectos p where p.id = p_id
$$;

create or replace function public.ac_proyecto_resultado(p_id uuid, p_ganado boolean) returns jsonb
language plpgsql security definer set search_path = public as $$
declare yo uuid := app.exigir_usuario(); p public.proyectos;
begin
  perform app.exigir(app.p_proyecto_resultado(p_id));
  select * into p from public.proyectos where id = p_id for update;
  update public.proyectos set estado = case when p_ganado then 'Ganado' else 'Perdido' end where id = p_id;
  if p_ganado and not exists (select 1 from public.proyecto_etapas where proyecto_id = p_id) then
    insert into public.proyecto_etapas (proyecto_id, nombre, orden, aprobadores)        -- [Action for Agregar etapa]
    values (p_id, 'General', 1, array_remove(array[p.gerente_id], null));
  end if;
  perform app.log('proyectos', p_id, case when p_ganado then 'ganado' else 'perdido' end, p.estado, case when p_ganado then 'Ganado' else 'Perdido' end);
  return jsonb_build_object('ok', true);
end $$;

-- ═════════════════════════ SOLICITUDES ═════════════════════════
create or replace function app.aprobadores_solicitud(p_id uuid) returns uuid[] language sql stable security definer set search_path = public as $$
  -- [_Aprobadores] = IFS(AND(Tipo="Proyecto", ISNOTBLANK(Etapa_Ref)), Etapa_Ref.Aprobadores, TRUE, LIST(Jefe_Email))
  select case when s.tipo = 'Proyecto' and s.etapa_id is not null then (select aprobadores from public.proyecto_etapas where id = s.etapa_id)
              else array_remove(array[s.jefe_id], null) end
  from public.solicitudes s where s.id = p_id
$$;

create or replace function app.p_solicitud_emitir(p_id uuid) returns text language sql stable security definer set search_path = public as $$
  select case
    when s.solicitante_id <> auth.uid() then 'Solo quien hizo la solicitud puede emitirla.'
    when s.estado <> 'Borrador' then 'La solicitud ya no está en borrador.'
    when not exists (select 1 from public.solicitud_items where solicitud_id = s.id) then 'Agrega al menos un ítem.'
    when coalesce(trim(s.sustento), '') = '' then 'Escribe el sustento.'
    when exists (select 1 from public.carga_items where solicitud_id = s.id and lote_id = s.lote_actual and estado_fila = 'Error')
      then 'Hay filas de la carga con error: corrígelas o descártalas.'
    when cardinality(coalesce(app.aprobadores_solicitud(s.id), '{}')) = 0
      then case when s.tipo = 'Proyecto' then 'La etapa del proyecto no tiene aprobadores.' else 'Indica a tu jefe: él la libera.' end
  end from public.solicitudes s where s.id = p_id
$$;

create or replace function public.ac_solicitud_emitir(p_id uuid) returns jsonb language plpgsql security definer set search_path = public as $$
declare yo uuid := app.exigir_usuario(); s public.solicitudes;
begin
  perform app.exigir(app.p_solicitud_emitir(p_id));
  select * into s from public.solicitudes where id = p_id for update;
  update public.solicitudes set estado = 'Pendiente Liberación',
         numero = coalesce(numero, app.correlativo('SOL'))                       -- [Asignar N° Solicitud] SOL-AAAA-0000
   where id = p_id returning * into s;
  perform app.log('solicitudes', p_id, 'emitir', 'Borrador', 'Pendiente Liberación');
  perform app.notificar(app.aprobadores_solicitud(p_id), 'Solicitud por liberar: ' || s.numero, s.sustento, 'solicitudes', p_id);
  return jsonb_build_object('ok', true, 'numero', s.numero);
end $$;

create or replace function app.p_solicitud_liberar(p_id uuid) returns text language sql stable security definer set search_path = public as $$
  select case
    when s.estado <> 'Pendiente Liberación' then 'La solicitud no está pendiente de liberación.'
    when not (auth.uid() = any(coalesce(app.aprobadores_solicitud(s.id), '{}'))) then 'No eres aprobador de esta solicitud.'
  end from public.solicitudes s where s.id = p_id                                   -- IN(USEREMAIL(), [_Aprobadores])
$$;

-- Crea el requerimiento En Proceso con los ítems de la solicitud (lo que hacía el bot tras «Generar requerimiento»).
create or replace function app.crear_requerimiento(p_sol uuid) returns uuid language plpgsql security definer set search_path = public as $$
declare s public.solicitudes; r uuid; area text := app.cfg('area_emisora_rq', '"Planeamiento"') #>> '{}';
begin
  select * into s from public.solicitudes where id = p_sol;
  if s.requerimiento_id is not null then return s.requerimiento_id; end if;
  insert into public.requerimientos (empresa_id, area_emisora, proyecto_id, motivo, solicitud_id)
  values (coalesce((select empresa_id from public.proyectos where id = s.proyecto_id), 'INROPRIN'), area, s.proyecto_id,
          coalesce((select nombre from public.proyectos where id = s.proyecto_id), s.sustento), s.id)
  returning id into r;
  insert into public.requerimiento_items (requerimiento_id, solicitud_item_id, n_item, tipo, codigo_cliente, descripcion, unidad,
         cantidad, canal, presupuesto_unit, moneda_ppto, fecha_meta)
  select r, i.id, coalesce(i.n_item, row_number() over (order by i.n_item, i.id)), i.tipo, i.codigo_cliente, i.descripcion, i.unidad,
         i.cantidad, i.canal, i.presupuesto_unit, i.moneda_ppto, i.plazo_adquisicion
    from public.solicitud_items i where i.solicitud_id = s.id;
  update public.requerimiento_items ri set incluido_en = (select x.id from public.requerimiento_items x
         where x.requerimiento_id = r and x.solicitud_item_id = si.incluido_en)
    from public.solicitud_items si where ri.requerimiento_id = r and si.id = ri.solicitud_item_id and si.incluido_en is not null;
  update public.solicitudes set requerimiento_id = r, estado = 'En Req' where id = s.id;
  perform app.notificar(app.usuarios_de_area(area), 'Requerimiento por emitir', coalesce(s.numero, '') || ' — ' || coalesce(s.sustento, ''), 'requerimientos', r);
  return r;
end $$;

create or replace function public.ac_solicitud_liberar(p_id uuid) returns jsonb language plpgsql security definer set search_path = public as $$
declare yo uuid := app.exigir_usuario(); r uuid;
begin
  perform app.exigir(app.p_solicitud_liberar(p_id));
  perform 1 from public.solicitudes where id = p_id for update;
  update public.solicitudes set estado = 'Liberada', liberado_por = yo, fecha_liberacion = now() where id = p_id;
  perform app.log('solicitudes', p_id, 'liberar', 'Pendiente Liberación', 'Liberada');
  r := app.crear_requerimiento(p_id);
  perform app.notificar(array[(select solicitante_id from public.solicitudes where id = p_id)], 'Tu solicitud fue liberada', null, 'solicitudes', p_id);
  return jsonb_build_object('ok', true, 'requerimiento_id', r);
end $$;

create or replace function public.ac_solicitud_rechazar(p_id uuid, p_motivo text) returns jsonb language plpgsql security definer set search_path = public as $$
declare yo uuid := app.exigir_usuario();
begin
  perform app.exigir(app.p_solicitud_liberar(p_id));
  perform app.exigir(case when coalesce(trim(p_motivo), '') = '' then 'Escribe el motivo del rechazo.' end);
  update public.solicitudes set estado = 'Rechazada', motivo_rechazo = p_motivo, rechazado_por = yo, fecha_rechazo = now() where id = p_id;
  perform app.log('solicitudes', p_id, 'rechazar', 'Pendiente Liberación', 'Rechazada', p_motivo);
  perform app.notificar(array[(select solicitante_id from public.solicitudes where id = p_id)], 'Tu solicitud fue rechazada', p_motivo, 'solicitudes', p_id);
  return jsonb_build_object('ok', true);
end $$;

create or replace function app.p_solicitud_cancelar(p_id uuid) returns text language sql stable security definer set search_path = public as $$
  select case
    when s.solicitante_id <> auth.uid() then 'Solo quien hizo la solicitud puede cancelarla.'
    when s.estado not in ('Borrador','Pendiente Liberación','Liberada') then 'En este estado ya no se puede cancelar.'
    when s.requerimiento_id is not null then 'Ya tiene requerimiento: pide su anulación.'               -- ISBLANK([Nuevo_ID_Req])
  end from public.solicitudes s where s.id = p_id
$$;

create or replace function public.ac_solicitud_cancelar(p_id uuid, p_motivo text) returns jsonb language plpgsql security definer set search_path = public as $$
declare yo uuid := app.exigir_usuario(); e text;
begin
  perform app.exigir(app.p_solicitud_cancelar(p_id));
  select estado into e from public.solicitudes where id = p_id for update;
  update public.solicitudes set estado = 'Cancelada', motivo_cancelacion = p_motivo where id = p_id;
  perform app.log('solicitudes', p_id, 'cancelar', e, 'Cancelada', p_motivo);
  return jsonb_build_object('ok', true);
end $$;

create or replace function app.p_solicitud_clonar(p_id uuid) returns text language sql stable security definer set search_path = public as $$
  select case
    when s.solicitante_id <> auth.uid() then 'Solo quien hizo la solicitud puede rehacerla.'
    when s.estado not in ('Rechazada','Cancelada') then 'Solo se rehace una solicitud rechazada o cancelada.'
    when s.nueva_solicitud_id is not null then 'Ya se generó una nueva a partir de esta.'
  end from public.solicitudes s where s.id = p_id
$$;

create or replace function public.ac_solicitud_clonar(p_id uuid) returns jsonb language plpgsql security definer set search_path = public as $$
declare yo uuid := app.exigir_usuario(); nueva uuid;
begin
  perform app.exigir(app.p_solicitud_clonar(p_id));
  insert into public.solicitudes (tipo, proyecto_id, etapa_id, jefe_id, solicitante_id, sustento)   -- [Action for Clonar cabecera]
  select tipo, proyecto_id, etapa_id, jefe_id, solicitante_id, sustento from public.solicitudes where id = p_id returning id into nueva;
  insert into public.solicitud_items (solicitud_id, n_item, tipo, codigo_cliente, descripcion, detalle, unidad, cantidad,
         ficha_tecnica_doc, referencia_link, plazo_adquisicion, canal, presupuesto_unit, moneda_ppto)          -- [_Clonar item al nuevo]
  select nueva, n_item, tipo, codigo_cliente, descripcion, detalle, unidad, cantidad, ficha_tecnica_doc, referencia_link,
         plazo_adquisicion, canal, presupuesto_unit, moneda_ppto from public.solicitud_items where solicitud_id = p_id;
  update public.solicitudes set nueva_solicitud_id = nueva where id = p_id;
  perform app.log('solicitudes', p_id, 'rehacer', null, null, null, jsonb_build_object('nueva', nueva));
  return jsonb_build_object('ok', true, 'id', nueva);
end $$;

create or replace function app.p_solicitud_reenviar(p_id uuid) returns text language sql stable security definer set search_path = public as $$
  select case
    when s.solicitante_id <> auth.uid() then 'Solo quien hizo la solicitud puede reenviarla.'
    when s.estado <> 'Observada' then 'La solicitud no está observada.'
    when not exists (select 1 from public.solicitud_items where solicitud_id = s.id) then 'Agrega al menos un ítem.'
  end from public.solicitudes s where s.id = p_id
$$;

create or replace function public.ac_solicitud_reenviar(p_id uuid) returns jsonb language plpgsql security definer set search_path = public as $$
declare yo uuid := app.exigir_usuario(); s public.solicitudes; requiere boolean;
begin
  perform app.exigir(app.p_solicitud_reenviar(p_id));
  select * into s from public.solicitudes where id = p_id for update;
  -- [_Requiere_Aprobacion]: hay ítems nuevos, o subió una cantidad, o cambió una descripción
  requiere := s.requerimiento_id is null
    or exists (select 1 from public.solicitud_items si where si.solicitud_id = s.id
               and not exists (select 1 from public.requerimiento_items ri where ri.solicitud_item_id = si.id))
    or exists (select 1 from public.requerimiento_items ri join public.solicitud_items si on si.id = ri.solicitud_item_id
               where ri.requerimiento_id = s.requerimiento_id and (si.cantidad > ri.cantidad or si.descripcion <> ri.descripcion));
  if requiere then
    update public.solicitudes set estado = 'Pendiente Liberación', liberado_por = null, fecha_liberacion = null where id = p_id;
    perform app.notificar(app.aprobadores_solicitud(p_id), 'Solicitud corregida por liberar: ' || s.numero, null, 'solicitudes', p_id);
  else
    update public.solicitudes set estado = 'En Req' where id = p_id;
    update public.requerimientos set estado = 'En Proceso' where id = s.requerimiento_id and estado = 'Observado';
  end if;
  perform app.log('solicitudes', p_id, 'reenviar', 'Observada', case when requiere then 'Pendiente Liberación' else 'En Req' end);
  return jsonb_build_object('ok', true, 'requiere_aprobacion', requiere);
end $$;

create or replace function app.p_solicitud_devolver(p_id uuid) returns text language sql stable security definer set search_path = public as $$
  select case
    when s.solicitante_id <> auth.uid() then 'Solo quien hizo la solicitud puede pedirla de vuelta.'
    when s.estado <> 'En Req' then 'La solicitud no está en requerimiento.'
    when (select estado from public.requerimientos where id = s.requerimiento_id) <> 'En Proceso' then 'El requerimiento ya fue emitido.'
  end from public.solicitudes s where s.id = p_id
$$;

create or replace function public.ac_solicitud_devolver(p_id uuid, p_motivo text) returns jsonb language plpgsql security definer set search_path = public as $$
declare yo uuid := app.exigir_usuario(); r uuid;
begin
  perform app.exigir(app.p_solicitud_devolver(p_id));
  update public.solicitudes set estado = 'Observada', motivo_observacion = p_motivo, observado_por = yo where id = p_id returning requerimiento_id into r;
  update public.requerimientos set estado = 'Observado', motivo_observacion = p_motivo, observado_por = yo where id = r;
  perform app.log('solicitudes', p_id, 'devolver', 'En Req', 'Observada', p_motivo);
  return jsonb_build_object('ok', true);
end $$;

-- Carga masiva desde Excel: la app sube las filas a carga_items (Revision) y esta función las valida y pasa las buenas.
create or replace function public.ac_carga_procesar(p_solicitud uuid, p_lote uuid) returns jsonb language plpgsql security definer set search_path = public as $$
declare yo uuid := app.exigir_usuario(); f record; errs text[]; ok int := 0; mal int := 0; d jsonb;
begin
  perform app.exigir((select case when solicitante_id <> yo then 'Solo quien hizo la solicitud puede cargar ítems.'
                                  when estado not in ('Borrador','Observada') then 'La solicitud no se puede editar.' end
                      from public.solicitudes where id = p_solicitud));
  update public.solicitudes set lote_actual = p_lote, estado_carga = 'Revision' where id = p_solicitud;
  for f in select * from public.carga_items where solicitud_id = p_solicitud and lote_id = p_lote and estado_fila in ('Revision','Error') order by n_fila loop
    d := f.datos; errs := '{}';
    if coalesce(trim(d->>'descripcion'), '') = '' then errs := array_append(errs, 'Falta la descripción'::text); end if;
    if coalesce(d->>'cantidad', '') !~ '^[0-9]+([.,][0-9]+)?$' or replace(d->>'cantidad', ',', '.')::numeric <= 0 then errs := array_append(errs, 'La cantidad debe ser un número mayor que cero'::text); end if;
    if (d->>'plazo_adquisicion') ~ '^\d{4}-\d{2}-\d{2}$' and (d->>'plazo_adquisicion')::date < current_date then
      errs := array_append(errs, 'La fecha de Plazo_Adquisicion ya pasó'::text); end if;                      -- mensaje literal del AppSheet
    if coalesce(d->>'tipo', 'Bienes') not in ('Bienes','Accesorios','Servicio','Muestra') then errs := array_append(errs, 'Tipo no válido'::text); end if;
    if cardinality(errs) > 0 then
      update public.carga_items set estado_fila = 'Error', errores = errs where id = f.id; mal := mal + 1;
    else
      insert into public.solicitud_items (solicitud_id, n_item, tipo, codigo_cliente, descripcion, detalle, unidad, cantidad,
             referencia_link, plazo_adquisicion, canal, presupuesto_unit)
      values (p_solicitud, f.n_fila, coalesce(d->>'tipo', 'Bienes'), d->>'codigo_cliente', d->>'descripcion', d->>'detalle',
              coalesce(nullif(d->>'unidad', ''), 'UND'), replace(d->>'cantidad', ',', '.')::numeric, d->>'referencia_link',
              nullif(d->>'plazo_adquisicion', '')::date, nullif(d->>'canal', ''), nullif(replace(d->>'presupuesto_unit', ',', '.'), '')::numeric);
      update public.carga_items set estado_fila = 'Procesado', errores = '{}' where id = f.id; ok := ok + 1;
    end if;
  end loop;
  update public.solicitudes set estado_carga = case when mal = 0 then 'Confirmado' else 'Revision' end where id = p_solicitud;
  return jsonb_build_object('ok', true, 'cargados', ok, 'con_error', mal);
end $$;

create or replace function public.ac_carga_descartar_fila(p_fila uuid) returns jsonb language plpgsql security definer set search_path = public as $$
declare yo uuid := app.exigir_usuario();
begin
  perform app.exigir((select case when s.solicitante_id <> yo then 'No es tu carga.' when c.estado_fila <> 'Error' then 'Solo se descartan filas con error.' end
                      from public.carga_items c join public.solicitudes s on s.id = c.solicitud_id where c.id = p_fila));
  update public.carga_items set estado_fila = 'Descartado' where id = p_fila;
  return jsonb_build_object('ok', true);
end $$;

-- ═════════════════════════ REQUERIMIENTOS ═════════════════════════
create or replace function app.p_req_emitir(p_id uuid) returns text language sql stable security definer set search_path = public as $$
  select case
    when r.estado <> 'En Proceso' then 'El requerimiento no está en proceso.'
    when r.numero is not null then 'Ya tiene número.'
    when r.area_emisora is distinct from app.mi_area() then 'Lo emite el área ' || r.area_emisora || '.'
    when r.empresa_id is null or r.tipo_compra is null or coalesce(r.destino, '') = '' then 'Completa empresa, tipo de compra y destino.'
    when not exists (select 1 from public.requerimiento_items where requerimiento_id = r.id and not anulado) then 'No tiene ítems.'
    when coalesce(r.concepto_general, '') = '' and exists (select 1 from public.requerimiento_items where requerimiento_id = r.id and concepto is null)
      then 'Pon un concepto general o un concepto a cada ítem.'
    when exists (select 1 from public.anulaciones where requerimiento_id = r.id and estado = 'Pendiente') then 'Tiene una anulación pendiente.'
  end from public.requerimientos r where r.id = p_id
$$;

create or replace function public.ac_req_emitir(p_id uuid) returns jsonb language plpgsql security definer set search_path = public as $$
declare yo uuid := app.exigir_usuario(); r public.requerimientos;
begin
  perform app.exigir(app.p_req_emitir(p_id));
  update public.requerimientos set estado = 'Emitido', numero = app.correlativo('RC'), emisor_id = yo, fecha_emision = now()
   where id = p_id returning * into r;
  perform app.log('requerimientos', p_id, 'emitir', 'En Proceso', 'Emitido');
  perform app.notificar(case when r.tipo_compra = 'Importación' then app.usuarios_de_area('Importaciones')
                             when r.tipo_compra = 'Nacional' then app.usuarios_de_area('Compras')
                             else app.usuarios_de_area('Compras') || app.usuarios_de_area('Importaciones') end,
                        'Requerimiento emitido: ' || r.numero, r.motivo, 'requerimientos', p_id);
  return jsonb_build_object('ok', true, 'numero', r.numero);
end $$;

create or replace function app.p_req_observar(p_id uuid) returns text language sql stable security definer set search_path = public as $$
  select case when r.estado <> 'En Proceso' then 'El requerimiento no está en proceso.'
              when r.area_emisora is distinct from app.mi_area() then 'Lo observa el área ' || r.area_emisora || '.' end
  from public.requerimientos r where r.id = p_id
$$;

create or replace function public.ac_req_observar(p_id uuid, p_motivo text) returns jsonb language plpgsql security definer set search_path = public as $$
declare yo uuid := app.exigir_usuario(); s uuid;
begin
  perform app.exigir(app.p_req_observar(p_id));
  perform app.exigir(case when coalesce(trim(p_motivo), '') = '' then 'Escribe qué hay que corregir.' end);
  update public.requerimientos set estado = 'Observado', motivo_observacion = p_motivo, observado_por = yo where id = p_id returning solicitud_id into s;
  update public.solicitudes set estado = 'Observada', motivo_observacion = p_motivo, observado_por = yo where id = s;   -- [Marcar observada (sistema)]
  perform app.log('requerimientos', p_id, 'observar', 'En Proceso', 'Observado', p_motivo);
  perform app.notificar(array[(select solicitante_id from public.solicitudes where id = s)], 'Tu solicitud tiene observaciones', p_motivo, 'solicitudes', s);
  return jsonb_build_object('ok', true);
end $$;

-- C-14: el RQ oficial lo emite PCP en el SIDIGE; aquí se anota su número.
create or replace function public.ac_req_rq_sidige(p_id uuid, p_rq text) returns jsonb language plpgsql security definer set search_path = public as $$
declare yo uuid := app.exigir_usuario();
begin
  perform app.exigir(case when not (app.mi_area() = 'Planeamiento' or app.es_admin()) then 'Lo registra Planeamiento (PCP).'
                          when (select estado from public.requerimientos where id = p_id) = 'Anulado' then 'El requerimiento está anulado.' end);
  update public.requerimientos set rq_sidige = nullif(trim(p_rq), '') where id = p_id;
  perform app.log('requerimientos', p_id, 'rq_sidige', null, p_rq);
  return jsonb_build_object('ok', true);
end $$;

-- C-14/C-22: SKU del SIDIGE (generador de Roberto).
create or replace function public.ac_item_sku(p_item uuid, p_codigo text) returns jsonb language plpgsql security definer set search_path = public as $$
declare yo uuid := app.exigir_usuario();
begin
  perform app.exigir(case when not (app.mi_area() in ('Planeamiento','Compras','Importaciones') or app.es_admin()) then 'Lo asigna Planeamiento o Compras.' end);
  update public.requerimiento_items set codigo_sidige = nullif(upper(trim(p_codigo)), '') where id = p_item;
  perform app.log('requerimiento_items', p_item, 'sku', null, p_codigo);
  return jsonb_build_object('ok', true);
end $$;

-- C-16: validación técnica por ítem (obligatoria en Inroprin). Técnica registra marca y modelo.
create or replace function app.p_item_tecnica(p_item uuid) returns text language sql stable security definer set search_path = public as $$
  select case when not (app.tengo_rol('TECNICA') or app.mi_area() = 'Técnica') then 'La validación técnica la hace el área Técnica.'
              when i.anulado then 'El ítem está anulado.' end
  from public.requerimiento_items i where i.id = p_item
$$;

create or replace function public.ac_item_tecnica(p_item uuid, p_resultado text, p_marca text default null, p_modelo text default null, p_motivo text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare yo uuid := app.exigir_usuario(); antes text;
begin
  perform app.exigir(app.p_item_tecnica(p_item));
  perform app.exigir(case when p_resultado not in ('Validado','Observado','No aplica') then 'Resultado no válido.'
                          when p_resultado = 'Observado' and coalesce(trim(p_motivo), '') = '' then 'Escribe qué observas.' end);
  select validacion_tecnica into antes from public.requerimiento_items where id = p_item for update;
  update public.requerimiento_items set validacion_tecnica = p_resultado, marca = coalesce(p_marca, marca), modelo = coalesce(p_modelo, modelo),
         tec_motivo = p_motivo, tec_por = yo, tec_fecha = now() where id = p_item;
  perform app.log('requerimiento_items', p_item, 'validacion_tecnica', antes, p_resultado, p_motivo);
  return jsonb_build_object('ok', true);
end $$;

-- Anulaciones de requerimiento o ítem
create or replace function app.aprobadores_anulacion(p_id uuid) returns uuid[] language sql stable security definer set search_path = public as $$
  -- [_Aprobadores] = IF(Causa="Error de emisión", LIST(jefe de quien la pidió), Solicitud._Aprobadores)
  select case when a.causa = 'Error de emisión' then array_remove(array[(select jefe_id from public.usuarios where id = a.solicitado_por)], null)
              else coalesce(app.aprobadores_solicitud(r.solicitud_id), array_remove(array[(select jefe_id from public.usuarios where id = a.solicitado_por)], null)) end
  from public.anulaciones a join public.requerimientos r on r.id = a.requerimiento_id where a.id = p_id
$$;

create or replace function public.ac_anulacion_solicitar(p_req uuid, p_item uuid, p_causa text, p_motivo text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare yo uuid := app.exigir_usuario(); n uuid; r public.requerimientos;
begin
  select * into r from public.requerimientos where id = p_req;
  perform app.exigir(case
    when r.id is null then 'No existe el requerimiento.'
    when r.estado = 'Anulado' then 'Ya está anulado.'
    when not (app.mi_area() = r.area_emisora or app.es_compras() or yo = (select solicitante_id from public.solicitudes where id = r.solicitud_id))
      then 'La pide el área emisora, Compras o quien hizo la solicitud.'
    when coalesce(trim(p_motivo), '') = '' then 'Escribe el motivo.'
    when exists (select 1 from public.anulaciones where requerimiento_id = p_req and coalesce(item_id::text,'') = coalesce(p_item::text,'') and estado = 'Pendiente')
      then 'Ya hay una anulación pendiente.' end);
  insert into public.anulaciones (requerimiento_id, item_id, causa, motivo, solicitado_por) values (p_req, p_item, p_causa, p_motivo, yo) returning id into n;
  perform app.log('anulaciones', n, 'solicitar', null, 'Pendiente', p_motivo);
  perform app.notificar(app.aprobadores_anulacion(n), 'Anulación por aprobar: ' || coalesce(r.numero, 'requerimiento'), p_motivo, 'anulaciones', n);
  return jsonb_build_object('ok', true, 'id', n);
end $$;

create or replace function app.p_anulacion_decidir(p_id uuid) returns text language sql stable security definer set search_path = public as $$
  select case when a.estado <> 'Pendiente' then 'La anulación ya fue decidida.'
              when not (auth.uid() = any(coalesce(app.aprobadores_anulacion(a.id), '{}'))) then 'No eres aprobador de esta anulación.' end
  from public.anulaciones a where a.id = p_id          -- AppSheet: «Rechazar Solicitud» no tenía control (B-02); aquí sí
$$;

create or replace function public.ac_anulacion_decidir(p_id uuid, p_aprobar boolean, p_motivo text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare yo uuid := app.exigir_usuario(); a public.anulaciones; en_oc boolean; final text;
begin
  perform app.exigir(app.p_anulacion_decidir(p_id));
  select * into a from public.anulaciones where id = p_id for update;
  if not p_aprobar then
    update public.anulaciones set estado = 'Rechazada', motivo_rechazo = p_motivo, aprobado_por = yo, fecha_aprobacion = now() where id = p_id;
    final := 'Rechazada';
  else
    en_oc := exists (select 1 from public.oc_lineas l join public.ordenes o on o.id = l.orden_id join public.requerimiento_items i on i.id = l.item_id
                     where i.requerimiento_id = a.requerimiento_id and (a.item_id is null or i.id = a.item_id) and o.estatus not in ('Anulada','Rechazada'));
    if en_oc then
      final := 'En Compras';   -- hay órdenes vivas: Compras debe anularlas primero
      perform app.notificar(app.usuarios_de_area('Compras') || app.usuarios_de_area('Importaciones'), 'Anulación aprobada con órdenes vivas', a.motivo, 'anulaciones', p_id);
    else
      final := 'Ejecutada';
      if a.item_id is null then
        update public.requerimientos set estado = 'Anulado' where id = a.requerimiento_id;            -- [Marcar anulado]
        update public.requerimiento_items set anulado = true where requerimiento_id = a.requerimiento_id;
      else
        update public.requerimiento_items set anulado = true where id = a.item_id;
      end if;
    end if;
    update public.anulaciones set estado = final, aprobado_por = yo, fecha_aprobacion = now() where id = p_id;
  end if;
  perform app.log('anulaciones', p_id, case when p_aprobar then 'aprobar' else 'rechazar' end, 'Pendiente', final, p_motivo);
  perform app.notificar(array[a.solicitado_por], 'Anulación ' || lower(final), p_motivo, 'anulaciones', p_id);
  return jsonb_build_object('ok', true, 'estado', final);
end $$;

-- ═════════════════════════ PROVEEDORES ═════════════════════════
create or replace function public.ac_proveedor_retencion(p_id uuid, p_agente boolean, p_buen_contribuyente boolean) returns jsonb
language plpgsql security definer set search_path = public as $$
declare yo uuid := app.exigir_usuario();
begin
  -- [Verificar Retención] = AND(ORIGEN<>"Extranjero", Verificado_Contab<>TRUE, IN("CONTABILIDAD", mis roles))
  perform app.exigir((select case when not app.tengo_rol('CONTABILIDAD') then 'Lo verifica Contabilidad.'
                                  when origen = 'Extranjero' then 'No aplica a proveedores extranjeros.'
                                  when verificado_contab then 'Ya está verificado.' end from public.proveedores where id = p_id));
  update public.proveedores set es_agente_retencion = p_agente, es_buen_contribuyente = p_buen_contribuyente,
         verificado_contab = true, verificado_por = yo, fecha_verificacion = now() where id = p_id;
  perform app.log('proveedores', p_id, 'verificar_retencion', null, null, null, jsonb_build_object('agente', p_agente, 'buen_contribuyente', p_buen_contribuyente));
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.ac_proveedor_evaluar(p_id uuid, p_resultado text, p_nota text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare yo uuid := app.exigir_usuario(); antes text;
begin
  perform app.exigir(case when not (app.tengo_rol('FINANZAS') or app.mi_area() = 'Finanzas') then 'La evaluación financiera la hace Finanzas.'
                          when p_resultado not in ('Aprobado','Observado') then 'Resultado no válido.'
                          when p_resultado = 'Observado' and coalesce(trim(p_nota), '') = '' then 'Escribe la observación.' end);
  select evaluacion_fin into antes from public.proveedores where id = p_id for update;
  update public.proveedores set evaluacion_fin = p_resultado, evaluacion_fin_por = yo, evaluacion_fin_fecha = now(), evaluacion_fin_nota = p_nota where id = p_id;
  perform app.log('proveedores', p_id, 'evaluacion_fin', antes, p_resultado, p_nota);
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.ac_proveedor_pedir_evaluacion(p_id uuid) returns jsonb language plpgsql security definer set search_path = public as $$
declare yo uuid := app.exigir_usuario(); p public.proveedores;
begin
  perform app.exigir(case when not app.es_compras() then 'Lo pide Compras o Importaciones.' end);
  select * into p from public.proveedores where id = p_id;
  perform app.notificar(app.usuarios_de_area('Finanzas'), 'Evaluar proveedor: ' || p.razon_social, coalesce(p.ruc, p.pais), 'proveedores', p_id);
  return jsonb_build_object('ok', true);
end $$;

-- ═════════════════════════ ÓRDENES ═════════════════════════
-- «Generar OC» desde el carrito del plan de compras (reemplaza la hoja «Base de datos OC NAC»).
-- p_lineas = [{"item_id": "...", "cantidad": 10, "precio_unit": 12.5, "descripcion_prov": "..."}]
create or replace function public.ac_oc_crear(p_proveedor uuid, p_procedencia text, p_moneda text, p_lineas jsonb,
  p_proyecto uuid default null, p_forma_pago text default 'Contado', p_clase text default 'Compra') returns jsonb
language plpgsql security definer set search_path = public as $$
declare yo uuid := app.exigir_usuario(); oc uuid; l jsonb; it public.requerimiento_items; pr public.proveedores; n int := 0; proy uuid := p_proyecto;
begin
  perform app.exigir(case when not app.es_compras() then 'Las órdenes las crea Compras o Importaciones.'
                          when jsonb_array_length(coalesce(p_lineas, '[]')) = 0 then 'Elige al menos una línea.' end);
  select * into pr from public.proveedores where id = p_proveedor;
  perform app.exigir(case when pr.id is null then 'Elige el proveedor.'
                          when p_procedencia = 'Importación' and pr.origen <> 'Extranjero' then 'Una importación lleva proveedor extranjero.'
                          when p_procedencia = 'Nacional' and pr.origen = 'Extranjero' then 'Una compra nacional no lleva proveedor extranjero.' end);
  for l in select * from jsonb_array_elements(p_lineas) loop
    select * into it from public.requerimiento_items where id = (l->>'item_id')::uuid;
    perform app.exigir(case when it.id is null then 'Una de las líneas no existe.'
                            when it.anulado then 'El ítem «' || it.descripcion || '» está anulado.'
                            when (l->>'cantidad')::numeric > public.saldo_item(it.id) + 0.0001
                              then '«' || it.descripcion || '»: pides ' || (l->>'cantidad') || ' y el saldo es ' || public.saldo_item(it.id) || '. Lo que exceda va como demasía.'
                            when (select estado from public.requerimientos where id = it.requerimiento_id) <> 'Emitido' then 'El requerimiento de «' || it.descripcion || '» aún no está emitido.' end);
    if proy is null then select proyecto_id into proy from public.requerimientos where id = it.requerimiento_id; end if;
  end loop;
  insert into public.ordenes (procedencia, clase, proyecto_id, proveedor_id, comprador_id, moneda, forma_pago, tipo_impuesto,
         empresa_id, lugar_entrega, correo_envio)
  values (p_procedencia, p_clase, proy, p_proveedor, yo, p_moneda, p_forma_pago,
          case when p_procedencia = 'Importación' then 'Sin IGV' else 'IGV 18%' end,
          coalesce((select empresa_id from public.proyectos where id = proy), 'INROPRIN'),
          (select lugar_entrega from public.proyectos where id = proy), pr.correo)
  returning id into oc;
  for l in select * from jsonb_array_elements(p_lineas) loop
    n := n + 1;
    select * into it from public.requerimiento_items where id = (l->>'item_id')::uuid;
    insert into public.oc_lineas (orden_id, item_id, n_linea, descripcion, descripcion_prov, unidad, cantidad, precio_unit)
    values (oc, it.id, n, it.descripcion, l->>'descripcion_prov', it.unidad, (l->>'cantidad')::numeric, coalesce((l->>'precio_unit')::numeric, 0));
  end loop;
  perform app.oc_recalcular(oc);
  perform app.log('ordenes', oc, 'crear', null, 'Borrador');
  return jsonb_build_object('ok', true, 'id', oc);
end $$;

create or replace function app.p_oc_demasia(p_linea uuid) returns text language sql stable security definer set search_path = public as $$
  -- [＋ Demasía] = AND(NOT Es_Demasia, sin otra demasía del mismo ítem en la OC, OC en Borrador/En modificación/Observado…)
  select case
    when not app.es_compras() then 'La demasía la agrega Compras o Importaciones.'
    when l.es_demasia then 'Esta línea ya es una demasía.'
    when exists (select 1 from public.oc_lineas x where x.orden_id = l.orden_id and x.item_id = l.item_id and x.es_demasia) then 'Ya hay una demasía de este ítem en la orden.'
    when not (o.estatus in ('Borrador','En modificación') or o.estatus like 'Observado%') then 'La orden no se puede editar en este estado.'
  end from public.oc_lineas l join public.ordenes o on o.id = l.orden_id where l.id = p_linea
$$;

create or replace function public.ac_oc_demasia(p_linea uuid, p_cantidad numeric, p_motivo text) returns jsonb language plpgsql security definer set search_path = public as $$
declare yo uuid := app.exigir_usuario(); l public.oc_lineas; n uuid;
begin
  perform app.exigir(app.p_oc_demasia(p_linea));
  perform app.exigir(case when coalesce(p_cantidad, 0) <= 0 then 'Indica la cantidad adicional.' when coalesce(trim(p_motivo), '') = '' then 'Escribe el motivo de la demasía.' end);
  select * into l from public.oc_lineas where id = p_linea;
  insert into public.oc_lineas (orden_id, item_id, n_linea, descripcion, descripcion_prov, unidad, cantidad, precio_unit, es_demasia, demasia_estado, demasia_motivo)
  values (l.orden_id, l.item_id, l.n_linea, l.descripcion || ' (demasía)', l.descripcion_prov, l.unidad, p_cantidad, l.precio_unit, true, 'Pendiente', p_motivo)
  returning id into n;
  perform app.oc_recalcular(l.orden_id);
  perform app.log('ordenes', l.orden_id, 'demasia', null, 'Pendiente', p_motivo, jsonb_build_object('linea', n, 'cantidad', p_cantidad));
  return jsonb_build_object('ok', true, 'id', n);
end $$;

create or replace function app.p_oc_emitir(p_id uuid) returns text language sql stable security definer set search_path = public as $$
  -- [Emitir OC] = AND(Estatus="Borrador", COUNT(líneas)>0, Monto>0, área Compras/Importaciones,
  --                   OR(CONTAINS(Forma de pago,"Tarjeta"), hay Documentos_OC tipo "Cotización"))
  select case
    when not app.es_compras() then 'La orden la emite Compras o Importaciones.'
    when o.estatus <> 'Borrador' then 'La orden ya fue emitida.'
    when not exists (select 1 from public.oc_lineas where orden_id = o.id) then 'La orden no tiene líneas.'
    when o.monto <= 0 then 'El monto debe ser mayor que cero.'
    when o.proveedor_id is null then 'Elige el proveedor.'
    when o.forma_pago = 'Adelanto' and o.pct_adelanto is null then 'Indica el % de adelanto.'
    when o.forma_pago in ('Crédito','Letra') and o.dias_credito is null then 'Indica los días de crédito.'
    when o.forma_pago <> 'Tarjeta de crédito' and not exists (select 1 from public.documentos where orden_id = o.id and tipo_doc = 'Cotización' and estado <> 'Reemplazado')
      then 'Sube la cotización del proveedor.'
    when (app.cfg('exigir_validacion_tecnica', 'true'))::text::boolean and exists (
           select 1 from public.oc_lineas l join public.requerimiento_items i on i.id = l.item_id
           where l.orden_id = o.id and i.validacion_tecnica not in ('Validado','No aplica'))
      then 'Hay ítems sin validación técnica.'                                              -- adición C-16
    when o.procedencia = 'Importación' and (select origen from public.proveedores where id = o.proveedor_id) <> 'Extranjero' then 'Una importación lleva proveedor extranjero.'
  end from public.ordenes o where o.id = p_id
$$;

create or replace function public.ac_oc_emitir(p_id uuid) returns jsonb language plpgsql security definer set search_path = public as $$
declare yo uuid := app.exigir_usuario(); o public.ordenes; proc text;
begin
  perform app.exigir(app.p_oc_emitir(p_id));
  select * into o from public.ordenes where id = p_id for update;
  proc := case when o.clase = 'Servicio' then 'SRV' when o.procedencia = 'Importación' then 'IMP' else 'NAC' end;
  update public.ordenes set estatus = 'Pendiente de aprobación', fecha_emision = now(), emitido_por = yo,
         numero = coalesce(numero, o.empresa_id || '-' || proc || '-' || extract(year from now())::int || '-' ||
                  lpad(app.siguiente(o.empresa_id, proc, extract(year from now())::int)::text, 4, '0'))     -- reservar_oc
   where id = p_id returning * into o;
  perform app.oc_recalcular(p_id);
  perform app.log('ordenes', p_id, 'emitir', 'Borrador', 'Pendiente de aprobación');
  perform app.encolar('crear_carpeta', 'ordenes', p_id);
  perform app.encolar('pdf_oc', 'ordenes', p_id, '{"version":"interna"}');
  perform app.notificar(app.usuarios_con_rol('CONTROL_GESTION'), 'Orden por validar presupuesto: ' || o.numero, null, 'ordenes', p_id);
  return jsonb_build_object('ok', true, 'numero', o.numero);
end $$;

create or replace function app.p_oc_cg(p_id uuid) returns text language sql stable security definer set search_path = public as $$
  select case when not app.tengo_rol('CONTROL_GESTION') then 'Lo hace Control de Gestión.'
              when app.oc_etapa(o) is distinct from 'CG' then 'La orden no está en la etapa de presupuesto.' end
  from public.ordenes o where o.id = p_id
$$;

-- [Validar presupuesto] = AND(_Etapa="CG", CONTROL_GESTION, Ppto elegido y no Observado/Anular OC/Subsanado)
create or replace function public.ac_oc_validar_ppto(p_id uuid, p_ppto text) returns jsonb language plpgsql security definer set search_path = public as $$
declare yo uuid := app.exigir_usuario(); o public.ordenes;
begin
  perform app.exigir(app.p_oc_cg(p_id));
  perform app.exigir(case when p_ppto is null or p_ppto in ('Observado','Anular OC','Subsanado')
                          or p_ppto not in ('Adm','No presupuestado','Excede Presupuesto','Preinversion','Presupuestado','Pre Aprobado')
                          then 'Elige el estado del presupuesto.' end);
  update public.ordenes set aprobacion_ppto = p_ppto, cg_por = yo, cg_fecha = now() where id = p_id;
  perform app.oc_sync_estatus(p_id);
  select * into o from public.ordenes where id = p_id;
  perform app.log('ordenes', p_id, 'validar_ppto', null, p_ppto);
  if o.estatus = 'Pendiente de aprobación' then
    perform app.notificar(case when o.tipo_aprobacion = 'Aprobación Conjunta' then app.usuarios_con_rol('GOP') || app.usuarios_con_rol('GAF')
                               else app.usuarios_con_rol('GOP') end,
                          'Orden por aprobar: ' || o.numero, o.tipo_aprobacion || ' · ' || o.moneda || ' ' || o.monto, 'ordenes', p_id);
  end if;
  return jsonb_build_object('ok', true, 'estatus', o.estatus);
end $$;

create or replace function public.ac_oc_observar_ppto(p_id uuid, p_motivo text) returns jsonb language plpgsql security definer set search_path = public as $$
declare yo uuid := app.exigir_usuario(); o public.ordenes;
begin
  perform app.exigir(app.p_oc_cg(p_id));                                                      -- [Observar presupuesto (CG)]
  perform app.exigir(case when coalesce(trim(p_motivo), '') = '' then 'Escribe la observación.' end);
  update public.ordenes set aprobacion_ppto = 'Observado', cg_por = yo, cg_fecha = now(), motivo_aprob = p_motivo where id = p_id;
  perform app.oc_sync_estatus(p_id);
  select * into o from public.ordenes where id = p_id;
  perform app.log('ordenes', p_id, 'observar_ppto', 'Pendiente de aprobación', o.estatus, p_motivo);
  perform app.notificar(array[o.comprador_id], 'Control de Gestión observó ' || o.numero, p_motivo, 'ordenes', p_id);
  return jsonb_build_object('ok', true);
end $$;

create or replace function app.p_oc_gop(p_id uuid) returns text language sql stable security definer set search_path = public as $$
  -- [Aprobar GOP] = AND(_Etapa="GERENCIA", GOP, Aprobación GOP<>"Aprobado", Estado de Aprobación3="Falta Aprobación")
  select case when not app.tengo_rol('GOP') then 'Lo aprueba la GOP.'
              when app.oc_etapa(o) is distinct from 'GERENCIA' then 'La orden no está en aprobación de gerencia.'
              when o.aprobacion_gop = 'Aprobado' then 'Ya la aprobaste.'
              when o.estado_aprobacion is distinct from 'Falta Aprobación' then 'La orden no espera aprobación.' end
  from public.ordenes o where o.id = p_id
$$;

create or replace function public.ac_oc_aprobar_gop(p_id uuid, p_con_demasia boolean default true) returns jsonb language plpgsql security definer set search_path = public as $$
declare yo uuid := app.exigir_usuario(); o public.ordenes;
begin
  perform app.exigir(app.p_oc_gop(p_id));
  perform app.exigir(case when not p_con_demasia and not app.oc_demasia_pend(p_id) then 'No hay demasías pendientes.' end);
  -- [_Aprobar_Demasias_OC] / [_Rechazar_Demasias_OC]: la GOP decide las demasías (decisión 17/11)
  update public.oc_lineas set demasia_estado = case when p_con_demasia then 'Aprobada' else 'Rechazada' end,
         demasia_decidido_por = yo, demasia_fecha = now()
   where orden_id = p_id and es_demasia and demasia_estado = 'Pendiente';
  update public.ordenes set aprobacion_gop = 'Aprobado', gop_por = yo, gop_fecha = now() where id = p_id;
  perform app.oc_sync_estatus(p_id);
  select * into o from public.ordenes where id = p_id;
  perform app.log('ordenes', p_id, case when p_con_demasia then 'aprobar_gop' else 'aprobar_gop_sin_demasia' end, null, o.estatus);
  return jsonb_build_object('ok', true, 'estatus', o.estatus);
end $$;

create or replace function app.p_oc_gaf(p_id uuid) returns text language sql stable security definer set search_path = public as $$
  -- [Aprobar GAF] = ... AND NOT(AND(_Demasia_Pend, Tipo="Aprobación Única"))
  select case when not app.tengo_rol('GAF') then 'Lo aprueba la GAF.'
              when app.oc_etapa(o) is distinct from 'GERENCIA' then 'La orden no está en aprobación de gerencia.'
              when o.aprobacion_gaf = 'Aprobado' then 'Ya la aprobaste.'
              when o.estado_aprobacion is distinct from 'Falta Aprobación' then 'La orden no espera aprobación.'
              when app.oc_demasia_pend(o.id) and o.tipo_aprobacion = 'Aprobación Única' then 'Tiene demasías: las decide la GOP.' end
  from public.ordenes o where o.id = p_id
$$;

create or replace function public.ac_oc_aprobar_gaf(p_id uuid) returns jsonb language plpgsql security definer set search_path = public as $$
declare yo uuid := app.exigir_usuario(); o public.ordenes;
begin
  perform app.exigir(app.p_oc_gaf(p_id));
  update public.ordenes set aprobacion_gaf = 'Aprobado', gaf_por = yo, gaf_fecha = now() where id = p_id;
  perform app.oc_sync_estatus(p_id);
  select * into o from public.ordenes where id = p_id;
  perform app.log('ordenes', p_id, 'aprobar_gaf', null, o.estatus);
  return jsonb_build_object('ok', true, 'estatus', o.estatus);
end $$;

create or replace function app.p_oc_gerencia_observa(p_id uuid) returns text language sql stable security definer set search_path = public as $$
  -- [Observar OC (aprobación)] y [Rechazar OC] = AND(_Etapa="GERENCIA", GOP o GAF, NOT STARTSWITH(Estado de Aprobación3,"Observado"))
  select case when not (app.tengo_rol('GOP') or app.tengo_rol('GAF')) then 'Lo hace la GOP o la GAF.'
              when app.oc_etapa(o) is distinct from 'GERENCIA' then 'La orden no está en aprobación de gerencia.'
              when coalesce(o.estado_aprobacion, '') like 'Observado%' then 'La orden ya está observada.' end
  from public.ordenes o where o.id = p_id
$$;

create or replace function public.ac_oc_observar(p_id uuid, p_motivo text) returns jsonb language plpgsql security definer set search_path = public as $$
declare yo uuid := app.exigir_usuario(); o public.ordenes; gop boolean := app.tengo_rol('GOP'); gaf boolean := app.tengo_rol('GAF');
begin
  perform app.exigir(app.p_oc_gerencia_observa(p_id));
  perform app.exigir(case when coalesce(trim(p_motivo), '') = '' then 'Escribe la observación.' end);
  select * into o from public.ordenes where id = p_id for update;
  update public.ordenes set
    aprobacion_gop = case when gop and coalesce(o.aprobacion_gop, '') <> 'Aprobado' then 'Observado' else aprobacion_gop end,
    aprobacion_gaf = case when gaf and coalesce(o.aprobacion_gaf, '') <> 'Aprobado' and not (gop and coalesce(o.aprobacion_gop, '') <> 'Aprobado') then 'Observado' else aprobacion_gaf end,
    motivo_aprob = p_motivo
  where id = p_id;
  perform app.oc_sync_estatus(p_id);
  select * into o from public.ordenes where id = p_id;
  perform app.log('ordenes', p_id, 'observar', 'Pendiente de aprobación', o.estatus, p_motivo);
  perform app.notificar(array[o.comprador_id], 'Gerencia observó ' || o.numero, p_motivo, 'ordenes', p_id);
  return jsonb_build_object('ok', true, 'estatus', o.estatus);
end $$;

create or replace function public.ac_oc_rechazar(p_id uuid, p_motivo text) returns jsonb language plpgsql security definer set search_path = public as $$
declare yo uuid := app.exigir_usuario(); o public.ordenes; gop boolean := app.tengo_rol('GOP'); gaf boolean := app.tengo_rol('GAF'); antes text;
begin
  perform app.exigir(app.p_oc_gerencia_observa(p_id));
  perform app.exigir(case when coalesce(trim(p_motivo), '') = '' then 'Escribe el motivo del rechazo.' end);
  select estatus into antes from public.ordenes where id = p_id for update;
  update public.ordenes set aprobacion_gop = case when gop then 'Rechazado' else aprobacion_gop end,
         aprobacion_gaf = case when gaf and not gop then 'Rechazado' else aprobacion_gaf end,
         estatus = 'Anulada', motivo_aprob = p_motivo where id = p_id returning * into o;
  update public.pagos set estado_pago = 'Anulado' where orden_id = p_id and estado_pago in ('Plan','Solicitado','Observado Finanzas','Programado');
  perform app.oc_recalcular(p_id);
  perform app.log('ordenes', p_id, 'rechazar', antes, 'Anulada', p_motivo);
  perform app.notificar(array[o.comprador_id], 'Gerencia rechazó ' || o.numero, p_motivo, 'ordenes', p_id);
  return jsonb_build_object('ok', true);
end $$;

create or replace function app.p_oc_reenviar(p_id uuid) returns text language sql stable security definer set search_path = public as $$
  -- [Reenviar a aprobación (comprador)] = AND(área Compras/Importaciones, STARTSWITH(Estado de Aprobación3,"Observado"))
  select case when not app.es_compras() then 'Lo reenvía Compras o Importaciones.'
              when coalesce(o.estado_aprobacion, '') not like 'Observado%' then 'La orden no tiene observaciones de aprobación.'
              when o.estatus in ('Anulada','Anulación solicitada') then 'La orden está anulada.' end
  from public.ordenes o where o.id = p_id
$$;

create or replace function public.ac_oc_reenviar(p_id uuid) returns jsonb language plpgsql security definer set search_path = public as $$
declare yo uuid := app.exigir_usuario(); o public.ordenes; antes text;
begin
  perform app.exigir(app.p_oc_reenviar(p_id));
  select estatus into antes from public.ordenes where id = p_id for update;
  update public.ordenes set
    aprobacion_ppto = case when aprobacion_ppto = 'Observado' then 'Subsanado' else aprobacion_ppto end,
    aprobacion_gop  = case when aprobacion_gop = 'Observado' then null else aprobacion_gop end,
    aprobacion_gaf  = case when aprobacion_gaf = 'Observado' then null else aprobacion_gaf end,
    estatus = 'Pendiente de aprobación'
  where id = p_id;
  perform app.oc_sync_estatus(p_id);
  select * into o from public.ordenes where id = p_id;
  perform app.log('ordenes', p_id, 'reenviar', antes, o.estatus);
  perform app.notificar(case when app.oc_etapa(o) = 'CG' then app.usuarios_con_rol('CONTROL_GESTION') else app.usuarios_con_rol('GOP') || app.usuarios_con_rol('GAF') end,
                        'Orden corregida: ' || o.numero, null, 'ordenes', p_id);
  return jsonb_build_object('ok', true);
end $$;

create or replace function app.p_oc_revocar(p_id uuid) returns text language sql stable security definer set search_path = public as $$
  -- [Revocar aprobación] = AND(aprobada, Estatus NOT IN(Anulada, Anulación solicitada, En modificación, Saldo pendiente, Oc Pagada),
  --                            COUNT(Related Pagos)=0, rol CG/GOP/GAF)
  select case when not (app.mis_roles() && array['CONTROL_GESTION','GOP','GAF']) then 'Lo hace Control de Gestión, la GOP o la GAF.'
              when o.estado_aprobacion is distinct from 'Aprobado para Compra' then 'La orden no está aprobada.'
              when o.estatus in ('Anulada','Anulación solicitada','En modificación','Saldo pendiente','OC pagada','OC cerrada') then 'En este estado ya no se revoca.'
              when exists (select 1 from public.pagos where orden_id = o.id and estado_pago not in ('Plan','Anulado')) then 'Ya hay pagos solicitados.' end
  from public.ordenes o where o.id = p_id
$$;

create or replace function public.ac_oc_revocar(p_id uuid, p_motivo text) returns jsonb language plpgsql security definer set search_path = public as $$
declare yo uuid := app.exigir_usuario(); o public.ordenes; cg boolean := app.tengo_rol('CONTROL_GESTION'); gop boolean := app.tengo_rol('GOP'); antes text;
begin
  perform app.exigir(app.p_oc_revocar(p_id));
  perform app.exigir(case when coalesce(trim(p_motivo), '') = '' then 'Escribe el motivo.' end);
  select estatus into antes from public.ordenes where id = p_id for update;
  update public.ordenes set
    aprobacion_ppto = case when cg then 'Observado' else aprobacion_ppto end,
    aprobacion_gop  = case when not cg and gop then 'Observado' else null end,
    aprobacion_gaf  = case when not cg and not gop and app.tengo_rol('GAF') then 'Observado' else null end,
    gop_por = null, gop_fecha = null, gaf_por = null, gaf_fecha = null, motivo_aprob = p_motivo,
    estatus = 'Pendiente de aprobación', fecha_aprobacion = null
  where id = p_id;
  update public.pagos set estado_pago = 'Anulado', comentario = 'Aprobación revocada' where orden_id = p_id and estado_pago = 'Plan';
  perform app.oc_sync_estatus(p_id);
  select * into o from public.ordenes where id = p_id;
  perform app.log('ordenes', p_id, 'revocar', antes, o.estatus, p_motivo);
  perform app.notificar(array[o.comprador_id], 'Se revocó la aprobación de ' || o.numero, p_motivo, 'ordenes', p_id);
  return jsonb_build_object('ok', true);
end $$;

create or replace function app.p_oc_modificar(p_id uuid) returns text language sql stable security definer set search_path = public as $$
  -- [Modificar OC] = AND(área Compras/Importaciones, aprobada, Estatus NOT IN(En modificación, Anulada, Anulación solicitada, Oc Pagada))
  select case when not app.es_compras() then 'La modifica Compras o Importaciones.'
              when o.estado_aprobacion is distinct from 'Aprobado para Compra' then 'Solo se modifica una orden aprobada.'
              when o.estatus in ('En modificación','Anulada','Anulación solicitada','OC pagada','OC cerrada') then 'En este estado no se modifica.' end
  from public.ordenes o where o.id = p_id
$$;

create or replace function public.ac_oc_modificar(p_id uuid, p_motivo text) returns jsonb language plpgsql security definer set search_path = public as $$
declare yo uuid := app.exigir_usuario(); o public.ordenes;
begin
  perform app.exigir(app.p_oc_modificar(p_id));
  perform app.exigir(case when coalesce(trim(p_motivo), '') = '' then 'Escribe el motivo (por ejemplo, nota de crédito del proveedor).' end);
  select * into o from public.ordenes where id = p_id for update;
  update public.ordenes set estado_previo_mod = o.estatus, monto_antes_mod = o.monto, moneda_antes_mod = o.moneda,
         formapago_antes_mod = o.forma_pago, mod_motivo = p_motivo, mod_por = yo, mod_fecha = now(), estatus = 'En modificación'
   where id = p_id;
  perform app.log('ordenes', p_id, 'modificar', o.estatus, 'En modificación', p_motivo);
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.ac_oc_confirmar_modificacion(p_id uuid) returns jsonb language plpgsql security definer set search_path = public as $$
declare yo uuid := app.exigir_usuario(); o public.ordenes; reaprob boolean;
begin
  perform app.exigir((select case when not app.es_compras() then 'Lo confirma Compras o Importaciones.'
                                  when estatus <> 'En modificación' then 'La orden no está en modificación.' end from public.ordenes where id = p_id));
  perform app.oc_recalcular(p_id);
  select * into o from public.ordenes where id = p_id for update;
  -- [_Requiere_Reaprob] = OR(Monto>Antes, Moneda<>Antes, Forma de pago<>Antes)
  reaprob := o.monto > o.monto_antes_mod or o.moneda <> o.moneda_antes_mod or o.forma_pago <> o.formapago_antes_mod;
  if reaprob then
    -- B-05: el AppSheet ponía en «Aprobación GAF» el valor de la GOP; aquí se limpian las tres firmas.
    update public.ordenes set revision = revision + 1, aprobacion_ppto = null, aprobacion_gop = null, aprobacion_gaf = null,
           cg_por = null, gop_por = null, gaf_por = null, cg_fecha = null, gop_fecha = null, gaf_fecha = null,
           fecha_aprobacion = null, estatus = 'Pendiente de aprobación' where id = p_id;
    update public.pagos set estado_pago = 'Anulado', comentario = 'Reemplazada por cambio de condiciones de pago' where orden_id = p_id and estado_pago = 'Plan';
    perform app.notificar(app.usuarios_con_rol('CONTROL_GESTION'), 'Orden modificada por reaprobar: ' || o.numero, o.mod_motivo, 'ordenes', p_id);
  else
    update public.ordenes set revision = revision + 1, estatus = o.estado_previo_mod where id = p_id;
    if o.monto <> o.monto_antes_mod then perform app.generar_cuotas(p_id, 'Ajuste por modificación (rev. ' || (o.revision + 1) || ')'); end if;
  end if;
  perform app.oc_sync_estatus(p_id);
  perform app.encolar('pdf_oc', 'ordenes', p_id, '{"version":"interna"}');
  if not reaprob then perform app.encolar('pdf_oc', 'ordenes', p_id, '{"version":"proveedor"}'); end if;
  perform app.log('ordenes', p_id, 'confirmar_modificacion', 'En modificación', (select estatus from public.ordenes where id = p_id), o.mod_motivo,
                  jsonb_build_object('reaprobacion', reaprob, 'monto_antes', o.monto_antes_mod, 'monto', o.monto));
  return jsonb_build_object('ok', true, 'reaprobacion', reaprob);
end $$;

create or replace function app.p_oc_pedir_anulacion(p_id uuid) returns text language sql stable security definer set search_path = public as $$
  -- [Solicitar anulación (Comprador)] = AND(área Compras/Importaciones, Estatus NOT IN(Borrador, Anulada, Anulación solicitada,
  --                                         En modificación, Saldo pendiente, Oc Pagada), Total_Pagado=0)
  select case when not app.es_compras() then 'La pide Compras o Importaciones.'
              when o.estatus in ('Borrador','Anulada','Anulación solicitada','En modificación','Saldo pendiente','OC pagada','OC cerrada') then 'En este estado no se pide anulación.'
              when app.oc_total_pagado(o.id) > 0 then 'Ya tiene pagos hechos.' end
  from public.ordenes o where o.id = p_id
$$;

create or replace function public.ac_oc_pedir_anulacion(p_id uuid, p_motivo text) returns jsonb language plpgsql security definer set search_path = public as $$
declare yo uuid := app.exigir_usuario(); o public.ordenes;
begin
  perform app.exigir(app.p_oc_pedir_anulacion(p_id));
  perform app.exigir(case when coalesce(trim(p_motivo), '') = '' then 'Escribe el motivo.' end);
  select * into o from public.ordenes where id = p_id for update;
  update public.ordenes set estado_previo_anul = o.estatus, estatus = 'Anulación solicitada', anul_motivo = p_motivo,
         anul_solicitada_por = yo, anul_fecha_sol = now() where id = p_id;
  perform app.log('ordenes', p_id, 'pedir_anulacion', o.estatus, 'Anulación solicitada', p_motivo);
  perform app.notificar(app.usuarios_con_rol(case when o.procedencia = 'Importación' then 'JEFE_COMPRAS_I' else 'JEFE_COMPRAS_N' end),
                        'Anulación por aprobar: ' || o.numero, p_motivo, 'ordenes', p_id);
  return jsonb_build_object('ok', true);
end $$;

create or replace function app.p_oc_decidir_anulacion(p_id uuid) returns text language sql stable security definer set search_path = public as $$
  -- [Aprobar/Rechazar anulación (jefe de Compras)] = AND(Estatus="Anulación solicitada", IN([_Rol_Jefe], mis roles))
  -- [_Rol_Jefe] = IF(Procedencia="Importación","JEFE_COMPRAS_I","JEFE_COMPRAS_N")   (B-03: en el AppSheet JEFE_COMPRAS_I no existía)
  select case when o.estatus <> 'Anulación solicitada' then 'No hay anulación pendiente.'
              when not app.tengo_rol(case when o.procedencia = 'Importación' then 'JEFE_COMPRAS_I' else 'JEFE_COMPRAS_N' end)
                then 'La decide la jefatura de Compras ' || case when o.procedencia = 'Importación' then '(importaciones).' else '(nacional).' end end
  from public.ordenes o where o.id = p_id
$$;

create or replace function public.ac_oc_decidir_anulacion(p_id uuid, p_aprobar boolean) returns jsonb language plpgsql security definer set search_path = public as $$
declare yo uuid := app.exigir_usuario(); o public.ordenes;
begin
  perform app.exigir(app.p_oc_decidir_anulacion(p_id));
  select * into o from public.ordenes where id = p_id for update;
  update public.ordenes set estatus = case when p_aprobar then 'Anulada' else o.estado_previo_anul end,
         anul_aprobada_por = yo, anul_fecha_apr = now() where id = p_id;
  if p_aprobar then
    update public.pagos set estado_pago = 'Anulado' where orden_id = p_id and estado_pago in ('Plan','Solicitado','Observado Finanzas','Programado');  -- [_Sincronizar_Estado_Pago]
  end if;
  perform app.log('ordenes', p_id, case when p_aprobar then 'anular' else 'rechazar_anulacion' end, 'Anulación solicitada',
                  case when p_aprobar then 'Anulada' else o.estado_previo_anul end);
  perform app.notificar(array[o.anul_solicitada_por], case when p_aprobar then 'Se anuló ' else 'No se anuló ' end || o.numero, null, 'ordenes', p_id);
  return jsonb_build_object('ok', true);
end $$;

create or replace function app.p_oc_anular_gerencia(p_id uuid) returns text language sql stable security definer set search_path = public as $$
  -- [Anular OC (Gerencia)] = AND(Estatus NOT IN(Borrador, Anulada, Anulación solicitada, Saldo pendiente, Oc Pagada), Total_Pagado=0, GOP o GAF)
  select case when not (app.tengo_rol('GOP') or app.tengo_rol('GAF')) then 'Lo hace la GOP o la GAF.'
              when o.estatus in ('Borrador','Anulada','Anulación solicitada','Saldo pendiente','OC pagada','OC cerrada') then 'En este estado no se anula.'
              when app.oc_total_pagado(o.id) > 0 then 'Ya tiene pagos hechos.' end
  from public.ordenes o where o.id = p_id
$$;

create or replace function public.ac_oc_anular_gerencia(p_id uuid, p_motivo text) returns jsonb language plpgsql security definer set search_path = public as $$
declare yo uuid := app.exigir_usuario(); o public.ordenes;
begin
  perform app.exigir(app.p_oc_anular_gerencia(p_id));
  perform app.exigir(case when coalesce(trim(p_motivo), '') = '' then 'Escribe el motivo.' end);
  select * into o from public.ordenes where id = p_id for update;
  update public.ordenes set estado_previo_anul = o.estatus, estatus = 'Anulada', anul_motivo = p_motivo,
         anul_solicitada_por = yo, anul_fecha_sol = now(), anul_aprobada_por = yo, anul_fecha_apr = now() where id = p_id;
  update public.pagos set estado_pago = 'Anulado' where orden_id = p_id and estado_pago in ('Plan','Solicitado','Observado Finanzas','Programado');
  perform app.log('ordenes', p_id, 'anular_gerencia', o.estatus, 'Anulada', p_motivo);
  perform app.notificar(array[o.comprador_id], 'Gerencia anuló ' || o.numero, p_motivo, 'ordenes', p_id);
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.ac_oc_descartar_borrador(p_id uuid) returns jsonb language plpgsql security definer set search_path = public as $$
declare yo uuid := app.exigir_usuario();
begin
  -- [Borrar borrador] = [Estatus Compra]="Borrador"   (B-01: aquí solo Compras/Importaciones)
  perform app.exigir((select case when not app.es_compras() then 'Lo descarta Compras o Importaciones.'
                                  when estatus <> 'Borrador' then 'Solo se descarta un borrador.' end from public.ordenes where id = p_id));
  update public.ordenes set estatus = 'Anulada', anul_motivo = 'Borrador descartado' where id = p_id;
  perform app.log('ordenes', p_id, 'descartar', 'Borrador', 'Anulada');
  return jsonb_build_object('ok', true);
end $$;

create or replace function app.p_oc_enviar(p_id uuid) returns text language sql stable security definer set search_path = public as $$
  -- [Enviar al proveedor] = AND(aprobada, área Compras/Importaciones, Estatus NOT IN(Anulada, Anulación solicitada))
  select case when not app.es_compras() then 'La envía Compras o Importaciones.'
              when o.estado_aprobacion is distinct from 'Aprobado para Compra' then 'La orden aún no está aprobada.'
              when o.estatus in ('Anulada','Anulación solicitada','En modificación') then 'La orden no se puede enviar en este estado.'
              when (app.cfg('exigir_evaluacion_fin', 'true'))::text::boolean
                   and (select evaluacion_fin from public.proveedores where id = o.proveedor_id) <> 'Aprobado'
                then 'Finanzas aún no evalúa al proveedor.' end                                   -- adición (18/11)
  from public.ordenes o where o.id = p_id
$$;

create or replace function public.ac_oc_enviar(p_id uuid, p_correo text) returns jsonb language plpgsql security definer set search_path = public as $$
declare yo uuid := app.exigir_usuario();
begin
  perform app.exigir(app.p_oc_enviar(p_id));
  perform app.exigir(case when coalesce(p_correo, '') !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then 'Escribe un correo válido.' end);
  update public.ordenes set correo_envio = p_correo, envio_solicitado = now() where id = p_id;
  perform app.encolar('enviar_correo', 'ordenes', p_id, jsonb_build_object('plantilla', 'oc_proveedor', 'para', p_correo));
  perform app.log('ordenes', p_id, 'enviar', null, p_correo);
  return jsonb_build_object('ok', true);
end $$;

create or replace function app.p_oc_finanzas_observa(p_id uuid) returns text language sql stable security definer set search_path = public as $$
  -- [Observar OC] = AND(_MiArea="Finanzas", Estatus IN("Pago pendiente","Adelanto pendiente","Crédito","Legajo incompleto"))
  select case when app.mi_area() <> 'Finanzas' then 'Lo hace Finanzas.'
              when o.estatus not in ('Pago pendiente','Adelanto pendiente','Crédito','Crédito letra','Legajo incompleto') then 'En este estado no se observa.' end
  from public.ordenes o where o.id = p_id
$$;

create or replace function public.ac_oc_finanzas_observar(p_id uuid, p_motivo text) returns jsonb language plpgsql security definer set search_path = public as $$
declare yo uuid := app.exigir_usuario(); o public.ordenes;
begin
  perform app.exigir(app.p_oc_finanzas_observa(p_id));
  perform app.exigir(case when coalesce(trim(p_motivo), '') = '' then 'Escribe el criterio de la observación.' end);
  select * into o from public.ordenes where id = p_id for update;
  update public.ordenes set estado_previo_obs = o.estatus, estatus = 'Observado por Finanzas', observacion_fin = 'Observado',
         criterio_obs_fin = p_motivo, fecha_observacion = current_date where id = p_id;
  perform app.log('ordenes', p_id, 'observar_finanzas', o.estatus, 'Observado por Finanzas', p_motivo);
  perform app.notificar(array[o.comprador_id], 'Finanzas observó ' || o.numero, p_motivo, 'ordenes', p_id);
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.ac_oc_finanzas_subsanar(p_id uuid) returns jsonb language plpgsql security definer set search_path = public as $$
declare yo uuid := app.exigir_usuario(); o public.ordenes;
begin
  -- [Subsanar OC] = AND(_MiArea="Finanzas", Estatus="Observado Por Finanzas"): Finanzas levanta su propia observación.
  perform app.exigir((select case when app.mi_area() <> 'Finanzas' then 'La levanta Finanzas.'
                                  when estatus <> 'Observado por Finanzas' then 'La orden no está observada por Finanzas.' end from public.ordenes where id = p_id));
  select * into o from public.ordenes where id = p_id for update;
  update public.ordenes set estatus = o.estado_previo_obs, observacion_fin = 'Subsanado', fecha_subsanacion = current_date where id = p_id;
  perform app.oc_sync_estatus(p_id);
  perform app.log('ordenes', p_id, 'subsanar_finanzas', 'Observado por Finanzas', o.estado_previo_obs);
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.ac_oc_cerrar(p_id uuid) returns jsonb language plpgsql security definer set search_path = public as $$
declare yo uuid := app.exigir_usuario();
begin
  perform app.exigir((select case when not (app.es_compras() or app.mi_area() in ('Finanzas','Contabilidad')) then 'La cierra Compras, Finanzas o Contabilidad.'
                                  when estatus <> 'OC pagada' then 'Solo se cierra una orden pagada.'
                                  when not exists (select 1 from public.documentos where orden_id = p_id and tipo_doc = 'Factura') then 'Falta la factura en el legajo.' end
                      from public.ordenes where id = p_id));
  update public.ordenes set estatus = 'OC cerrada' where id = p_id;
  perform app.log('ordenes', p_id, 'cerrar', 'OC pagada', 'OC cerrada');
  return jsonb_build_object('ok', true);
end $$;

-- ═════════════════════════ PAGOS ═════════════════════════
create or replace function app.p_pago_solicitar(p_id uuid) returns text language sql stable security definer set search_path = public as $$
  -- [Solicitar pago 2] = AND(Estado_Pago="Plan", OC aprobada, área Compras/Importaciones)
  select case when not app.es_compras() then 'Lo solicita Compras o Importaciones.'
              when g.estado_pago <> 'Plan' then 'La cuota ya fue solicitada.'
              when o.estado_aprobacion is distinct from 'Aprobado para Compra' then 'La orden no está aprobada.'
              when o.estatus in ('Anulada','Anulación solicitada','En modificación','Observado por Finanzas') then 'La orden no admite pagos en este estado.' end
  from public.pagos g join public.ordenes o on o.id = g.orden_id where g.id = p_id
$$;

create or replace function app.factura_libre(p_pago uuid) returns uuid language sql stable security definer set search_path = public as $$
  -- [_Facturas_Libres] + [_Vincular_Factura]: factura de la OC no usada por otra cuota y con monto que calza (±1)
  select d.id from public.pagos g join public.documentos d on d.orden_id = g.orden_id and d.tipo_doc = 'Factura' and d.estado <> 'Reemplazado'
  where g.id = p_pago and abs(coalesce(d.monto_doc, -1) - g.monto_pago) < 1
    and not exists (select 1 from public.pagos x where x.factura_id = d.id and x.estado_pago <> 'Anulado' and x.id <> g.id)
  order by d.creado limit 1
$$;

create or replace function app.solicitar_pago(p_id uuid, p_sustento text, p_comentario text) returns void language plpgsql security definer set search_path = public as $$
declare f uuid := app.factura_libre(p_id); g public.pagos; o public.ordenes;
begin
  select * into g from public.pagos where id = p_id;
  select * into o from public.ordenes where id = g.orden_id;
  update public.pagos set estado_pago = 'Solicitado', factura_id = f, fecha_factura = (select fecha_doc from public.documentos where id = f),
         sustento_falta_factura = case when f is null then p_sustento end,
         fecha_limite_pago = case when f is not null and coalesce(dias_credito, 0) > 0 then (select fecha_doc from public.documentos where id = f) + dias_credito
                                  else coalesce(fecha_limite_pago, current_date) end,                    -- [_Fechas_Factura]
         comentario = coalesce(p_comentario, comentario)
   where id = p_id;
  perform app.calcular_retencion(p_id);
  perform app.oc_sync_estatus(g.orden_id);
  perform app.encolar('inropay_solicitar', 'pagos', p_id);
  perform app.notificar(app.usuarios_de_area('Finanzas'), 'Pago solicitado: ' || o.numero || ' cuota ' || g.n_cuota, o.moneda || ' ' || g.monto_pago, 'pagos', p_id);
  perform app.log('pagos', p_id, 'solicitar', 'Plan', 'Solicitado', p_comentario);
end $$;

create or replace function public.ac_pago_solicitar(p_id uuid, p_sustento text default null) returns jsonb language plpgsql security definer set search_path = public as $$
declare yo uuid := app.exigir_usuario(); g public.pagos;
begin
  perform app.exigir(app.p_pago_solicitar(p_id));
  select * into g from public.pagos where id = p_id for update;
  perform app.exigir(case when app.factura_libre(p_id) is null and g.tipo_pago not in ('Adelanto','Caja chica') and coalesce(trim(p_sustento), '') = ''
                          then 'No hay factura que calce con la cuota: súbela o escribe el sustento para pagar sin factura.' end);
  perform app.solicitar_pago(p_id, p_sustento, null);
  return jsonb_build_object('ok', true);
end $$;

-- Al subir una factura con monto, se solicita sola la cuota en Plan que calce ([_Solicitar_Auto]).
create or replace function app.al_subir_factura() returns trigger language plpgsql security definer set search_path = public as $$
declare g uuid;
begin
  if new.tipo_doc = 'Factura' and new.orden_id is not null and new.monto_doc is not null then
    select p.id into g from public.pagos p join public.ordenes o on o.id = p.orden_id
     where p.orden_id = new.orden_id and p.estado_pago = 'Plan' and abs(p.monto_pago - new.monto_doc) < 1
       and o.estado_aprobacion = 'Aprobado para Compra' and o.estatus not in ('Anulada','Anulación solicitada','En modificación','Observado por Finanzas')
     order by p.n_cuota limit 1;
    if g is not null then
      perform app.solicitar_pago(g, null, 'Solicitado automáticamente al subir factura');
    else
      update public.pagos set factura_id = new.id, fecha_factura = new.fecha_doc
       where id = (select id from public.pagos where orden_id = new.orden_id and estado_pago in ('Solicitado','Programado','Pagado')
                   and factura_id is null and abs(monto_pago - new.monto_doc) < 1 order by n_cuota limit 1);
    end if;
  end if;
  return new;
end $$;
create trigger al_subir_factura after insert or update of monto_doc on public.documentos for each row execute function app.al_subir_factura();

create or replace function public.ac_pago_programar(p_id uuid, p_fecha date) returns jsonb language plpgsql security definer set search_path = public as $$
declare yo uuid := app.exigir_usuario();
begin
  -- [Programar pago] = AND(Estado_Pago="Solicitado", _MiArea="Finanzas", Monto_Pago>0)
  perform app.exigir((select case when app.mi_area() <> 'Finanzas' then 'Lo programa Finanzas.' when estado_pago <> 'Solicitado' then 'La cuota no está solicitada.' end
                      from public.pagos where id = p_id));
  update public.pagos set estado_pago = 'Programado', fecha_programada = coalesce(p_fecha, current_date), aprobado_fin_por = yo where id = p_id;
  perform app.log('pagos', p_id, 'programar', 'Solicitado', 'Programado');
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.ac_pago_pagado(p_id uuid, p_n_operacion text, p_voucher uuid default null) returns jsonb language plpgsql security definer set search_path = public as $$
declare yo uuid := app.exigir_usuario(); g public.pagos;
begin
  -- [Pagado] = Estado_Pago="Programado"   (B-06: el AppSheet no pedía rol; aquí solo Finanzas)
  perform app.exigir((select case when not (app.mi_area() = 'Finanzas' or app.tengo_rol('FINANZAS')) then 'Lo marca Finanzas.'
                                  when estado_pago <> 'Programado' then 'La cuota no está programada.'
                                  when coalesce(trim(p_n_operacion), '') = '' then 'Escribe el número de operación.' end from public.pagos where id = p_id));
  update public.pagos set estado_pago = 'Pagado', fecha_pago = now(), n_operacion = p_n_operacion, voucher_doc = p_voucher where id = p_id returning * into g;
  perform app.oc_sync_estatus(g.orden_id);
  perform app.log('pagos', p_id, 'pagado', 'Programado', 'Pagado', p_n_operacion);
  perform app.notificar(array[(select comprador_id from public.ordenes where id = g.orden_id)], 'Pago hecho: cuota ' || g.n_cuota, p_n_operacion, 'pagos', p_id);
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.ac_pago_observar(p_id uuid, p_motivo text, p_detalle text default null) returns jsonb language plpgsql security definer set search_path = public as $$
declare yo uuid := app.exigir_usuario(); g public.pagos;
begin
  perform app.exigir((select case when app.mi_area() <> 'Finanzas' then 'Lo observa Finanzas.'
                                  when estado_pago not in ('Solicitado','Programado') then 'Solo se observa una cuota solicitada o programada.'
                                  when p_motivo is null then 'Elige el motivo.' end from public.pagos where id = p_id));
  update public.pagos set estado_pago = 'Observado Finanzas', motivo_obs_fin = p_motivo, detalle_obs_fin = p_detalle where id = p_id returning * into g;
  perform app.log('pagos', p_id, 'observar', null, 'Observado Finanzas', p_motivo);
  perform app.notificar(array[(select comprador_id from public.ordenes where id = g.orden_id)], 'Finanzas observó un pago', p_motivo || coalesce(': ' || p_detalle, ''), 'pagos', p_id);
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.ac_pago_subsanar(p_id uuid) returns jsonb language plpgsql security definer set search_path = public as $$
declare yo uuid := app.exigir_usuario();
begin
  perform app.exigir((select case when not app.es_compras() then 'Lo subsana Compras o Importaciones.'
                                  when estado_pago <> 'Observado Finanzas' then 'La cuota no está observada.' end from public.pagos where id = p_id));
  update public.pagos set estado_pago = 'Solicitado', factura_id = coalesce(factura_id, app.factura_libre(id)) where id = p_id;
  perform app.calcular_retencion(p_id);
  perform app.log('pagos', p_id, 'subsanar', 'Observado Finanzas', 'Solicitado');
  perform app.notificar(app.usuarios_de_area('Finanzas'), 'Pago subsanado', null, 'pagos', p_id);
  return jsonb_build_object('ok', true);
end $$;

-- Entrega parcial: la cuota se parte y el remanente queda en Plan ([New step Action - 5]).
create or replace function public.ac_pago_dividir(p_id uuid, p_monto numeric) returns jsonb language plpgsql security definer set search_path = public as $$
declare yo uuid := app.exigir_usuario(); g public.pagos;
begin
  select * into g from public.pagos where id = p_id for update;
  perform app.exigir(case when not app.es_compras() then 'Lo hace Compras o Importaciones.' when g.estado_pago <> 'Plan' then 'Solo se divide una cuota en plan.'
                          when p_monto <= 0 or p_monto >= g.monto_pago then 'El monto debe ser menor que el de la cuota.' end);
  update public.pagos set monto_pago = p_monto, tipo_pago = 'Pago parcial' where id = p_id;
  insert into public.pagos (orden_id, n_cuota, hito, tipo_pago, monto_pago, dias_credito, es_letra, estado_pago, comentario)
  values (g.orden_id, g.n_cuota + 0.1, g.hito, 'Saldo', g.monto_pago - p_monto, g.dias_credito, g.es_letra, 'Plan', 'Remanente de la cuota ' || g.n_cuota);
  perform app.log('pagos', p_id, 'dividir', g.monto_pago::text, p_monto::text);
  return jsonb_build_object('ok', true);
end $$;

-- InroPay (Finanzas) devuelve el estado. Solo el servidor (service_role) la llama; no se da permiso a authenticated.
create or replace function public.inropay_actualizar(p_pago uuid, p_estado text, p_fecha date default null, p_n_operacion text default null, p_ref text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare g public.pagos;
begin
  if p_estado not in ('Programado','Pagado','Observado Finanzas') then raise exception 'Estado no válido'; end if;
  update public.pagos set estado_pago = p_estado, inropay_ref = coalesce(p_ref, inropay_ref),
         fecha_programada = case when p_estado = 'Programado' then coalesce(p_fecha, current_date) else fecha_programada end,
         fecha_pago = case when p_estado = 'Pagado' then coalesce(p_fecha, current_date) else fecha_pago end,
         n_operacion = coalesce(p_n_operacion, n_operacion)
   where id = p_pago returning * into g;
  perform app.oc_sync_estatus(g.orden_id);
  insert into public.historial (tabla, registro_id, accion, a, datos) values ('pagos', p_pago, 'inropay', p_estado, jsonb_build_object('ref', p_ref));
  return jsonb_build_object('ok', true);
end $$;

-- ═════════════════════════ DESADUANAJE ═════════════════════════
create or replace function public.ac_des_crear(p_oc uuid, p_tipo text, p_alcance text default 'Total') returns jsonb
language plpgsql security definer set search_path = public as $$
declare yo uuid := app.exigir_usuario(); o public.ordenes; d uuid; n int;
begin
  -- [Nuevo desaduanaje] = AND(Procedencia de importación, aprobada, área Compras/Importaciones)
  select * into o from public.ordenes where id = p_oc;
  perform app.exigir(case when not app.es_compras() then 'Lo crea Compras o Importaciones.'
                          when o.procedencia <> 'Importación' then 'Solo para órdenes de importación.'
                          when o.estado_aprobacion is distinct from 'Aprobado para Compra' then 'La orden no está aprobada.'
                          when o.estatus in ('Anulada','Anulación solicitada') then 'La orden está anulada.' end);
  select count(*) + 1 into n from public.desaduanajes where orden_duena_id = p_oc;
  insert into public.desaduanajes (numero, empresa_id, orden_duena_id, romano, tipo, alcance, creado_por, tc_usd, tc_eur, tc_gbp)
  values (app.correlativo('DES'), o.empresa_id, p_oc, app.romano(n::int), p_tipo, p_alcance, yo,
          (select tasa_a_soles from public.monedas where id = 'USD'), (select tasa_a_soles from public.monedas where id = 'EUR'),
          (select tasa_a_soles from public.monedas where id = 'GBP'))
  returning id into d;
  insert into public.des_productos (desaduanaje_id, orden_id, linea_id, proyecto_id, descripcion, cantidad, moneda, precio_exw)
  select d, p_oc, l.id, o.proyecto_id, l.descripcion,
         l.cantidad - coalesce((select sum(x.cantidad) from public.des_productos x where x.linea_id = l.id and x.desaduanaje_id <> d), 0),
         o.moneda, l.precio_unit
    from public.oc_lineas l where l.orden_id = p_oc and not (l.es_demasia and l.demasia_estado = 'Rechazada');
  delete from public.des_productos where desaduanaje_id = d and cantidad <= 0;
  perform app.encolar('crear_carpeta', 'desaduanajes', d);
  perform app.log('desaduanajes', d, 'crear', null, 'Borrador');
  return jsonb_build_object('ok', true, 'id', d);
end $$;

create or replace function app.des_docs_faltantes(p_id uuid) returns text[] language sql stable security definer set search_path = public as $$
  -- [_Checklist]: un documento cuenta si se marcó el check o si se subió el archivo
  select array_remove(array[
    case when not (d.chk_factura or exists (select 1 from public.documentos x where x.desaduanaje_id = d.id and x.tipo_doc = 'Factura comercial')) then 'Factura comercial' end,
    case when not (d.chk_bl or exists (select 1 from public.documentos x where x.desaduanaje_id = d.id and x.tipo_doc = 'BL / AWB')) then 'BL / AWB' end,
    case when not (d.chk_cert_origen or exists (select 1 from public.documentos x where x.desaduanaje_id = d.id and x.tipo_doc = 'Certificado de origen')) then 'Certificado de origen' end,
    case when not (d.chk_seguro or exists (select 1 from public.documentos x where x.desaduanaje_id = d.id and x.tipo_doc = 'Póliza de seguro')) then 'Seguro' end,
    case when d.requiere_permiso and not (d.chk_permiso or exists (select 1 from public.documentos x where x.desaduanaje_id = d.id and x.tipo_doc = 'Permiso (MTC / DIGESA)')) then 'Permiso' end
  ], null) from public.desaduanajes d where d.id = p_id
$$;

-- Avanza un paso del ciclo: Documentos completos → DAM numerada → Llegada → Levante → En almacén.
-- (B-07: en el AppSheet cualquiera podía mover estos pasos; aquí solo Compras/Importaciones.)
create or replace function public.ac_des_avanzar(p_id uuid, p_fecha date default null, p_n_dam text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare yo uuid := app.exigir_usuario(); d public.desaduanajes; sig text; f date := coalesce(p_fecha, current_date);
begin
  select * into d from public.desaduanajes where id = p_id for update;
  perform app.exigir(case when not app.es_compras() then 'Lo registra Compras o Importaciones.' end);
  sig := case d.estado when 'Borrador' then 'Documentos completos' when 'Documentos completos' then 'DAM numerada'
                       when 'DAM numerada' then 'Llegada' when 'Llegada' then 'Levante' when 'Levante' then 'En almacén' end;
  perform app.exigir(case when sig is null then 'No hay un paso siguiente: cierra el costeo.'
                          when sig = 'Documentos completos' and cardinality(app.des_docs_faltantes(p_id)) > 0
                            then 'Falta: ' || array_to_string(app.des_docs_faltantes(p_id), ', ') || '.'
                          when sig = 'DAM numerada' and coalesce(trim(p_n_dam), '') = '' then 'Escribe el número de DAM.' end);
  update public.desaduanajes set estado = sig,
    n_dam = case when sig = 'DAM numerada' then p_n_dam else n_dam end,
    fecha_numeracion = case when sig = 'DAM numerada' then f else fecha_numeracion end,
    -- decisión 19/11: el tipo de cambio de costeo se congela al numerar la DAM
    tc_usd = case when sig = 'DAM numerada' then coalesce((select tc from public.tc_costeo where moneda = 'USD' and vigente_desde <= f order by vigente_desde desc limit 1), tc_usd) else tc_usd end,
    tc_eur = case when sig = 'DAM numerada' then coalesce((select tc from public.tc_costeo where moneda = 'EUR' and vigente_desde <= f order by vigente_desde desc limit 1), tc_eur) else tc_eur end,
    tc_gbp = case when sig = 'DAM numerada' then coalesce((select tc from public.tc_costeo where moneda = 'GBP' and vigente_desde <= f order by vigente_desde desc limit 1), tc_gbp) else tc_gbp end,
    fecha_llegada = case when sig = 'Llegada' then f else fecha_llegada end,
    fecha_levante = case when sig = 'Levante' then f else fecha_levante end,
    fecha_almacen = case when sig = 'En almacén' then f else fecha_almacen end
  where id = p_id;
  perform app.log('desaduanajes', p_id, 'avanzar', d.estado, sig);
  return jsonb_build_object('ok', true, 'estado', sig);
end $$;

-- Costeo: reparte gastos que entran al costo (por Valor = según EXW en soles; por Producto = según cantidad) + ad valorem.
create or replace function app.des_calcular(p_id uuid) returns void language plpgsql security definer set search_path = public as $$
declare d public.desaduanajes; tot_exw numeric; tot_cant numeric; g_valor numeric; g_prod numeric;
begin
  select * into d from public.desaduanajes where id = p_id;
  update public.des_productos p set exw_s = round(p.cantidad * p.precio_exw *
           case p.moneda when 'USD' then coalesce(d.tc_usd, 1) when 'EUR' then coalesce(d.tc_eur, 1) when 'GBP' then coalesce(d.tc_gbp, 1) else 1 end, 2),
         ad_valorem_s = round(p.ad_valorem_usd * coalesce(d.tc_usd, 1), 2)
   where p.desaduanaje_id = p_id;
  select sum(exw_s), sum(cantidad) into tot_exw, tot_cant from public.des_productos where desaduanaje_id = p_id;
  select coalesce(sum(case when c.reparto = 'Valor' then g.monto_s end), 0), coalesce(sum(case when c.reparto = 'Producto' then g.monto_s end), 0)
    into g_valor, g_prod
    from public.des_gastos g join public.conceptos_gasto_imp c on c.concepto = g.concepto
   where g.desaduanaje_id = p_id and g.entra_costo and g.tipo_comprobante <> 'Nota de crédito';
  g_valor := g_valor - coalesce((select sum(g.monto_s) from public.des_gastos g join public.conceptos_gasto_imp c on c.concepto = g.concepto
                                  where g.desaduanaje_id = p_id and g.entra_costo and g.tipo_comprobante = 'Nota de crédito'), 0);
  update public.des_productos set pct_reparto = round(exw_s / nullif(tot_exw, 0), 6),
         gastos_valor_s = round(g_valor * exw_s / nullif(tot_exw, 0) + g_prod * cantidad / nullif(tot_cant, 0), 2)
   where desaduanaje_id = p_id;
  update public.des_productos set costo_total_s = coalesce(exw_s, 0) + coalesce(gastos_valor_s, 0) + coalesce(ad_valorem_s, 0),
         costo_unit_s = round((coalesce(exw_s, 0) + coalesce(gastos_valor_s, 0) + coalesce(ad_valorem_s, 0)) / nullif(cantidad, 0), 4)
   where desaduanaje_id = p_id;
  update public.desaduanajes set exw_total_s = tot_exw, gastos_costo_s = g_valor + g_prod,
         fi = round((select sum(costo_total_s) from public.des_productos where desaduanaje_id = p_id) / nullif(tot_exw, 0), 6)
   where id = p_id;
end $$;

create or replace function public.ac_des_calcular(p_id uuid) returns jsonb language plpgsql security definer set search_path = public as $$
declare yo uuid := app.exigir_usuario();
begin
  perform app.exigir((select case when not (app.es_compras() or app.mi_area() = 'Contabilidad') then 'Lo calcula Importaciones o Contabilidad.'
                                  when estado = 'Costeo cerrado' then 'El costeo está cerrado: reábrelo con motivo.' end from public.desaduanajes where id = p_id));
  perform app.des_calcular(p_id);
  return jsonb_build_object('ok', true, 'fi', (select fi from public.desaduanajes where id = p_id));
end $$;

create or replace function public.ac_des_cerrar_costeo(p_id uuid) returns jsonb language plpgsql security definer set search_path = public as $$
declare yo uuid := app.exigir_usuario(); d public.desaduanajes;
begin
  select * into d from public.desaduanajes where id = p_id for update;
  perform app.exigir(case when not app.es_compras() then 'Lo cierra Importaciones.' when d.estado <> 'En almacén' then 'Primero registra el ingreso a almacén.' end);
  perform app.des_calcular(p_id);
  update public.desaduanajes set estado = 'Costeo cerrado', version_costeo = version_costeo + 1, cerrado_por = yo, fecha_cierre = now() where id = p_id returning * into d;
  insert into public.des_costeo_hist (desaduanaje_id, version, cerrado_por, motivo, orden_id, proyecto_id, producto, cantidad, exw_unit_s, fi, costo_unit_s)
  select p_id, d.version_costeo, yo, d.motivo_reapertura, p.orden_id, p.proyecto_id, p.descripcion, p.cantidad,
         round(p.exw_s / nullif(p.cantidad, 0), 4), round(p.costo_total_s / nullif(p.exw_s, 0), 6), p.costo_unit_s
    from public.des_productos p where p.desaduanaje_id = p_id;
  perform app.log('desaduanajes', p_id, 'cerrar_costeo', 'En almacén', 'Costeo cerrado', null, jsonb_build_object('version', d.version_costeo, 'fi', d.fi));
  return jsonb_build_object('ok', true, 'version', d.version_costeo);
end $$;

-- C-02 / C-09: costo que llega tarde → se reabre con motivo y el cierre siguiente es una versión nueva.
create or replace function public.ac_des_reabrir(p_id uuid, p_motivo text) returns jsonb language plpgsql security definer set search_path = public as $$
declare yo uuid := app.exigir_usuario();
begin
  perform app.exigir((select case when not (app.tengo_rol('JEFE_COMPRAS_I') or app.es_admin()) then 'Lo reabre la jefatura de Importaciones.'
                                  when estado <> 'Costeo cerrado' then 'El costeo no está cerrado.'
                                  when coalesce(trim(p_motivo), '') = '' then 'Escribe el motivo (por ejemplo, multa que llegó después).' end
                      from public.desaduanajes where id = p_id));
  update public.desaduanajes set estado = 'En almacén', motivo_reapertura = p_motivo where id = p_id;
  perform app.log('desaduanajes', p_id, 'reabrir', 'Costeo cerrado', 'En almacén', p_motivo);
  return jsonb_build_object('ok', true);
end $$;

-- ═════════════════════════ ADMINISTRADOR ═════════════════════════
-- Corrige cualquier estado, siempre con motivo e historial (pedido del jefe de área, 06/11).
create or replace function public.ac_admin_corregir(p_tabla text, p_id uuid, p_campo text, p_valor text, p_motivo text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare yo uuid := app.exigir_usuario(); antes text;
begin
  perform app.exigir(case when not app.es_admin() then 'Solo el administrador.'
                          when coalesce(trim(p_motivo), '') = '' then 'Escribe el motivo de la corrección.'
                          when p_tabla not in ('ordenes','pagos','solicitudes','requerimientos','desaduanajes','requerimiento_items','proyectos') then 'Tabla no permitida.' end);
  execute format('select %I::text from public.%I where id = $1', p_campo, p_tabla) into antes using p_id;
  execute format('update public.%I set %I = $1 where id = $2', p_tabla, p_campo) using p_valor, p_id;
  perform app.log(p_tabla, p_id, 'correccion_admin', antes, p_valor, p_motivo, jsonb_build_object('campo', p_campo));
  return jsonb_build_object('ok', true);
end $$;

-- ═════════════════════════ QUÉ BOTONES MOSTRAR ═════════════════════════
-- Devuelve las acciones que el usuario actual puede hacer sobre un registro.
-- tipo: 'p' = principal (un solo botón azul), 's' = secundaria, 'd' = peligro (pide confirmar).
-- pide: campos que la UI debe pedir antes de llamar a la función.
create or replace function public.acciones_disponibles(p_tabla text, p_id uuid)
returns table (accion text, etiqueta text, tipo text, funcion text, pide jsonb)
language plpgsql stable security definer set search_path = public as $$
declare o public.ordenes; c record;
begin
  if auth.uid() is null then return; end if;
  if p_tabla = 'ordenes' then
    select * into o from public.ordenes where id = p_id;
    for c in select * from (values
      ('emitir','Emitir y enviar a aprobación','p','ac_oc_emitir', '[]'::jsonb, app.p_oc_emitir(p_id)),
      ('validar_ppto','Validar presupuesto','p','ac_oc_validar_ppto','[{"campo":"p_ppto","tipo":"opcion","opciones":["Presupuestado","No presupuestado","Excede Presupuesto","Preinversion","Adm","Pre Aprobado"]}]', app.p_oc_cg(p_id)),
      ('observar_ppto','Observar presupuesto','s','ac_oc_observar_ppto','[{"campo":"p_motivo","tipo":"texto"}]', app.p_oc_cg(p_id)),
      ('aprobar_gop','Aprobar','p','ac_oc_aprobar_gop','[]', app.p_oc_gop(p_id)),
      ('aprobar_gop_sin_demasia','Aprobar sin la demasía','s','ac_oc_aprobar_gop','[{"campo":"p_con_demasia","valor":false}]',
         coalesce(app.p_oc_gop(p_id), case when not app.oc_demasia_pend(p_id) then 'Sin demasías' end)),
      ('aprobar_gaf','Aprobar','p','ac_oc_aprobar_gaf','[]', app.p_oc_gaf(p_id)),
      ('observar','Observar','s','ac_oc_observar','[{"campo":"p_motivo","tipo":"texto"}]', app.p_oc_gerencia_observa(p_id)),
      ('rechazar','Rechazar','d','ac_oc_rechazar','[{"campo":"p_motivo","tipo":"texto"}]', app.p_oc_gerencia_observa(p_id)),
      ('reenviar','Reenviar a aprobación','p','ac_oc_reenviar','[]', app.p_oc_reenviar(p_id)),
      ('enviar','Enviar al proveedor','p','ac_oc_enviar', jsonb_build_array(jsonb_build_object('campo','p_correo','tipo','correo','valor',o.correo_envio)), app.p_oc_enviar(p_id)),
      ('modificar','Modificar orden','s','ac_oc_modificar','[{"campo":"p_motivo","tipo":"texto"}]', app.p_oc_modificar(p_id)),
      ('confirmar_modificacion','Confirmar modificación','p','ac_oc_confirmar_modificacion','[]',
         (select case when not app.es_compras() then 'x' when o.estatus <> 'En modificación' then 'x' end)),
      ('revocar','Revocar aprobación','d','ac_oc_revocar','[{"campo":"p_motivo","tipo":"texto"}]', app.p_oc_revocar(p_id)),
      ('pedir_anulacion','Pedir anulación','d','ac_oc_pedir_anulacion','[{"campo":"p_motivo","tipo":"texto"}]', app.p_oc_pedir_anulacion(p_id)),
      ('aprobar_anulacion','Aprobar anulación','p','ac_oc_decidir_anulacion','[{"campo":"p_aprobar","valor":true}]', app.p_oc_decidir_anulacion(p_id)),
      ('rechazar_anulacion','Rechazar anulación','s','ac_oc_decidir_anulacion','[{"campo":"p_aprobar","valor":false}]', app.p_oc_decidir_anulacion(p_id)),
      ('anular_gerencia','Anular orden','d','ac_oc_anular_gerencia','[{"campo":"p_motivo","tipo":"texto"}]', app.p_oc_anular_gerencia(p_id)),
      ('observar_finanzas','Observar (Finanzas)','s','ac_oc_finanzas_observar','[{"campo":"p_motivo","tipo":"texto"}]', app.p_oc_finanzas_observa(p_id)),
      ('subsanar_finanzas','Levantar observación','p','ac_oc_finanzas_subsanar','[]',
         (select case when app.mi_area() <> 'Finanzas' or o.estatus <> 'Observado por Finanzas' then 'x' end)),
      ('descartar','Descartar borrador','d','ac_oc_descartar_borrador','[]', (select case when not app.es_compras() or o.estatus <> 'Borrador' then 'x' end)),
      ('nuevo_desaduanaje','Nuevo desaduanaje','s','ac_des_crear','[{"campo":"p_tipo","tipo":"opcion","opciones":["Marítimo","Aéreo","Courier"]},{"campo":"p_alcance","tipo":"opcion","opciones":["Total","Parcial"]}]',
         (select case when not app.es_compras() or o.procedencia <> 'Importación' or o.estado_aprobacion is distinct from 'Aprobado para Compra' or o.estatus in ('Anulada','Anulación solicitada') then 'x' end)),
      ('cerrar','Cerrar orden','s','ac_oc_cerrar','[]', (select case when o.estatus <> 'OC pagada' or not (app.es_compras() or app.mi_area() in ('Finanzas','Contabilidad')) then 'x' end))
    ) as t(accion, etiqueta, tipo, funcion, pide, motivo) where t.motivo is null loop
      accion := c.accion; etiqueta := c.etiqueta; tipo := c.tipo; funcion := c.funcion; pide := c.pide; return next;
    end loop;
  elsif p_tabla = 'solicitudes' then
    for c in select * from (values
      ('emitir','Emitir solicitud','p','ac_solicitud_emitir','[]'::jsonb, app.p_solicitud_emitir(p_id)),
      ('liberar','Liberar','p','ac_solicitud_liberar','[]', app.p_solicitud_liberar(p_id)),
      ('rechazar','Rechazar','d','ac_solicitud_rechazar','[{"campo":"p_motivo","tipo":"texto"}]', app.p_solicitud_liberar(p_id)),
      ('reenviar','Corregir y reenviar','p','ac_solicitud_reenviar','[]', app.p_solicitud_reenviar(p_id)),
      ('devolver','Pedir de vuelta para corregir','s','ac_solicitud_devolver','[{"campo":"p_motivo","tipo":"texto"}]', app.p_solicitud_devolver(p_id)),
      ('cancelar','Cancelar solicitud','d','ac_solicitud_cancelar','[{"campo":"p_motivo","tipo":"texto"}]', app.p_solicitud_cancelar(p_id)),
      ('rehacer','Hacer una nueva a partir de esta','s','ac_solicitud_clonar','[]', app.p_solicitud_clonar(p_id))
    ) as t(accion, etiqueta, tipo, funcion, pide, motivo) where t.motivo is null loop
      accion := c.accion; etiqueta := c.etiqueta; tipo := c.tipo; funcion := c.funcion; pide := c.pide; return next;
    end loop;
  elsif p_tabla = 'requerimientos' then
    for c in select * from (values
      ('emitir','Emitir requerimiento','p','ac_req_emitir','[]'::jsonb, app.p_req_emitir(p_id)),
      ('observar','Observar','s','ac_req_observar','[{"campo":"p_motivo","tipo":"texto"}]', app.p_req_observar(p_id)),
      ('rq_sidige','Anotar RQ del SIDIGE','s','ac_req_rq_sidige','[{"campo":"p_rq","tipo":"texto"}]',
         (select case when not (app.mi_area() = 'Planeamiento' or app.es_admin()) then 'x' end))
    ) as t(accion, etiqueta, tipo, funcion, pide, motivo) where t.motivo is null loop
      accion := c.accion; etiqueta := c.etiqueta; tipo := c.tipo; funcion := c.funcion; pide := c.pide; return next;
    end loop;
  elsif p_tabla = 'pagos' then
    for c in select * from (values
      ('solicitar','Solicitar pago','p','ac_pago_solicitar','[{"campo":"p_sustento","tipo":"texto","opcional":true}]'::jsonb, app.p_pago_solicitar(p_id)),
      ('programar','Programar','p','ac_pago_programar','[{"campo":"p_fecha","tipo":"fecha"}]',
         (select case when app.mi_area() <> 'Finanzas' or estado_pago <> 'Solicitado' then 'x' end from public.pagos where id = p_id)),
      ('pagado','Marcar pagado','p','ac_pago_pagado','[{"campo":"p_n_operacion","tipo":"texto"},{"campo":"p_voucher","tipo":"documento","opcional":true}]',
         (select case when not (app.mi_area() = 'Finanzas' or app.tengo_rol('FINANZAS')) or estado_pago <> 'Programado' then 'x' end from public.pagos where id = p_id)),
      ('observar','Observar','s','ac_pago_observar','[{"campo":"p_motivo","tipo":"opcion","opciones":["Documentos incompletos","Datos incorrectos","Falta factura","Falta validación técnica","Monto no coincide","Proveedor incorrecto","Otros"]},{"campo":"p_detalle","tipo":"texto","opcional":true}]',
         (select case when app.mi_area() <> 'Finanzas' or estado_pago not in ('Solicitado','Programado') then 'x' end from public.pagos where id = p_id)),
      ('subsanar','Subsanar','p','ac_pago_subsanar','[]',
         (select case when not app.es_compras() or estado_pago <> 'Observado Finanzas' then 'x' end from public.pagos where id = p_id)),
      ('dividir','Entrega parcial: dividir cuota','s','ac_pago_dividir','[{"campo":"p_monto","tipo":"numero"}]',
         (select case when not app.es_compras() or estado_pago <> 'Plan' then 'x' end from public.pagos where id = p_id))
    ) as t(accion, etiqueta, tipo, funcion, pide, motivo) where t.motivo is null loop
      accion := c.accion; etiqueta := c.etiqueta; tipo := c.tipo; funcion := c.funcion; pide := c.pide; return next;
    end loop;
  elsif p_tabla = 'desaduanajes' then
    for c in select * from (values
      ('avanzar', (select case estado when 'Borrador' then 'Documentos completos' when 'Documentos completos' then 'Registrar DAM'
                     when 'DAM numerada' then 'Registrar llegada' when 'Llegada' then 'Registrar levante' when 'Levante' then 'Ingreso a almacén' end
                   from public.desaduanajes where id = p_id), 'p', 'ac_des_avanzar',
         (select case when estado = 'Documentos completos' then '[{"campo":"p_n_dam","tipo":"texto"},{"campo":"p_fecha","tipo":"fecha"}]'::jsonb
                      when estado = 'Borrador' then '[]'::jsonb else '[{"campo":"p_fecha","tipo":"fecha"}]'::jsonb end from public.desaduanajes where id = p_id),
         (select case when not app.es_compras() or estado in ('En almacén','Costeo cerrado')
                        or (estado = 'Borrador' and cardinality(app.des_docs_faltantes(p_id)) > 0) then 'x' end from public.desaduanajes where id = p_id)),
      ('calcular','Calcular costeo','s','ac_des_calcular','[]'::jsonb,
         (select case when not (app.es_compras() or app.mi_area() = 'Contabilidad') or estado = 'Costeo cerrado' then 'x' end from public.desaduanajes where id = p_id)),
      ('cerrar_costeo','Cerrar costeo','p','ac_des_cerrar_costeo','[]'::jsonb,
         (select case when not app.es_compras() or estado <> 'En almacén' then 'x' end from public.desaduanajes where id = p_id)),
      ('reabrir','Reabrir costeo','d','ac_des_reabrir','[{"campo":"p_motivo","tipo":"texto"}]'::jsonb,
         (select case when not (app.tengo_rol('JEFE_COMPRAS_I') or app.es_admin()) or estado <> 'Costeo cerrado' then 'x' end from public.desaduanajes where id = p_id))
    ) as t(accion, etiqueta, tipo, funcion, pide, motivo) where t.motivo is null loop
      accion := c.accion; etiqueta := c.etiqueta; tipo := c.tipo; funcion := c.funcion; pide := c.pide; return next;
    end loop;
  elsif p_tabla = 'proyectos' then
    if app.p_proyecto_resultado(p_id) is null then
      accion := 'ganado'; etiqueta := 'Marcar como ganado'; tipo := 'p'; funcion := 'ac_proyecto_resultado'; pide := '[{"campo":"p_ganado","valor":true}]'; return next;
      accion := 'perdido'; etiqueta := 'Marcar como perdido'; tipo := 'd'; funcion := 'ac_proyecto_resultado'; pide := '[{"campo":"p_ganado","valor":false}]'; return next;
    end if;
  elsif p_tabla = 'anulaciones' then
    if app.p_anulacion_decidir(p_id) is null then
      accion := 'aprobar'; etiqueta := 'Aprobar anulación'; tipo := 'p'; funcion := 'ac_anulacion_decidir'; pide := '[{"campo":"p_aprobar","valor":true}]'; return next;
      accion := 'rechazar'; etiqueta := 'Rechazar'; tipo := 's'; funcion := 'ac_anulacion_decidir'; pide := '[{"campo":"p_aprobar","valor":false},{"campo":"p_motivo","tipo":"texto"}]'; return next;
    end if;
  end if;
end $$;

-- «Te toca»: la bandeja de cada persona (lo que hoy obliga a revisar varias vistas del AppSheet).
create or replace function public.te_toca() returns table (tabla text, id uuid, titulo text, paso text, desde timestamptz)
language sql stable security definer set search_path = public as $$
  select 'solicitudes', s.id, coalesce(s.numero, 'Solicitud') || ' · ' || coalesce(left(s.sustento, 60), ''), 'Liberar solicitud', s.creado
    from public.solicitudes s where s.estado = 'Pendiente Liberación' and auth.uid() = any(coalesce(app.aprobadores_solicitud(s.id), '{}'))
  union all
  select 'solicitudes', s.id, coalesce(s.numero, 'Solicitud'), 'Corregir solicitud observada', s.creado
    from public.solicitudes s where s.estado = 'Observada' and s.solicitante_id = auth.uid()
  union all
  select 'requerimientos', r.id, coalesce(r.motivo, 'Requerimiento'), 'Emitir requerimiento', r.creado
    from public.requerimientos r where r.estado = 'En Proceso' and r.area_emisora = app.mi_area()
  union all
  select 'requerimiento_items', i.id, i.descripcion, 'Validación técnica', r.fecha_emision
    from public.requerimiento_items i join public.requerimientos r on r.id = i.requerimiento_id
   where (app.tengo_rol('TECNICA') or app.mi_area() = 'Técnica') and i.validacion_tecnica = 'Pendiente' and not i.anulado and r.estado in ('En Proceso','Emitido')
  union all
  select 'ordenes', o.id, o.numero || ' · ' || coalesce((select razon_social from public.proveedores where id = o.proveedor_id), ''),
         case app.oc_etapa(o) when 'CG' then 'Validar presupuesto' else 'Aprobar orden' end, coalesce(o.cg_fecha, o.fecha_emision)
    from public.ordenes o
   where (app.oc_etapa(o) = 'CG' and app.tengo_rol('CONTROL_GESTION'))
      or (app.oc_etapa(o) = 'GERENCIA' and o.estado_aprobacion = 'Falta Aprobación'
          and ((app.tengo_rol('GOP') and coalesce(o.aprobacion_gop, '') <> 'Aprobado')
            or (app.tengo_rol('GAF') and coalesce(o.aprobacion_gaf, '') <> 'Aprobado' and o.tipo_aprobacion = 'Aprobación Conjunta')))
  union all
  select 'ordenes', o.id, o.numero, case when o.estatus like 'Observado%' then 'Corregir orden observada'
                                         when o.envio_solicitado is null and o.estado_aprobacion = 'Aprobado para Compra' then 'Enviar al proveedor'
                                         else 'Completar legajo' end, coalesce(o.fecha_emision, o.creado)
    from public.ordenes o where o.comprador_id = auth.uid()
     and (o.estatus like 'Observado%' or (o.estado_aprobacion = 'Aprobado para Compra' and o.envio_solicitado is null and o.estatus not in ('Anulada','Anulación solicitada'))
          or o.estatus = 'Legajo incompleto')
  union all
  select 'ordenes', o.id, o.numero, 'Decidir anulación', o.anul_fecha_sol from public.ordenes o
   where o.estatus = 'Anulación solicitada' and app.tengo_rol(case when o.procedencia = 'Importación' then 'JEFE_COMPRAS_I' else 'JEFE_COMPRAS_N' end)
  union all
  select 'pagos', g.id, (select numero from public.ordenes where id = g.orden_id) || ' · cuota ' || g.n_cuota,
         case g.estado_pago when 'Solicitado' then 'Programar pago' else 'Pagar' end, g.creado
    from public.pagos g where app.mi_area() = 'Finanzas' and g.estado_pago in ('Solicitado','Programado')
  union all
  select 'pagos', g.id, (select numero from public.ordenes where id = g.orden_id) || ' · cuota ' || g.n_cuota, 'Subsanar pago observado', g.creado
    from public.pagos g join public.ordenes o on o.id = g.orden_id where g.estado_pago = 'Observado Finanzas' and o.comprador_id = auth.uid()
  union all
  select 'proveedores', p.id, p.razon_social, 'Evaluar proveedor', p.creado from public.proveedores p
   where (app.tengo_rol('FINANZAS') or app.mi_area() = 'Finanzas') and p.evaluacion_fin = 'Pendiente'
     and exists (select 1 from public.ordenes o where o.proveedor_id = p.id and o.estatus not in ('Borrador','Anulada'))
  union all
  select 'proveedores', p.id, p.razon_social, 'Verificar retención', p.creado from public.proveedores p
   where app.tengo_rol('CONTABILIDAD') and p.origen = 'Nacional' and not p.verificado_contab
  union all
  select 'anulaciones', a.id, a.motivo, 'Decidir anulación de requerimiento', a.creado from public.anulaciones a
   where a.estado = 'Pendiente' and auth.uid() = any(coalesce(app.aprobadores_anulacion(a.id), '{}'))
$$;

-- Consulta sin montos para Técnica, Planeamiento, Almacén y solicitantes (C-18).
create or replace function public.seguimiento_items(p_proyecto uuid default null)
returns table (item_id uuid, proyecto text, requerimiento text, rq_sidige text, codigo_cliente text, codigo_sidige text, descripcion text,
               cantidad numeric, saldo numeric, validacion_tecnica text, marca text, modelo text, ordenes text, estado_orden text,
               fecha_meta date, pagado boolean)
language sql stable security definer set search_path = public as $$
  select i.id, p.nombre, r.numero, r.rq_sidige, i.codigo_cliente, i.codigo_sidige, i.descripcion, i.cantidad, public.saldo_item(i.id),
         i.validacion_tecnica, i.marca, i.modelo,
         (select string_agg(distinct o.numero, ', ') from public.oc_lineas l join public.ordenes o on o.id = l.orden_id where l.item_id = i.id and o.estatus <> 'Anulada'),
         (select string_agg(distinct o.estatus, ', ') from public.oc_lineas l join public.ordenes o on o.id = l.orden_id where l.item_id = i.id and o.estatus <> 'Anulada'),
         i.fecha_meta,
         exists (select 1 from public.oc_lineas l join public.ordenes o on o.id = l.orden_id where l.item_id = i.id and o.estatus in ('OC pagada','OC cerrada'))
  from public.requerimiento_items i join public.requerimientos r on r.id = i.requerimiento_id left join public.proyectos p on p.id = r.proyecto_id
  where not i.anulado and (p_proyecto is null or r.proyecto_id = p_proyecto) and auth.uid() is not null
$$;


-- Al registrar un documento: pasarlo a Drive y, si es cotización o factura, leerlo (propuesta que la persona confirma).
create or replace function app.al_registrar_documento() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.storage_path is not null and new.drive_file_id is null then
    perform app.encolar('archivar_doc', 'documentos', new.id);
  end if;
  if new.tipo_doc in ('Cotización','Factura') and coalesce(new.lectura_estado, 'Pendiente') = 'Pendiente' and new.storage_path is not null then
    perform app.encolar('leer_documento', 'documentos', new.id);
  end if;
  return new;
end $$;
create trigger al_registrar_documento after insert on public.documentos for each row execute function app.al_registrar_documento();

-- La persona confirma (y corrige) lo que leyó el lector. Si trae RUC y la orden aún no tiene proveedor, propone el proveedor.
create or replace function public.ac_documento_confirmar_lectura(p_id uuid, p_numero text, p_fecha date, p_monto numeric, p_moneda text, p_ruc text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare yo uuid := app.exigir_usuario(); d public.documentos; prov uuid;
begin
  select * into d from public.documentos where id = p_id for update;
  perform app.exigir(case when d.id is null then 'No existe el documento.'
                          when not (app.es_compras() or app.mi_area() in ('Finanzas','Contabilidad')) then 'Lo confirma Compras, Importaciones, Finanzas o Contabilidad.'
                          when p_ruc is not null and not public.ruc_valido(p_ruc) then 'El RUC no es válido.' end);
  update public.documentos set numero = p_numero, fecha_doc = p_fecha, monto_doc = p_monto, moneda = p_moneda, ruc_emisor = p_ruc,
         lectura_estado = 'Confirmado' where id = p_id;
  select id into prov from public.proveedores where ruc = p_ruc;
  if prov is not null and d.orden_id is not null then
    update public.ordenes set proveedor_id = prov where id = d.orden_id and proveedor_id is null and estatus = 'Borrador';
  end if;
  perform app.log('documentos', p_id, 'confirmar_lectura', 'Leído', 'Confirmado');
  return jsonb_build_object('ok', true, 'proveedor_id', prov);
end $$;

-- Notificaciones: solo se puede cambiar «leida».
create trigger proteger before update on public.notificaciones for each row execute function app.proteger('leida');

-- Permisos de ejecución: todas las ac_* y las consultas para authenticated; inropay_actualizar solo para el servidor.
do $$ declare f record; begin
  for f in select p.oid::regprocedure as sig, p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and (p.proname like 'ac\_%' or p.proname in ('acciones_disponibles','te_toca','seguimiento_items','saldo_item','ruc_valido')) loop
    execute format('revoke all on function %s from public', f.sig);
    execute format('grant execute on function %s to authenticated', f.sig);
  end loop;
end $$;
revoke all on function public.inropay_actualizar(uuid, text, date, text, text) from public;
