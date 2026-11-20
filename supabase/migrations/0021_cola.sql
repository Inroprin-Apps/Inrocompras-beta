-- INROCOMPRAS · 0021 · Cola de trabajos: tomar, terminar y ver (Hito 2)
-- Prueba: supabase/tests/proveedores_cola.test.mjs
--
-- El servidor (POST/GET /api/cola, con SUPABASE_SERVICE_ROLE_KEY) toma trabajos con app.cola_tomar(n) y los cierra con
-- app.cola_terminar(id, ok, error, final). Las dos van también en public (PostgREST solo expone public), y SOLO las
-- ejecuta service_role: ni authenticated ni anon.
--   * Tomar: FOR UPDATE SKIP LOCKED (dos corridas a la vez no toman el mismo trabajo), cuenta el intento y deja un
--     «plazo» de 10 minutos en procesar_desde: si la función del servidor se corta a la mitad, el trabajo vuelve a
--     estar disponible al vencer el plazo (y al 5.º corte queda en Error).
--   * Terminar: ok → Hecho (o Descartado si p_final = 'Descartado', p. ej. «InroPay no configurado»).
--     Falla → Pendiente con espera creciente (1, 2, 4, 8 min) hasta 5 intentos; al 5.º, o si p_final = 'Error'
--     (p. ej. «Drive no configurado»: reintentar no sirve), queda en Error con el mensaje para el administrador.
-- El administrador ve la cola y reintenta o descarta un trabajo en Error desde Configuración (funciones solo-admin).

-- ───────────────────────── Servidor ─────────────────────────
create or replace function app.cola_tomar(p_n int default 10)
returns setof public.cola_trabajos language plpgsql security definer set search_path = public as $$
begin
  -- Cortados 5 veces a la mitad: no se vuelven a tomar.
  update public.cola_trabajos set estado = 'Error', terminado = now(),
         error = coalesce(error || ' · ', '') || 'Se cortó a la mitad 5 veces. Revisa el registro del servidor y reintenta.'
   where estado = 'En curso' and procesar_desde <= now() and intentos >= 5;
  return query
  update public.cola_trabajos c set estado = 'En curso', intentos = c.intentos + 1, procesar_desde = now() + interval '10 minutes'
   where c.id in (select id from public.cola_trabajos
                   where estado in ('Pendiente', 'En curso') and procesar_desde <= now()
                   order by id
                   limit greatest(1, least(coalesce(p_n, 10), 50))
                   for update skip locked)
  returning c.*;
end $$;

create or replace function app.cola_terminar(p_id bigint, p_ok boolean, p_error text default null, p_final text default null)
returns public.cola_trabajos language plpgsql security definer set search_path = public as $$
declare t public.cola_trabajos;
begin
  select * into t from public.cola_trabajos where id = p_id for update;
  if t.id is null then raise exception 'No existe el trabajo %.', p_id using errcode = 'P0001'; end if;
  if p_final is not null and p_final not in ('Error', 'Descartado') then
    raise exception 'Estado final no válido: %.', p_final using errcode = 'P0001';
  end if;
  if p_ok then
    update public.cola_trabajos set estado = coalesce(p_final, 'Hecho'), terminado = now(), error = left(p_error, 1000)
     where id = p_id returning * into t;
  elsif p_final is not null or t.intentos >= 5 then
    update public.cola_trabajos set estado = coalesce(p_final, 'Error'), terminado = now(), error = left(coalesce(p_error, 'Falló sin mensaje.'), 1000)
     where id = p_id returning * into t;
  else
    update public.cola_trabajos set estado = 'Pendiente', error = left(coalesce(p_error, 'Falló sin mensaje.'), 1000),
           procesar_desde = now() + make_interval(mins => power(2, greatest(t.intentos - 1, 0))::int)
     where id = p_id returning * into t;
  end if;
  return t;
end $$;

create or replace function public.cola_tomar(p_n int default 10)
returns setof public.cola_trabajos language sql security definer set search_path = public as $$
  select * from app.cola_tomar(p_n)
$$;
create or replace function public.cola_terminar(p_id bigint, p_ok boolean, p_error text default null, p_final text default null)
returns public.cola_trabajos language sql security definer set search_path = public as $$
  select * from app.cola_terminar(p_id, p_ok, p_error, p_final)
$$;

-- ───────────────────────── Administrador (Configuración) ─────────────────────────
create or replace function public.cola_resumen()
returns table (estado text, tipo text, cantidad bigint, mas_antiguo timestamptz)
language sql stable security definer set search_path = public as $$
  select c.estado, c.tipo, count(*), min(c.creado) from public.cola_trabajos c
   where app.es_admin() and exists (select 1 from public.usuarios where id = auth.uid() and activo)
     and (c.estado <> 'Hecho' or c.terminado > now() - interval '7 days')
   group by c.estado, c.tipo
$$;

create or replace function public.cola_listar(p_estado text default null, p_limite int default 100)
returns table (id bigint, tipo text, ref_tabla text, ref_id uuid, estado text, intentos int, error text,
               creado timestamptz, procesar_desde timestamptz, terminado timestamptz)
language sql stable security definer set search_path = public as $$
  select c.id, c.tipo, c.ref_tabla, c.ref_id, c.estado, c.intentos, c.error, c.creado, c.procesar_desde, c.terminado
    from public.cola_trabajos c
   where app.es_admin() and exists (select 1 from public.usuarios where id = auth.uid() and activo)
     and (p_estado is null or c.estado = p_estado)
   order by case c.estado when 'Error' then 0 when 'En curso' then 1 when 'Pendiente' then 2 else 3 end, c.id desc
   limit greatest(1, least(coalesce(p_limite, 100), 500))
$$;

create or replace function app.p_cola_reintentar(p_id bigint) returns text language sql stable security definer set search_path = public as $$
  select case when not app.es_admin() then 'Solo el administrador reintenta trabajos.'
              when c.id is null then 'No existe el trabajo.'
              when c.estado not in ('Error', 'Descartado') then 'Solo se reintenta un trabajo en Error o Descartado.' end
  from (select 1) x left join public.cola_trabajos c on c.id = p_id
$$;

create or replace function public.ac_cola_reintentar(p_id bigint) returns jsonb language plpgsql security definer set search_path = public as $$
declare yo uuid := app.exigir_usuario();
begin
  perform app.exigir(app.p_cola_reintentar(p_id));
  update public.cola_trabajos set estado = 'Pendiente', intentos = 0, procesar_desde = now(), terminado = null,
         error = 'Reintento pedido por el administrador. Antes: ' || coalesce(error, '—')
   where id = p_id;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.ac_cola_descartar(p_id bigint, p_motivo text) returns jsonb language plpgsql security definer set search_path = public as $$
declare yo uuid := app.exigir_usuario(); t public.cola_trabajos;
begin
  perform app.exigir(case when not app.es_admin() then 'Solo el administrador descarta trabajos.'
                          when coalesce(trim(p_motivo), '') = '' then 'Escribe por qué lo descartas.' end);
  select * into t from public.cola_trabajos where id = p_id for update;
  perform app.exigir(case when t.id is null then 'No existe el trabajo.'
                          when t.estado not in ('Error', 'Pendiente') then 'Solo se descarta un trabajo en Error o Pendiente.' end);
  update public.cola_trabajos set estado = 'Descartado', terminado = now(),
         error = left('Descartado por el administrador: ' || trim(p_motivo) || ' · Antes: ' || coalesce(t.error, '—'), 1000)
   where id = p_id;
  return jsonb_build_object('ok', true);
end $$;

-- ───────────────────────── Permisos ─────────────────────────
revoke all on function app.cola_tomar(int) from public, anon, authenticated;
revoke all on function app.cola_terminar(bigint, boolean, text, text) from public, anon, authenticated;
revoke all on function public.cola_tomar(int) from public, anon, authenticated;
revoke all on function public.cola_terminar(bigint, boolean, text, text) from public, anon, authenticated;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    execute 'grant execute on function app.cola_tomar(int) to service_role';
    execute 'grant execute on function app.cola_terminar(bigint, boolean, text, text) to service_role';
    execute 'grant execute on function public.cola_tomar(int) to service_role';
    execute 'grant execute on function public.cola_terminar(bigint, boolean, text, text) to service_role';
    execute 'grant usage on schema app to service_role';
  end if;
end $$;
do $$ declare f text; begin
  foreach f in array array['public.cola_resumen()', 'public.cola_listar(text, int)', 'public.ac_cola_reintentar(bigint)',
                           'public.ac_cola_descartar(bigint, text)', 'app.p_cola_reintentar(bigint)'] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;
