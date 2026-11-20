-- INROCOMPRAS · 0060 · Huecos que encontró la construcción del Hito 1

-- 1) carga_items no tenía app.proteger: el solicitante podía pasar una fila de 'Error' a 'Procesado' con un UPDATE
--    directo (o insertarla ya «procesada») y saltarse la validación de ac_carga_procesar. Ahora solo edita los datos
--    de la fila; el estado lo cambian las funciones.
create trigger proteger before update on public.carga_items for each row execute function app.proteger('datos', 'n_fila');

create or replace function app.carga_nueva() returns trigger language plpgsql as $$
begin
  if current_user in ('authenticated', 'anon') then
    new.estado_fila := 'Revision';
    new.errores := '{}';
  end if;
  return new;
end $$;
create trigger carga_nueva before insert on public.carga_items for each row execute function app.carga_nueva();

-- 2) El historial de solicitudes, requerimientos, ítems, anulaciones y proyectos no tiene montos y esas tablas las ve
--    todo el mundo: Planeamiento, Técnica y los gerentes solo veían sus propias entradas. Ahora las ven todas.
create policy sin_montos on public.historial for select to authenticated
  using (tabla in ('solicitudes', 'requerimientos', 'requerimiento_items', 'anulaciones', 'proyectos') and app.exigir_usuario() is not null);

-- 3) ac_item_sku no revisaba que el ítem existiera ni que estuviera vivo, y dejaba historial igual.
create or replace function public.ac_item_sku(p_item uuid, p_codigo text) returns jsonb language plpgsql security definer set search_path = public as $$
declare yo uuid := app.exigir_usuario(); i public.requerimiento_items;
begin
  perform app.exigir(case when not (coalesce(app.mi_area() in ('Planeamiento','Compras','Importaciones'), false) or app.es_admin()) then 'Lo asigna Planeamiento o Compras.' end);
  select * into i from public.requerimiento_items where id = p_item for update;
  perform app.exigir(case when i.id is null then 'No existe el ítem.' when i.anulado then 'El ítem está anulado.' end);
  update public.requerimiento_items set codigo_sidige = nullif(upper(trim(p_codigo)), '') where id = p_item;
  perform app.log('requerimiento_items', p_item, 'sku', i.codigo_sidige, nullif(upper(trim(p_codigo)), ''));
  return jsonb_build_object('ok', true);
end $$;
revoke all on function public.ac_item_sku(uuid, text) from public, anon;
grant execute on function public.ac_item_sku(uuid, text) to authenticated;
