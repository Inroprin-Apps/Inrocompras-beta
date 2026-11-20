-- INROCOMPRAS · 0023 · InroPay: el webhook solo mueve pagos que existen y por pasos válidos (Hito 2)
-- Prueba: supabase/tests/proveedores_cola.test.mjs (sección 8)
--
-- inropay_actualizar (0003) lo llama el servidor con el aviso firmado de InroPay. Huecos:
--   * con un pago_id que no existe respondía «ok» y dejaba una fila de historial huérfana;
--   * aceptaba cualquier salto: un pago en «Plan» (aún no solicitado) o «Anulado» pasaba a «Pagado».
-- Ahora: el pago debe existir y estar Solicitado, Programado u Observado Finanzas (o ya en el mismo estado: el aviso
-- repetido no cambia nada y responde ok). Pagado es final. La fila se bloquea antes de cambiarla.
create or replace function public.inropay_actualizar(p_pago uuid, p_estado text, p_fecha date default null, p_n_operacion text default null, p_ref text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare g public.pagos;
begin
  if p_estado is null or p_estado not in ('Programado','Pagado','Observado Finanzas') then
    raise exception 'Estado no válido: debe ser Programado, Pagado u Observado Finanzas.' using errcode = 'P0001';
  end if;
  select * into g from public.pagos where id = p_pago for update;
  if g.id is null then raise exception 'No existe el pago %.', p_pago using errcode = 'P0001'; end if;
  if g.estado_pago = p_estado then
    return jsonb_build_object('ok', true, 'sin_cambio', true);
  end if;
  if g.estado_pago not in ('Solicitado','Programado','Observado Finanzas') then
    raise exception 'El pago está «%»: InroPay no lo puede pasar a «%».', g.estado_pago, p_estado using errcode = 'P0001';
  end if;
  update public.pagos set estado_pago = p_estado, inropay_ref = coalesce(p_ref, inropay_ref),
         fecha_programada = case when p_estado = 'Programado' then coalesce(p_fecha, current_date) else fecha_programada end,
         fecha_pago = case when p_estado = 'Pagado' then coalesce(p_fecha, current_date) else fecha_pago end,
         n_operacion = coalesce(p_n_operacion, n_operacion)
   where id = p_pago returning * into g;
  perform app.oc_sync_estatus(g.orden_id);
  insert into public.historial (tabla, registro_id, accion, de, a, datos)
  values ('pagos', p_pago, 'inropay', null, p_estado, jsonb_build_object('ref', p_ref, 'n_operacion', p_n_operacion));
  return jsonb_build_object('ok', true);
end $$;

revoke all on function public.inropay_actualizar(uuid, text, date, text, text) from public, anon, authenticated;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    execute 'grant execute on function public.inropay_actualizar(uuid, text, date, text, text) to service_role';
  end if;
end $$;
