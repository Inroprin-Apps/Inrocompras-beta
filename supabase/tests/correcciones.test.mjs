// Prueba de 0060 (huecos del Hito 1) sobre Postgres real (PGlite).
//   node supabase/tests/correcciones.test.mjs
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
for (const f of fs
    .readdirSync(path.join(aqui, '..', 'migrations'))
    .filter((f) => f >= '0009')
    .sort())
    await db.exec(leer('migrations/' + f));
await db.exec(`grant usage, select on all sequences in schema public to authenticated;`);

const U = {
    sol: ['44444444-0000-0000-0000-000000000001', 'Comercial', []],
    ger: ['44444444-0000-0000-0000-000000000002', 'Proyectos', []],
    pcp: ['44444444-0000-0000-0000-000000000003', 'Planeamiento', []],
    tec: ['44444444-0000-0000-0000-000000000004', 'Técnica', ['TECNICA']],
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
async function falla(k, sql, params, msg) {
    try {
        await como(k, sql, params);
        check(false, msg + ' (debió fallar)');
    } catch (e) {
        check(true, msg + ' → «' + e.message.split('\n')[0] + '»');
    }
}
const adm = async (sql, p) => (await db.query(sql, p)).rows;

console.log('\n1. Carga Excel');
const sol = (
    await como('sol', `insert into public.solicitudes (tipo, solicitante_id, sustento) values ('Administrativa', $1, 'Prueba') returning id`, [U.sol[0]])
)[0].id;
const lote = '55555555-0000-0000-0000-000000000001';
await como(
    'sol',
    `insert into public.carga_items (solicitud_id, lote_id, n_fila, datos, estado_fila) values ($1, $2, 1, '{"descripcion":"","cantidad":"x"}', 'Procesado')`,
    [sol, lote],
);
check(
    (await adm(`select estado_fila from public.carga_items where lote_id = $1`, [lote]))[0].estado_fila === 'Revision',
    'Una fila nueva entra siempre «Revision» aunque la manden «Procesado»',
);
await como('sol', `select public.ac_carga_procesar($1, $2)`, [sol, lote]);
check((await adm(`select estado_fila from public.carga_items where lote_id = $1`, [lote]))[0].estado_fila === 'Error', 'La fila mala queda en Error');
await falla('sol', `update public.carga_items set estado_fila = 'Procesado' where lote_id = $1`, [lote], 'No se pasa a Procesado con un UPDATE directo');
await como('sol', `update public.carga_items set datos = '{"descripcion":"Taladro","cantidad":"2"}' where lote_id = $1`, [lote]);
check(true, 'Sí se corrigen los datos de la fila');

console.log('\n2. Historial sin montos');
await adm(
    `insert into public.historial (tabla, registro_id, accion, de, a, usuario_id) values ('solicitudes', $1, 'emitir', 'Borrador', 'Pendiente Liberación', $2), ('ordenes', $1, 'emitir', 'Borrador', 'x', $2)`,
    [sol, U.sol[0]],
);
check(
    (await como('pcp', `select tabla from public.historial where registro_id = $1`, [sol])).map((r) => r.tabla).join() === 'solicitudes',
    'Planeamiento ve el historial de la solicitud ajena, pero no el de órdenes',
);

console.log('\n3. SKU');
const req = (await adm(`insert into public.requerimientos (area_emisora) values ('Planeamiento') returning id`))[0].id;
const it = (
    await adm(`insert into public.requerimiento_items (requerimiento_id, descripcion, cantidad, anulado) values ($1, 'Item', 1, true) returning id`, [req])
)[0].id;
await falla('pcp', `select public.ac_item_sku($1, 'ME001')`, [it], 'No se asigna SKU a un ítem anulado');
await falla('pcp', `select public.ac_item_sku(gen_random_uuid(), 'ME001')`, [], 'Ni a uno que no existe');
await adm(`update public.requerimiento_items set anulado = false where id = $1`, [it]);
await como('pcp', `select public.ac_item_sku($1, ' me001 ')`, [it]);
check((await adm(`select codigo_sidige from public.requerimiento_items where id = $1`, [it]))[0].codigo_sidige === 'ME001', 'Al ítem vivo sí, en mayúsculas');
await falla('tec', `select public.ac_item_sku($1, 'ME002')`, [it], 'Técnica no asigna SKU');

console.log('\n4. Te toca con desaduanajes (0062)');
const imp = '44444444-0000-0000-0000-000000000009';
await adm(`insert into public.usuarios (id, email, nombre, area) values ($1, 'imp@inroprin.com', 'Imp', 'Importaciones')`, [imp]);
const prov = (await adm(`insert into public.proveedores (razon_social, origen, pais) values ('Ext', 'Extranjero', 'China') returning id`))[0].id;
const oc = (
    await adm(
        `insert into public.ordenes (procedencia, tipo_impuesto, proveedor_id, comprador_id, estatus) values ('Importación', 'Sin IGV', $1, $2, 'Legajo incompleto') returning id`,
        [prov, imp],
    )
)[0].id;
await adm(`insert into public.desaduanajes (numero, empresa_id, orden_duena_id, tipo, creado_por) values ('DES-T-1', 'INROPRIN', $1, 'Marítimo', $2)`, [
    oc,
    imp,
]);
await db.exec(`reset role; select set_config('test.uid', '${imp}', false); set role authenticated;`);
const bandeja = (await db.query(`select tabla, paso from public.te_toca()`)).rows;
await db.exec('reset role');
check(
    bandeja.some((r) => r.tabla === 'desaduanajes' && r.paso === 'Completar documentos de importación'),
    'Importaciones ve el desaduanaje en su bandeja',
);
check((await como('pcp', `select * from public.te_toca() where tabla = 'desaduanajes'`)).length === 0, 'Planeamiento no');

console.log(`\n${ok} correctas, ${mal} con error`);
process.exit(mal ? 1 : 0);
