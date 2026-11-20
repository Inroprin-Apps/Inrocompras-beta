-- INROCOMPRAS · 0062 · «Te toca» también muestra los desaduanajes por avanzar (Compras / Importaciones).
-- Antes no aparecían en la bandeja: había que entrar a Desaduanaje para ver qué faltaba.
create or replace function public.te_toca() returns table (tabla text, id uuid, titulo text, paso text, desde timestamptz)
language sql stable security definer set search_path = public as $$
  select * from app.te_toca_base() where exists (select 1 from public.usuarios where id = auth.uid() and activo)
  union all
  select 'desaduanajes', d.id, coalesce(d.numero, 'Desaduanaje') || ' · ' || coalesce(o.numero, ''),
         case d.estado when 'Borrador' then 'Completar documentos de importación' when 'En almacén' then 'Cerrar costeo'
                       else 'Avanzar desaduanaje' end,
         coalesce(d.fecha_almacen::timestamptz, d.fecha_levante::timestamptz, d.fecha_llegada::timestamptz, d.fecha_numeracion::timestamptz, d.creado)
    from public.desaduanajes d join public.ordenes o on o.id = d.orden_duena_id
   where coalesce(app.es_compras(), false) and d.estado <> 'Costeo cerrado'
     and (app.mi_area() = 'Importaciones' or o.comprador_id = auth.uid() or d.creado_por = auth.uid())
     and exists (select 1 from public.usuarios where id = auth.uid() and activo)
$$;
revoke all on function public.te_toca() from public, anon;
grant execute on function public.te_toca() to authenticated;
