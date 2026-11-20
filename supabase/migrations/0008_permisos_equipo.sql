-- INROCOMPRAS · 0008 · Cierra a «public» (y por tanto a anon) las 3 funciones que creó 0005.
-- Postgres da EXECUTE a PUBLIC al crear una función; 0005 solo agregó el grant a authenticated.
-- Las tres ya exigían sesión activa por dentro, así que no había daño: es para que nada nuestro quede abierto sin sesión.
revoke all on function public.ac_equipo_guardar(uuid, text, uuid, text, boolean, text[]) from public, anon;
revoke all on function public.acciones_disponibles(text, uuid) from public, anon;
revoke all on function public.mi_perfil() from public, anon;
grant execute on function public.ac_equipo_guardar(uuid, text, uuid, text, boolean, text[]) to authenticated;
grant execute on function public.acciones_disponibles(text, uuid) to authenticated;
grant execute on function public.mi_perfil() to authenticated;
