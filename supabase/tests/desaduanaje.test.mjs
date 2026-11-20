// Prueba de 0050 (Hito 6): desaduanaje y costeo de punta a punta con las ac_* reales, y los huecos que cierra 0050.
//   node supabase/tests/desaduanaje.test.mjs
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
for (const f of ['0005_equipo.sql', '0006_correcciones_null.sql', '0007_permisos_supabase.sql', '0008_permisos_equipo.sql',
  '0010_solicitudes_reglas.sql', '0020_proveedores.sql', '0030_ordenes_plan.sql', '0050_desaduanaje.sql', '0060_correcciones_hito1.sql'])
  await db.exec(leer('migrations/' + f));

// Personas de prueba (inventadas)
const U = {
  imp: ['66666666-0000-0000-0000-000000000001', 'Importaciones', [], 'Iván Prueba'],
  jefe: ['66666666-0000-0000-0000-000000000002', 'Importaciones', ['JEFE_COMPRAS_I'], 'Julia Prueba'],
  cont: ['66666666-0000-0000-0000-000000000003', 'Contabilidad', ['CONTABILIDAD'], 'Cecilia Prueba'],
  pcp: ['66666666-0000-0000-0000-000000000004', 'Planeamiento', [], 'Paula Prueba'],
};
for (const [k, [id, area, roles, nombre]] of Object.entries(U)) {
  await db.query(`insert into public.usuarios (id, email, nombre, area) values ($1, $2, $3, $4)`, [id, k + '@inroprin.com', nombre, area]);
  for (const r of roles) await db.query(`insert into public.usuario_roles (usuario_id, rol) values ($1, $2)`, [id, r]);
}

async function como(k, sql, params = []) {
  await db.exec(`reset role; select set_config('test.uid', '${k ? U[k][0] : ''}', false); set role ${k ? 'authenticated' : 'anon'};`);
  try { return (await db.query(sql, params)).rows; } finally { await db.exec('reset role'); }
}
async function falla(k, sql, params = []) {
  try { await como(k, sql, params); return null; } catch (e) { return e.message; }
}
const adm = async (sql, p) => (await db.query(sql, p)).rows;
const acciones = async (k, id) => (await como(k, `select accion from public.acciones_disponibles('desaduanajes', $1)`, [id])).map((r) => r.accion);

console.log('\n1. Una OC de importación aprobada (USD) con dos líneas');
const prov = (await adm(`insert into public.proveedores (razon_social, origen, pais) values ('Overseas Prueba Ltd','Extranjero','China') returning id`))[0].id;
const oc = (await adm(`insert into public.ordenes (numero, procedencia, proveedor_id, comprador_id, moneda, tipo_impuesto, estatus, estado_aprobacion)
  values ('INROPRIN-IMP-2026-0901','Importación',$1,$2,'USD','Sin IGV','Adelanto pendiente','Aprobado para Compra') returning id`, [prov, U.imp[0]]))[0].id;
await adm(`insert into public.oc_lineas (orden_id, n_linea, descripcion, cantidad, precio_unit) values ($1,1,'Bomba',2,1000),($1,2,'Válvula',10,100)`, [oc]);

console.log('\n2. Crear y checklist');
check((await falla('pcp', `select public.ac_des_crear($1,'Marítimo','Total')`, [oc]))?.includes('Compras o Importaciones'), 'Planeamiento no crea desaduanajes');
const des = (await como('imp', `select public.ac_des_crear($1,'Marítimo','Total') r`, [oc]))[0].r.id;
const prods = await adm(`select descripcion, cantidad, precio_exw from public.des_productos where desaduanaje_id = $1 order by descripcion`, [des]);
check(prods.length === 2 && Number(prods[0].cantidad) === 2, 'Trae las líneas de la OC como productos');
check(!(await acciones('imp', des)).includes('avanzar'), 'Con el checklist incompleto no aparece «Documentos completos»');
const f1 = await falla('imp', `select public.ac_des_avanzar($1)`, [des]);
check(f1?.startsWith('Falta: Factura comercial, BL / AWB, Certificado de origen, Seguro'), `Avanzar dice qué falta (${f1})`);
await como('imp', `update public.desaduanajes set chk_factura = true, chk_bl = true, chk_cert_origen = true, requiere_permiso = true, tipo_permiso = 'DIGESA' where id = $1`, [des]);
await adm(`insert into public.documentos (desaduanaje_id, tipo_doc, nombre_archivo, subido_por) values ($1,'Póliza de seguro','poliza.pdf',$2)`, [des, U.imp[0]]);
const falt = (await adm(`select app.des_docs_faltantes($1) f`, [des]))[0].f;
check(JSON.stringify(falt) === JSON.stringify(['Permiso']), 'Un documento subido cuenta; con permiso requerido falta el permiso');
await como('imp', `update public.desaduanajes set chk_permiso = true where id = $1`, [des]);
check((await acciones('imp', des)).includes('avanzar'), 'Checklist completo: aparece el botón');
await como('imp', `select public.ac_des_avanzar($1)`, [des]);
const fchk = await falla('imp', `update public.desaduanajes set chk_factura = false where id = $1`, [des]);
check(fchk?.includes('Borrador'), '0050: después de Borrador el checklist no se toca');
await como('imp', `update public.desaduanajes set agente = 'Agencia Prueba', bl_awb = 'BL-1' where id = $1`, [des]);
check((await adm(`select agente from public.desaduanajes where id = $1`, [des]))[0].agente === 'Agencia Prueba', 'Los datos editables sí se guardan');

console.log('\n3. DAM y TC congelado');
check((await falla('imp', `select public.ac_des_avanzar($1, '2026-11-18', '')`, [des]))?.includes('número de DAM'), 'Para numerar pide el N° de DAM');
await adm(`insert into public.tc_costeo (moneda, tc, vigente_desde) values ('USD', 3.70, '2026-11-01'), ('USD', 3.80, '2026-11-15'), ('USD', 9.99, '2026-12-01')`);
await como('imp', `select public.ac_des_avanzar($1, '2026-11-18', '118-2026-10-000123')`, [des]);
const d1 = (await adm(`select estado, n_dam, tc_usd from public.desaduanajes where id = $1`, [des]))[0];
check(d1.estado === 'DAM numerada' && Number(d1.tc_usd) === 3.8, `TC USD congelado con el vigente a la fecha de numeración (${d1.tc_usd})`);
for (let i = 0; i < 3; i++) await como('imp', `select public.ac_des_avanzar($1, '2026-11-19')`, [des]);
check((await adm(`select estado from public.desaduanajes where id = $1`, [des]))[0].estado === 'En almacén', 'Llegada → Levante → En almacén');

console.log('\n4. Productos (0050: solo lo editable)');
const pid = (await adm(`select id from public.des_productos where desaduanaje_id = $1 and descripcion = 'Bomba'`, [des]))[0].id;
await como('imp', `update public.des_productos set ad_valorem_usd = 100, cant_recibida = 2, incidencia = 'Caja golpeada' where id = $1`, [pid]);
check(Number((await adm(`select ad_valorem_usd from public.des_productos where id = $1`, [pid]))[0].ad_valorem_usd) === 100, 'Ad valorem, recibida e incidencia se editan');
check((await falla('imp', `update public.des_productos set precio_exw = 1 where id = $1`, [pid]))?.includes('precio_exw'), 'El precio EXW no se edita directo');
check((await falla('imp', `update public.des_productos set costo_unit_s = 1 where id = $1`, [pid]))?.includes('costo_unit_s'), 'El costo calculado no se edita directo');

console.log('\n5. Gastos');
const gasto = (k, concepto, monto, extra = {}) => como(k, `insert into public.des_gastos (desaduanaje_id, concepto, entra_costo, moneda, monto_sin_igv, tc_costeo, tipo_comprobante, registrado_por)
  values ($1,$2,$3,$4,$5,$6,$7,$8) returning id, entra_costo, tc_costeo`, [des, concepto, extra.entra ?? true, extra.moneda ?? 'USD', monto, extra.tc ?? 3.8, extra.tipo ?? 'Factura', U[k][0]]);
const g1 = (await gasto('cont', 'Flete internacional', 500))[0];
check(g1.entra_costo === true, 'Contabilidad registra un flete');
const g2 = (await gasto('cont', 'IGV importación', 300, { entra: true }))[0];
check(g2.entra_costo === false, '0050: entra_costo sale del concepto aunque la pantalla mande otro');
const g3 = (await gasto('imp', 'Agente de aduanas', 760, { moneda: 'PEN', tc: 3.8 }))[0];
check(Number(g3.tc_costeo) === 1, '0050: en soles el TC es 1');
check((await falla('cont', `update public.des_gastos set monto_sin_igv = 750 where id = $1`, [g3.id])) === null, '0050: Contabilidad corrige un gasto que registró Importaciones');
check(Number((await adm(`select monto_sin_igv from public.des_gastos where id = $1`, [g3.id]))[0].monto_sin_igv) === 750, '… y el cambio queda');
check((await adm(`select registrado_por from public.des_gastos where id = $1`, [g3.id]))[0].registrado_por === U.imp[0], '… sin cambiar quién lo registró');
check((await falla('cont', `insert into public.des_gastos (desaduanaje_id, concepto, entra_costo, moneda, monto_sin_igv, registrado_por) values ($1,'Seguro',true,'USD',0,$2)`, [des, U.cont[0]]))?.includes('mayor que cero'), '0050: monto cero se rechaza con mensaje');
check((await falla('pcp', `insert into public.des_gastos (desaduanaje_id, concepto, entra_costo, moneda, monto_sin_igv, tc_costeo, registrado_por) values ($1,'Seguro',true,'USD',5,3.8,$2)`, [des, U.pcp[0]])) !== null, 'Planeamiento no registra gastos');

console.log('\n6. Calcular y cerrar (v1)');
await como('cont', `select public.ac_des_calcular($1)`, [des]);
const d2 = (await adm(`select exw_total_s, gastos_costo_s, fi from public.desaduanajes where id = $1`, [des]))[0];
// EXW: (2×1000 + 10×100) × 3.8 = 11400; gastos que entran: 500×3.8 + 750 = 2650; ad valorem 100×3.8 = 380
check(Number(d2.exw_total_s) === 11400 && Number(d2.gastos_costo_s) === 2650, `EXW S/ ${d2.exw_total_s} y gastos al costo S/ ${d2.gastos_costo_s}`);
check(Math.abs(Number(d2.fi) - (11400 + 2650 + 380) / 11400) < 1e-5, `FI = (EXW + gastos + ad valorem) / EXW (${d2.fi})`);
check(!(await acciones('imp', des)).includes('reabrir') && (await acciones('imp', des)).includes('cerrar_costeo'), 'Importaciones ve «Cerrar costeo» y no «Reabrir»');
const v1 = (await como('imp', `select public.ac_des_cerrar_costeo($1) r`, [des]))[0].r;
check(v1.version === 1, 'Cierra la versión 1');
check((await adm(`select count(*)::int n from public.des_costeo_hist where desaduanaje_id = $1 and version = 1`, [des]))[0].n === 2, 'Guarda una fila por producto en el historial de costeo');
const fg = await falla('cont', `insert into public.des_gastos (desaduanaje_id, concepto, entra_costo, moneda, monto_sin_igv, tc_costeo, registrado_por) values ($1,'Multa / gasto posterior',true,'PEN',200,1,$2)`, [des, U.cont[0]]);
check(fg?.startsWith('El costeo está cerrado'), `0050: con el costeo cerrado no entran gastos, con mensaje claro (${fg?.slice(0, 40)}…)`);
const upd = await como('cont', `update public.des_gastos set monto_sin_igv = 1 where id = $1 returning id`, [g1.id]);
check(upd.length === 0, 'Con el costeo cerrado tampoco se cambian gastos (0 filas)');
check((await falla('imp', `select public.ac_des_reabrir($1, 'Multa')`, [des]))?.includes('jefatura'), 'Importaciones sin jefatura no reabre');

console.log('\n7. Reabrir con motivo, multa y v2');
check((await acciones('jefe', des)).includes('reabrir'), 'La jefatura ve «Reabrir costeo»');
check((await falla('jefe', `select public.ac_des_reabrir($1, '  ')`, [des]))?.includes('motivo'), 'Reabrir pide motivo');
await como('jefe', `select public.ac_des_reabrir($1, 'Llegó una multa de SUNAT')`, [des]);
await gasto('cont', 'Multa / gasto posterior', 200, { moneda: 'PEN', tc: 1 });
const v2 = (await como('imp', `select public.ac_des_cerrar_costeo($1) r`, [des]))[0].r;
check(v2.version === 2, 'El siguiente cierre es la versión 2');
const h2 = await adm(`select distinct motivo from public.des_costeo_hist where desaduanaje_id = $1 and version = 2`, [des]);
check(h2.length === 1 && h2[0].motivo === 'Llegó una multa de SUNAT', 'La versión 2 guarda el motivo de la reapertura');
check(Number((await adm(`select gastos_costo_s from public.desaduanajes where id = $1`, [des]))[0].gastos_costo_s) === 2850, 'La multa entra al costo de la v2');
const hist = await adm(`select accion from public.historial where tabla = 'desaduanajes' and registro_id = $1 order by id`, [des]);
check(hist.filter((h) => h.accion === 'cerrar_costeo').length === 2 && hist.some((h) => h.accion === 'reabrir'), 'Historial: dos cierres y la reapertura');

console.log(`\n${ok} bien, ${mal} mal`);
process.exit(mal ? 1 : 0);
