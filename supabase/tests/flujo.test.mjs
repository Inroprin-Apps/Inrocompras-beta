// Prueba de reglas y flujo completo sobre Postgres real (PGlite, sin instalar nada más).
//   npm i @electric-sql/pglite   y luego   node supabase/tests/flujo.test.mjs
// Simula auth.uid() y el rol «authenticated» de Supabase para que RLS y los disparadores actúen igual que en producción.
import { PGlite } from '@electric-sql/pglite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

process.on('unhandledRejection', (e) => { console.log('ERROR:', e.message, e.where || ''); process.exit(1); });
const aqui = path.dirname(fileURLToPath(import.meta.url));
const mig = (f) => fs.readFileSync(path.join(aqui, '..', 'migrations', f), 'utf8');
const db = new PGlite();
let ok = 0, mal = 0;
const check = (cond, msg) => { if (cond) { ok++; console.log('  ✓', msg); } else { mal++; console.log('  ✗', msg); } };

await db.exec(`
  create schema auth;
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
  create role authenticated nologin; create role anon nologin;
  grant usage on schema public to authenticated;
`);
for (const f of ['0001_esquema.sql', '0002_seguridad.sql', '0003_acciones.sql']) await db.exec(mig(f));
await db.exec(fs.readFileSync(path.join(aqui, '..', 'seed.sql'), 'utf8'));
await db.exec(mig('0005_equipo.sql'));
await db.exec(mig('0006_correcciones_null.sql'));
await db.exec(mig('0007_permisos_supabase.sql'));
await db.exec(mig('0008_permisos_equipo.sql'));
await db.exec(`grant usage on schema public to authenticated; grant usage, select on all sequences in schema public to authenticated;`);

// Personas de prueba (inventadas)
const U = {
  sol: ['11111111-0000-0000-0000-000000000001', 'Comercial', []],
  ger: ['11111111-0000-0000-0000-000000000002', 'Proyectos', []],
  pcp: ['11111111-0000-0000-0000-000000000003', 'Planeamiento', []],
  tec: ['11111111-0000-0000-0000-000000000004', 'Técnica', ['TECNICA']],
  com: ['11111111-0000-0000-0000-000000000005', 'Compras', []],
  imp: ['11111111-0000-0000-0000-000000000006', 'Importaciones', []],
  cg:  ['11111111-0000-0000-0000-000000000007', 'Control de Gestión', ['CONTROL_GESTION']],
  gop: ['11111111-0000-0000-0000-000000000008', 'Gerencia', ['GOP']],
  gaf: ['11111111-0000-0000-0000-000000000009', 'Gerencia', ['GAF']],
  fin: ['11111111-0000-0000-0000-000000000010', 'Finanzas', ['FINANZAS']],
  con: ['11111111-0000-0000-0000-000000000011', 'Contabilidad', ['CONTABILIDAD']],
  jcn: ['11111111-0000-0000-0000-000000000012', 'Compras', ['JEFE_COMPRAS_N']],
  jci: ['11111111-0000-0000-0000-000000000013', 'Importaciones', ['JEFE_COMPRAS_I']],
};
for (const [k, [id, area, roles]] of Object.entries(U)) {
  await db.query(`insert into public.usuarios (id, email, nombre, area) values ($1, $2, $3, $4)`, [id, k + '@ejemplo.pe', 'Persona ' + k, area]);
  for (const r of roles) await db.query(`insert into public.usuario_roles (usuario_id, rol) values ($1, $2)`, [id, r]);
}

async function como(k, sql, params = []) {
  await db.exec(`reset role; select set_config('test.uid', '${U[k][0]}', false); set role authenticated;`);
  try { return (await db.query(sql, params)).rows; } finally { await db.exec('reset role'); }
}
async function falla(k, sql, params, msg) {
  try { await como(k, sql, params); check(false, msg + ' (debió fallar)'); }
  catch (e) { check(true, msg + ' → «' + e.message.split('\n')[0] + '»'); }
}
const uno = async (k, sql, p) => (await como(k, sql, p))[0];
const adm = async (sql, p) => (await db.query(sql, p)).rows;

console.log('\n1. Proyecto, solicitud y liberación');
const proy = (await adm(`insert into public.proyectos (codigo, nombre, cliente, estado, gerente_id) values ('P-001','Talleres EPT','Cliente de prueba','Estudio de mercado',$1) returning id`, [U.ger[0]]))[0].id;
await falla('com', `select public.ac_proyecto_resultado($1, true)`, [proy], 'Compras no marca el proyecto como ganado');
await como('ger', `select public.ac_proyecto_resultado($1, true)`, [proy]);
const etapa = (await adm(`select id, aprobadores from public.proyecto_etapas where proyecto_id = $1`, [proy]))[0];
check(etapa && etapa.aprobadores.includes(U.ger[0]), 'Al ganar se crea la etapa General con el gerente como aprobador');

const sol = (await uno('sol', `insert into public.solicitudes (tipo, proyecto_id, etapa_id, solicitante_id, sustento) values ('Proyecto',$1,$2,$3,'Equipos para talleres') returning id`, [proy, etapa.id, U.sol[0]])).id;
await como('sol', `insert into public.solicitud_items (solicitud_id, n_item, descripcion, cantidad, unidad) values ($1,1,'Torno de banco',10,'UND'),($1,2,'Juego de brocas',20,'JGO')`, [sol]);
// carga masiva con una fila mala
const lote = '22222222-0000-0000-0000-000000000001';
await como('sol', `insert into public.carga_items (solicitud_id, lote_id, n_fila, datos) values ($1,$2,3,'{"descripcion":"Multímetro","cantidad":"5"}'),($1,$2,4,'{"descripcion":"","cantidad":"x"}')`, [sol, lote]);
const carga = (await uno('sol', `select public.ac_carga_procesar($1,$2) r`, [sol, lote])).r;
check(carga.cargados === 1 && carga.con_error === 1, 'Carga masiva: 1 fila cargada y 1 con error');
await falla('sol', `select public.ac_solicitud_emitir($1)`, [sol], 'No se emite con filas de carga en error');
const filaMala = (await adm(`select id from public.carga_items where estado_fila = 'Error'`))[0].id;
await como('sol', `select public.ac_carga_descartar_fila($1)`, [filaMala]);
const em = (await uno('sol', `select public.ac_solicitud_emitir($1) r`, [sol])).r;
check(/^SOL-\d{4}-0001$/.test(em.numero), 'Emitir asigna ' + em.numero);
await como('sol', `update public.solicitudes set estado = 'Liberada' where id = $1`, [sol]).catch(() => {});
check((await adm(`select estado from public.solicitudes where id = $1`, [sol]))[0].estado === 'Pendiente Liberación', 'El solicitante no cambia el estado con un UPDATE directo');
await falla('com', `select public.ac_solicitud_liberar($1)`, [sol], 'Compras no libera (no es aprobador)');
const lib = (await uno('ger', `select public.ac_solicitud_liberar($1) r`, [sol])).r;
const req = lib.requerimiento_id;
check(!!req, 'Liberar crea el requerimiento En Proceso');
check((await adm(`select count(*)::int n from public.requerimiento_items where requerimiento_id = $1`, [req]))[0].n === 3, 'El requerimiento trae los 3 ítems');

console.log('\n2. Requerimiento, SKU y validación técnica');
await falla('com', `select public.ac_req_emitir($1)`, [req], 'Compras no emite el requerimiento (lo emite el área emisora)');
await falla('pcp', `select public.ac_req_emitir($1)`, [req], 'Sin destino ni tipo de compra no se emite');
await como('pcp', `update public.requerimientos set tipo_compra = 'Nacional', destino = 'Almacén Lima', concepto_general = 'Equipamiento de proyecto' where id = $1`, [req]);
const rq = (await uno('pcp', `select public.ac_req_emitir($1) r`, [req])).r;
check(/^RC-/.test(rq.numero), 'Planeamiento emite ' + rq.numero);
await como('pcp', `select public.ac_req_rq_sidige($1, 'RQ-000123')`, [req]);
const items = await adm(`select id, descripcion, cantidad from public.requerimiento_items where requerimiento_id = $1 order by n_item`, [req]);
await falla('com', `select public.ac_item_tecnica($1, 'Validado')`, [items[0].id], 'Compras no hace la validación técnica');
for (const it of items) await como('tec', `select public.ac_item_tecnica($1, 'Validado', 'MarcaX', 'M-1')`, [it.id]);
const visto = await como('tec', `select count(*)::int n from public.ordenes`);
check(visto[0].n === 0, 'Técnica no ve órdenes (no ve precios)');

console.log('\n3. Orden nacional < S/ 5,000: aprobación única');
const prov = (await uno('com', `insert into public.proveedores (ruc, razon_social, correo) values ('20100047218','Proveedor Uno SAC','ventas@proveedor.pe') returning id`)).id;
check((await adm(`select public.ruc_valido('20100047218') a, public.ruc_valido('20100047219') b`))[0].a === true, 'RUC válido por módulo 11');
await falla('com', `select public.ac_oc_crear($1,'Nacional','PEN',$2::jsonb)`, [prov, JSON.stringify([{ item_id: items[0].id, cantidad: 11, precio_unit: 100 }])], 'No se pide más que el saldo (eso es demasía)');
const oc = (await uno('com', `select public.ac_oc_crear($1,'Nacional','PEN',$2::jsonb) r`, [prov, JSON.stringify([
  { item_id: items[0].id, cantidad: 10, precio_unit: 250 }, { item_id: items[1].id, cantidad: 20, precio_unit: 40 }])])).r.id;
let o = (await adm(`select * from public.ordenes where id = $1`, [oc]))[0];
check(Number(o.monto) === 3894, 'Monto con IGV: 3,300 + 594 = ' + o.monto);
await falla('com', `select public.ac_oc_emitir($1)`, [oc], 'No se emite sin cotización');
await como('com', `insert into public.documentos (orden_id, tipo_doc, nombre_archivo, subido_por) values ($1,'Cotización','cot.pdf',$2)`, [oc, U.com[0]]);
await falla('com', `update public.ordenes set estatus = 'Aprobada' where id = $1`, [oc], 'Compras no puede poner el estatus a mano');
const emi = (await uno('com', `select public.ac_oc_emitir($1) r`, [oc])).r;
check(/^INROPRIN-NAC-\d{4}-0001$/.test(emi.numero), 'Numeración por serie: ' + emi.numero);
await falla('gop', `select public.ac_oc_aprobar_gop($1)`, [oc], 'La GOP no aprueba antes de que CG valide el presupuesto');
let acc = (await como('cg', `select accion from public.acciones_disponibles('ordenes', $1)`, [oc])).map(r => r.accion);
check(acc.includes('validar_ppto') && acc.includes('observar_ppto') && !acc.includes('aprobar_gop'), 'Botones de CG: ' + acc.join(', '));
await como('cg', `select public.ac_oc_observar_ppto($1, 'Falta sustento del centro de costo')`, [oc]);
o = (await adm(`select estatus from public.ordenes where id = $1`, [oc]))[0];
check(o.estatus === 'Observado por Ppto', 'CG observa → ' + o.estatus);
await como('com', `update public.ordenes set terminos = 'Entrega en 15 días' where id = $1`, [oc]);
check(true, 'Con la orden observada, Compras puede editarla');
await como('com', `select public.ac_oc_reenviar($1)`, [oc]);
o = (await adm(`select estatus, aprobacion_ppto from public.ordenes where id = $1`, [oc]))[0];
check(o.estatus === 'Pendiente de aprobación' && o.aprobacion_ppto === 'Subsanado', 'Reenviada: vuelve a CG con Ppto «Subsanado»');
await como('cg', `select public.ac_oc_validar_ppto($1, 'Presupuestado')`, [oc]);
o = (await adm(`select tipo_aprobacion, estado_aprobacion from public.ordenes where id = $1`, [oc]))[0];
check(o.tipo_aprobacion === 'Aprobación Única', 'Ruta: ' + o.tipo_aprobacion);
const toca = (await como('gop', `select paso from public.te_toca()`)).map(r => r.paso);
check(toca.includes('Aprobar orden'), 'A la GOP le aparece en «Te toca»');
await como('gop', `select public.ac_oc_aprobar_gop($1)`, [oc]);
o = (await adm(`select estatus, estado_aprobacion, fecha_aprobacion from public.ordenes where id = $1`, [oc]))[0];
check(o.estado_aprobacion === 'Aprobado para Compra' && o.estatus === 'Legajo incompleto', 'Aprobada → ' + o.estatus);
const cuotas = await adm(`select * from public.pagos where orden_id = $1`, [oc]);
check(cuotas.length === 1 && cuotas[0].estado_pago === 'Plan' && Number(cuotas[0].monto_pago) === 3894, 'Contado: 1 cuota en Plan por el total');
const cola = (await adm(`select tipo from public.cola_trabajos order by id`)).map(r => r.tipo);
check(cola.includes('crear_carpeta') && cola.includes('pdf_oc') && cola.includes('notificar'), 'Se encolaron carpeta de Drive, PDF y correos');

console.log('\n4. Envío, factura y pago');
await falla('com', `select public.ac_oc_enviar($1, 'ventas@proveedor.pe')`, [oc], 'No se envía si Finanzas no evaluó al proveedor');
await como('fin', `select public.ac_proveedor_evaluar($1, 'Aprobado')`, [prov]);
await como('com', `select public.ac_oc_enviar($1, 'ventas@proveedor.pe')`, [oc]);
await como('con', `select public.ac_proveedor_retencion($1, false, false)`, [prov]);
await como('com', `insert into public.documentos (orden_id, tipo_doc, numero, fecha_doc, monto_doc, moneda, nombre_archivo, subido_por) values ($1,'Factura','F001-123',current_date,3894,'PEN','f.pdf',$2)`, [oc, U.com[0]]);
let g = (await adm(`select * from public.pagos where orden_id = $1`, [oc]))[0];
check(g.estado_pago === 'Solicitado' && g.comentario === 'Solicitado automáticamente al subir factura', 'Al subir la factura la cuota se solicita sola');
check(g.aplica_retencion && Number(g.monto_retencion) === 116.82, 'Retención 3 %: ' + g.monto_retencion);
o = (await adm(`select estatus from public.ordenes where id = $1`, [oc]))[0];
check(o.estatus === 'Pago pendiente', 'Estatus → Pago pendiente');
await falla('com', `select public.ac_pago_programar($1, current_date)`, [g.id], 'Compras no programa pagos');
await como('fin', `select public.ac_pago_programar($1, current_date)`, [g.id]);
await falla('com', `select public.ac_pago_pagado($1, 'OP-1')`, [g.id], 'Compras no marca pagado (en el AppSheet sí podía)');
await como('fin', `select public.ac_pago_pagado($1, 'OP-998877')`, [g.id]);
o = (await adm(`select estatus from public.ordenes where id = $1`, [oc]))[0];
check(o.estatus === 'OC pagada', 'Pagada → ' + o.estatus);
const sg = await como('tec', `select descripcion, saldo, pagado from public.seguimiento_items($1)`, [proy]);
check(sg.find(r => r.descripcion === 'Torno de banco')?.pagado === true, 'Técnica ve el avance sin montos (seguimiento)');

console.log('\n5. Orden ≥ S/ 5,000 con demasía: conjunta');
const oc2 = (await uno('com', `select public.ac_oc_crear($1,'Nacional','USD',$2::jsonb) r`, [prov, JSON.stringify([{ item_id: items[2].id, cantidad: 5, precio_unit: 400 }])])).r.id;
await como('com', `insert into public.documentos (orden_id, tipo_doc, nombre_archivo, subido_por) values ($1,'Cotización','c2.pdf',$2)`, [oc2, U.com[0]]);
const lin2 = (await adm(`select id from public.oc_lineas where orden_id = $1`, [oc2]))[0].id;
await como('com', `select public.ac_oc_demasia($1, 1, 'El proveedor vende por caja')`, [lin2]);
await como('com', `select public.ac_oc_emitir($1)`, [oc2]);
await como('cg', `select public.ac_oc_validar_ppto($1, 'Presupuestado')`, [oc2]);
o = (await adm(`select tipo_aprobacion, monto, monto_soles from public.ordenes where id = $1`, [oc2]))[0];
check(o.tipo_aprobacion === 'Aprobación Conjunta', `US$ ${o.monto} = S/ ${o.monto_soles} → ${o.tipo_aprobacion}`);
await como('gaf', `select public.ac_oc_aprobar_gaf($1)`, [oc2]);
o = (await adm(`select estatus from public.ordenes where id = $1`, [oc2]))[0];
check(o.estatus === 'Pendiente de aprobación', 'Con solo la GAF sigue pendiente');
await como('gop', `select public.ac_oc_aprobar_gop($1, false)`, [oc2]);
o = (await adm(`select estatus, monto from public.ordenes where id = $1`, [oc2]))[0];
const dem = (await adm(`select demasia_estado from public.oc_lineas where orden_id = $1 and es_demasia`, [oc2]))[0];
check(o.estatus === 'Legajo incompleto' && dem.demasia_estado === 'Rechazada', 'GOP aprueba sin la demasía: queda ' + o.monto + ' y la demasía rechazada');

console.log('\n6. Modificación que sube el monto → reaprobación');
await como('com', `select public.ac_oc_modificar($1, 'Cambio de modelo')`, [oc2]);
await como('com', `update public.oc_lineas set precio_unit = 450 where orden_id = $1 and not es_demasia`, [oc2]);
const cm = (await uno('com', `select public.ac_oc_confirmar_modificacion($1) r`, [oc2])).r;
o = (await adm(`select estatus, revision, aprobacion_gop, aprobacion_gaf from public.ordenes where id = $1`, [oc2]))[0];
check(cm.reaprobacion && o.estatus === 'Pendiente de aprobación' && o.revision === 1 && !o.aprobacion_gaf, 'Rev. 1 vuelve a aprobación y se limpian las firmas');

console.log('\n7. Anulación: la pide Compras, la decide la jefatura');
await falla('gop', `select public.ac_oc_pedir_anulacion($1, 'x')`, [oc2], 'La GOP no «pide» anulación (ella anula directo)');
await como('com', `select public.ac_oc_pedir_anulacion($1, 'El cliente canceló')`, [oc2]);
await falla('jci', `select public.ac_oc_decidir_anulacion($1, true)`, [oc2], 'La jefatura de importaciones no decide una orden nacional');
await como('jcn', `select public.ac_oc_decidir_anulacion($1, true)`, [oc2]);
o = (await adm(`select estatus from public.ordenes where id = $1`, [oc2]))[0];
check(o.estatus === 'Anulada', 'Anulada por la jefatura nacional');
check(Number((await adm(`select public.saldo_item($1) s`, [items[2].id]))[0].s) === 5, 'El saldo del ítem vuelve a estar disponible');

console.log('\n8. Importación y desaduanaje');
const pext = (await uno('imp', `insert into public.proveedores (razon_social, origen, pais, evaluacion_fin) values ('Overseas Ltd','Extranjero','China','Pendiente') returning id`)).id;
await como('fin', `select public.ac_proveedor_evaluar($1, 'Aprobado')`, [pext]);
await falla('imp', `select public.ac_oc_crear($1,'Importación','USD',$2::jsonb)`, [prov, JSON.stringify([{ item_id: items[2].id, cantidad: 5, precio_unit: 300 }])], 'Importación con proveedor nacional: no');
const oc3 = (await uno('imp', `select public.ac_oc_crear($1,'Importación','USD',$2::jsonb, null, 'Adelanto') r`, [pext, JSON.stringify([{ item_id: items[2].id, cantidad: 5, precio_unit: 300 }])])).r.id;
await como('imp', `update public.ordenes set pct_adelanto = 0.3, hito_saldo = 'Contra BL', incoterm = 'FOB' where id = $1`, [oc3]);
await como('imp', `insert into public.documentos (orden_id, tipo_doc, nombre_archivo, subido_por) values ($1,'Cotización','pi.pdf',$2)`, [oc3, U.imp[0]]);
const e3 = (await uno('imp', `select public.ac_oc_emitir($1) r`, [oc3])).r;
check(/IMP/.test(e3.numero) && (await adm(`select tipo_impuesto from public.ordenes where id=$1`, [oc3]))[0].tipo_impuesto === 'Sin IGV', 'Serie IMP y «Sin IGV»: ' + e3.numero);
await como('cg', `select public.ac_oc_validar_ppto($1, 'Presupuestado')`, [oc3]);
await como('gop', `select public.ac_oc_aprobar_gop($1)`, [oc3]);
await como('gaf', `select public.ac_oc_aprobar_gaf($1)`, [oc3]);
const c3 = await adm(`select tipo_pago, monto_pago from public.pagos where orden_id = $1 order by n_cuota`, [oc3]);
check(c3.length === 2 && c3[0].tipo_pago === 'Adelanto' && Number(c3[0].monto_pago) === 450, 'Adelanto 30 % + saldo contra BL');
const des = (await uno('imp', `select public.ac_des_crear($1, 'Marítimo') r`, [oc3])).r.id;
await falla('imp', `select public.ac_des_avanzar($1)`, [des], 'Sin documentos no pasa a «Documentos completos»');
await como('imp', `update public.desaduanajes set chk_factura = true, chk_bl = true, chk_cert_origen = true, chk_seguro = true where id = $1`, [des]);
await como('imp', `select public.ac_des_avanzar($1)`, [des]);
await falla('imp', `select public.ac_des_avanzar($1)`, [des], 'Para numerar pide el N° de DAM');
await adm(`insert into public.tc_costeo (moneda, tc, vigente_desde) values ('USD', 3.80, current_date - 1)`);
await como('imp', `select public.ac_des_avanzar($1, current_date, '118-2026-10-000123')`, [des]);
check(Number((await adm(`select tc_usd from public.desaduanajes where id = $1`, [des]))[0].tc_usd) === 3.8, 'TC congelado al numerar la DAM: 3.80');
for (let i = 0; i < 3; i++) await como('imp', `select public.ac_des_avanzar($1)`, [des]);
await como('con', `insert into public.des_gastos (desaduanaje_id, concepto, entra_costo, moneda, monto_sin_igv, tc_costeo, registrado_por) values ($1,'Flete internacional',true,'USD',200,3.8,$2)`, [des, U.con[0]]);
const cierre = (await uno('imp', `select public.ac_des_cerrar_costeo($1) r`, [des])).r;
const d = (await adm(`select estado, fi from public.desaduanajes where id = $1`, [des]))[0];
check(d.estado === 'Costeo cerrado' && cierre.version === 1 && Number(d.fi) > 1, 'Costeo cerrado v1, FI = ' + d.fi);
await falla('con', `insert into public.des_gastos (desaduanaje_id, concepto, entra_costo, moneda, monto_sin_igv, registrado_por) values ($1,'Multa / gasto posterior',true,'PEN',100,$2)`, [des, U.con[0]], 'Con el costeo cerrado no se agregan gastos');
await falla('imp', `select public.ac_des_reabrir($1, 'Multa')`, [des], 'Importaciones (sin jefatura) no reabre');
await como('jci', `select public.ac_des_reabrir($1, 'Multa de SUNAT que llegó después')`, [des]);
await como('con', `insert into public.des_gastos (desaduanaje_id, concepto, entra_costo, moneda, monto_sin_igv, registrado_por) values ($1,'Multa / gasto posterior',true,'PEN',100,$2)`, [des, U.con[0]]);
const c2 = (await uno('imp', `select public.ac_des_cerrar_costeo($1) r`, [des])).r;
check(c2.version === 2 && (await adm(`select count(distinct version)::int n from public.des_costeo_hist where desaduanaje_id = $1`, [des]))[0].n === 2, 'Reabierto y cerrado otra vez: versión 2 en el historial');

console.log('\n9. Historial');
const h = await adm(`select count(*)::int n from public.historial`);
check(h[0].n > 30, 'Cada paso dejó historial: ' + h[0].n + ' registros');

console.log(`\n${ok} correctas, ${mal} con error`);
process.exit(mal ? 1 : 0);
