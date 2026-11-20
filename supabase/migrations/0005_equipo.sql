-- INROCOMPRAS · 0005 · Equipo: el administrador asigna área, jefe, ámbito y roles (Hito 0)
-- Criterio 0: «Solo el administrador cambia áreas y roles, y queda en el historial».
-- El área ya estaba protegida por app.proteger (solo «nombre» se edita directo). Los roles se podían
-- escribir directo con la política «admin»: se cierra esa puerta para que todo pase por la función y deje historial.

revoke insert, update, delete on public.usuario_roles from authenticated;

-- Primer administrador: el correo (o los correos) en config.admins_iniciales recibe el rol ADMIN al entrar por primera vez.
-- Se carga a mano en cada proyecto (no se sube al repo un correo real):
--   insert into public.config (clave, valor, nota) values ('admins_iniciales', '["persona@inroprin.com"]', 'Reciben ADMIN al primer ingreso')
--   on conflict (clave) do update set valor = excluded.valor;
create or replace function app.alta_usuario() returns trigger language plpgsql security definer set search_path = public as $$
declare
  dominio text := coalesce((select valor #>> '{}' from public.config where clave = 'dominio_permitido'), 'inroprin.com');
  admins jsonb := coalesce((select valor from public.config where clave = 'admins_iniciales'), '[]'::jsonb);
begin
  if split_part(lower(new.email), '@', 2) <> dominio then
    raise exception 'Solo cuentas @%', dominio;
  end if;
  insert into public.usuarios (id, email, nombre)
  values (new.id, lower(new.email), coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  if admins ? lower(new.email) then
    insert into public.usuario_roles (usuario_id, rol) values (new.id, 'ADMIN') on conflict do nothing;
    perform app.log('usuarios', new.id, 'alta_admin_inicial', null, 'ADMIN', 'Administrador inicial (config.admins_iniciales)');
  end if;
  return new;
end $$;

-- Guardar a una persona del equipo. Todo o nada; cada cambio queda en el historial.
create or replace function public.ac_equipo_guardar(
  p_usuario uuid, p_area text, p_jefe uuid default null, p_ambito text default 'todas',
  p_activo boolean default true, p_roles text[] default '{}'
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  yo uuid := app.exigir_usuario();
  u public.usuarios;
  antes_roles text[];
  nuevos text[] := coalesce((select array_agg(distinct r order by r) from unnest(coalesce(p_roles, '{}')) r where r is not null), '{}');
  admins_restantes int;
begin
  perform app.exigir(case when not app.es_admin() then 'Solo el administrador cambia áreas y roles.' end);
  select * into u from public.usuarios where id = p_usuario for update;
  perform app.exigir(case
    when u.id is null then 'No encuentro a esa persona.'
    when p_jefe = p_usuario then 'Una persona no puede ser su propio jefe.'
    when p_jefe is not null and not exists (select 1 from public.usuarios where id = p_jefe) then 'El jefe elegido no existe.'
    when p_ambito not in ('nac','imp','todas') then 'Elige el ámbito: nacional, importación o todas.' end);

  select coalesce(array_agg(rol order by rol), '{}') into antes_roles from public.usuario_roles where usuario_id = p_usuario and activo;

  -- No dejar la app sin administrador.
  if 'ADMIN' = any(antes_roles) and (not ('ADMIN' = any(nuevos)) or not p_activo) then
    select count(*) into admins_restantes from public.usuario_roles r join public.usuarios x on x.id = r.usuario_id
     where r.rol = 'ADMIN' and r.activo and x.activo and r.usuario_id <> p_usuario;
    perform app.exigir(case when admins_restantes = 0 then 'Debe quedar al menos un administrador activo. Nombra a otro antes de quitar este rol.' end);
  end if;

  -- El área se valida con el check de la tabla; el mensaje se traduce.
  begin
    update public.usuarios set area = p_area, jefe_id = p_jefe, ambito = p_ambito, activo = p_activo where id = p_usuario;
  exception when check_violation then
    raise exception 'Elige un área de la lista.' using errcode = 'P0001';
  end;

  begin
    delete from public.usuario_roles where usuario_id = p_usuario and not (rol = any(nuevos));
    insert into public.usuario_roles (usuario_id, rol, activo) select p_usuario, r, true from unnest(nuevos) r
    on conflict (usuario_id, rol) do update set activo = true;
  exception when check_violation then
    raise exception 'Hay un rol que no existe. Elige los roles de la lista.' using errcode = 'P0001';
  end;

  if u.area is distinct from p_area then perform app.log('usuarios', p_usuario, 'equipo_area', u.area, p_area); end if;
  if u.jefe_id is distinct from p_jefe then perform app.log('usuarios', p_usuario, 'equipo_jefe', u.jefe_id::text, p_jefe::text); end if;
  if u.ambito is distinct from p_ambito then perform app.log('usuarios', p_usuario, 'equipo_ambito', u.ambito, p_ambito); end if;
  if u.activo is distinct from p_activo then perform app.log('usuarios', p_usuario, 'equipo_activo', u.activo::text, p_activo::text); end if;
  if antes_roles is distinct from nuevos then
    perform app.log('usuarios', p_usuario, 'equipo_roles', array_to_string(antes_roles, ', '), array_to_string(nuevos, ', '));
  end if;
  return jsonb_build_object('ok', true);
end $$;

-- El administrador ve el historial de Equipo aunque no «vea precios» por área.
create policy equipo_admin on public.historial for select to authenticated using (tabla = 'usuarios' and app.es_admin());

-- Mi perfil para la UI (área, roles y si ve precios) en una sola llamada.
create or replace function public.mi_perfil() returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', u.id, 'email', u.email, 'nombre', u.nombre, 'area', u.area, 'ambito', u.ambito, 'activo', u.activo,
    'roles', to_jsonb(app.mis_roles()), 've_precios', app.ve_precios(), 'es_admin', app.es_admin(), 'es_compras', app.es_compras())
  from public.usuarios u where u.id = auth.uid()
$$;

grant execute on function public.ac_equipo_guardar(uuid, text, uuid, text, boolean, text[]) to authenticated;
grant execute on function public.mi_perfil() to authenticated;

-- Corrección: acciones_disponibles() devolvía botones para un registro que no existe (las condiciones p_* dan NULL,
-- que significa «se puede») y para una persona desactivada (su área sale NULL y las comparaciones no la descartan).
-- Las ac_* ya lo bloqueaban con exigir_usuario(); esto evita que la UI muestre botones que luego fallan.
alter function public.acciones_disponibles(text, uuid) set schema app;
alter function app.acciones_disponibles(text, uuid) rename to acciones_base;
revoke all on function app.acciones_base(text, uuid) from public, authenticated;

create or replace function public.acciones_disponibles(p_tabla text, p_id uuid)
returns table (accion text, etiqueta text, tipo text, funcion text, pide jsonb)
language plpgsql stable security definer set search_path = public as $$
declare existe boolean;
begin
  if auth.uid() is null or not exists (select 1 from public.usuarios where id = auth.uid() and activo) then return; end if;
  if p_tabla not in ('ordenes','oc_lineas','solicitudes','requerimientos','requerimiento_items','proveedores','pagos',
                     'desaduanajes','proyectos','anulaciones') then return; end if;
  execute format('select exists (select 1 from public.%I where id = $1)', p_tabla) into existe using p_id;
  if not existe then return; end if;
  return query select * from app.acciones_base(p_tabla, p_id);
end $$;
grant execute on function public.acciones_disponibles(text, uuid) to authenticated;

-- Corrección: con gerente_id NULL, «p.gerente_id = auth.uid()» da NULL y el NOT(...) no descartaba a nadie:
-- cualquier persona podía marcar como ganado o perdido un proyecto sin gerente.
create or replace function app.p_proyecto_resultado(p_id uuid) returns text language sql stable security definer set search_path = public as $$
  select case
    when p.estado <> 'Estudio de mercado' then 'El proyecto ya no está en estudio de mercado.'
    when not (coalesce(app.mi_area() in ('Comercial','Control de Gestión','Gerencia'), false)
              or coalesce(p.gerente_id = auth.uid(), false) or app.es_admin())
      then 'Lo marca Comercial, Control de Gestión, Gerencia o el gerente del proyecto.'
  end from public.proyectos p where p.id = p_id
$$;
