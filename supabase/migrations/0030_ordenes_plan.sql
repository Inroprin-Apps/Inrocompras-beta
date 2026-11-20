-- INROCOMPRAS · 0030 · Órdenes y plan de compras (Hito 3)
--
-- 1) ac_oc_recalcular: tras editar la cabecera (moneda, impuesto…) o las líneas de una orden editable con un UPDATE
--    directo (lo que permiten app.proteger y RLS «editar»), los montos y la ruta de aprobación quedaban como antes.
--    Esta acción los vuelve a calcular con app.oc_recalcular (la misma que usan crear, emitir y modificar).
-- 2) plan_compras(proyecto): las líneas del plan (requerimiento_items) con su saldo, su validación técnica y sus
--    órdenes, SIN montos (Planeamiento también lo ve). Es una función y no una vista con security_invoker porque
--    quien no ve precios no lee la tabla ordenes (RLS) y aun así debe ver el número y el estado de la OC
--    (igual que seguimiento_items). El presupuesto unitario solo viaja a quien ve precios.
--    Las fechas límite, el semáforo y la criticidad se calculan en la pantalla (src/modules/plan/domain), no se guardan.

-- ───────────────────────── Recalcular una orden editable ─────────────────────────
create or replace function app.p_oc_recalcular(p_id uuid) returns text language sql stable security definer set search_path = public as $$
  select case
    when o.id is null then 'No existe la orden.'
    when not app.es_compras() then 'La orden la edita Compras o Importaciones.'
    when not app.oc_editable(o.estatus, o.cg_por, o.gop_por, o.gaf_por) then 'La orden no se puede editar en este estado.'
  end from (select 1) x left join public.ordenes o on o.id = p_id
$$;

create or replace function public.ac_oc_recalcular(p_id uuid) returns jsonb language plpgsql security definer set search_path = public as $$
declare yo uuid := app.exigir_usuario(); o public.ordenes;
begin
  perform app.exigir(app.p_oc_recalcular(p_id));
  perform 1 from public.ordenes where id = p_id for update;
  perform app.oc_recalcular(p_id);
  select * into o from public.ordenes where id = p_id;
  return jsonb_build_object('ok', true, 'subtotal', o.subtotal, 'igv', o.igv, 'monto', o.monto, 'monto_soles', o.monto_soles,
                            'tipo_aprobacion', o.tipo_aprobacion);
end $$;

-- ───────────────────────── Plan de compras ─────────────────────────
-- p_proyecto null y p_sin_proyecto false: todo. p_sin_proyecto true: solo lo que no tiene proyecto (compras administrativas).
create or replace function public.plan_compras(p_proyecto uuid default null, p_sin_proyecto boolean default false)
returns table (item_id uuid, requerimiento_id uuid, requerimiento text, rq_sidige text, req_estado text, proyecto_id uuid,
               n_item int, tipo text, codigo_cliente text, codigo_sidige text, descripcion text, unidad text, cantidad numeric,
               saldo numeric, canal text, plazo_entrega_dias int, fecha_meta date, incluido_en uuid, anulado boolean,
               validacion_tecnica text, marca text, modelo text, presupuesto_unit numeric, moneda_ppto text,
               ordenes jsonb, pagado boolean)
language sql stable security definer set search_path = public as $$
  select i.id, r.id, r.numero, r.rq_sidige, r.estado, r.proyecto_id, i.n_item, i.tipo, i.codigo_cliente, i.codigo_sidige,
         i.descripcion, i.unidad, i.cantidad, public.saldo_item(i.id),
         coalesce(i.canal, case r.tipo_compra when 'Importación' then 'Importación' when 'Nacional' then 'Nacional' end),
         i.plazo_entrega_dias, coalesce(i.fecha_meta, p.fecha_meta), i.incluido_en, i.anulado,
         i.validacion_tecnica, i.marca, i.modelo,
         case when app.ve_precios() then i.presupuesto_unit end, case when app.ve_precios() then i.moneda_ppto end,
         coalesce((select jsonb_agg(jsonb_build_object('id', o.id, 'numero', o.numero, 'estatus', o.estatus) order by o.creado)
                     from public.ordenes o
                    where o.estatus not in ('Anulada','Rechazada')
                      and exists (select 1 from public.oc_lineas l where l.orden_id = o.id and l.item_id = i.id)), '[]'::jsonb),
         exists (select 1 from public.oc_lineas l join public.ordenes o on o.id = l.orden_id
                  where l.item_id = i.id and o.estatus in ('OC pagada','OC cerrada'))
    from public.requerimiento_items i
    join public.requerimientos r on r.id = i.requerimiento_id
    left join public.proyectos p on p.id = r.proyecto_id
   where exists (select 1 from public.usuarios where id = auth.uid() and activo)
     and r.estado <> 'Anulado'
     and (case when p_proyecto is not null then r.proyecto_id = p_proyecto
               when p_sin_proyecto then r.proyecto_id is null
               else true end)
$$;

revoke all on function app.p_oc_recalcular(uuid) from public, anon;
grant execute on function app.p_oc_recalcular(uuid) to authenticated;
revoke all on function public.ac_oc_recalcular(uuid) from public, anon;
grant execute on function public.ac_oc_recalcular(uuid) to authenticated;
revoke all on function public.plan_compras(uuid, boolean) from public, anon;
grant execute on function public.plan_compras(uuid, boolean) to authenticated;
