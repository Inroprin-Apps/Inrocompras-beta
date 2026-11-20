-- INROCOMPRAS · 0020 · Proveedores (Hito 2)
-- Prueba: supabase/tests/proveedores_cola.test.mjs
--
-- 1) acciones_disponibles() no devolvía nada para 'proveedores' (0003 no tenía esa rama): la ficha no podía mostrar
--    «Evaluar», «Verificar retención» ni «Pedir evaluación». Se agrega app.acciones_extra(tabla, id) y la pública pasa a
--    ser base ∪ extra, con las mismas protecciones de 0005 (usuario activo, tabla permitida, registro existente) y los
--    permisos de 0007/0008 (nada para public/anon; authenticated ejecuta).
-- 2) Cada acción de proveedor tiene su app.p_* (el motivo en español) y la ac_* lo vuelve a validar, bloquea la fila
--    y deja historial. Antes: con un id que no existe «se podía» (exigir(NULL)) y la acción terminaba en «ok» sin hacer
--    nada; pedir evaluación no dejaba historial.
-- 3) Alta directa (RLS «alta» de 0002): Compras podía insertar un proveedor ya «Aprobado» por Finanzas o «verificado»
--    por Contabilidad, y un RUC nacional con el formato bien pero el dígito verificador mal (el check solo mira el
--    formato). Un disparador fija esas columnas al alta y exige RUC válido (módulo 11) o país si es extranjero.
-- 4) La verificación de retención se pide con «Sí/No» (la UI muestra opciones de texto): ac_proveedor_verificar_retencion
--    traduce y llama a ac_proveedor_retencion.

-- ───────────────────────── Alta ─────────────────────────
-- Sin SECURITY DEFINER: dentro de una definer current_user es el dueño y no se sabría si el alta viene de la app.
create or replace function app.proveedor_alta() returns trigger language plpgsql set search_path = public as $$
begin
  new.ruc := nullif(regexp_replace(coalesce(new.ruc, ''), '\s', '', 'g'), '');
  new.razon_social := trim(new.razon_social);
  new.pais := nullif(trim(coalesce(new.pais, '')), '');
  if coalesce(new.razon_social, '') = '' then
    raise exception 'Escribe la razón social.' using errcode = 'P0001';
  end if;
  if new.origen = 'Nacional' and (new.ruc is null or not public.ruc_valido(new.ruc)) then
    raise exception 'El RUC no es válido. Revisa los 11 dígitos.' using errcode = 'P0001';
  end if;
  if new.origen = 'Extranjero' and new.pais is null then
    raise exception 'Escribe el país del proveedor extranjero.' using errcode = 'P0001';
  end if;
  if new.ruc is not null and exists (select 1 from public.proveedores where ruc = new.ruc) then
    raise exception 'Ya hay un proveedor con el RUC %. Búscalo en la lista.', new.ruc using errcode = 'P0001';
  end if;
  -- Lo que decide otra área no se fija al dar de alta (desde la app).
  if current_user in ('authenticated', 'anon') then
    new.evaluacion_fin := 'Pendiente'; new.evaluacion_fin_por := null; new.evaluacion_fin_fecha := null; new.evaluacion_fin_nota := null;
    new.verificado_contab := false; new.verificado_por := null; new.fecha_verificacion := null;
    new.creado_por := auth.uid();
  end if;
  return new;
end $$;
drop trigger if exists proveedor_alta on public.proveedores;
create trigger proveedor_alta before insert on public.proveedores for each row execute function app.proveedor_alta();

-- Edición directa (columnas editables de 0002): un extranjero no se queda sin país, la razón social no queda vacía,
-- las cuentas son una lista y lo que Contabilidad verificó no lo cambia otra área.
create or replace function app.proveedor_editar() returns trigger language plpgsql as $$
begin
  new.pais := nullif(trim(coalesce(new.pais, '')), '');
  new.razon_social := trim(new.razon_social);
  if coalesce(new.razon_social, '') = '' then raise exception 'Escribe la razón social.' using errcode = 'P0001'; end if;
  if new.origen = 'Extranjero' and new.pais is null then raise exception 'Escribe el país del proveedor extranjero.' using errcode = 'P0001'; end if;
  if jsonb_typeof(new.cuentas) <> 'array' then raise exception 'Las cuentas bancarias no tienen el formato esperado.' using errcode = 'P0001'; end if;
  -- Hueco: es_agente_retencion y es_buen_contribuyente son editables (0002), así que Compras podía cambiar lo que
  -- Contabilidad ya verificó (y con eso, la retención de los pagos). Verificado, solo lo cambia el administrador.
  if current_user in ('authenticated', 'anon') and old.verificado_contab and not app.es_admin()
     and (new.es_agente_retencion is distinct from old.es_agente_retencion or new.es_buen_contribuyente is distinct from old.es_buen_contribuyente) then
    raise exception 'Contabilidad ya verificó la retención de este proveedor. Si cambió, pide al administrador que la corrija.' using errcode = 'P0001';
  end if;
  return new;
end $$;
drop trigger if exists proveedor_editar on public.proveedores;
create trigger proveedor_editar before update on public.proveedores for each row execute function app.proveedor_editar();

-- ───────────────────────── Reglas (motivo o NULL) ─────────────────────────
create or replace function app.p_proveedor_evaluar(p_id uuid) returns text language sql stable security definer set search_path = public as $$
  select case
    when p.id is null then 'No existe el proveedor.'
    when not (app.tengo_rol('FINANZAS') or coalesce(app.mi_area() = 'Finanzas', false)) then 'La evaluación financiera la hace Finanzas.'
  end from (select 1) x left join public.proveedores p on p.id = p_id
$$;

create or replace function app.p_proveedor_retencion(p_id uuid) returns text language sql stable security definer set search_path = public as $$
  -- [Verificar Retención] = AND(ORIGEN<>"Extranjero", Verificado_Contab<>TRUE, IN("CONTABILIDAD", mis roles))
  select case
    when p.id is null then 'No existe el proveedor.'
    when not app.tengo_rol('CONTABILIDAD') then 'Lo verifica Contabilidad.'
    when p.origen = 'Extranjero' then 'No aplica a proveedores extranjeros.'
    when p.verificado_contab then 'Ya está verificado.'
  end from (select 1) x left join public.proveedores p on p.id = p_id
$$;

create or replace function app.p_proveedor_pedir_evaluacion(p_id uuid) returns text language sql stable security definer set search_path = public as $$
  select case
    when p.id is null then 'No existe el proveedor.'
    when not coalesce(app.es_compras(), false) then 'Lo pide Compras o Importaciones.'
    when p.evaluacion_fin = 'Aprobado' then 'Finanzas ya aprobó a este proveedor.'
  end from (select 1) x left join public.proveedores p on p.id = p_id
$$;

-- ───────────────────────── Acciones ─────────────────────────
create or replace function public.ac_proveedor_evaluar(p_id uuid, p_resultado text, p_nota text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare yo uuid := app.exigir_usuario(); antes text;
begin
  perform app.exigir(app.p_proveedor_evaluar(p_id));
  perform app.exigir(case when p_resultado is null or p_resultado not in ('Aprobado','Observado') then 'Elige el resultado: Aprobado u Observado.'
                          when p_resultado = 'Observado' and coalesce(trim(p_nota), '') = '' then 'Escribe la observación: qué debe corregir el proveedor.' end);
  select evaluacion_fin into antes from public.proveedores where id = p_id for update;
  update public.proveedores set evaluacion_fin = p_resultado, evaluacion_fin_por = yo, evaluacion_fin_fecha = now(),
         evaluacion_fin_nota = nullif(trim(coalesce(p_nota, '')), '') where id = p_id;
  perform app.log('proveedores', p_id, 'evaluacion_fin', antes, p_resultado, nullif(trim(coalesce(p_nota, '')), ''));
  -- Quien pidió la evaluación (Compras) se entera.
  perform app.notificar(array(select distinct h.usuario_id from public.historial h
                               where h.tabla = 'proveedores' and h.registro_id = p_id and h.accion = 'pedir_evaluacion' and h.usuario_id is not null),
                        'Proveedor ' || lower(p_resultado) || ' por Finanzas: ' || (select razon_social from public.proveedores where id = p_id),
                        nullif(trim(coalesce(p_nota, '')), ''), 'proveedores', p_id);
  return jsonb_build_object('ok', true, 'evaluacion_fin', p_resultado);
end $$;

create or replace function public.ac_proveedor_retencion(p_id uuid, p_agente boolean, p_buen_contribuyente boolean) returns jsonb
language plpgsql security definer set search_path = public as $$
declare yo uuid := app.exigir_usuario();
begin
  perform app.exigir(app.p_proveedor_retencion(p_id));
  perform app.exigir(case when p_agente is null or p_buen_contribuyente is null then 'Indica si es agente de retención y si es buen contribuyente.' end);
  perform 1 from public.proveedores where id = p_id for update;
  update public.proveedores set es_agente_retencion = p_agente, es_buen_contribuyente = p_buen_contribuyente,
         verificado_contab = true, verificado_por = yo, fecha_verificacion = now() where id = p_id;
  perform app.log('proveedores', p_id, 'verificar_retencion', null, null, null, jsonb_build_object('agente', p_agente, 'buen_contribuyente', p_buen_contribuyente));
  return jsonb_build_object('ok', true);
end $$;

-- La misma, con «Sí»/«No» (lo que elige la persona en el diálogo de la ficha).
create or replace function public.ac_proveedor_verificar_retencion(p_id uuid, p_agente text, p_buen_contribuyente text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare a boolean; b boolean;
begin
  a := case lower(trim(coalesce(p_agente, ''))) when 'sí' then true when 'si' then true when 'no' then false when 'true' then true when 'false' then false end;
  b := case lower(trim(coalesce(p_buen_contribuyente, ''))) when 'sí' then true when 'si' then true when 'no' then false when 'true' then true when 'false' then false end;
  return public.ac_proveedor_retencion(p_id, a, b);
end $$;

create or replace function public.ac_proveedor_pedir_evaluacion(p_id uuid) returns jsonb language plpgsql security definer set search_path = public as $$
declare yo uuid := app.exigir_usuario(); p public.proveedores;
begin
  perform app.exigir(app.p_proveedor_pedir_evaluacion(p_id));
  select * into p from public.proveedores where id = p_id for update;
  perform app.log('proveedores', p_id, 'pedir_evaluacion', p.evaluacion_fin, null);
  perform app.notificar(array(select unnest(app.usuarios_de_area('Finanzas')) union select unnest(app.usuarios_con_rol('FINANZAS'))),
                        'Evaluar proveedor: ' || p.razon_social, coalesce(p.ruc, p.pais), 'proveedores', p_id);
  return jsonb_build_object('ok', true);
end $$;

-- ───────────────────────── Qué botones mostrar (lo que 0003 no cubría) ─────────────────────────
create or replace function app.acciones_extra(p_tabla text, p_id uuid)
returns table (accion text, etiqueta text, tipo text, funcion text, pide jsonb)
language plpgsql stable security definer set search_path = public as $$
declare c record; ev text;
begin
  if p_tabla = 'proveedores' then
    select evaluacion_fin into ev from public.proveedores where id = p_id;
    for c in select * from (values
      ('evaluar_aprobar', 'Aprobar proveedor', 'p', 'ac_proveedor_evaluar',
         '[{"campo":"p_resultado","valor":"Aprobado"},{"campo":"p_nota","tipo":"texto","opcional":true}]'::jsonb,
         coalesce(app.p_proveedor_evaluar(p_id), case when ev = 'Aprobado' then 'x' end)),
      ('evaluar_observar', 'Observar proveedor', 's', 'ac_proveedor_evaluar',
         '[{"campo":"p_resultado","valor":"Observado"},{"campo":"p_nota","tipo":"texto"}]'::jsonb,
         app.p_proveedor_evaluar(p_id)),
      ('verificar_retencion', 'Verificar retención', 'p', 'ac_proveedor_verificar_retencion',
         '[{"campo":"p_agente","tipo":"opcion","opciones":["Sí","No"]},{"campo":"p_buen_contribuyente","tipo":"opcion","opciones":["Sí","No"]}]'::jsonb,
         app.p_proveedor_retencion(p_id)),
      ('pedir_evaluacion', 'Pedir evaluación a Finanzas', 's', 'ac_proveedor_pedir_evaluacion', '[]'::jsonb,
         app.p_proveedor_pedir_evaluacion(p_id))
    ) as t(accion, etiqueta, tipo, funcion, pide, motivo) where t.motivo is null loop
      accion := c.accion; etiqueta := c.etiqueta; tipo := c.tipo; funcion := c.funcion; pide := c.pide; return next;
    end loop;
  end if;
end $$;

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
  return query select * from app.acciones_base(p_tabla, p_id)
               union all
               select * from app.acciones_extra(p_tabla, p_id);
end $$;

-- ───────────────────────── Permisos ─────────────────────────
revoke all on function app.acciones_extra(text, uuid) from public, anon, authenticated;
revoke all on function public.acciones_disponibles(text, uuid) from public, anon;
grant execute on function public.acciones_disponibles(text, uuid) to authenticated;
do $$ declare f text; begin
  foreach f in array array['public.ac_proveedor_evaluar(uuid, text, text)', 'public.ac_proveedor_retencion(uuid, boolean, boolean)',
                           'public.ac_proveedor_verificar_retencion(uuid, text, text)', 'public.ac_proveedor_pedir_evaluacion(uuid)'] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
  foreach f in array array['app.p_proveedor_evaluar(uuid)', 'app.p_proveedor_retencion(uuid)', 'app.p_proveedor_pedir_evaluacion(uuid)',
                           'app.proveedor_alta()', 'app.proveedor_editar()'] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;
