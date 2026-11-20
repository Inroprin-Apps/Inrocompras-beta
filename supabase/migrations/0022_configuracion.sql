-- INROCOMPRAS · 0022 · Configuración (Hito 2)
-- Prueba: supabase/tests/proveedores_cola.test.mjs (sección 7)
--
-- Las tablas de configuración ya tenían su RLS en 0002 (config y conceptos: administrador; monedas: administrador o
-- FINANZAS; TC de costeo y conceptos de gasto: administrador o Importaciones). Faltaba:
-- 1) monedas.actualizado no cambiaba al editar la tasa (quedaba la fecha del alta) y se aceptaba una tasa 0 o negativa,
--    que deja en cero el monto en soles de las órdenes (y con eso, su ruta de aprobación).
-- 2) tc_costeo.registrado_por quedaba vacío (nadie lo llenaba) y aceptaba un TC 0 o negativo.

create or replace function app.moneda_tasa() returns trigger language plpgsql as $$
begin
  if new.tasa_a_soles is null or new.tasa_a_soles <= 0 then
    raise exception 'La tasa de % debe ser mayor que cero.', new.id using errcode = 'P0001';
  end if;
  if tg_op = 'INSERT' or new.tasa_a_soles is distinct from old.tasa_a_soles then new.actualizado := now(); end if;
  return new;
end $$;
drop trigger if exists moneda_tasa on public.monedas;
create trigger moneda_tasa before insert or update on public.monedas for each row execute function app.moneda_tasa();

create or replace function app.tc_costeo_alta() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.tc is null or new.tc <= 0 then
    raise exception 'El tipo de cambio de costeo debe ser mayor que cero.' using errcode = 'P0001';
  end if;
  new.registrado_por := coalesce(auth.uid(), new.registrado_por);
  return new;
end $$;
drop trigger if exists tc_costeo_alta on public.tc_costeo;
create trigger tc_costeo_alta before insert on public.tc_costeo for each row execute function app.tc_costeo_alta();

revoke all on function app.moneda_tasa() from public, anon;
revoke all on function app.tc_costeo_alta() from public, anon;
grant execute on function app.moneda_tasa() to authenticated;
grant execute on function app.tc_costeo_alta() to authenticated;
