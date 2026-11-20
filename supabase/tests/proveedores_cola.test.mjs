// Prueba de 0020 (proveedores) y 0021 (cola de trabajos) sobre Postgres real (PGlite).
//   node supabase/tests/proveedores_cola.test.mjs
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
  create role authenticated nologin; create role anon nologin; create role service_role nologin bypassrls;
  grant usage on schema public to authenticated, service_role;
  grant usage on schema auth to authenticated;   -- como en Supabase (auth.uid() desde una función sin SECURITY DEFINER)
`);
for (const f of ['0001_esquema.sql', '0002_seguridad.sql', '0003_acciones.sql']) await db.exec(leer('migrations/' + f));
await db.exec(leer('seed.sql'));
for (const f of ['0005_equipo.sql', '0006_correcciones_null.sql', '0007_permisos_supabase.sql', '0008_permisos_equipo.sql',
                 '0020_proveedores.sql', '0021_cola.sql', '0022_configuracion.sql', '0023_inropay.sql'])
  await db.exec(leer('migrations/' + f));
await db.exec(`grant usage, select on all sequences in schema public to authenticated;
               grant all on all tables in schema public to service_role;`);

// Personas de prueba (inventadas)
const U = {
  com:  ['55555555-0000-0000-0000-000000000001', 'Compras', []],
  fin:  ['55555555-0000-0000-0000-000000000002', 'Finanzas', ['FINANZAS']],
  con:  ['55555555-0000-0000-0000-000000000003', 'Contabilidad', ['CONTABILIDAD']],
  otro: ['55555555-0000-0000-0000-000000000004', 'Almacén', []],
  adm:  ['55555555-0000-0000-0000-000000000005', 'Administración', ['ADMIN']],
  inac: ['55555555-0000-0000-0000-000000000006', 'Finanzas', ['FINANZAS']],
};
for (const [k, [id, area, roles]] of Object.entries(U)) {
  await db.query(`insert into public.usuarios (id, email, nombre, area) values ($1, $2, $3, $4)`, [id, k + '@inroprin.com', 'Persona ' + k, area]);
  for (const r of roles) await db.query(`insert into public.usuario_roles (usuario_id, rol) values ($1, $2)`, [id, r]);
}
await db.query(`update public.usuarios set activo = false where id = $1`, [U.inac[0]]);

async function como(k, sql, params = []) {
  await db.exec(`reset role; select set_config('test.uid', '${U[k]?.[0] ?? ''}', false); set role ${k === 'servidor' ? 'service_role' : 'authenticated'};`);
  try { return (await db.query(sql, params)).rows; } finally { await db.exec('reset role'); }
}
async function falla(k, sql, params, msg, re) {
  try { await como(k, sql, params); check(false, msg + ' (debió fallar)'); }
  catch (e) { const m = e.message.split('\n')[0]; check(!re || re.test(m), msg + ' → «' + m + '»'); }
}
const uno = async (k, sql, p) => (await como(k, sql, p))[0];
const adm = async (sql, p) => (await db.query(sql, p)).rows;
const acciones = async (k, id) => (await como(k, `select accion from public.acciones_disponibles('proveedores', $1)`, [id])).map((r) => r.accion);

console.log('\n1. Alta de proveedores');
await falla('com', `insert into public.proveedores (ruc, razon_social, origen) values ('20100100102', 'RUC malo SAC', 'Nacional')`, [],
  'Un RUC nacional con el dígito verificador mal se rechaza', /RUC no es válido/);
await falla('com', `insert into public.proveedores (razon_social, origen) values ('Sin RUC SAC', 'Nacional')`, [],
  'Un nacional sin RUC se rechaza', /RUC no es válido/);
await falla('com', `insert into public.proveedores (razon_social, origen) values ('Abroad Inc', 'Extranjero')`, [],
  'Un extranjero sin país se rechaza', /país/);
const prov = (await uno('com', `insert into public.proveedores (ruc, razon_social, origen, evaluacion_fin, verificado_contab)
                                values (' 20100100101 ', 'Proveedor Bueno SAC', 'Nacional', 'Aprobado', true) returning *`)) ;
check(prov.ruc === '20100100101', 'El RUC válido se acepta (sin espacios)');
check(prov.evaluacion_fin === 'Pendiente' && prov.verificado_contab === false, 'Compras no puede darlo de alta ya aprobado ni verificado');
check(prov.creado_por === U.com[0], 'Queda quién lo dio de alta');
await falla('com', `insert into public.proveedores (ruc, razon_social, origen) values ('20100100101', 'Duplicado SAC', 'Nacional')`, [],
  'El mismo RUC no se da de alta dos veces', /Ya hay un proveedor con el RUC/);
const ext = (await uno('com', `insert into public.proveedores (razon_social, origen, pais) values ('Abroad Inc', 'Extranjero', 'China') returning id`)).id;
check(!!ext, 'Un extranjero con país se acepta sin RUC');
await falla('otro', `insert into public.proveedores (ruc, razon_social, origen) values ('20555666773', 'Otro SAC', 'Nacional')`, [],
  'Almacén no da de alta proveedores (RLS)', /row-level security|permission/);

console.log('\n2. Edición de datos (columnas editables)');
await como('com', `update public.proveedores set correo = 'ventas@ejemplo.pe', cuentas = '[{"banco":"BCP","moneda":"PEN","numero":"191-0000000-0-00","cci":"00219100000000000000"}]' where id = $1`, [prov.id]);
check((await adm(`select correo from public.proveedores where id = $1`, [prov.id]))[0].correo === 'ventas@ejemplo.pe', 'Compras edita el correo y las cuentas');
await falla('com', `update public.proveedores set evaluacion_fin = 'Aprobado' where id = $1`, [prov.id], 'Pero no la evaluación', /no se edita directo/);
await falla('com', `update public.proveedores set ruc = '20555666773' where id = $1`, [prov.id], 'Ni el RUC', /no se edita directo/);
await falla('com', `update public.proveedores set pais = '' where id = $1`, [ext], 'Un extranjero no se queda sin país', /país/);
await falla('com', `update public.proveedores set cuentas = '{}' where id = $1`, [prov.id], 'Las cuentas son una lista', /formato/);

console.log('\n3. Botones (acciones_disponibles base ∪ extra)');
check((await acciones('com', prov.id)).join() === 'pedir_evaluacion', 'Compras ve «Pedir evaluación»: ' + (await acciones('com', prov.id)).join());
check((await acciones('fin', prov.id)).sort().join() === 'evaluar_aprobar,evaluar_observar', 'Finanzas ve Aprobar y Observar');
check((await acciones('con', prov.id)).join() === 'verificar_retencion', 'Contabilidad ve «Verificar retención»');
check((await acciones('con', ext)).length === 0, 'Contabilidad no verifica un extranjero');
check((await acciones('otro', prov.id)).length === 0, 'Almacén no ve nada');
check((await acciones('inac', prov.id)).length === 0, 'Una persona desactivada no ve nada');
check((await acciones('fin', '00000000-0000-0000-0000-00000000dead')).length === 0, 'Un proveedor que no existe no tiene botones');
const ordenesBtns = await como('adm', `select count(*)::int n from public.acciones_disponibles('tablas_raras', $1)`, [prov.id]);
check(ordenesBtns[0].n === 0, 'Una tabla no permitida no devuelve nada');
check((await adm(`select has_function_privilege('anon', 'public.acciones_disponibles(text, uuid)', 'execute') a`))[0].a === false, 'anon no ejecuta acciones_disponibles');
check((await adm(`select has_function_privilege('authenticated', 'app.acciones_extra(text, uuid)', 'execute') a`))[0].a === false, 'acciones_extra es interna');

console.log('\n4. Pedir evaluación, evaluar y verificar');
await como('com', `select public.ac_proveedor_pedir_evaluacion($1)`, [prov.id]);
check((await adm(`select count(*)::int n from public.notificaciones where usuario_id = $1 and ref_id = $2`, [U.fin[0], prov.id]))[0].n === 1, 'Finanzas recibe la notificación');
check((await adm(`select count(*)::int n from public.historial where registro_id = $1 and accion = 'pedir_evaluacion'`, [prov.id]))[0].n === 1, 'Y queda en el historial');
await falla('com', `select public.ac_proveedor_evaluar($1, 'Aprobado')`, [prov.id], 'Compras no evalúa', /Finanzas/);
await falla('con', `select public.ac_proveedor_evaluar($1, 'Aprobado')`, [prov.id], 'Contabilidad tampoco', /Finanzas/);
await falla('fin', `select public.ac_proveedor_evaluar($1, 'Observado', '  ')`, [prov.id], 'Observar exige la nota', /observación/);
await falla('fin', `select public.ac_proveedor_evaluar('00000000-0000-0000-0000-00000000dead', 'Aprobado')`, [], 'Un id que no existe falla (antes daba ok)', /No existe/);
await falla('inac', `select public.ac_proveedor_evaluar($1, 'Aprobado')`, [prov.id], 'Finanzas desactivada no evalúa', /no está activo/);
await como('fin', `select public.ac_proveedor_evaluar($1, 'Observado', 'Falta la constancia de cuenta')`, [prov.id]);
check((await adm(`select evaluacion_fin, evaluacion_fin_nota from public.proveedores where id = $1`, [prov.id]))[0].evaluacion_fin_nota === 'Falta la constancia de cuenta', 'Finanzas observa con nota');
check((await adm(`select count(*)::int n from public.notificaciones where usuario_id = $1 and ref_id = $2`, [U.com[0], prov.id]))[0].n === 1, 'Quien pidió la evaluación se entera');
check((await acciones('fin', prov.id)).sort().join() === 'evaluar_aprobar,evaluar_observar', 'Observado: Finanzas puede aprobarlo después');
await como('fin', `select public.ac_proveedor_evaluar($1, 'Aprobado', null)`, [prov.id]);
check((await acciones('fin', prov.id)).join() === 'evaluar_observar', 'Aprobado: ya no ve «Aprobar», sí «Observar»');
check((await acciones('com', prov.id)).length === 0, 'Aprobado: Compras ya no pide evaluación');
await falla('com', `select public.ac_proveedor_pedir_evaluacion($1)`, [prov.id], 'Ni puede pedirla', /ya aprobó/);

await falla('fin', `select public.ac_proveedor_verificar_retencion($1, 'Sí', 'No')`, [prov.id], 'Finanzas no verifica la retención', /Contabilidad/);
await falla('con', `select public.ac_proveedor_verificar_retencion($1, '', 'No')`, [prov.id], 'Hay que responder las dos preguntas', /Indica/);
await falla('con', `select public.ac_proveedor_verificar_retencion($1, 'Sí', 'No')`, [ext], 'No aplica a extranjeros', /extranjeros/);
await como('con', `select public.ac_proveedor_verificar_retencion($1, 'Sí', 'No')`, [prov.id]);
const v = (await adm(`select es_agente_retencion, es_buen_contribuyente, verificado_contab, verificado_por from public.proveedores where id = $1`, [prov.id]))[0];
check(v.es_agente_retencion === true && v.es_buen_contribuyente === false && v.verificado_contab && v.verificado_por === U.con[0], 'Contabilidad verifica: agente Sí, buen contribuyente No');
check((await acciones('con', prov.id)).length === 0, 'Verificado: ya no le toca');
await falla('com', `update public.proveedores set es_buen_contribuyente = true where id = $1`, [prov.id], 'Compras ya no cambia lo que verificó Contabilidad', /Contabilidad ya verificó/);
await como('com', `update public.proveedores set telefono = '999 000 111' where id = $1`, [prov.id]);
check((await adm(`select telefono from public.proveedores where id = $1`, [prov.id]))[0].telefono === '999 000 111', 'Pero sí sus otros datos');
await como('adm', `update public.proveedores set es_buen_contribuyente = true where id = $1`, [prov.id]);
check((await adm(`select es_buen_contribuyente from public.proveedores where id = $1`, [prov.id]))[0].es_buen_contribuyente === true, 'El administrador sí lo corrige');
await falla('con', `select public.ac_proveedor_retencion($1, true, true)`, [prov.id], 'Ni se verifica dos veces', /Ya está verificado/);

console.log('\n5. Cola de trabajos (servidor)');
check((await adm(`select has_function_privilege('authenticated', 'public.cola_tomar(int)', 'execute') a`))[0].a === false, 'authenticated no toma trabajos');
check((await adm(`select has_function_privilege('anon', 'public.cola_terminar(bigint, boolean, text, text)', 'execute') a`))[0].a === false, 'anon no termina trabajos');
await falla('adm', `select * from public.cola_tomar(5)`, [], 'Ni siquiera el administrador', /permission denied/);
await adm(`delete from public.cola_trabajos`);
await adm(`insert into public.cola_trabajos (tipo, ref_tabla, payload) values ('notificar','notificaciones','{"notificacion_id":1}'),
           ('pdf_oc','ordenes','{}'), ('sidige_escribir', null, '{}'), ('crear_carpeta','ordenes','{}')`);
await adm(`insert into public.cola_trabajos (tipo, procesar_desde) values ('notificar', now() + interval '1 hour')`);
const a = await como('servidor', `select * from public.cola_tomar(2)`);
const b = await como('servidor', `select * from public.cola_tomar(10)`);
check(a.length === 2 && b.length === 2, 'Dos tomas no se pisan: 2 + 2 (el programado para después no sale)');
check(new Set([...a, ...b].map((t) => t.id)).size === 4, 'Cada trabajo se toma una sola vez');
check([...a, ...b].every((t) => t.estado === 'En curso' && t.intentos === 1), 'Quedan «En curso» con el intento contado');
check((await como('servidor', `select * from public.cola_tomar(10)`)).length === 0, 'Mientras corren, nadie más los toma');

const [t1, t2, t3, t4] = [...a, ...b];
let r = (await uno('servidor', `select * from public.cola_terminar($1, true)`, [t1.id]));
check(r.estado === 'Hecho' && r.terminado, 'ok → Hecho');
r = (await uno('servidor', `select * from public.cola_terminar($1, true, 'SIDIGE fuera de esta etapa', 'Descartado')`, [t3.id]));
check(r.estado === 'Descartado' && /SIDIGE/.test(r.error), 'Descartado a propósito, con su motivo');
r = (await uno('servidor', `select * from public.cola_terminar($1, false, 'Drive no configurado', 'Error')`, [t4.id]));
check(r.estado === 'Error' && r.error === 'Drive no configurado', 'Sin credenciales → Error sin reintentos, con mensaje legible');
r = (await uno('servidor', `select * from public.cola_terminar($1, false, 'Se cayó la red')`, [t2.id]));
check(r.estado === 'Pendiente' && new Date(r.procesar_desde) > new Date(), 'Una falla vuelve a Pendiente con espera');
const espera = async () => Number((await adm(`select extract(epoch from procesar_desde - now()) s from public.cola_trabajos where id = $1`, [t2.id]))[0].s);
const e1 = await espera();
for (let i = 2; i <= 5; i++) {
  await adm(`update public.cola_trabajos set procesar_desde = now() - interval '1 second' where id = $1`, [t2.id]);
  const t = (await como('servidor', `select * from public.cola_tomar(1)`))[0];
  check(t?.id === t2.id && t.intentos === i, `Intento ${i}`);
  r = (await uno('servidor', `select * from public.cola_terminar($1, false, 'Se cayó la red')`, [t2.id]));
  if (i === 2) check((await espera()) > e1 + 30, 'La espera crece (1 min → 2 min)');
}
check(r.estado === 'Error' && r.error === 'Se cayó la red', 'Al 5.º intento queda en Error con el último mensaje');

// Un trabajo que se cortó a la mitad (la función del servidor murió): vuelve al vencer el plazo.
await adm(`insert into public.cola_trabajos (tipo) values ('archivar_doc')`);
const c1 = (await como('servidor', `select * from public.cola_tomar(1)`))[0];
await adm(`update public.cola_trabajos set procesar_desde = now() - interval '1 second' where id = $1`, [c1.id]);
const c2 = (await como('servidor', `select * from public.cola_tomar(1)`))[0];
check(c2?.id === c1.id && c2.intentos === 2, 'Un trabajo cortado a la mitad se retoma al vencer el plazo');
await adm(`update public.cola_trabajos set intentos = 5, procesar_desde = now() - interval '1 second' where id = $1`, [c1.id]);
check((await como('servidor', `select * from public.cola_tomar(1)`)).length === 0, 'Cortado 5 veces: no se retoma');
check((await adm(`select estado from public.cola_trabajos where id = $1`, [c1.id]))[0].estado === 'Error', 'Y queda en Error');

console.log('\n6. Cola en Configuración (solo el administrador)');
check((await como('fin', `select * from public.cola_listar()`)).length === 0, 'Finanzas no ve la cola');
const lista = await como('adm', `select * from public.cola_listar()`);
check(lista.length === 6 && lista[0].estado === 'Error', 'El administrador la ve, los errores primero');
const res = await como('adm', `select * from public.cola_resumen()`);
check(res.filter((x) => x.estado === 'Error').reduce((a, x) => a + Number(x.cantidad), 0) === 3, 'Y el resumen por estado y tipo');
await falla('fin', `select public.ac_cola_reintentar($1)`, [t4.id], 'Finanzas no reintenta', /Solo el administrador/);
await falla('adm', `select public.ac_cola_reintentar($1)`, [t1.id], 'Un trabajo Hecho no se reintenta', /Error o Descartado/);
await como('adm', `select public.ac_cola_reintentar($1)`, [t4.id]);
r = (await adm(`select * from public.cola_trabajos where id = $1`, [t4.id]))[0];
check(r.estado === 'Pendiente' && r.intentos === 0 && /Drive no configurado/.test(r.error), 'Reintentar lo deja Pendiente desde cero (con el error anterior a la vista)');
await falla('adm', `select public.ac_cola_descartar($1, '')`, [t4.id], 'Descartar pide motivo', /por qué/);
await como('adm', `select public.ac_cola_descartar($1, 'Duplicado')`, [t4.id]);
check((await adm(`select estado from public.cola_trabajos where id = $1`, [t4.id]))[0].estado === 'Descartado', 'El administrador lo descarta con motivo');
check((await como('adm', `select * from public.cola_trabajos`)).length === 0, 'Nadie lee la tabla de la cola directo (sin políticas)');

console.log('\n7. Configuración');
await como('fin', `update public.monedas set tasa_a_soles = 3.80 where id = 'USD'`);
const m = (await adm(`select tasa_a_soles, actualizado > now() - interval '1 minute' reciente from public.monedas where id = 'USD'`))[0];
check(Number(m.tasa_a_soles) === 3.8 && m.reciente, 'Finanzas actualiza una tasa y queda la fecha');
await falla('fin', `update public.monedas set tasa_a_soles = 0 where id = 'USD'`, [], 'Una tasa debe ser mayor que cero', /mayor que cero/);
await como('com', `update public.config set valor = '5' where clave = 'dias_alerta_plan'`);   // RLS: 0 filas
const antes = (await adm(`select valor from public.config where clave = 'dias_alerta_plan'`))[0].valor;
check(antes === 7, 'Compras no edita la configuración (RLS: sigue igual)');
await como('adm', `update public.config set valor = '10' where clave = 'dias_alerta_plan'`);
check((await adm(`select valor from public.config where clave = 'dias_alerta_plan'`))[0].valor === 10, 'El administrador la edita');
await como('adm', `insert into public.tc_costeo (moneda, tc, comentario) values ('USD', 3.77, 'Cierre de mes')`);
check((await adm(`select registrado_por from public.tc_costeo where comentario = 'Cierre de mes'`))[0].registrado_por === U.adm[0], 'El TC de costeo guarda quién lo registró');
await falla('adm', `insert into public.tc_costeo (moneda, tc) values ('USD', -1)`, [], 'Un TC de costeo debe ser mayor que cero', /mayor que cero/);

console.log('\n8. InroPay (webhook → inropay_actualizar, solo el servidor)');
check((await adm(`select has_function_privilege('authenticated', 'public.inropay_actualizar(uuid, text, date, text, text)', 'execute') a`))[0].a === false, 'authenticated no la ejecuta');
await falla('servidor', `select public.inropay_actualizar('00000000-0000-0000-0000-00000000dead', 'Pagado')`, [], 'Un pago que no existe falla (antes daba ok)', /No existe el pago/);
const oc = (await adm(`insert into public.ordenes (proveedor_id, comprador_id, estatus) values ($1, $2, 'Borrador') returning id`, [prov.id, U.com[0]]))[0].id;
const pago = (await adm(`insert into public.pagos (orden_id, tipo_pago, monto_pago) values ($1, 'Pago total', 100) returning id`, [oc]))[0].id;
await falla('servidor', `select public.inropay_actualizar($1, 'Pagado')`, [pago], 'Un pago en Plan (no solicitado) no se paga desde InroPay', /está «Plan»/);
await adm(`update public.pagos set estado_pago = 'Solicitado' where id = $1`, [pago]);
await como('servidor', `select public.inropay_actualizar($1, 'Programado', '2026-12-01')`, [pago]);
await como('servidor', `select public.inropay_actualizar($1, 'Pagado', '2026-12-02', 'OP-1', 'IP-9')`, [pago]);
const gp = (await adm(`select estado_pago, n_operacion, inropay_ref from public.pagos where id = $1`, [pago]))[0];
check(gp.estado_pago === 'Pagado' && gp.n_operacion === 'OP-1' && gp.inropay_ref === 'IP-9', 'Solicitado → Programado → Pagado, con operación y referencia');
check((await uno('servidor', `select public.inropay_actualizar($1, 'Pagado') r`, [pago])).r.sin_cambio === true, 'El aviso repetido no cambia nada');
await falla('servidor', `select public.inropay_actualizar($1, 'Programado')`, [pago], 'Pagado es final', /está «Pagado»/);
await falla('servidor', `select public.inropay_actualizar($1, 'Anulado')`, [pago], 'Estado fuera del contrato', /Estado no válido/);

console.log(`\n${ok} bien, ${mal} mal`);
process.exit(mal ? 1 : 0);
