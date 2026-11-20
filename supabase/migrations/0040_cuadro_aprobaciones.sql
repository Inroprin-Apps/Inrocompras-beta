-- INROCOMPRAS · 0040 · Cuadro de aprobaciones (Hito 4)
--
-- Las áreas que leían el cuadro de la hoja OC del AppSheet no deben notar el cambio (docs/04 «Vista pendiente»).
-- Dos vistas, las dos con security_invoker (RLS de quien consulta: sin «ve precios» no sale ninguna fila):
--   * v_cuadro_aprobaciones: SOLO las 35 columnas del AppSheet, con sus nombres exactos y en su orden. Es la que se
--     exporta y la que pueden leer otras áreas u hojas.
--   * v_cuadro_aprobaciones_app: las mismas 35 + id y empresa_id al inicio, para que la pantalla filtre y abra la orden.
-- D-05: el cuadro tenía 37 columnas; faltan confirmar 2 contra la hoja real. Su lugar está marcado abajo.
--
-- Cómo se llena cada columna (la base no guarda los checks manuales del AppSheet; se calculan):
--   VB C. GESTION           CG dio su VB al presupuesto (validó y no está observado, anulado ni subsanado por revisar)
--   Check Aprobació         la orden quedó «Aprobado para Compra»
--   Check Control Gestión   CG ya revisó la orden (validó u observó)
--   Aprobación GOP / GAF    sin firma = «Pendiente» (como el enum del AppSheet)
--   N° Requerimiento        los RC de sus líneas, separados por coma
--   Link de la carpeta OC   la carpeta del legajo en Drive
--   Cuadro de pagos         las cuotas no anuladas: «1 Pago total PEN 4248.00 Pagado | …»
--   Comentarios compras     no hay columna propia todavía: va vacía (ver informe del Hito 4)
--   UBICACIÓN               el lugar de entrega
--   SUSTENTO DEL EXCESO…    los motivos de sus demasías
--   Concatenado             [_Etiqueta_OC] = OC - Proveedor - Proyecto - Unidad de negocio («?» si falta)

create or replace view public.v_cuadro_aprobaciones_app with (security_invoker = true) as
select
  o.id,
  o.empresa_id,
  (o.cg_por is not null and o.aprobacion_ppto is not null
     and o.aprobacion_ppto not in ('Observado','Anular OC','Subsanado'))                 as "VB C. GESTION",
  o.numero                                                                               as "OC",
  o.estatus                                                                              as "Estatus Compra",
  u.nombre                                                                               as "Comprador",
  rq.numeros                                                                             as "N° Requerimiento",
  o.procedencia                                                                          as "Procedencia",
  e.razon_social                                                                         as "Unidad de negocio",
  o.fecha                                                                                as "Fecha",
  p.razon_social                                                                         as "Proveedor",
  nullif(concat_ws(' · ', pr.codigo, pr.nombre), '')                                     as "Proyecto",
  o.concepto                                                                             as "Concepto",
  o.carpeta_drive_url                                                                    as "Link de la carpeta OC",
  o.monto                                                                                as "Monto",
  o.moneda                                                                               as "Moneda original",
  o.monto_soles                                                                          as "Monto en Soles",
  o.tipo_aprobacion                                                                      as "Tipo de aprobación",
  o.forma_pago                                                                           as "Forma de pago",
  o.pct_adelanto                                                                         as "% adelanto",
  o.dias_credito                                                                         as "Días de crédito",
  o.condicion                                                                            as "Condición",
  o.aprobacion_ppto                                                                      as "Aprobación Ppto",
  case when o.estatus = 'Borrador' then null else coalesce(o.aprobacion_gop, 'Pendiente') end as "Aprobación GOP",
  case when o.estatus = 'Borrador' then null else coalesce(o.aprobacion_gaf, 'Pendiente') end as "Aprobación GAF",
  (o.estado_aprobacion = 'Aprobado para Compra')                                         as "Check Aprobació",
  (o.cg_por is not null)                                                                 as "Check Control Gestión",
  o.estado_aprobacion                                                                    as "Estado de Aprobación3",
  o.observacion_fin                                                                      as "Observación finanzas",
  o.criterio_obs_fin                                                                     as "Criterio de observación finanzas",
  o.legajo_para_pago                                                                     as "LEGAJO PARA PAGO",
  (o.estatus = 'OC cerrada')                                                             as "OC CERRADA",
  cp.cuadro                                                                              as "Cuadro de pagos",
  null::text                                                                             as "Comentarios compras",
  o.lugar_entrega                                                                        as "UBICACIÓN",
  dm.sustento                                                                            as "SUSTENTO DEL EXCESO PARA LA BD",
  concat_ws(' - ', coalesce(o.numero, '?'), coalesce(p.razon_social, '?'),
            coalesce(nullif(concat_ws(' · ', pr.codigo, pr.nombre), ''), '?'), coalesce(e.razon_social, '?')) as "Concatenado"
  -- D-05: aquí van las 2 columnas que faltan para llegar a las 37 de la hoja OC, cuando se confirmen.
  -- , <columna 36> as "<nombre exacto>"
  -- , <columna 37> as "<nombre exacto>"
from public.ordenes o
left join public.usuarios u on u.id = o.comprador_id
left join public.empresas e on e.id = o.empresa_id
left join public.proveedores p on p.id = o.proveedor_id
left join public.proyectos pr on pr.id = o.proyecto_id
left join lateral (
  select string_agg(distinct r.numero, ', ' order by r.numero) as numeros
    from public.oc_lineas l
    join public.requerimiento_items i on i.id = l.item_id
    join public.requerimientos r on r.id = i.requerimiento_id
   where l.orden_id = o.id and r.numero is not null
) rq on true
left join lateral (
  select string_agg(trim(to_char(g.n_cuota, 'FM990.0')) || ' ' || g.tipo_pago || ' ' || o.moneda || ' ' || g.monto_pago::text || ' ' || g.estado_pago,
                    ' | ' order by g.n_cuota) as cuadro
    from public.pagos g
   where g.orden_id = o.id and g.estado_pago <> 'Anulado'
) cp on true
left join lateral (
  select string_agg(l.demasia_motivo, ' | ' order by l.n_linea) as sustento
    from public.oc_lineas l
   where l.orden_id = o.id and l.es_demasia and coalesce(trim(l.demasia_motivo), '') <> ''
) dm on true;

comment on view public.v_cuadro_aprobaciones_app is
  'Cuadro de aprobaciones para la pantalla: id, empresa_id y las 35 columnas del AppSheet (ver v_cuadro_aprobaciones).';

create or replace view public.v_cuadro_aprobaciones with (security_invoker = true) as
select "VB C. GESTION", "OC", "Estatus Compra", "Comprador", "N° Requerimiento", "Procedencia", "Unidad de negocio", "Fecha",
       "Proveedor", "Proyecto", "Concepto", "Link de la carpeta OC", "Monto", "Moneda original", "Monto en Soles",
       "Tipo de aprobación", "Forma de pago", "% adelanto", "Días de crédito", "Condición", "Aprobación Ppto",
       "Aprobación GOP", "Aprobación GAF", "Check Aprobació", "Check Control Gestión", "Estado de Aprobación3",
       "Observación finanzas", "Criterio de observación finanzas", "LEGAJO PARA PAGO", "OC CERRADA", "Cuadro de pagos",
       "Comentarios compras", "UBICACIÓN", "SUSTENTO DEL EXCESO PARA LA BD", "Concatenado"
  from public.v_cuadro_aprobaciones_app;

comment on view public.v_cuadro_aprobaciones is
  'Cuadro de aprobaciones con las 35 columnas del AppSheet (hoja OC), nombres exactos y en orden. D-05: faltan 2 por confirmar.';

-- Solo lectura y solo con sesión (RLS de ordenes decide qué filas). anon nada.
revoke all on public.v_cuadro_aprobaciones_app, public.v_cuadro_aprobaciones from public;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke all on public.v_cuadro_aprobaciones_app, public.v_cuadro_aprobaciones from anon';
  end if;
end $$;
grant select on public.v_cuadro_aprobaciones_app, public.v_cuadro_aprobaciones to authenticated;
