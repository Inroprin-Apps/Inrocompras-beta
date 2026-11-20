-- INROCOMPRAS · 0006 · Correcciones por lógica de tres valores (NULL)
-- En SQL, una comparación con NULL no da «falso» sino NULL; un CASE no entra en una rama cuya condición es NULL,
-- y las funciones app.p_* devuelven NULL cuando «se puede». Así, un NULL en el dato terminaba en «permitido».
-- Cada corrección dice qué pasaba. Los mensajes al usuario no cambian.

-- Corrección: si la lista de aprobadores de una etapa traía un NULL (aprobador sin elegir), «auth.uid() = any(...)»
-- daba NULL para quien no estaba en la lista, el NOT(...) también, y la regla no lo descartaba: CUALQUIER persona activa
-- podía liberar o rechazar la solicitud (y decidir la anulación de su requerimiento). Además, una etapa con solo
-- {NULL} contaba como «con aprobadores» al emitir. Se limpian los NULL de la lista y la comparación se vuelve falsa.
create or replace function app.aprobadores_solicitud(p_id uuid) returns uuid[] language sql stable security definer set search_path = public as $$
  -- [_Aprobadores] = IFS(AND(Tipo="Proyecto", ISNOTBLANK(Etapa_Ref)), Etapa_Ref.Aprobadores, TRUE, LIST(Jefe_Email))
  select case when s.tipo = 'Proyecto' and s.etapa_id is not null
              then array_remove((select aprobadores from public.proyecto_etapas where id = s.etapa_id), null)
              else array_remove(array[s.jefe_id], null) end
  from public.solicitudes s where s.id = p_id
$$;

create or replace function app.p_solicitud_liberar(p_id uuid) returns text language sql stable security definer set search_path = public as $$
  select case
    when s.estado <> 'Pendiente Liberación' then 'La solicitud no está pendiente de liberación.'
    when not coalesce(auth.uid() = any(app.aprobadores_solicitud(s.id)), false) then 'No eres aprobador de esta solicitud.'
  end from public.solicitudes s where s.id = p_id                                   -- IN(USEREMAIL(), [_Aprobadores])
$$;

create or replace function app.p_anulacion_decidir(p_id uuid) returns text language sql stable security definer set search_path = public as $$
  select case when a.estado <> 'Pendiente' then 'La anulación ya fue decidida.'
              when not coalesce(auth.uid() = any(app.aprobadores_anulacion(a.id)), false) then 'No eres aprobador de esta anulación.' end
  from public.anulaciones a where a.id = p_id
$$;

-- Corrección: en un requerimiento sin solicitud (solicitud_id NULL, p. ej. migrado del AppSheet), «yo = (select solicitante…)»
-- daba NULL, el OR quedaba en NULL y el NOT(...) no descartaba a nadie: cualquier persona activa podía pedir su anulación,
-- y esa anulación pendiente bloquea la emisión del requerimiento.
create or replace function public.ac_anulacion_solicitar(p_req uuid, p_item uuid, p_causa text, p_motivo text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare yo uuid := app.exigir_usuario(); n uuid; r public.requerimientos;
begin
  select * into r from public.requerimientos where id = p_req;
  perform app.exigir(case
    when r.id is null then 'No existe el requerimiento.'
    when r.estado = 'Anulado' then 'Ya está anulado.'
    when not (coalesce(app.mi_area() = r.area_emisora, false) or coalesce(app.es_compras(), false)
              or coalesce(yo = (select solicitante_id from public.solicitudes where id = r.solicitud_id), false))
      then 'La pide el área emisora, Compras o quien hizo la solicitud.'
    when coalesce(trim(p_motivo), '') = '' then 'Escribe el motivo.'
    when exists (select 1 from public.anulaciones where requerimiento_id = p_req and coalesce(item_id::text,'') = coalesce(p_item::text,'') and estado = 'Pendiente')
      then 'Ya hay una anulación pendiente.' end);
  insert into public.anulaciones (requerimiento_id, item_id, causa, motivo, solicitado_por) values (p_req, p_item, p_causa, p_motivo, yo) returning id into n;
  perform app.log('anulaciones', n, 'solicitar', null, 'Pendiente', p_motivo);
  perform app.notificar(app.aprobadores_anulacion(n), 'Anulación por aprobar: ' || coalesce(r.numero, 'requerimiento'), p_motivo, 'anulaciones', n);
  return jsonb_build_object('ok', true, 'id', n);
end $$;

-- Corrección: con proveedor_id NULL, «(select evaluacion_fin …) <> 'Aprobado'» daba NULL y no frenaba el envío: Compras podía
-- vaciar el proveedor mientras la orden aún no tenía firmas (es editable) y, ya aprobada, enviarla sin la evaluación de Finanzas.
create or replace function app.p_oc_enviar(p_id uuid) returns text language sql stable security definer set search_path = public as $$
  -- [Enviar al proveedor] = AND(aprobada, área Compras/Importaciones, Estatus NOT IN(Anulada, Anulación solicitada))
  select case when not app.es_compras() then 'La envía Compras o Importaciones.'
              when o.estado_aprobacion is distinct from 'Aprobado para Compra' then 'La orden aún no está aprobada.'
              when o.estatus in ('Anulada','Anulación solicitada','En modificación') then 'La orden no se puede enviar en este estado.'
              when o.proveedor_id is null then 'Elige el proveedor.'
              when (app.cfg('exigir_evaluacion_fin', 'true'))::text::boolean
                   and coalesce((select evaluacion_fin from public.proveedores where id = o.proveedor_id), '') <> 'Aprobado'
                then 'Finanzas aún no evalúa al proveedor.' end                                   -- adición (18/11)
  from public.ordenes o where o.id = p_id
$$;

-- Corrección: «Te toca» y el seguimiento de ítems no miraban si la persona sigue activa. Una persona desactivada seguía viendo
-- sus órdenes, pagos observados y solicitudes por liberar (comparan con auth.uid(), que no es NULL aunque esté inactiva).
-- Igual que con acciones_disponibles en 0005: la consulta original pasa a app.* y la pública solo responde a usuarios activos.
alter function public.te_toca() set schema app;
alter function app.te_toca() rename to te_toca_base;
revoke all on function app.te_toca_base() from public, authenticated;

create or replace function public.te_toca() returns table (tabla text, id uuid, titulo text, paso text, desde timestamptz)
language sql stable security definer set search_path = public as $$
  select * from app.te_toca_base() where exists (select 1 from public.usuarios where id = auth.uid() and activo)
$$;
revoke all on function public.te_toca() from public;
grant execute on function public.te_toca() to authenticated;

alter function public.seguimiento_items(uuid) set schema app;
alter function app.seguimiento_items(uuid) rename to seguimiento_items_base;
revoke all on function app.seguimiento_items_base(uuid) from public, authenticated;

create or replace function public.seguimiento_items(p_proyecto uuid default null)
returns table (item_id uuid, proyecto text, requerimiento text, rq_sidige text, codigo_cliente text, codigo_sidige text, descripcion text,
               cantidad numeric, saldo numeric, validacion_tecnica text, marca text, modelo text, ordenes text, estado_orden text,
               fecha_meta date, pagado boolean)
language sql stable security definer set search_path = public as $$
  select * from app.seguimiento_items_base(p_proyecto) where exists (select 1 from public.usuarios where id = auth.uid() and activo)
$$;
revoke all on function public.seguimiento_items(uuid) from public;
grant execute on function public.seguimiento_items(uuid) to authenticated;
