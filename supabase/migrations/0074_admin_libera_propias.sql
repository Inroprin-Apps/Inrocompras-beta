-- 0074 · Decisión (22/11/2026): el ADMINISTRADOR libera sus propias solicitudes.
-- La regla general sigue: nadie libera lo que pidió (0010, como el AppSheet). La excepción es solo para quien tiene el rol
-- ADMIN: cuenta como aprobador de sus propias solicitudes (de proyecto o administrativas), aunque la etapa no tenga otro
-- aprobador. Cada liberación queda en el historial con su nombre.

create or replace function app.usuario_es_admin(p_usuario uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.usuario_roles r join public.usuarios u on u.id = r.usuario_id
                  where r.usuario_id = p_usuario and r.rol = 'ADMIN' and r.activo and u.activo)
$$;

create or replace function app.aprobadores_solicitud(p_id uuid) returns uuid[] language sql stable security definer set search_path = public as $$
  -- [_Aprobadores] = IFS(AND(Tipo="Proyecto", ISNOTBLANK(Etapa_Ref)), Etapa_Ref.Aprobadores, TRUE, LIST(Jefe_Email)), sin el
  -- solicitante; salvo que el solicitante sea administrador (0074), que sí libera lo suyo.
  select case when app.usuario_es_admin(s.solicitante_id) then array_append(lista, s.solicitante_id) else lista end
  from public.solicitudes s,
       lateral (select array_remove(
                  case when s.tipo = 'Proyecto' and s.etapa_id is not null
                       then array_remove((select aprobadores from public.proyecto_etapas where id = s.etapa_id), null)
                       else array_remove(array[s.jefe_id], null) end,
                  s.solicitante_id) lista) l
  where s.id = p_id
$$;

create or replace function app.p_solicitud_emitir(p_id uuid) returns text language sql stable security definer set search_path = public as $$
  select case
    when s.solicitante_id <> auth.uid() then 'Solo quien hizo la solicitud puede emitirla.'
    when s.estado <> 'Borrador' then 'La solicitud ya no está en borrador.'
    when s.tipo = 'Proyecto' and s.etapa_id is null then 'Elige la etapa del proyecto: sus aprobadores la liberan.'
    when s.tipo = 'Proyecto' and not exists (select 1 from public.proyecto_etapas e where e.id = s.etapa_id and e.proyecto_id = s.proyecto_id)
      then 'La etapa elegida no es de ese proyecto. Edita la solicitud y elige otra.'
    when s.tipo = 'Proyecto' and coalesce((select estado from public.proyectos where id = s.proyecto_id), '') <> 'Ganado'
      then 'El proyecto no está ganado: solo se hacen solicitudes de proyectos ganados.'
    when s.tipo = 'Administrativa' and s.jefe_id = s.solicitante_id and not app.usuario_es_admin(s.solicitante_id)
      then 'Tú no puedes liberar tu propia solicitud: elige a tu jefe.'
    when not exists (select 1 from public.solicitud_items where solicitud_id = s.id) then 'Agrega al menos un ítem.'
    when coalesce(trim(s.sustento), '') = '' then 'Escribe el sustento.'
    when exists (select 1 from public.carga_items where solicitud_id = s.id and lote_id = s.lote_actual and estado_fila = 'Error')
      then 'Hay filas de la carga con error: corrígelas o descártalas.'
    when cardinality(coalesce(app.aprobadores_solicitud(s.id), '{}')) = 0
      then case when s.tipo = 'Proyecto' then 'La etapa del proyecto no tiene aprobadores (aparte de ti). Pide al gerente del proyecto que agregue uno.'
                else 'Indica a tu jefe: él la libera.' end
  end from public.solicitudes s where s.id = p_id
$$;
