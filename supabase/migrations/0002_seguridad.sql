-- INROCOMPRAS · 0002 · Seguridad
-- Modelo del AppSheet: ÁREA del usuario ([_MiArea]) + ROLES de aprobación ([_MisRoles]).
-- Diferencia clave con el AppSheet: allá cualquiera con la app abierta veía TODO y podía editar
-- filas si sabía cómo (no había security filters). Aquí:
--   1) RLS en todas las tablas (quién ve qué filas);
--   2) los cambios de estado SOLO por funciones (0003) que validan la misma condición del AppSheet;
--   3) un disparador que impide tocar columnas protegidas con un UPDATE directo.

-- ───────────────────────── Funciones de identidad ─────────────────────────
-- En Supabase, auth.uid() ya existe. Todas estas viven en el esquema app (no se exponen por la API).
create or replace function app.yo() returns uuid language sql stable as $$ select auth.uid() $$;

create or replace function app.mi_area() returns text language sql stable security definer set search_path = public as $$
  select area from public.usuarios where id = auth.uid() and activo
$$;

create or replace function app.mis_roles() returns text[] language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(r.rol), '{}') from public.usuario_roles r
  join public.usuarios u on u.id = r.usuario_id
  where r.usuario_id = auth.uid() and r.activo and u.activo
$$;

create or replace function app.tengo_rol(p_rol text) returns boolean language sql stable as $$
  select p_rol = any(app.mis_roles())
$$;

create or replace function app.es_admin() returns boolean language sql stable as $$ select app.tengo_rol('ADMIN') $$;

create or replace function app.es_compras() returns boolean language sql stable as $$
  select app.mi_area() in ('Compras','Importaciones')             -- IN([_MiArea], LIST("Compras","Importaciones"))
$$;

-- Quién ve montos. Técnica, Planeamiento, Almacén, Comercial y el solicitante común NO ven precios:
-- consultan el avance con app_seguimiento() (0003), que no devuelve montos.
create or replace function app.ve_precios() returns boolean language sql stable as $$
  select app.mi_area() in ('Compras','Importaciones','Finanzas','Contabilidad','Control de Gestión','Gerencia','Costos','Administración')
      or app.mis_roles() && array['CONTROL_GESTION','GOP','GAF','JEFE_COMPRAS_N','JEFE_COMPRAS_I','LIDER_COMPRAS','FINANZAS','CONTABILIDAD','ADMIN']
$$;

-- Usuario activo y registrado (toda acción lo exige).
create or replace function app.exigir_usuario() returns uuid language plpgsql stable security definer set search_path = public as $$
declare v uuid := auth.uid();
begin
  if v is null or not exists (select 1 from public.usuarios where id = v and activo) then
    raise exception 'Tu usuario no está activo en INROCOMPRAS. Pide acceso al administrador.' using errcode = '42501';
  end if;
  return v;
end $$;

grant usage on schema app to authenticated;
grant execute on all functions in schema app to authenticated;

-- ───────────────────────── Alta de usuarios ─────────────────────────
-- Entra solo gente del dominio. El área y los roles los asigna el administrador (vista Equipo).
create or replace function app.alta_usuario() returns trigger language plpgsql security definer set search_path = public as $$
declare dominio text := coalesce((select valor #>> '{}' from public.config where clave = 'dominio_permitido'), 'inroprin.com');
begin
  if split_part(lower(new.email), '@', 2) <> dominio then
    raise exception 'Solo cuentas @%', dominio;
  end if;
  insert into public.usuarios (id, email, nombre)
  values (new.id, lower(new.email), coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end $$;
-- En Supabase:  create trigger alta_usuario after insert on auth.users for each row execute function app.alta_usuario();
-- (se crea en 0004_supabase.sql para que este archivo también corra en un Postgres sin el esquema auth completo)

-- ───────────────────────── Columnas protegidas ─────────────────────────
-- Un UPDATE directo desde la app (rol authenticated) solo puede tocar las columnas de la lista.
-- Las funciones de 0003 son SECURITY DEFINER (corren como dueño) y pasan sin restricción.
create or replace function app.proteger() returns trigger language plpgsql as $$
declare
  editables text[] := tg_argv::text[];
  a jsonb; b jsonb; k text;
begin
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;
  a := to_jsonb(old); b := to_jsonb(new);
  for k in select jsonb_object_keys(b) loop
    if not (k = any(editables)) and (a -> k) is distinct from (b -> k) then
      raise exception 'La columna «%» de % no se edita directo: usa la acción correspondiente.', k, tg_table_name
        using errcode = '42501';
    end if;
  end loop;
  return new;
end $$;

create trigger proteger before update on public.ordenes for each row execute function app.proteger(
  'proyecto_id','proveedor_id','fecha','moneda','tipo_impuesto','forma_pago','pct_adelanto','hito_saldo','dias_credito',
  'condicion','concepto','entrega_total','monto_a_registrar','lugar_entrega','plazo_entrega_dias','terminos','incoterm',
  'referencia_prov','plazo_reposicion_dias','penalidad_pct_dia','penalidad_tope_pct','oc_padre_id','clase','empresa_id',
  'procedencia','fecha_limite_factura','correo_envio');
create trigger proteger before update on public.oc_lineas for each row execute function app.proteger(
  'item_id','n_linea','descripcion','descripcion_prov','unidad','cantidad','precio_unit','demasia_motivo','subtotal');
create trigger proteger before update on public.solicitudes for each row execute function app.proteger(
  'tipo','proyecto_id','etapa_id','jefe_id','sustento');
create trigger proteger before update on public.solicitud_items for each row execute function app.proteger(
  'n_item','tipo','codigo_cliente','descripcion','detalle','unidad','cantidad','ficha_tecnica_doc','referencia_link',
  'plazo_adquisicion','canal','presupuesto_unit','moneda_ppto','incluido_en');
create trigger proteger before update on public.requerimientos for each row execute function app.proteger(
  'empresa_id','tipo_compra','proyecto_id','motivo','destino','direccion','receptor','concepto_general');
create trigger proteger before update on public.requerimiento_items for each row execute function app.proteger(
  'n_item','tipo','codigo_cliente','descripcion','unidad','cantidad','concepto','tipo_compra','canal',
  'plazo_entrega_dias','fecha_meta','presupuesto_unit','moneda_ppto','incluido_en');
create trigger proteger before update on public.proveedores for each row execute function app.proteger(
  'razon_social','pais','correo','telefono','contacto','cuentas','es_agente_retencion','es_buen_contribuyente');
create trigger proteger before update on public.proyectos for each row execute function app.proteger(
  'codigo','nombre','cliente','empresa_id','gerente_id','fecha_meta','lugar_entrega');
create trigger proteger before update on public.desaduanajes for each row execute function app.proteger(
  'romano','tipo','alcance','agente','bl_awb','moneda_dam','chk_factura','chk_bl','chk_cert_origen','chk_seguro',
  'requiere_permiso','tipo_permiso','chk_permiso','fecha_embarque','fecha_llegada_est','comentario');
create trigger proteger before update on public.documentos for each row execute function app.proteger(
  'numero','fecha_doc','monto_doc','moneda','ruc_emisor');
create trigger proteger before update on public.pagos for each row execute function app.proteger('comentario');
create trigger proteger before update on public.usuarios for each row execute function app.proteger('nombre');

-- ───────────────────────── RLS ─────────────────────────
do $$ declare t text; begin
  foreach t in array array['empresas','monedas','reglas_aprobacion','conceptos','conceptos_gasto_imp','tc_costeo','config',
    'usuarios','usuario_roles','proveedores','proyectos','proyecto_etapas','solicitudes','solicitud_items','carga_items',
    'requerimientos','requerimiento_items','anulaciones','series','correlativos','ordenes','oc_lineas','documentos','pagos','caja_chica',
    'desaduanajes','des_gastos','des_productos','des_costeo_hist','historial','cola_trabajos','notificaciones'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('grant select on public.%I to authenticated', t);
  end loop;
end $$;
grant insert, update, delete on public.proveedores, public.proyectos, public.proyecto_etapas, public.solicitudes,
  public.solicitud_items, public.carga_items, public.ordenes, public.oc_lineas, public.documentos, public.desaduanajes,
  public.des_gastos, public.des_productos, public.requerimientos, public.requerimiento_items, public.notificaciones,
  public.usuarios, public.usuario_roles, public.monedas, public.tc_costeo, public.conceptos, public.conceptos_gasto_imp,
  public.reglas_aprobacion, public.config, public.empresas to authenticated;
-- series, cola_trabajos, historial, pagos, anulaciones, caja_chica, des_costeo_hist: sin escritura directa (solo funciones).

-- Catálogos: todos leen; escribe el administrador (monedas y TC de costeo también Finanzas / Jefe de Importaciones).
create policy leer on public.empresas for select to authenticated using (true);
create policy admin on public.empresas for all to authenticated using (app.es_admin()) with check (app.es_admin());
create policy leer on public.monedas for select to authenticated using (true);
create policy escribir on public.monedas for all to authenticated using (app.es_admin() or app.tengo_rol('FINANZAS')) with check (app.es_admin() or app.tengo_rol('FINANZAS'));
create policy leer on public.reglas_aprobacion for select to authenticated using (true);
create policy admin on public.reglas_aprobacion for all to authenticated using (app.es_admin()) with check (app.es_admin());
create policy leer on public.conceptos for select to authenticated using (true);
create policy admin on public.conceptos for all to authenticated using (app.es_admin()) with check (app.es_admin());
create policy leer on public.conceptos_gasto_imp for select to authenticated using (true);
create policy escribir on public.conceptos_gasto_imp for all to authenticated using (app.es_admin() or app.tengo_rol('JEFE_COMPRAS_I')) with check (app.es_admin() or app.tengo_rol('JEFE_COMPRAS_I'));
create policy leer on public.tc_costeo for select to authenticated using (true);
create policy escribir on public.tc_costeo for insert to authenticated with check (app.es_admin() or app.tengo_rol('JEFE_COMPRAS_I') or app.mi_area() = 'Importaciones');
create policy leer on public.config for select to authenticated using (true);
create policy admin on public.config for all to authenticated using (app.es_admin()) with check (app.es_admin());

-- Personas
create policy leer on public.usuarios for select to authenticated using (true);
create policy propio on public.usuarios for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy admin on public.usuarios for all to authenticated using (app.es_admin()) with check (app.es_admin());
create policy leer on public.usuario_roles for select to authenticated using (true);
create policy admin on public.usuario_roles for all to authenticated using (app.es_admin()) with check (app.es_admin());

-- Proveedores: todos leen (no tiene precios). Altas: Compras, Importaciones, Finanzas.
create policy leer on public.proveedores for select to authenticated using (true);
create policy alta on public.proveedores for insert to authenticated
  with check (app.es_compras() or app.mi_area() = 'Finanzas' or app.es_admin());
create policy editar on public.proveedores for update to authenticated
  using (app.es_compras() or app.mi_area() = 'Finanzas' or app.es_admin());

-- Proyectos (el estado Ganado/Perdido se mueve con acción)
create policy leer on public.proyectos for select to authenticated using (true);
create policy alta on public.proyectos for insert to authenticated
  with check (app.mi_area() in ('Comercial','Control de Gestión','Gerencia','Planeamiento') or app.es_admin());
create policy editar on public.proyectos for update to authenticated
  using (gerente_id = auth.uid() or app.mi_area() in ('Comercial','Control de Gestión','Planeamiento') or app.es_admin());
create policy leer on public.proyecto_etapas for select to authenticated using (true);
create policy escribir on public.proyecto_etapas for all to authenticated
  using (app.es_admin() or app.mi_area() = 'Control de Gestión' or exists (select 1 from public.proyectos p where p.id = proyecto_id and p.gerente_id = auth.uid()))
  with check (app.es_admin() or app.mi_area() = 'Control de Gestión' or exists (select 1 from public.proyectos p where p.id = proyecto_id and p.gerente_id = auth.uid()));

-- Solicitudes: todos leen (como el AppSheet). Crea y edita el solicitante, solo en Borrador u Observada.
create policy leer on public.solicitudes for select to authenticated using (true);
create policy alta on public.solicitudes for insert to authenticated
  with check (solicitante_id = auth.uid() and estado = 'Borrador' and numero is null);
create policy editar on public.solicitudes for update to authenticated
  using (solicitante_id = auth.uid() and estado in ('Borrador','Observada'));
create policy borrar on public.solicitudes for delete to authenticated
  using (solicitante_id = auth.uid() and estado = 'Borrador');              -- Delete: [Estado] = "Borrador"

create policy leer on public.solicitud_items for select to authenticated using (true);
create policy escribir on public.solicitud_items for all to authenticated   -- Edit/Delete: Estado IN (Borrador, Observada)
  using (exists (select 1 from public.solicitudes s where s.id = solicitud_id and s.solicitante_id = auth.uid() and s.estado in ('Borrador','Observada')))
  with check (exists (select 1 from public.solicitudes s where s.id = solicitud_id and s.solicitante_id = auth.uid() and s.estado in ('Borrador','Observada')));
create policy leer on public.carga_items for select to authenticated using (true);
create policy escribir on public.carga_items for all to authenticated
  using (exists (select 1 from public.solicitudes s where s.id = solicitud_id and s.solicitante_id = auth.uid() and s.estado in ('Borrador','Observada')))
  with check (exists (select 1 from public.solicitudes s where s.id = solicitud_id and s.solicitante_id = auth.uid() and s.estado in ('Borrador','Observada')));

-- Requerimientos: todos leen. Edita el área emisora mientras está En Proceso.
create policy leer on public.requerimientos for select to authenticated using (true);
create policy editar on public.requerimientos for update to authenticated
  using (estado = 'En Proceso' and area_emisora = app.mi_area());
create policy leer on public.requerimiento_items for select to authenticated using (true);
create policy editar on public.requerimiento_items for update to authenticated
  using (exists (select 1 from public.requerimientos r where r.id = requerimiento_id and r.estado = 'En Proceso' and r.area_emisora = app.mi_area()));
create policy leer on public.anulaciones for select to authenticated using (true);

-- Órdenes y todo lo que lleva montos: solo quien ve precios.
create or replace function app.oc_editable(p_estatus text, p_cg uuid, p_gop uuid, p_gaf uuid) returns boolean language sql immutable as $$
  -- [Editar OC]: Borrador o En modificación, Observado…, o Pendiente de aprobación sin ninguna firma
  select p_estatus in ('Borrador','En modificación') or p_estatus like 'Observado%'
      or (p_estatus = 'Pendiente de aprobación' and p_cg is null and p_gop is null and p_gaf is null)
$$;

create policy leer on public.ordenes for select to authenticated using (app.ve_precios());
create policy alta on public.ordenes for insert to authenticated
  with check (app.es_compras() and comprador_id = auth.uid() and estatus = 'Borrador' and numero is null);
create policy editar on public.ordenes for update to authenticated
  using (app.es_compras() and app.oc_editable(estatus, cg_por, gop_por, gaf_por));

create policy leer on public.oc_lineas for select to authenticated using (app.ve_precios());
create policy escribir on public.oc_lineas for all to authenticated
  using (app.es_compras() and exists (select 1 from public.ordenes o where o.id = orden_id and app.oc_editable(o.estatus, o.cg_por, o.gop_por, o.gaf_por)))
  with check (app.es_compras() and not es_demasia and exists (select 1 from public.ordenes o where o.id = orden_id and app.oc_editable(o.estatus, o.cg_por, o.gop_por, o.gaf_por)));

create policy leer on public.pagos for select to authenticated using (app.ve_precios());
create policy leer on public.caja_chica for select to authenticated using (app.ve_precios());

-- Documentos: los de una orden o desaduanaje los ve quien ve precios; las fichas técnicas, todos.
create policy leer on public.documentos for select to authenticated
  using (app.ve_precios() or (orden_id is null and desaduanaje_id is null));
create policy subir on public.documentos for insert to authenticated
  with check (subido_por = auth.uid() and estado = 'Subido' and (
       (orden_id is not null and (app.es_compras() or app.mi_area() in ('Finanzas','Contabilidad')))
    or (desaduanaje_id is not null and (app.es_compras() or app.mi_area() = 'Contabilidad'))
    or (orden_id is null and desaduanaje_id is null)));
create policy editar on public.documentos for update to authenticated
  using (subido_por = auth.uid() and estado in ('Subido','Archivado','Error'));

-- Desaduanaje: Compras/Importaciones; Contabilidad registra gastos.
create policy leer on public.desaduanajes for select to authenticated using (app.ve_precios());
create policy editar on public.desaduanajes for update to authenticated using (app.es_compras() and estado <> 'Costeo cerrado');
create policy leer on public.des_gastos for select to authenticated using (app.ve_precios());
create policy escribir on public.des_gastos for all to authenticated    -- Edit/Delete: Des_Ref.Estado <> "Costeo cerrado"
  using ((app.es_compras() or app.mi_area() = 'Contabilidad') and exists (select 1 from public.desaduanajes d where d.id = desaduanaje_id and d.estado <> 'Costeo cerrado'))
  with check ((app.es_compras() or app.mi_area() = 'Contabilidad') and registrado_por = auth.uid() and exists (select 1 from public.desaduanajes d where d.id = desaduanaje_id and d.estado <> 'Costeo cerrado'));
create policy leer on public.des_productos for select to authenticated using (app.ve_precios());
create policy escribir on public.des_productos for all to authenticated
  using (app.es_compras() and exists (select 1 from public.desaduanajes d where d.id = desaduanaje_id and d.estado <> 'Costeo cerrado'))
  with check (app.es_compras() and exists (select 1 from public.desaduanajes d where d.id = desaduanaje_id and d.estado <> 'Costeo cerrado'));
create policy leer on public.des_costeo_hist for select to authenticated using (app.ve_precios());

-- Bitácora: quien ve precios, o lo propio.
create policy leer on public.historial for select to authenticated using (app.ve_precios() or usuario_id = auth.uid());
-- Notificaciones: solo las propias; solo se marca «leída».
create policy propias on public.notificaciones for select to authenticated using (usuario_id = auth.uid());
create policy leer_marca on public.notificaciones for update to authenticated using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());
-- series y cola_trabajos: sin políticas = nadie desde la app (solo funciones y el servidor con service_role).
