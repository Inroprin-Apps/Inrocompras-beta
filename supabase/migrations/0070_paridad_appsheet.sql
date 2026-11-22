-- 0070 · Lo que hacían bots del AppSheet y aquí faltaba (docs/12_PARIDAD_APPSHEET.md).
--   1. «Aviso - Solicitud cancelada»: al cancelar, avisa al solicitante y a quien la libera o la liberó.
--   2. «Chat Liberada», «Chat - Pago registrado»: cada cambio de estado deja historial; los que estén en
--      config.chat_avisos se encolan como trabajo 'chat' y la cola los publica en el espacio de Google Chat
--      (las URL de los webhooks viven solo en el servidor: GOOGLE_CHAT_WEBHOOKS).
--   3. «OC - Estado al aprobar», paso «correo envio»: al aprobar, si la OC no tiene correo de envío, toma el del
--      proveedor (antes solo se copiaba al crear la OC).
--   4. «Recordatorio - Facturas» (programado): cuotas pagadas sin factura → aviso al comprador, cada N días. Corre
--      una vez al día desde la cola (public.correr_diarios, solo el servidor), sin cron aparte.

-- ───────────────────────── 1. Solicitud cancelada ─────────────────────────
create or replace function public.ac_solicitud_cancelar(p_id uuid, p_motivo text) returns jsonb language plpgsql security definer set search_path = public as $$
declare yo uuid := app.exigir_usuario(); s public.solicitudes;
begin
  perform app.exigir(app.p_solicitud_cancelar(p_id));
  select * into s from public.solicitudes where id = p_id for update;
  update public.solicitudes set estado = 'Cancelada', motivo_cancelacion = p_motivo where id = p_id;
  perform app.log('solicitudes', p_id, 'cancelar', s.estado, 'Cancelada', p_motivo);
  -- [Aviso - Solicitud cancelada]: al solicitante (si no fue él) y, si ya estaba en manos de quien libera, a ellos.
  perform app.notificar(
    array[s.solicitante_id] || case when s.estado in ('Pendiente Liberación', 'Liberada') then coalesce(app.aprobadores_solicitud(p_id), '{}') else '{}' end,
    'Solicitud cancelada: ' || coalesce(s.numero, 'borrador'), p_motivo, 'solicitudes', p_id);
  return jsonb_build_object('ok', true);
end $$;

-- ───────────────────────── 2. Avisos a Google Chat ─────────────────────────
alter table public.cola_trabajos drop constraint if exists cola_trabajos_tipo_check;
alter table public.cola_trabajos add constraint cola_trabajos_tipo_check check (tipo in ('crear_carpeta','archivar_doc','pdf_oc',
  'enviar_correo','leer_documento','notificar','inropay_solicitar','sidige_escribir','chat'));

insert into public.config (clave, valor, nota) values
  ('chat_avisos', '{"solicitudes.liberar": "compras", "pagos.pagado": "compras"}',
   'Qué cambios de estado (tabla.accion del historial) se publican en Google Chat y en qué espacio. Las URL de cada espacio van en GOOGLE_CHAT_WEBHOOKS, en el servidor.')
on conflict (clave) do nothing;

-- El nombre corto de un registro para un aviso: «SOL-2026-0012», «OC-2026-0142 cuota 2».
create or replace function app.nombre_registro(p_tabla text, p_id uuid) returns text language sql stable security definer set search_path = public as $$
  select case p_tabla
    when 'solicitudes'    then (select coalesce(numero, 'Solicitud en borrador') from public.solicitudes where id = p_id)
    when 'requerimientos' then (select coalesce(numero, 'Requerimiento en proceso') from public.requerimientos where id = p_id)
    when 'ordenes'        then (select coalesce(numero, 'OC en borrador') from public.ordenes where id = p_id)
    when 'pagos'          then (select coalesce(o.numero, 'OC') || ' cuota ' || case when g.n_cuota = floor(g.n_cuota) then floor(g.n_cuota)::int::text else g.n_cuota::text end
                                  from public.pagos g join public.ordenes o on o.id = g.orden_id where g.id = p_id)
    when 'desaduanajes'   then (select coalesce(numero, 'Desaduanaje') from public.desaduanajes where id = p_id)
    when 'proveedores'    then (select razon_social from public.proveedores where id = p_id)
  end
$$;

create or replace function app.historial_a_chat() returns trigger language plpgsql security definer set search_path = public as $$
declare espacio text; quien text; nombre text; etiqueta text;
begin
  select valor ->> (new.tabla || '.' || new.accion) into espacio from public.config where clave = 'chat_avisos';
  if coalesce(espacio, '') = '' then return new; end if;
  select u.nombre into quien from public.usuarios u where u.id = new.usuario_id;
  nombre := app.nombre_registro(new.tabla, new.registro_id);
  etiqueta := case new.tabla when 'solicitudes' then 'Solicitud' when 'requerimientos' then 'Requerimiento' when 'ordenes' then 'Orden'
                when 'pagos' then 'Pago' when 'desaduanajes' then 'Desaduanaje' when 'proveedores' then 'Proveedor' else initcap(new.tabla) end;
  perform app.encolar('chat', new.tabla, new.registro_id, jsonb_build_object(
    'espacio', espacio,
    'texto', etiqueta || ' ' || coalesce(nombre, '') || ': ' || coalesce(new.a, new.accion)
             || coalesce(' · ' || quien, '')
             || coalesce(E'\n«' || nullif(trim(new.motivo), '') || '»', '')));
  return new;
end $$;

drop trigger if exists historial_a_chat on public.historial;
create trigger historial_a_chat after insert on public.historial for each row execute function app.historial_a_chat();

-- ───────────────────────── 3. Correo de envío al aprobar ─────────────────────────
create or replace function app.oc_correo_al_aprobar() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.estado_aprobacion = 'Aprobado para Compra' and old.estado_aprobacion is distinct from 'Aprobado para Compra'
     and coalesce(trim(new.correo_envio), '') = '' then
    new.correo_envio := (select nullif(trim(p.correo), '') from public.proveedores p where p.id = new.proveedor_id);
  end if;
  return new;
end $$;

drop trigger if exists oc_correo_al_aprobar on public.ordenes;
create trigger oc_correo_al_aprobar before update of estado_aprobacion on public.ordenes
  for each row execute function app.oc_correo_al_aprobar();

-- ───────────────────────── 4. Recordatorio de facturas ─────────────────────────
insert into public.config (clave, valor, nota) values
  ('recordatorio_facturas_dias', '3', 'Cada cuántos días se le recuerda al comprador una cuota pagada sin factura.')
on conflict (clave) do nothing;

-- [Recordatorio - Facturas] + [_Alerta_Factura]: por cada OC con cuotas pagadas sin factura, un aviso al comprador
-- (no más de uno cada N días por OC). Devuelve cuántos avisos dejó.
create or replace function app.recordatorio_facturas() returns int language plpgsql security definer set search_path = public as $$
declare cada int := coalesce((app.cfg('recordatorio_facturas_dias', '3'))::text::int, 3); r record; n int := 0;
begin
  for r in
    select o.id, o.numero, o.comprador_id, count(*)::int cuotas, o.fecha_limite_factura
      from public.ordenes o join public.pagos g on g.orden_id = o.id
     where g.estado_pago = 'Pagado' and g.factura_id is null
       and o.estatus not in ('Anulada', 'Anulación solicitada', 'OC cerrada')
       and o.comprador_id is not null
     group by o.id
  loop
    continue when exists (select 1 from public.notificaciones x
                           where x.ref_tabla = 'ordenes' and x.ref_id = r.id and x.titulo like 'Falta la factura%'
                             and x.creado > now() - make_interval(days => cada));
    perform app.notificar(array[r.comprador_id], 'Falta la factura de ' || coalesce(r.numero, 'una orden'),
      r.cuotas || case when r.cuotas = 1 then ' cuota pagada' else ' cuotas pagadas' end || ' sin factura. Súbela en el legajo de la orden'
        || case when r.fecha_limite_factura is not null then ' antes del ' || to_char(r.fecha_limite_factura, 'DD/MM/YYYY') else '' end || '.',
      'ordenes', r.id);
    n := n + 1;
  end loop;
  return n;
end $$;

-- Lo que corre una vez al día (hoy, el recordatorio). Lo llama la cola en cada corrida; solo actúa la primera del día
-- (hora de Lima). Solo el servidor (service_role) la ejecuta.
create or replace function public.correr_diarios() returns jsonb language plpgsql security definer set search_path = public as $$
declare hoy text := to_char((now() at time zone 'America/Lima')::date, 'YYYY-MM-DD'); ultima text; n int;
begin
  select valor #>> '{}' into ultima from public.config where clave = 'diarios_ultima_corrida' for update;
  if ultima = hoy then return jsonb_build_object('ok', true, 'ya_corrio', hoy); end if;
  n := app.recordatorio_facturas();
  insert into public.config (clave, valor, nota) values ('diarios_ultima_corrida', to_jsonb(hoy), 'La lleva public.correr_diarios.')
  on conflict (clave) do update set valor = excluded.valor;
  return jsonb_build_object('ok', true, 'dia', hoy, 'recordatorios_factura', n);
end $$;

revoke execute on function public.correr_diarios() from public, anon, authenticated;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    execute 'grant execute on function public.correr_diarios() to service_role';
  end if;
end $$;
