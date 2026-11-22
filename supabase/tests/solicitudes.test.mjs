// Prueba de las correcciones de 0010 (solicitudes, carga Excel y anulaciones) sobre Postgres real (PGlite).
//   node supabase/tests/solicitudes.test.mjs
// Cada caso arma lo que antes pasaba (o rompía la carga) y comprueba que ahora se niega con un mensaje que dice qué hacer,
// y que el camino correcto sigue funcionando.
import { PGlite } from '@electric-sql/pglite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

process.on('unhandledRejection', (e) => {
    console.log('ERROR:', e.message, e.where || '');
    process.exit(1);
});
const aqui = path.dirname(fileURLToPath(import.meta.url));
const leer = (f) => fs.readFileSync(path.join(aqui, '..', f), 'utf8');
const db = new PGlite();
let ok = 0,
    mal = 0;
const check = (cond, msg) => {
    if (cond) {
        ok++;
        console.log('  ✓', msg);
    } else {
        mal++;
        console.log('  ✗', msg);
    }
};

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
await db.exec(leer('migrations/0007_permisos_supabase.sql'));
await db.exec(leer('migrations/0008_permisos_equipo.sql'));
await db.exec(leer('migrations/0010_solicitudes_reglas.sql'));
await db.exec(leer('migrations/0074_admin_libera_propias.sql'));
await db.exec(`grant usage, select on all sequences in schema public to authenticated;`);

// Personas de prueba (inventadas)
const U = {
    sol: ['33333333-0000-0000-0000-000000000001', 'Comercial', []],
    ger: ['33333333-0000-0000-0000-000000000002', 'Proyectos', []],
    pcp: ['33333333-0000-0000-0000-000000000003', 'Planeamiento', []],
    otro: ['33333333-0000-0000-0000-000000000004', 'Almacén', []], // nadie: ni área ni rol que le dé permiso
    com: ['33333333-0000-0000-0000-000000000005', 'Compras', []],
    cg: ['33333333-0000-0000-0000-000000000007', 'Control de Gestión', ['CONTROL_GESTION']],
    gop: ['33333333-0000-0000-0000-000000000008', 'Gerencia', ['GOP']],
};
for (const [k, [id, area, roles]] of Object.entries(U)) {
    await db.query(`insert into public.usuarios (id, email, nombre, area) values ($1, $2, $3, $4)`, [id, k + '@inroprin.com', 'Persona ' + k, area]);
    for (const r of roles) await db.query(`insert into public.usuario_roles (usuario_id, rol) values ($1, $2)`, [id, r]);
}

async function como(k, sql, params = []) {
    await db.exec(`reset role; select set_config('test.uid', '${U[k][0]}', false); set role authenticated;`);
    try {
        return (await db.query(sql, params)).rows;
    } finally {
        await db.exec('reset role');
    }
}
async function falla(k, sql, params, msg, re) {
    try {
        await como(k, sql, params);
        check(false, msg + ' (debió fallar)');
    } catch (e) {
        const m = e.message.split('\n')[0];
        check(!re || re.test(m), msg + ' → «' + m + '»');
    }
}
const uno = async (k, sql, p) => (await como(k, sql, p))[0];
const adm = async (sql, p) => (await db.query(sql, p)).rows;
const acciones = async (k, tabla, id) => (await como(k, `select accion from public.acciones_disponibles($1, $2)`, [tabla, id])).map((r) => r.accion);

console.log('\n1. Autoliberación: el solicitante se pone como jefe');
const adm1 = (
    await uno('sol', `insert into public.solicitudes (tipo, jefe_id, solicitante_id, sustento) values ('Administrativa',$1,$1,'Útiles') returning id`, [
        U.sol[0],
    ])
).id;
await como('sol', `insert into public.solicitud_items (solicitud_id, n_item, descripcion, cantidad) values ($1,1,'Papel',10)`, [adm1]);
check(!(await acciones('sol', 'solicitudes', adm1)).includes('emitir'), 'No le aparece «Emitir» con él mismo como jefe');
await falla('sol', `select public.ac_solicitud_emitir($1)`, [adm1], 'Ni puede emitirla', /no puedes liberar tu propia solicitud/);
// Aunque llegara a «Pendiente Liberación» (dato migrado), no se libera a sí mismo.
await adm(`update public.solicitudes set estado = 'Pendiente Liberación' where id = $1`, [adm1]);
check(!(await acciones('sol', 'solicitudes', adm1)).includes('liberar'), 'No ve «Liberar» en su propia solicitud');
await falla('sol', `select public.ac_solicitud_liberar($1)`, [adm1], 'Ni puede liberarla', /No eres aprobador/);
check(!(await como('sol', `select paso from public.te_toca()`)).some((r) => r.paso === 'Liberar solicitud'), 'Ni le aparece en «Te toca»');
await adm(`update public.solicitudes set estado = 'Borrador' where id = $1`, [adm1]);
await como('sol', `update public.solicitudes set jefe_id = $1 where id = $2`, [U.ger[0], adm1]);
await como('sol', `select public.ac_solicitud_emitir($1)`, [adm1]);
check((await acciones('ger', 'solicitudes', adm1)).includes('liberar'), 'Con su jefe real, el jefe sí la libera');

// Decisión 0074: el administrador sí libera las suyas (los demás, no).
const ADM = '33333333-0000-0000-0000-000000000099';
await adm(`insert into public.usuarios (id, email, nombre, area) values ($1, 'admin-prueba@inroprin.com', 'Persona admin', 'Administración')`, [ADM]);
await adm(`insert into public.usuario_roles (usuario_id, rol) values ($1, 'ADMIN')`, [ADM]);
U.adm = [ADM, 'Administración', ['ADMIN']];
const adm2 = (
    await uno(
        'adm',
        `insert into public.solicitudes (tipo, jefe_id, solicitante_id, sustento) values ('Administrativa',$1,$1,'Prueba del admin') returning id`,
        [ADM],
    )
).id;
await como('adm', `insert into public.solicitud_items (solicitud_id, n_item, descripcion, cantidad) values ($1,1,'Tóner',2)`, [adm2]);
await como('adm', `select public.ac_solicitud_emitir($1)`, [adm2]);
check((await acciones('adm', 'solicitudes', adm2)).includes('liberar'), 'El administrador sí ve «Liberar» en su propia solicitud (0074)');
await como('adm', `select public.ac_solicitud_liberar($1)`, [adm2]);
check((await adm(`select estado from public.solicitudes where id = $1`, [adm2]))[0].estado === 'En Req', 'Y la libera: pasa a requerimiento');

console.log('\n2. Proyecto: etapa de otro proyecto, proyecto no ganado, solicitante aprobador de su etapa');
const pA = (await adm(`insert into public.proyectos (codigo, nombre, estado, gerente_id) values ('P-A','Proyecto A','Ganado',$1) returning id`, [U.ger[0]]))[0]
    .id;
const pB = (await adm(`insert into public.proyectos (codigo, nombre, estado, gerente_id) values ('P-B','Proyecto B','Ganado',$1) returning id`, [U.ger[0]]))[0]
    .id;
const pC = (
    await adm(`insert into public.proyectos (codigo, nombre, estado, gerente_id) values ('P-C','Proyecto C','Estudio de mercado',$1) returning id`, [U.ger[0]])
)[0].id;
const eA = (
    await adm(`insert into public.proyecto_etapas (proyecto_id, nombre, aprobadores) values ($1,'General',array[$2::uuid]) returning id`, [pA, U.ger[0]])
)[0].id;
const eB = (
    await adm(`insert into public.proyecto_etapas (proyecto_id, nombre, aprobadores) values ($1,'General',array[$2::uuid]) returning id`, [pB, U.sol[0]])
)[0].id;
const eC = (
    await adm(`insert into public.proyecto_etapas (proyecto_id, nombre, aprobadores) values ($1,'General',array[$2::uuid]) returning id`, [pC, U.ger[0]])
)[0].id;
async function solProy(proy, etapa) {
    const s = (
        await uno(
            'sol',
            `insert into public.solicitudes (tipo, proyecto_id, etapa_id, solicitante_id, sustento) values ('Proyecto',$1,$2,$3,'Equipos') returning id`,
            [proy, etapa, U.sol[0]],
        )
    ).id;
    await como('sol', `insert into public.solicitud_items (solicitud_id, n_item, descripcion, cantidad) values ($1,1,'Equipo',1)`, [s]);
    return s;
}
await falla('sol', `select public.ac_solicitud_emitir($1)`, [await solProy(pA, eB)], 'La etapa de otro proyecto no vale', /no es de ese proyecto/);
await falla(
    'sol',
    `select public.ac_solicitud_emitir($1)`,
    [await solProy(pC, eC)],
    'Un proyecto en estudio de mercado no recibe solicitudes',
    /no está ganado/,
);
await falla(
    'sol',
    `select public.ac_solicitud_emitir($1)`,
    [await solProy(pB, eB)],
    'Si el único aprobador de la etapa es el solicitante, no se emite',
    /no tiene aprobadores \(aparte de ti\)/,
);
const buena = await solProy(pA, eA);
await como('sol', `select public.ac_solicitud_emitir($1)`, [buena]);
check(
    (await adm(`select estado from public.solicitudes where id = $1`, [buena]))[0].estado === 'Pendiente Liberación',
    'Etapa del proyecto ganado, con otro aprobador: se emite',
);

console.log('\n3. Carga Excel: valores malos marcan la fila, no rompen la carga');
const sc = (
    await uno('sol', `insert into public.solicitudes (tipo, jefe_id, solicitante_id, sustento) values ('Administrativa',$1,$2,'Carga') returning id`, [
        U.ger[0],
        U.sol[0],
    ])
).id;
const lote = '44444444-0000-0000-0000-000000000001';
const filas = [
    { descripcion: 'Bueno', cantidad: '2', presupuesto_unit: '10.5', plazo_adquisicion: '2099-01-31', canal: 'Nacional' },
    { descripcion: 'Ppto texto', cantidad: '1', presupuesto_unit: 'S/ 1,200' },
    { descripcion: 'Canal raro', cantidad: '1', canal: 'Aéreo' },
    { descripcion: 'Fecha dd/mm', cantidad: '1', plazo_adquisicion: '15/03/2099' },
    { descripcion: 'Fecha inexistente', cantidad: '1', plazo_adquisicion: '2099-02-31' },
    { descripcion: 'Fecha pasada', cantidad: '1', plazo_adquisicion: '2020-01-01' },
    { descripcion: 'Cantidad texto', cantidad: 'dos' },
    { descripcion: 'Moneda rara', cantidad: '1', presupuesto_unit: '5', moneda_ppto: 'XYZ' },
    { descripcion: 'En dólares', cantidad: '3', presupuesto_unit: '7', moneda_ppto: 'usd', unidad: 'caja' },
];
for (const [i, d] of filas.entries())
    await como('sol', `insert into public.carga_items (solicitud_id, lote_id, n_fila, datos) values ($1,$2,$3,$4)`, [sc, lote, i + 1, JSON.stringify(d)]);
const res = (await uno('sol', `select public.ac_carga_procesar($1,$2) r`, [sc, lote])).r;
check(res.cargados === 2 && res.con_error === 7, `La carga termina: 2 cargados y 7 con error (${res.cargados}/${res.con_error})`);
const errs = Object.fromEntries(
    (await adm(`select datos->>'descripcion' d, errores from public.carga_items where solicitud_id = $1 and estado_fila = 'Error'`, [sc])).map((r) => [
        r.d,
        r.errores.join(' | '),
    ]),
);
check(/presupuesto unitario debe ser un número/.test(errs['Ppto texto']), 'Presupuesto con símbolo → «' + errs['Ppto texto'] + '»');
check(/Canal no válido/.test(errs['Canal raro']), 'Canal fuera de la lista → «' + errs['Canal raro'] + '»');
check(
    /no es válida/.test(errs['Fecha dd/mm']) && /no es válida/.test(errs['Fecha inexistente']),
    'Fecha que no es aaaa-mm-dd o no existe → dice cómo escribirla',
);
check(/ya pasó/.test(errs['Fecha pasada']), 'Fecha pasada → mensaje del AppSheet');
check(/cantidad debe ser un número/.test(errs['Cantidad texto']), 'Cantidad en texto → «' + errs['Cantidad texto'] + '»');
check(/Moneda no válida/.test(errs['Moneda rara']), 'Moneda que no existe → «' + errs['Moneda rara'] + '»');
const its = await adm(
    `select descripcion, moneda_ppto, unidad, presupuesto_unit::text p, plazo_adquisicion::text f from public.solicitud_items where solicitud_id = $1 order by n_item`,
    [sc],
);
check(its[0].moneda_ppto === 'PEN' && its[0].p === '10.5000' && its[0].f === '2099-01-31', 'Con presupuesto y sin moneda, va en PEN');
check(its[1].moneda_ppto === 'USD' && its[1].unidad === 'CAJA', 'La moneda y la unidad se normalizan (usd → USD, caja → CAJA)');
await falla('sol', `select public.ac_solicitud_emitir($1)`, [sc], 'Con filas en error no se emite', /filas de la carga con error/);
for (const r of await adm(`select id from public.carga_items where solicitud_id = $1 and estado_fila = 'Error'`, [sc]))
    await como('sol', `select public.ac_carga_descartar_fila($1)`, [r.id]);
await como('sol', `select public.ac_solicitud_emitir($1)`, [sc]);
check((await adm(`select estado from public.solicitudes where id = $1`, [sc]))[0].estado === 'Pendiente Liberación', 'Descartadas las filas malas, se emite');

console.log('\n4. Anulación de un ítem de OTRO requerimiento');
const r1 = (await uno('ger', `select public.ac_solicitud_liberar($1) r`, [buena])).r.requerimiento_id;
const r2 = (await uno('ger', `select public.ac_solicitud_liberar($1) r`, [sc])).r.requerimiento_id;
const itemDeR2 = (await adm(`select id from public.requerimiento_items where requerimiento_id = $1 limit 1`, [r2]))[0].id;
await falla(
    'sol',
    `select public.ac_anulacion_solicitar($1,$2,'Ya no se necesita','x')`,
    [r1, itemDeR2],
    'No se pide anular en A un ítem de B',
    /no es de este requerimiento/,
);
await falla('sol', `select public.ac_anulacion_solicitar($1,null,'Porque sí','x')`, [r1], 'Una causa fuera de la lista se dice en palabras', /Elige la causa/);
const an = (await uno('sol', `select public.ac_anulacion_solicitar($1,$2,'Ya no se necesita','Sobra') r`, [r2, itemDeR2])).r.id;
check(!!an, 'Un ítem de su propio requerimiento sí se pide anular');

console.log(`\n${ok} correctas, ${mal} con error`);
process.exit(mal ? 1 : 0);
