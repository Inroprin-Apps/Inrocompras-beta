-- INROCOMPRAS · 0007 · Permisos tal como los deja Supabase
-- En Supabase, cada función y tabla nueva del esquema public recibe permisos para anon, authenticated y service_role
-- por separado (default privileges). Por eso el «revoke ... from public» de 0003 no bastaba:
--   * inropay_actualizar (marca cuotas como Pagado) la podía llamar CUALQUIERA con la llave pública, sin iniciar sesión;
--   * anon podía ejecutar todas las ac_* (fallaban en exigir_usuario, pero no deben estar expuestas).
-- La app nunca usa anon: todo pasa con sesión (authenticated) o desde el servidor (service_role).

-- 1) anon no ejecuta nada nuestro ni toca tablas.
revoke execute on all functions in schema public from anon;
revoke execute on all functions in schema app from anon;
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke usage on schema app from anon;

-- 2) inropay_actualizar: solo el servidor (webhook de InroPay con service_role).
revoke all on function public.inropay_actualizar(uuid, text, date, text, text) from public, anon, authenticated;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    execute 'grant execute on function public.inropay_actualizar(uuid, text, date, text, text) to service_role';
  end if;
end $$;

-- 3) Las funciones internas que 0005/0006 dejaron solo para uso interno siguen cerradas también para anon.
revoke all on function app.acciones_base(text, uuid) from public, anon, authenticated;
revoke all on function app.te_toca_base() from public, anon, authenticated;
revoke all on function app.seguimiento_items_base(uuid) from public, anon, authenticated;

-- 4) Lo que se cree después nace cerrado para anon (vale para objetos que cree el dueño actual de las migraciones).
alter default privileges in schema public revoke execute on functions from anon;
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on sequences from anon;
alter default privileges in schema app revoke execute on functions from anon;
