-- 0070 · Lo que hacían bots del AppSheet y aquí faltaba (docs/12_PARIDAD_APPSHEET.md).
--   1. «Aviso - Solicitud cancelada»: al cancelar, avisa al solicitante y a quien la libera o la liberó.
--   2. «Chat Liberada», «Chat - Pago registrado»: cada cambio de estado deja historial; los que estén en
--      config.chat_avisos se encolan como trabajo 'chat' y la cola los publica en el espacio de Google Chat
--      (las URL de los webhooks viven solo en el servidor: GOOGLE_CHAT_WEBHOOKS).
--   3. «OC - Estado al aprobar», paso «correo envio»: al aprobar, si la OC no tiene correo de envío, toma el del
--      proveedor (antes solo se copiaba al crear la OC).
--   4. «Recordatorio - Facturas» (programado, 8:00 de Lima): cuotas pagadas sin factura → aviso al comprador cada N días
--      y un resumen del día al espacio de Chat. Corre una vez al día desde la cola (public.correr_diarios).
--   5. «Pago - Factura subida»: una factura por el TOTAL de la OC cubre todas sus cuotas (antes solo se vinculaba la
--      cuota con el mismo monto, y una factura por el total dejaba cuotas «sin factura»).
--   6. «Generar Requerimiento»: el área que emite sale de la solicitud (Administración si es administrativa, Logística
--      si la etapa es de transporte, si no el parámetro area_emisora_rq), y si esa área no tiene a nadie activo, va al
--      parámetro: un requerimiento nunca queda sin quién lo emita.

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
  ('chat_avisos', '{"solicitudes.liberar": "compras", "pagos.solicitar": "finanzas", "recordatorio.facturas": "compras"}',
   'Qué se publica en Google Chat y en qué espacio: cambios de estado (tabla.accion del historial) y «recordatorio.facturas» (resumen diario). Las URL de cada espacio van en GOOGLE_CHAT_WEBHOOKS, en el servidor.')
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
        espacio text := (select valor ->> 'recordatorio.facturas' from public.config where clave = 'chat_avisos');
        lista text; total int;
begin
  -- El resumen del día para el espacio de Chat (el bot del AppSheet: «Enviar digest a Chat», todos los días a las 8:00).
  if coalesce(espacio, '') <> '' then
    select count(*)::int, string_agg('• ' || x.linea, E'\n' order by x.numero) into total, lista
      from (select o.numero, coalesce(o.numero, 'OC') || ' · ' || coalesce(p.razon_social, 'proveedor') || ' · ' || count(*) ||
                   case when count(*) = 1 then ' cuota' else ' cuotas' end || coalesce(' · ' || u.nombre, '') linea
              from public.ordenes o join public.pagos g on g.orden_id = o.id
              left join public.proveedores p on p.id = o.proveedor_id left join public.usuarios u on u.id = o.comprador_id
             where g.estado_pago = 'Pagado' and g.factura_id is null and o.estatus not in ('Anulada', 'Anulación solicitada', 'OC cerrada')
             group by o.id, p.razon_social, u.nombre) x;
    if total > 0 then
      perform app.encolar('chat', 'ordenes', null, jsonb_build_object('espacio', espacio,
        'texto', 'Facturas pendientes: ' || total || case when total = 1 then ' orden con cuotas pagadas sin factura' else ' órdenes con cuotas pagadas sin factura' end
                 || E'\n' || lista));
    end if;
  end if;
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

-- ───────────────────────── 5. Factura por el total de la OC ─────────────────────────
-- [_Facturas_Libres] + [_Vincular_Factura]: la factura que respalda una cuota es (a) una de la OC, no usada por otra
-- cuota, con el monto de la cuota (±1), o (b) una por el total de la OC (±1), que cubre todas sus cuotas.
create or replace function app.factura_libre(p_pago uuid) returns uuid language sql stable security definer set search_path = public as $$
  select d.id from public.pagos g join public.ordenes o on o.id = g.orden_id
    join public.documentos d on d.orden_id = g.orden_id and d.tipo_doc = 'Factura' and d.estado <> 'Reemplazado'
  where g.id = p_pago and d.monto_doc is not null
    and ((abs(d.monto_doc - g.monto_pago) < 1
          and not exists (select 1 from public.pagos x where x.factura_id = d.id and x.estado_pago <> 'Anulado' and x.id <> g.id))
         or (o.monto > 0 and abs(d.monto_doc - o.monto) < 1))
  order by (abs(d.monto_doc - g.monto_pago) < 1) desc, d.creado limit 1
$$;

-- Al subir una factura con monto: (1) la cuota en Plan con ese monto se solicita sola; (2) si no, la cuota ya
-- solicitada, programada o pagada sin factura con ese monto la toma; (3) si es por el total de la OC, la toman todas
-- las cuotas sin factura ya solicitadas, programadas o pagadas, y el adelanto que siga en Plan se solicita (como el
-- bot «Pago - Factura subida», que solicita las cuotas con hito «A la aprobación»). Las demás cuotas en Plan no se
-- solicitan solas: al pedirlas, encuentran esta factura (factura_libre, caso b) y no piden sustento.
create or replace function app.al_subir_factura() returns trigger language plpgsql security definer set search_path = public as $$
declare g uuid; o public.ordenes; total boolean; vigente boolean;
begin
  if new.tipo_doc = 'Factura' and new.orden_id is not null and new.monto_doc is not null and new.estado <> 'Reemplazado' then
    select * into o from public.ordenes where id = new.orden_id;
    total := o.monto > 0 and abs(new.monto_doc - o.monto) < 1;
    vigente := o.estado_aprobacion = 'Aprobado para Compra' and o.estatus not in ('Anulada','Anulación solicitada','En modificación','Observado por Finanzas');
    select p.id into g from public.pagos p
     where vigente and p.orden_id = new.orden_id and p.estado_pago = 'Plan' and abs(p.monto_pago - new.monto_doc) < 1
     order by p.n_cuota limit 1;
    if g is not null then
      perform app.solicitar_pago(g, null, 'Solicitado automáticamente al subir factura');
    elsif not total then
      update public.pagos set factura_id = new.id, fecha_factura = new.fecha_doc
       where id = (select id from public.pagos where orden_id = new.orden_id and estado_pago in ('Solicitado','Programado','Pagado')
                   and factura_id is null and abs(monto_pago - new.monto_doc) < 1 order by n_cuota limit 1);
    end if;
    if total then
      update public.pagos set factura_id = new.id, fecha_factura = coalesce(fecha_factura, new.fecha_doc)
       where orden_id = new.orden_id and estado_pago in ('Solicitado','Programado','Pagado') and factura_id is null;
      for g in select id from public.pagos where vigente and orden_id = new.orden_id and estado_pago = 'Plan' and hito = 'A la aprobación' order by n_cuota loop
        perform app.solicitar_pago(g, null, 'Solicitado automáticamente al subir la factura por el total');
      end loop;
    end if;
  end if;
  return new;
end $$;

-- ───────────────────────── 6. Área que emite el requerimiento ─────────────────────────
alter table public.usuarios drop constraint if exists usuarios_area_check;
alter table public.usuarios add constraint usuarios_area_check check (area in (
  'Compras','Importaciones','Finanzas','Contabilidad','Control de Gestión','Gerencia','Planeamiento','Comercial','Técnica',
  'Costos','Proyectos','Administración','Almacén','Logística','Sin área'));

-- [Generar Requerimiento › AVISO AREA]: Administración si la solicitud es administrativa, Logística si la etapa es de
-- transporte, si no el parámetro (Planeamiento). Si esa área no tiene a nadie activo, el parámetro.
create or replace function app.area_emisora_de(p_sol uuid) returns text language plpgsql stable security definer set search_path = public as $$
declare defecto text := coalesce(app.cfg('area_emisora_rq', '"Planeamiento"') #>> '{}', 'Planeamiento'); s public.solicitudes; etapa text; area text;
begin
  select * into s from public.solicitudes where id = p_sol;
  select nombre into etapa from public.proyecto_etapas where id = s.etapa_id;
  area := case when s.tipo = 'Administrativa' then 'Administración'
               when etapa ilike '%transporte%' then 'Logística'
               else defecto end;
  if cardinality(app.usuarios_de_area(area)) = 0 then area := defecto; end if;
  return area;
end $$;

create or replace function app.crear_requerimiento(p_sol uuid) returns uuid language plpgsql security definer set search_path = public as $$
declare s public.solicitudes; r uuid; area text := app.area_emisora_de(p_sol);
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
