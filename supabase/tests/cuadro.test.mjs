// Prueba de 0040 (Hito 4): v_cuadro_aprobaciones con las 35 columnas exactas del AppSheet, en orden, y con RLS.
//   node supabase/tests/cuadro.test.mjs
import { PGlite } from '@electric-sql/pglite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

process.on('unhandledRejection', (e) => { console.log('ERROR:', e.message, e.where || ''); process.exit(1); });
const aqui = path.dirname(fileURLToPath(import.meta.url));
const leer = (f) => fs.readFileSync(path.join(aqui, '..', f), 'utf8');
const db = new PGlite();
let ok = 0, mal = 0;
const check = (cond, msg) => { if (cond) { ok++; console.log('  ✓', msg); } else { mal++; console.log('  ✗', msg); } };

await db.exec(`
  create schema auth;
  create table auth.users (id uuid primary key, email text not null, raw_user_meta_data jsonb default '{}');
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
  create role authenticated nologin; create role anon nologin;
  grant usage on schema public to authenticated;
`);
for (const f of ['0001_esquema.sql', '0002_seguridad.sql', '0003_acciones.sql']) await db.exec(leer('migrations/' + f));
await db.exec(leer('seed.sql'));
for (const f of ['0005_equipo.sql', '0006_correcciones_null.sql', '0007_permisos_supabase.sql', '0008_permisos_equipo.sql', '0030_ordenes_plan.sql', '0040_cuadro_aprobaciones.sql'])
  await db.exec(leer('migrations/' + f));

// Las 35 columnas de docs/04 («Vista pendiente: cuadro de aprobaciones»), tal cual.
const COLUMNAS = ['VB C. GESTION', 'OC', 'Estatus Compra', 'Comprador', 'N° Requerimiento', 'Procedencia', 'Unidad de negocio', 'Fecha',
  'Proveedor', 'Proyecto', 'Concepto', 'Link de la carpeta OC', 'Monto', 'Moneda original', 'Monto en Soles', 'Tipo de aprobación',
  'Forma de pago', '% adelanto', 'Días de crédito', 'Condición', 'Aprobación Ppto', 'Aprobación GOP', 'Aprobación GAF', 'Check Aprobació',
  'Check Control Gestión', 'Estado de Aprobación3', 'Observación finanzas', 'Criterio de observación finanzas', 'LEGAJO PARA PAGO',
  'OC CERRADA', 'Cuadro de pagos', 'Comentarios compras', 'UBICACIÓN', 'SUSTENTO DEL EXCESO PARA LA BD', 'Concatenado'];

// Personas de prueba (inventadas)
const U = {
  com: ['55555555-0000-0000-0000-000000000001', 'Compras', [], 'Carla Prueba'],
  cg:  ['55555555-0000-0000-0000-000000000002', 'Control de Gestión', ['CONTROL_GESTION'], 'Carlos Prueba'],
  gop: ['55555555-0000-0000-0000-000000000003', 'Gerencia', ['GOP'], 'Gloria Prueba'],
  pcp: ['55555555-0000-0000-0000-000000000004', 'Planeamiento', [], 'Paula Prueba'],
  inac: ['55555555-0000-0000-0000-000000000005', 'Compras', [], 'Inactiva Prueba'],
};
for (const [k, [id, area, roles, nombre]] of Object.entries(U)) {
  await db.query(`insert into public.usuarios (id, email, nombre, area) values ($1, $2, $3, $4)`, [id, k + '@inroprin.com', nombre, area]);
  for (const r of roles) await db.query(`insert into public.usuario_roles (usuario_id, rol) values ($1, $2)`, [id, r]);
}
await db.query(`update public.usuarios set activo = false where id = $1`, [U.inac[0]]);

async function como(k, sql, params = []) {
  await db.exec(`reset role; select set_config('test.uid', '${k ? U[k][0] : ''}', false); set role ${k ? 'authenticated' : 'anon'};`);
  try { return (await db.query(sql, params)).rows; } finally { await db.exec('reset role'); }
}
const adm = async (sql, p) => (await db.query(sql, p)).rows;

console.log('\n1. Columnas');
const cols = (await adm(`select column_name from information_schema.columns where table_schema = 'public' and table_name = 'v_cuadro_aprobaciones' order by ordinal_position`)).map((r) => r.column_name);
check(cols.length === 35, `35 columnas (hay ${cols.length})`);
check(JSON.stringify(cols) === JSON.stringify(COLUMNAS), 'Con los nombres exactos del AppSheet y en su orden');
if (JSON.stringify(cols) !== JSON.stringify(COLUMNAS)) console.log('   ', cols.map((c, i) => (c === COLUMNAS[i] ? '' : `${i + 1}: ${c} ≠ ${COLUMNAS[i]}`)).filter(Boolean).join('; '));
const colsApp = (await adm(`select column_name from information_schema.columns where table_schema = 'public' and table_name = 'v_cuadro_aprobaciones_app' order by ordinal_position`)).map((r) => r.column_name);
check(JSON.stringify(colsApp) === JSON.stringify(['id', 'empresa_id', ...COLUMNAS]), 'La de la pantalla: id y empresa_id, luego las mismas 35');
const invoker = (await adm(`select c.relname, c.reloptions from pg_class c where c.relname in ('v_cuadro_aprobaciones','v_cuadro_aprobaciones_app')`));
check(invoker.length === 2 && invoker.every((r) => (r.reloptions ?? []).includes('security_invoker=true')), 'Las dos con security_invoker (RLS de quien consulta)');

console.log('\n2. Una orden aprobada con dos RC, una demasía y cuotas');
const proy = (await adm(`insert into public.proyectos (codigo, nombre, cliente, estado) values ('P-T40','Proyecto 40','Cliente','Ganado') returning id`))[0].id;
const prov = (await adm(`insert into public.proveedores (ruc, razon_social, origen) values ('20100000001','Proveedor Cuadro S.A.C.','Nacional') returning id`))[0].id;
const rq1 = (await adm(`insert into public.requerimientos (numero, proyecto_id, estado) values ('RC-2026-0101',$1,'Emitido') returning id`, [proy]))[0].id;
const rq2 = (await adm(`insert into public.requerimientos (numero, proyecto_id, estado) values ('RC-2026-0102',$1,'Emitido') returning id`, [proy]))[0].id;
const it1 = (await adm(`insert into public.requerimiento_items (requerimiento_id, n_item, descripcion, cantidad) values ($1,1,'Torno',5) returning id`, [rq1]))[0].id;
const it2 = (await adm(`insert into public.requerimiento_items (requerimiento_id, n_item, descripcion, cantidad) values ($1,1,'Fresa',5) returning id`, [rq2]))[0].id;
const oc = (await adm(`insert into public.ordenes (numero, procedencia, proyecto_id, proveedor_id, comprador_id, fecha, moneda, monto, monto_soles, forma_pago, pct_adelanto,
    condicion, concepto, lugar_entrega, estatus, aprobacion_ppto, cg_por, cg_fecha, aprobacion_gop, gop_por, tipo_aprobacion, estado_aprobacion, legajo_para_pago,
    carpeta_drive_url, observacion_fin, criterio_obs_fin)
  values ('INROPRIN-NAC-2026-0101','Nacional',$1,$2,$3,'2026-11-10','USD',1000,3750,'Adelanto',0.3,'Urgente',null,'Almacén Lurín','Adelanto pendiente','Presupuestado',$4,now(),
    'Aprobado',$5,'Aprobación Única','Aprobado para Compra',true,'https://drive.google.com/drive/folders/prueba','Subsanado','Faltaba la guía') returning id`,
  [proy, prov, U.com[0], U.cg[0], U.gop[0]]))[0].id;
await adm(`insert into public.oc_lineas (orden_id, item_id, n_linea, descripcion, cantidad, precio_unit) values ($1,$2,1,'Torno',2,300),($1,$3,2,'Fresa',2,200)`, [oc, it1, it2]);
await adm(`insert into public.oc_lineas (orden_id, item_id, n_linea, descripcion, cantidad, precio_unit, es_demasia, demasia_estado, demasia_motivo) values ($1,$2,1,'Torno (demasía)',1,300,true,'Aprobada','Viene en caja de 3')`, [oc, it1]);
await adm(`insert into public.pagos (orden_id, n_cuota, tipo_pago, monto_pago, estado_pago) values ($1,1,'Adelanto',300,'Pagado'),($1,2,'Saldo',700,'Plan'),($1,3,'Pago total',5,'Anulado')`, [oc]);
const borr = (await adm(`insert into public.ordenes (procedencia, comprador_id, moneda) values ('Nacional',$1,'PEN') returning id`, [U.com[0]]))[0].id;

const filas = await como('com', `select * from public.v_cuadro_aprobaciones where "OC" = 'INROPRIN-NAC-2026-0101'`);
const f = filas[0] ?? {};
check(filas.length === 1, 'Compras (ve precios) ve la orden en el cuadro');
check(f['VB C. GESTION'] === true && f['Check Control Gestión'] === true && f['Check Aprobació'] === true, 'VB de CG, check de CG y check de aprobación en verdadero');
check(f['Comprador'] === 'Carla Prueba', 'Comprador por nombre');
check(f['N° Requerimiento'] === 'RC-2026-0101, RC-2026-0102', 'Los RC de sus líneas, sin repetir');
check(f['Unidad de negocio'] === 'INROPRIN' && f['Proyecto'] === 'P-T40 · Proyecto 40' && f['Proveedor'] === 'Proveedor Cuadro S.A.C.', 'Unidad de negocio, proyecto y proveedor');
check(Number(f['Monto']) === 1000 && f['Moneda original'] === 'USD' && Number(f['Monto en Soles']) === 3750, 'Monto, moneda original y monto en soles');
check(Number(f['% adelanto']) === 0.3 && f['Forma de pago'] === 'Adelanto' && f['Condición'] === 'Urgente', 'Forma de pago, % de adelanto y condición');
check(f['Aprobación GOP'] === 'Aprobado' && f['Aprobación GAF'] === 'Pendiente', 'Sin firma de GAF = «Pendiente»');
check(f['Cuadro de pagos'] === '1.0 Adelanto USD 300.00 Pagado | 2.0 Saldo USD 700.00 Plan', 'Cuadro de pagos sin las cuotas anuladas');
check(f['SUSTENTO DEL EXCESO PARA LA BD'] === 'Viene en caja de 3', 'Sustento del exceso = motivo de la demasía');
check(f['UBICACIÓN'] === 'Almacén Lurín' && f['Link de la carpeta OC'].startsWith('https://drive.google.com/'), 'Ubicación y carpeta del legajo');
check(f['LEGAJO PARA PAGO'] === true && f['OC CERRADA'] === false && f['Observación finanzas'] === 'Subsanado', 'Legajo, OC cerrada y observación de finanzas');
check(f['Concatenado'] === 'INROPRIN-NAC-2026-0101 - Proveedor Cuadro S.A.C. - P-T40 · Proyecto 40 - INROPRIN', 'Concatenado = OC - Proveedor - Proyecto - Unidad');
const b = (await como('com', `select * from public.v_cuadro_aprobaciones_app where id = $1`, [borr]))[0] ?? {};
check(b['OC'] === null && b['VB C. GESTION'] === false && b['Aprobación GOP'] === null && b['Concatenado'] === '? - ? - ? - INROPRIN', 'Un borrador: sin número, sin VB, sin firmas y «?» donde falta');
const app = (await como('cg', `select id, empresa_id, "OC" from public.v_cuadro_aprobaciones_app where id = $1`, [oc]))[0];
check(app?.id === oc && app.empresa_id === 'INROPRIN', 'CG lee la vista de la pantalla con id y empresa');

console.log('\n3. Quién la ve');
check((await como('pcp', `select * from public.v_cuadro_aprobaciones`)).length === 0, 'Planeamiento (no ve precios) no ve ninguna fila');
check((await como('inac', `select * from public.v_cuadro_aprobaciones`)).length === 0, 'Una persona inactiva no ve ninguna fila');
try { await como(null, `select * from public.v_cuadro_aprobaciones`); check(false, 'anon no la lee (debió fallar)'); }
catch (e) { check(/permission denied/.test(e.message), 'anon no la lee → «' + e.message.split('\n')[0] + '»'); }
try { await como('com', `update public.v_cuadro_aprobaciones_app set "OC" = 'x' where id = $1`, [oc]); check(false, 'Nadie la edita (debió fallar)'); }
catch (e) { check(/permission denied|cannot update/.test(e.message), 'Nadie la edita → «' + e.message.split('\n')[0] + '»'); }

console.log(`\n${ok} bien, ${mal} mal`);
process.exit(mal ? 1 : 0);
