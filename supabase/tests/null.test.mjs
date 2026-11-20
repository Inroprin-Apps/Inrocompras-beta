// Prueba de los agujeros por lógica de tres valores (NULL) en las reglas (0006) sobre Postgres real (PGlite).
//   node supabase/tests/null.test.mjs
// Cada caso arma el NULL que dejaba pasar a quien no debía y comprueba que ahora se le niega
// (y que la persona correcta sigue pudiendo).
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
await db.exec(leer('migrations/0005_equipo.sql'));
await db.exec(leer('migrations/0006_correcciones_null.sql'));
await db.exec(`grant usage, select on all sequences in schema public to authenticated;`);

// Personas de prueba (inventadas)
const U = {
  sol:  ['33333333-0000-0000-0000-000000000001', 'Comercial', []],
  ger:  ['33333333-0000-0000-0000-000000000002', 'Proyectos', []],
  pcp:  ['33333333-0000-0000-0000-000000000003', 'Planeamiento', []],
  otro: ['33333333-0000-0000-0000-000000000004', 'Almacén', []],          // nadie: ni área ni rol que le dé permiso
  com:  ['33333333-0000-0000-0000-000000000005', 'Compras', []],
  cg:   ['33333333-0000-0000-0000-000000000007', 'Control de Gestión', ['CONTROL_GESTION']],
  gop:  ['33333333-0000-0000-0000-000000000008', 'Gerencia', ['GOP']],
};
for (const [k, [id, area, roles]] of Object.entries(U)) {
  await db.query(`insert into public.usuarios (id, email, nombre, area) values ($1, $2, $3, $4)`, [id, k + '@inroprin.com', 'Persona ' + k, area]);
  for (const r of roles) await db.query(`insert into public.usuario_roles (usuario_id, rol) values ($1, $2)`, [id, r]);
}

async function como(k, sql, params = []) {
  await db.exec(`reset role; select set_config('test.uid', '${U[k][0]}', false); set role authenticated;`);
  try { return (await db.query(sql, params)).rows; } finally { await db.exec('reset role'); }
}
async function falla(k, sql, params, msg, re) {
  try { await como(k, sql, params); check(false, msg + ' (debió fallar)'); }
  catch (e) {
    const m = e.message.split('\n')[0];
    check(!re || re.test(m), msg + ' → «' + m + '»');
  }
}
const uno = async (k, sql, p) => (await como(k, sql, p))[0];
const adm = async (sql, p) => (await db.query(sql, p)).rows;
const acciones = async (k, tabla, id) => (await como(k, `select accion from public.acciones_disponibles($1, $2)`, [tabla, id])).map((r) => r.accion);

console.log('\n1. Aprobadores de etapa con un NULL en la lista (liberar / rechazar solicitud)');
const proy = (await adm(`insert into public.proyectos (codigo, nombre, cliente, estado, gerente_id) values ('P-N01','Proyecto N','Cliente','Ganado',$1) returning id`, [U.ger[0]]))[0].id;
// Control de Gestión arma las etapas por RLS; un aprobador sin elegir llega como NULL dentro del arreglo.
const etapa = (await uno('cg', `insert into public.proyecto_etapas (proyecto_id, nombre, orden, aprobadores) values ($1,'Adquisición',1,array[$2::uuid, null]) returning id`, [proy, U.ger[0]])).id;
const etapaVacia = (await uno('cg', `insert into public.proyecto_etapas (proyecto_id, nombre, orden, aprobadores) values ($1,'Muestras',2,array[null]::uuid[]) returning id`, [proy])).id;

async function nuevaSolicitud(etapaId, sustento) {
  const s = (await uno('sol', `insert into public.solicitudes (tipo, proyecto_id, etapa_id, solicitante_id, sustento) values ('Proyecto',$1,$2,$3,$4) returning id`, [proy, etapaId, U.sol[0], sustento])).id;
  await como('sol', `insert into public.solicitud_items (solicitud_id, n_item, descripcion, cantidad) values ($1,1,'Equipo',2)`, [s]);
  return s;
}
const s1 = await nuevaSolicitud(etapa, 'Compra de equipos');
await como('sol', `select public.ac_solicitud_emitir($1)`, [s1]);
check(!(await acciones('otro', 'solicitudes', s1)).includes('liberar'), 'Quien no es aprobador no ve «Liberar»');
await falla('otro', `select public.ac_solicitud_liberar($1)`, [s1], 'Ni puede liberarla', /No eres aprobador/);
await falla('otro', `select public.ac_solicitud_rechazar($1, 'no')`, [s1], 'Ni rechazarla', /No eres aprobador/);
check((await adm(`select estado from public.solicitudes where id = $1`, [s1]))[0].estado === 'Pendiente Liberación', 'La solicitud sigue pendiente de liberación');
check((await como('otro', `select * from public.te_toca()`)).length === 0, 'Y no le aparece en «Te toca»');
check((await acciones('ger', 'solicitudes', s1)).includes('liberar'), 'El gerente (aprobador real) sí ve «Liberar»');

const s0 = await nuevaSolicitud(etapaVacia, 'Muestras');
await falla('sol', `select public.ac_solicitud_emitir($1)`, [s0], 'Una etapa cuyo único «aprobador» es NULL cuenta como sin aprobadores', /La etapa del proyecto no tiene aprobadores/);

console.log('\n2. Anulación de requerimiento: decidir');
const lib = (await uno('ger', `select public.ac_solicitud_liberar($1) r`, [s1])).r;
const req = lib.requerimiento_id;
const an = (await uno('sol', `select public.ac_anulacion_solicitar($1, null, 'Ya no se necesita', 'El cliente redujo el alcance') r`, [req])).r.id;
check((await acciones('otro', 'anulaciones', an)).length === 0, 'Quien no es aprobador no ve botones en la anulación');
await falla('otro', `select public.ac_anulacion_decidir($1, true)`, [an], 'Ni puede aprobarla', /No eres aprobador de esta anulación/);
check((await adm(`select estado from public.anulaciones where id = $1`, [an]))[0].estado === 'Pendiente', 'La anulación sigue pendiente');
check((await acciones('ger', 'anulaciones', an)).includes('aprobar'), 'El aprobador de la etapa sí la decide');

console.log('\n3. Anulación de requerimiento sin solicitud (p. ej. migrado del AppSheet): pedir');
const reqSinSol = (await adm(`insert into public.requerimientos (area_emisora, motivo) values ('Planeamiento','RQ migrado') returning id`))[0].id;
await falla('otro', `select public.ac_anulacion_solicitar($1, null, 'Otro', 'porque sí')`, [reqSinSol], 'Alguien ajeno no pide la anulación de un requerimiento sin solicitud',
  /La pide el área emisora, Compras o quien hizo la solicitud/);
check((await adm(`select count(*)::int n from public.anulaciones where requerimiento_id = $1`, [reqSinSol]))[0].n === 0, 'Y no queda una anulación pendiente que bloquee la emisión');
await como('pcp', `select public.ac_anulacion_solicitar($1, null, 'Otro', 'Duplicado')`, [reqSinSol]);
check((await adm(`select count(*)::int n from public.anulaciones where requerimiento_id = $1`, [reqSinSol]))[0].n === 1, 'El área emisora sí la pide');

console.log('\n4. Enviar al proveedor una orden aprobada sin proveedor');
const prov = (await adm(`insert into public.proveedores (ruc, razon_social, correo) values ('20100047218','Proveedor Sin Evaluar SAC','v@p.pe') returning id`))[0].id;
const oc = (await adm(`insert into public.ordenes (numero, proveedor_id, comprador_id, estatus) values ('INROPRIN-NAC-2026-0900',$1,$2,'Pendiente de aprobación') returning id`, [prov, U.com[0]]))[0].id;
await adm(`insert into public.oc_lineas (orden_id, n_linea, descripcion, cantidad, precio_unit) values ($1,1,'Servicio',1,100)`, [oc]);
// Sin firmas, la orden es editable: Compras puede vaciar el proveedor con un UPDATE directo (RLS + proteger lo permiten).
await como('com', `update public.ordenes set proveedor_id = null where id = $1`, [oc]);
check((await adm(`select proveedor_id from public.ordenes where id = $1`, [oc]))[0].proveedor_id === null, 'Compras deja la orden sin proveedor antes de las firmas');
await como('cg', `select public.ac_oc_validar_ppto($1, 'Presupuestado')`, [oc]);
await como('gop', `select public.ac_oc_aprobar_gop($1)`, [oc]);
check((await adm(`select estado_aprobacion from public.ordenes where id = $1`, [oc]))[0].estado_aprobacion === 'Aprobado para Compra', 'La orden queda aprobada');
check(!(await acciones('com', 'ordenes', oc)).includes('enviar'), 'Sin proveedor no aparece «Enviar al proveedor»');
await falla('com', `select public.ac_oc_enviar($1, 'v@p.pe')`, [oc], 'Ni se puede enviar saltándose la evaluación de Finanzas', /Elige el proveedor/);
check((await adm(`select envio_solicitado from public.ordenes where id = $1`, [oc]))[0].envio_solicitado === null, 'No se encoló ningún envío');
await adm(`update public.ordenes set proveedor_id = $1 where id = $2`, [prov, oc]);
await falla('com', `select public.ac_oc_enviar($1, 'v@p.pe')`, [oc], 'Con el proveedor sin evaluar sigue sin enviarse', /Finanzas aún no evalúa al proveedor/);
await adm(`update public.proveedores set evaluacion_fin = 'Aprobado' where id = $1`, [prov]);
await como('com', `select public.ac_oc_enviar($1, 'v@p.pe')`, [oc]);
check((await adm(`select envio_solicitado from public.ordenes where id = $1`, [oc]))[0].envio_solicitado !== null, 'Evaluado por Finanzas, Compras sí la envía');

console.log('\n5. «Te toca» y seguimiento para una persona desactivada');
const s2 = await nuevaSolicitud(etapa, 'Otra compra');
await como('sol', `select public.ac_solicitud_emitir($1)`, [s2]);
check((await como('ger', `select paso from public.te_toca()`)).some((r) => r.paso === 'Liberar solicitud'), 'Activo, al gerente le toca liberar');
check((await como('ger', `select * from public.seguimiento_items()`)).length > 0, 'Activo, ve el seguimiento de ítems');
await adm(`update public.usuarios set activo = false where id = $1`, [U.ger[0]]);
check((await como('ger', `select * from public.te_toca()`)).length === 0, 'Desactivado, «Te toca» no le muestra nada');
check((await como('ger', `select * from public.seguimiento_items()`)).length === 0, 'Ni el seguimiento de ítems');
await falla('ger', `select public.ac_solicitud_liberar($1)`, [s2], 'Ni puede liberar (ya lo cubría exigir_usuario)');

console.log(`\n${ok} correctas, ${mal} con error`);
process.exit(mal ? 1 : 0);
