-- INROCOMPRAS · 0001 · Esquema
-- Traducción del AppSheet v2 de Geanfranco (tablas reales) + plan de compras por proyecto.
-- Cada tabla dice entre corchetes de qué tabla del AppSheet viene.
-- Reglas: los estados NO se escriben directo; se mueven con las funciones de 0003_acciones.sql.

create schema if not exists app;

-- ───────────────────────── Catálogos ─────────────────────────
create table public.empresas (            -- [Empresas] / Unidad de negocio
  id            text primary key,         -- 'INROPRIN', 'INROPLAS', 'CONSORCIO-PUCP', 'COOTEQ'
  razon_social  text not null,
  ruc           text,
  direccion     text,
  activo        boolean not null default true
);

create table public.monedas (             -- [Tipo_Cambio]
  id            text primary key check (id in ('PEN','USD','EUR','GBP')),
  nombre        text not null,
  tasa_a_soles  numeric(12,6) not null default 1,
  actualizado   timestamptz not null default now()
);

create table public.reglas_aprobacion (   -- [Reglas_Aprobacion]
  id            serial primary key,
  tipo_compra   text not null default 'Todos',   -- 'Todos' | 'Proyecto' | 'Administrativa' | 'Importación'
  monto_desde   numeric(14,2) not null,
  monto_hasta   numeric(14,2),                   -- null = sin tope
  ruta          text not null check (ruta in ('Aprobación Única','Aprobación Conjunta'))
);

create table public.conceptos (           -- [Conceptos] (43 de OC) y [Conceptos_Item]
  id            text primary key,
  ambito        text not null default 'OC' check (ambito in ('OC','Item','Gasto')),
  activo        boolean not null default true
);

create table public.conceptos_gasto_imp ( -- [Conceptos_Gasto_Imp]
  concepto      text primary key,
  entra_costo   boolean not null default true,
  reparto       text not null default 'Valor' check (reparto in ('Producto','Valor')),
  orden         int not null default 0,
  activo        boolean not null default true
);

create table public.tc_costeo (           -- [TC_Costeo]
  id            uuid primary key default gen_random_uuid(),
  moneda        text not null references public.monedas(id),
  tc            numeric(12,6) not null,
  vigente_desde date not null default current_date,
  registrado_por uuid,
  comentario    text
);

create table public.config (              -- parámetros que el AppSheet tenía fijos o en Listas
  clave         text primary key,
  valor         jsonb not null,
  nota          text
);

-- ───────────────────────── Personas y roles ─────────────────────────
-- El AppSheet cruza DOS cosas: el ÁREA del usuario (Usuarios.Área → [_MiArea])
-- y sus ROLES de aprobación (Aprobadores_OC.Rol → [_MisRoles]). Se mantiene igual.
create table public.usuarios (            -- [Usuarios]
  id            uuid primary key,         -- = auth.users.id
  email         text not null unique,
  nombre        text not null,
  area          text not null default 'Sin área' check (area in (
                  'Compras','Importaciones','Finanzas','Contabilidad','Control de Gestión',
                  'Gerencia','Planeamiento','Comercial','Técnica','Costos','Proyectos',
                  'Administración','Almacén','Sin área')),
  jefe_id       uuid references public.usuarios(id),
  ambito        text not null default 'todas' check (ambito in ('nac','imp','todas')),
  activo        boolean not null default true,
  creado        timestamptz not null default now()
);

create table public.usuario_roles (       -- [Aprobadores_OC]
  usuario_id    uuid not null references public.usuarios(id) on delete cascade,
  rol           text not null check (rol in (
                  'CONTROL_GESTION','GOP','GAF','JEFE_COMPRAS_N','JEFE_COMPRAS_I',
                  'LIDER_COMPRAS','FINANZAS','CONTABILIDAD','TECNICA','ADMIN')),
  activo        boolean not null default true,
  primary key (usuario_id, rol)
);

-- ───────────────────────── Proveedores ─────────────────────────
create table public.proveedores (         -- [Base de datos Proveedores]
  id            uuid primary key default gen_random_uuid(),
  ruc           text unique,              -- 11 dígitos si es nacional
  razon_social  text not null,
  origen        text not null default 'Nacional' check (origen in ('Nacional','Extranjero')),
  pais          text,
  correo        text,
  telefono      text,
  contacto      text,
  cuentas       jsonb not null default '[]',   -- [{banco, moneda, numero, cci, swift, iban}]
  es_agente_retencion   boolean not null default false,
  es_buen_contribuyente boolean not null default false,
  verificado_contab     boolean not null default false,
  verificado_por        uuid references public.usuarios(id),
  fecha_verificacion    timestamptz,
  -- adición: evaluación financiera (Finanzas negocia e investiga; decisión 18/11)
  evaluacion_fin        text not null default 'Pendiente' check (evaluacion_fin in ('Pendiente','Aprobado','Observado')),
  evaluacion_fin_por    uuid references public.usuarios(id),
  evaluacion_fin_fecha  timestamptz,
  evaluacion_fin_nota   text,
  creado_por    uuid references public.usuarios(id),
  creado        timestamptz not null default now(),
  constraint ruc_nacional check (origen = 'Extranjero' or ruc ~ '^(10|15|16|17|20)[0-9]{9}$')
);

-- ───────────────────────── Proyectos ─────────────────────────
create table public.proyectos (           -- [Proyectos]
  id            uuid primary key default gen_random_uuid(),
  codigo        text unique,              -- centro de costo / código interno
  nombre        text not null,
  cliente       text,
  empresa_id    text not null default 'INROPRIN' references public.empresas(id),
  estado        text not null default 'Estudio de mercado' check (estado in ('Estudio de mercado','Ganado','Perdido','Cerrado')),
  gerente_id    uuid references public.usuarios(id),
  fecha_meta    date,                     -- adición: fecha meta en almacén (plan de compras)
  lugar_entrega text,
  creado_por    uuid references public.usuarios(id),
  creado        timestamptz not null default now()
);

create table public.proyecto_etapas (     -- [Proyecto_Etapas]  (Muestras, Adquisición, Transporte…)
  id            uuid primary key default gen_random_uuid(),
  proyecto_id   uuid not null references public.proyectos(id) on delete cascade,
  nombre        text not null,
  orden         int not null default 1,
  aprobadores   uuid[] not null default '{}'   -- usuarios que liberan solicitudes de esta etapa
);

-- ───────────────────────── Solicitudes ─────────────────────────
create table public.solicitudes (         -- [Solicitudes] + [Solicitud_Docs] (numeración)
  id            uuid primary key default gen_random_uuid(),
  numero        text unique,              -- SOL-2026-0001 (se asigna al emitir)
  tipo          text not null check (tipo in ('Proyecto','Administrativa')),
  proyecto_id   uuid references public.proyectos(id),
  etapa_id      uuid references public.proyecto_etapas(id),
  jefe_id       uuid references public.usuarios(id),     -- libera si es Administrativa
  solicitante_id uuid not null references public.usuarios(id),
  sustento      text,
  estado        text not null default 'Borrador' check (estado in (
                  'Borrador','Pendiente Liberación','Observada','Liberada','En Req','Rechazada','Cancelada')),
  liberado_por  uuid references public.usuarios(id),
  fecha_liberacion timestamptz,
  motivo_rechazo text, rechazado_por uuid references public.usuarios(id), fecha_rechazo timestamptz,
  motivo_observacion text, observado_por uuid references public.usuarios(id),
  motivo_cancelacion text,
  nueva_solicitud_id uuid references public.solicitudes(id),
  requerimiento_id uuid,                  -- FK abajo
  estado_carga  text check (estado_carga in ('Revision','Confirmando','Confirmado')),
  lote_actual   uuid,
  creado        timestamptz not null default now(),
  constraint proyecto_si_tipo check (tipo = 'Administrativa' or proyecto_id is not null)
);

create table public.solicitud_items (     -- [Solicitud_Items]
  id            uuid primary key default gen_random_uuid(),
  solicitud_id  uuid not null references public.solicitudes(id) on delete cascade,
  n_item        int,
  tipo          text not null default 'Bienes' check (tipo in ('Bienes','Accesorios','Servicio','Muestra')),
  codigo_cliente text,                    -- EQU-…, COMPL-…
  descripcion   text not null,
  detalle       text,
  unidad        text not null default 'UND',
  cantidad      numeric(14,3) not null check (cantidad > 0),
  ficha_tecnica_doc uuid,                 -- documentos.id
  referencia_link text,
  plazo_adquisicion date,
  -- adiciones del plan de compras
  canal         text check (canal in ('Nacional','Importación')),
  presupuesto_unit numeric(14,4),
  moneda_ppto   text references public.monedas(id),
  incluido_en   uuid references public.solicitud_items(id)   -- accesorio que viene con su equipo
);

create table public.carga_items (         -- [Carga_items] (carga masiva desde Excel, fila por fila)
  id            uuid primary key default gen_random_uuid(),
  solicitud_id  uuid not null references public.solicitudes(id) on delete cascade,
  lote_id       uuid not null,
  n_fila        int not null,
  datos         jsonb not null,           -- la fila tal cual vino
  estado_fila   text not null default 'Revision' check (estado_fila in ('Revision','Error','Procesado','Descartado')),
  errores       text[] not null default '{}'
);

-- ───────────────────────── Requerimientos ─────────────────────────
create table public.requerimientos (      -- [Requerimientos]
  id            uuid primary key default gen_random_uuid(),
  numero        text unique,              -- N° RC interno (RC-2026-0001), se asigna al emitir
  rq_sidige     text,                     -- adición C-14: número del RQ que emite PCP en el SIDIGE
  empresa_id    text not null default 'INROPRIN' references public.empresas(id),
  area_emisora  text not null default 'Planeamiento',
  tipo_compra   text check (tipo_compra in ('Nacional','Importación','Nacional/Importaciones')),
  proyecto_id   uuid references public.proyectos(id),
  motivo        text,                     -- MOTIVO O PROYECTO
  destino       text, direccion text, receptor text,
  concepto_general text,
  solicitud_id  uuid references public.solicitudes(id),
  estado        text not null default 'En Proceso' check (estado in ('En Proceso','Emitido','Observado','Anulado')),
  emisor_id     uuid references public.usuarios(id),
  fecha_emision timestamptz,
  motivo_observacion text, observado_por uuid references public.usuarios(id),
  creado        timestamptz not null default now()
);
alter table public.solicitudes add constraint solicitudes_req_fk foreign key (requerimiento_id) references public.requerimientos(id);

create table public.requerimiento_items ( -- [Items]  ← es también la LÍNEA DEL PLAN DE COMPRAS
  id            uuid primary key default gen_random_uuid(),
  requerimiento_id uuid not null references public.requerimientos(id) on delete cascade,
  solicitud_item_id uuid references public.solicitud_items(id),
  n_item        int,
  tipo          text not null default 'Bienes',
  codigo_cliente text,
  codigo_sidige text,                     -- SKU (ME00…) que da el generador de Roberto (C-14, C-22)
  descripcion   text not null,            -- DESCRIPCIÓN CLIENTE
  unidad        text not null default 'UND',
  cantidad      numeric(14,3) not null check (cantidad > 0),   -- CANTIDAD REQUERIDA
  concepto      text,
  tipo_compra   text,
  caja_chica    boolean not null default false,
  anulado       boolean not null default false,
  -- adiciones (plan de compras y validación técnica, C-16/C-17)
  canal         text check (canal in ('Nacional','Importación')),
  plazo_entrega_dias int,
  fecha_meta    date,
  presupuesto_unit numeric(14,4),
  moneda_ppto   text references public.monedas(id),
  incluido_en   uuid references public.requerimiento_items(id),
  validacion_tecnica text not null default 'Pendiente' check (validacion_tecnica in ('Pendiente','Validado','Observado','No aplica')),
  marca         text,
  modelo        text,
  tec_por       uuid references public.usuarios(id),
  tec_fecha     timestamptz,
  tec_motivo    text
);

create table public.anulaciones (         -- [Anulaciones] (de requerimiento o de ítem)
  id            uuid primary key default gen_random_uuid(),
  requerimiento_id uuid not null references public.requerimientos(id),
  item_id       uuid references public.requerimiento_items(id),   -- null = todo el requerimiento
  causa         text not null check (causa in ('Error de emisión','Ya no se necesita','Cambio de especificación','Otro')),
  motivo        text not null,
  solicitado_por uuid not null references public.usuarios(id),
  estado        text not null default 'Pendiente' check (estado in ('Pendiente','Aprobada','Rechazada','Ejecutada','En Compras')),
  aprobado_por  uuid references public.usuarios(id),
  fecha_aprobacion timestamptz,
  motivo_rechazo text,
  creado        timestamptz not null default now()
);

-- ───────────────────────── Órdenes ─────────────────────────
create table public.series (              -- numeración EMPRESA|PROCEDENCIA|AÑO (hoy INROPRIN|NACIONAL|2026 = 24)
  empresa_id    text not null references public.empresas(id),
  procedencia   text not null check (procedencia in ('NAC','IMP','SRV')),
  anio          int not null,
  ultimo        int not null default 0,
  primary key (empresa_id, procedencia, anio)
);

create table public.correlativos (        -- SOL-, RC-, DES- por año
  prefijo       text not null,
  anio          int not null,
  ultimo        int not null default 0,
  primary key (prefijo, anio)
);

create table public.ordenes (             -- [OC]  (las 37 columnas del cuadro salen de la vista v_cuadro_aprobaciones)
  id            uuid primary key default gen_random_uuid(),
  numero        text unique,              -- se reserva al emitir: INROPRIN-NAC-2026-0025
  empresa_id    text not null default 'INROPRIN' references public.empresas(id),
  procedencia   text not null default 'Nacional' check (procedencia in ('Nacional','Importación')),
  clase         text not null default 'Compra' check (clase in ('Compra','Servicio')),
  proyecto_id   uuid references public.proyectos(id),
  proveedor_id  uuid references public.proveedores(id),
  comprador_id  uuid not null references public.usuarios(id),
  fecha         date not null default current_date,
  moneda        text not null default 'PEN' references public.monedas(id),
  tipo_impuesto text not null default 'IGV 18%' check (tipo_impuesto in ('IGV 18%','Sin IGV','Exonerado')),
  subtotal      numeric(14,2) not null default 0,
  igv           numeric(14,2) not null default 0,
  monto         numeric(14,2) not null default 0,   -- total
  monto_soles   numeric(14,2) not null default 0,
  forma_pago    text not null default 'Contado' check (forma_pago in (
                  'Contado','Crédito','Adelanto','Tarjeta de crédito','Caja chica','Contra entrega','Letra')),
  pct_adelanto  numeric(5,4) check (pct_adelanto is null or (pct_adelanto > 0 and pct_adelanto < 1)),
  hito_saldo    text,                     -- contra BL, contra fotos y video, contra entrega…
  dias_credito  int,
  condicion     text not null default 'Normal' check (condicion in ('Normal','Urgente')),
  concepto      text references public.conceptos(id),
  entrega_total boolean not null default true,
  monto_a_registrar numeric(14,2),        -- entrega parcial
  lugar_entrega text,
  plazo_entrega_dias int,
  terminos      text,
  -- importación (C-11)
  incoterm      text check (incoterm in ('EXW','FOB','CIF','FCA','CFR','DAP','DDP')),
  referencia_prov text,
  plazo_reposicion_dias int default 15,
  penalidad_pct_dia numeric(6,4) default 0.005,
  penalidad_tope_pct numeric(6,4) default 0.10,
  oc_padre_id   uuid references public.ordenes(id),      -- OC hija de servicio (flete, agente…)
  -- estado general (Estatus Compra)
  estatus       text not null default 'Borrador',
  -- aprobación
  aprobacion_ppto text check (aprobacion_ppto in ('Adm','No presupuestado','Excede Presupuesto','Preinversion',
                  'Presupuestado','Observado','Anular OC','Pre Aprobado','Subsanado')),
  cg_por uuid references public.usuarios(id), cg_fecha timestamptz,
  aprobacion_gop text check (aprobacion_gop in ('Aprobado','Observado','Rechazado')),
  gop_por uuid references public.usuarios(id), gop_fecha timestamptz,
  aprobacion_gaf text check (aprobacion_gaf in ('Aprobado','Observado','Rechazado')),
  gaf_por uuid references public.usuarios(id), gaf_fecha timestamptz,
  motivo_aprob  text,
  tipo_aprobacion text,                   -- calculado: app.oc_tipo_aprobacion()
  estado_aprobacion text,                 -- calculado: app.oc_estado_aprobacion()  [Estado de Aprobación3]
  fecha_emision timestamptz, emitido_por uuid references public.usuarios(id),
  fecha_aprobacion date,
  -- legajo y finanzas
  legajo_para_pago boolean not null default false,
  fecha_legajo  date,
  observacion_fin text check (observacion_fin in ('Observado','Subsanado')),
  criterio_obs_fin text, fecha_observacion date, fecha_subsanacion date,
  estado_previo_obs text,
  fecha_limite_factura date,
  -- anulación
  estado_previo_anul text, anul_motivo text,
  anul_solicitada_por uuid references public.usuarios(id), anul_fecha_sol timestamptz,
  anul_aprobada_por uuid references public.usuarios(id), anul_fecha_apr timestamptz,
  -- modificación
  estado_previo_mod text, monto_antes_mod numeric(14,2), moneda_antes_mod text, formapago_antes_mod text,
  mod_motivo text, mod_por uuid references public.usuarios(id), mod_fecha timestamptz,
  revision      int not null default 0,
  -- envío y PDF
  correo_envio  text, envio_solicitado timestamptz, envio_hecho timestamptz,
  pdf_interna_doc uuid, pdf_proveedor_doc uuid,
  carpeta_drive_id text, carpeta_drive_url text,
  creado        timestamptz not null default now(),
  constraint estatus_valido check (estatus in (
     'Borrador','Pendiente de aprobación','Rechazada','Legajo incompleto','Adelanto pendiente','Saldo pendiente',
     'Pago pendiente','Crédito','Crédito letra','Caja chica','Tarjeta de crédito','Observado por Finanzas',
     'OC pagada','OC cerrada','Anulación solicitada','Anulada','En modificación') or estatus like 'Observado por %'),
  constraint imp_sin_igv check (procedencia = 'Nacional' or tipo_impuesto = 'Sin IGV')
  -- % de adelanto y días de crédito se exigen al emitir (app.p_oc_emitir), no en el borrador
);

create table public.oc_lineas (           -- [Base de datos OC NAC]
  id            uuid primary key default gen_random_uuid(),
  orden_id      uuid not null references public.ordenes(id) on delete cascade,
  item_id       uuid references public.requerimiento_items(id),   -- Item_Req_Ref
  n_linea       int,
  descripcion   text not null,
  descripcion_prov text,                  -- C-22: cómo lo llama el proveedor
  unidad        text not null default 'UND',
  cantidad      numeric(14,3) not null check (cantidad > 0),
  precio_unit   numeric(14,4) not null check (precio_unit >= 0),
  subtotal      numeric(14,2) generated always as (round(cantidad * precio_unit, 2)) stored,
  es_demasia    boolean not null default false,
  demasia_estado text check (demasia_estado in ('Pendiente','Aprobada','Rechazada')),
  demasia_motivo text,
  demasia_decidido_por uuid references public.usuarios(id),
  demasia_fecha timestamptz,
  constraint demasia_con_estado check (not es_demasia or demasia_estado is not null)
);

-- ───────────────────────── Documentos (Drive) ─────────────────────────
create table public.documentos (          -- [Documentos_OC] + [Des_Documentos] + fichas técnicas
  id            uuid primary key default gen_random_uuid(),
  orden_id      uuid references public.ordenes(id),
  desaduanaje_id uuid,                    -- FK abajo
  solicitud_item_id uuid references public.solicitud_items(id),
  tipo_doc      text not null check (tipo_doc in (
                  'Cotización','Factura','Guía de remisión','Correo de sustento','Validación técnica','Acta de conformidad',
                  'Nota de crédito','PDF OC interna','PDF OC proveedor','Ficha técnica',
                  'Factura comercial','Packing list','BL / AWB','Certificado de origen','Póliza de seguro',
                  'Permiso (MTC / DIGESA)','DAM','Comprobante de gasto','Voucher de pago','Otro')),
  numero        text,                     -- serie-número del comprobante
  fecha_doc     date,
  monto_doc     numeric(14,2),
  moneda        text references public.monedas(id),
  ruc_emisor    text,
  nombre_archivo text not null,
  mime          text not null default 'application/pdf',
  storage_path  text,                     -- Supabase Storage (staging)
  drive_file_id text,                     -- Google Drive (legajo oficial)
  drive_url     text,
  estado        text not null default 'Subido' check (estado in ('Subido','Archivando','Archivado','Error','Reemplazado')),
  lectura       jsonb,                    -- lo que leyó el lector de cotizaciones/facturas (ver docs/07)
  lectura_estado text check (lectura_estado in ('Pendiente','Leído','Confirmado','Error','No aplica')),
  subido_por    uuid not null references public.usuarios(id),
  creado        timestamptz not null default now()
);

-- ───────────────────────── Pagos (cuotas) ─────────────────────────
create table public.pagos (               -- [Pagos]
  id            uuid primary key default gen_random_uuid(),
  orden_id      uuid not null references public.ordenes(id),
  n_cuota       numeric(6,1) not null default 1,
  hito          text,
  porcentaje    numeric(6,4),
  tipo_pago     text not null check (tipo_pago in ('Adelanto','Valorización','Pago parcial','Saldo','Pago total','Caja chica','Reembolso')),
  monto_pago    numeric(14,2) not null check (monto_pago > 0),
  dias_credito  int,
  es_letra      boolean not null default false,
  fecha_limite_pago date,
  fecha_programada date,
  estado_pago   text not null default 'Plan' check (estado_pago in ('Plan','Solicitado','Programado','Pagado','Observado Finanzas','Anulado')),
  factura_id    uuid references public.documentos(id),
  fecha_factura date,
  sustento_falta_factura text,
  n_operacion   text,
  voucher_doc   uuid references public.documentos(id),
  aprobado_fin_por uuid references public.usuarios(id),
  motivo_obs_fin text check (motivo_obs_fin in ('Documentos incompletos','Datos incorrectos','Falta factura',
                   'Falta validación técnica','Monto no coincide','Proveedor incorrecto','Otros')),
  detalle_obs_fin text,
  aplica_retencion boolean not null default false,
  monto_retencion numeric(14,2) not null default 0,
  neto_referencial numeric(14,2),
  fecha_pago    timestamptz,
  inropay_ref   text,                     -- id de la solicitud en InroPay (Finanzas)
  comentario    text,
  creado        timestamptz not null default now()
);

create table public.caja_chica (          -- [Caja_Chica]
  id            uuid primary key default gen_random_uuid(),
  item_id       uuid not null references public.requerimiento_items(id),
  monto         numeric(14,2) not null,
  moneda        text not null default 'PEN' references public.monedas(id),
  comprobante_doc uuid references public.documentos(id),
  registrado_por uuid not null references public.usuarios(id),
  fecha         date not null default current_date
);

-- ───────────────────────── Desaduanaje e importación ─────────────────────────
create table public.desaduanajes (        -- [Desaduanajes] + [Des_Docs]
  id            uuid primary key default gen_random_uuid(),
  numero        text unique,              -- DES-2026-0001
  empresa_id    text not null references public.empresas(id),
  orden_duena_id uuid not null references public.ordenes(id),
  romano        text,                     -- I, II, III… (embarques parciales)
  tipo          text not null check (tipo in ('Marítimo','Aéreo','Courier')),
  alcance       text not null default 'Total' check (alcance in ('Total','Parcial')),
  agente        text,
  bl_awb        text,
  n_dam         text,
  moneda_dam    text not null default 'USD' check (moneda_dam in ('USD','EUR')),
  tc_usd numeric(12,6), tc_eur numeric(12,6), tc_gbp numeric(12,6),   -- se congela al numerar la DAM
  estado        text not null default 'Borrador' check (estado in (
                  'Borrador','Documentos completos','DAM numerada','Llegada','Levante','En almacén','Costeo cerrado')),
  chk_factura boolean not null default false, chk_bl boolean not null default false,
  chk_cert_origen boolean not null default false, chk_seguro boolean not null default false,
  requiere_permiso boolean not null default false, tipo_permiso text, chk_permiso boolean not null default false,
  fecha_embarque date, fecha_llegada_est date, fecha_numeracion date, fecha_llegada date,
  fecha_levante date, fecha_almacen date,
  carpeta_drive_id text, carpeta_drive_url text,
  exw_total_s   numeric(14,2), gastos_costo_s numeric(14,2), fi numeric(10,6),
  version_costeo int not null default 0,
  cerrado_por uuid references public.usuarios(id), fecha_cierre timestamptz,
  motivo_reapertura text,
  creado_por    uuid not null references public.usuarios(id),
  creado        timestamptz not null default now(),
  comentario    text
);
alter table public.documentos add constraint documentos_des_fk foreign key (desaduanaje_id) references public.desaduanajes(id);

create table public.des_gastos (          -- [Des_Gastos]
  id            uuid primary key default gen_random_uuid(),
  desaduanaje_id uuid not null references public.desaduanajes(id) on delete cascade,
  concepto      text not null references public.conceptos_gasto_imp(concepto),
  entra_costo   boolean not null,
  emisor        text,
  ruc_emisor    text check (ruc_emisor is null or length(ruc_emisor) = 11),
  tipo_comprobante text not null default 'Factura' check (tipo_comprobante in ('Factura','Nota de crédito','Nota de débito','Liquidación SUNAT/DAM','Recibo','Otro')),
  n_comprobante text,
  fecha_comprobante date,
  moneda        text not null check (moneda in ('USD','EUR','PEN')),
  monto_sin_igv numeric(14,2) not null,
  tc_costeo     numeric(12,6) not null default 1,
  monto_s       numeric(14,2) generated always as (round(monto_sin_igv * tc_costeo, 2)) stored,
  oc_hija_id    uuid references public.ordenes(id),
  archivo_doc   uuid references public.documentos(id),
  registrado_por uuid not null references public.usuarios(id),
  fecha_registro timestamptz not null default now(),
  comentario    text
);

create table public.des_productos (       -- [Des_Productos]  (puede traer líneas de varias OC)
  id            uuid primary key default gen_random_uuid(),
  desaduanaje_id uuid not null references public.desaduanajes(id) on delete cascade,
  orden_id      uuid not null references public.ordenes(id),
  linea_id      uuid references public.oc_lineas(id),
  es_muestra    boolean not null default false,
  proyecto_id   uuid references public.proyectos(id),
  descripcion   text not null,
  cantidad      numeric(14,3) not null,
  moneda        text not null default 'USD',
  precio_exw    numeric(14,4) not null,
  ad_valorem_usd numeric(14,2) not null default 0,
  exw_s numeric(14,2), pct_reparto numeric(10,6), gastos_valor_s numeric(14,2),
  ad_valorem_s numeric(14,2), costo_total_s numeric(14,2), costo_unit_s numeric(14,4),
  cant_recibida numeric(14,3),
  incidencia    text,
  comentario    text
);

create table public.des_costeo_hist (     -- [Des_Costeo_Hist]  (solo lectura: lo escribe el cierre)
  id            uuid primary key default gen_random_uuid(),
  desaduanaje_id uuid not null references public.desaduanajes(id),
  version       int not null,
  fecha         timestamptz not null default now(),
  cerrado_por   uuid references public.usuarios(id),
  motivo        text,
  orden_id      uuid, proyecto_id uuid, producto text,
  cantidad numeric(14,3), exw_unit_s numeric(14,4), fi numeric(10,6), costo_unit_s numeric(14,4)
);

-- ───────────────────────── Transversales ─────────────────────────
create table public.historial (           -- bitácora de TODO cambio de estado (AppSheet no la tenía)
  id            bigserial primary key,
  tabla         text not null,
  registro_id   uuid not null,
  accion        text not null,
  de            text,
  a             text,
  motivo        text,
  datos         jsonb,
  usuario_id    uuid,
  ts            timestamptz not null default now()
);
create index on public.historial (tabla, registro_id, ts desc);

create table public.cola_trabajos (       -- equivale a la cola de Apps Script del AppSheet
  id            bigserial primary key,
  tipo          text not null check (tipo in ('crear_carpeta','archivar_doc','pdf_oc','enviar_correo',
                  'leer_documento','notificar','inropay_solicitar','sidige_escribir')),
  ref_tabla     text, ref_id uuid,
  payload       jsonb not null default '{}',
  estado        text not null default 'Pendiente' check (estado in ('Pendiente','En curso','Hecho','Error','Descartado')),
  intentos      int not null default 0,
  error         text,
  creado        timestamptz not null default now(),
  procesar_desde timestamptz not null default now(),
  terminado     timestamptz
);
create index on public.cola_trabajos (estado, procesar_desde);

create table public.notificaciones (      -- bandeja en la app + correo
  id            bigserial primary key,
  usuario_id    uuid not null references public.usuarios(id),
  titulo        text not null,
  cuerpo        text,
  ref_tabla     text, ref_id uuid,
  leida         boolean not null default false,
  correo        boolean not null default true,
  creado        timestamptz not null default now()
);
create index on public.notificaciones (usuario_id, leida, creado desc);

-- índices de uso frecuente
create index on public.ordenes (estatus);
create index on public.ordenes (proyecto_id);
create index on public.oc_lineas (orden_id);
create index on public.oc_lineas (item_id);
create index on public.pagos (orden_id, estado_pago);
create index on public.requerimiento_items (requerimiento_id);
create index on public.solicitudes (estado);
create index on public.documentos (orden_id, tipo_doc);
