// Prueba del Hito 0 (acceso y equipo) sobre Postgres real (PGlite).
//   node supabase/tests/equipo.test.mjs
// Simula auth.users y auth.uid() de Supabase para que el alta, RLS y las funciones actúen como en producción.
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
// Como en Supabase: cada función y tabla de public queda con permisos para anon y authenticated por separado.
await db.exec(`grant execute on all functions in schema public to anon, authenticated; grant all on all tables in schema public to anon;`);
await db.exec(leer('migrations/0007_permisos_supabase.sql'));
await db.exec(leer('migrations/0008_permisos_equipo.sql'));
await db.exec(`create trigger alta_usuario after insert on auth.users for each row execute function app.alta_usuario();`);
await db.exec(`grant usage, select on all sequences in schema public to authenticated;`);
await db.exec(`insert into public.config (clave, valor) values ('admins_iniciales', '["jefa@inroprin.com"]')`);

const id = (n) => `22222222-0000-0000-0000-${String(n).padStart(12, '0')}`;
async function alta(n, email, nombre) {
    await db.query(`insert into auth.users (id, email, raw_user_meta_data) values ($1, $2, $3)`, [id(n), email, { full_name: nombre }]);
}
async function como(n, sql, params = []) {
    await db.exec(`reset role; select set_config('test.uid', '${id(n)}', false); set role authenticated;`);
    try {
        return (await db.query(sql, params)).rows;
    } finally {
        await db.exec('reset role');
    }
}
async function falla(n, sql, params, msg) {
    try {
        await como(n, sql, params);
        check(false, msg + ' (debió fallar)');
    } catch (e) {
        check(true, msg + ' → «' + e.message.split('\n')[0] + '»');
    }
}
const adm = async (sql, p) => (await db.query(sql, p)).rows;

console.log('\n0. Acceso');
try {
    await alta(9, 'alguien@gmail.com', 'De fuera');
    check(false, 'Una cuenta de otro dominio no entra (debió fallar)');
} catch (e) {
    check(/Solo cuentas @inroprin\.com/.test(e.message), 'Una cuenta de otro dominio no entra → «' + e.message + '»');
}
check((await adm(`select count(*)::int n from public.usuarios`))[0].n === 0, 'Y no queda registrada');

await alta(1, 'Jefa@Inroprin.com', 'Jefa de Sistemas');
await alta(2, 'nuevo@inroprin.com', 'Persona Nueva');
await alta(3, 'compras@inroprin.com', 'Persona de Compras');
const p1 = (await como(1, `select public.mi_perfil() p`))[0].p;
check(p1.es_admin && p1.roles.includes('ADMIN') && p1.email === 'jefa@inroprin.com', 'El correo de admins_iniciales entra como administrador');
const p2 = (await como(2, `select public.mi_perfil() p`))[0].p;
check(
    p2.area === 'Sin área' && p2.roles.length === 0 && !p2.ve_precios && p2.nombre === 'Persona Nueva',
    'Una persona nueva entra «Sin área», sin roles y sin ver precios',
);
check((await como(2, `select * from public.ordenes`)).length === 0, 'La persona nueva no ve órdenes');
check((await como(2, `select * from public.acciones_disponibles('ordenes', gen_random_uuid())`)).length === 0, 'Un registro que no existe no ofrece acciones');

console.log('\n1. Equipo');
await falla(2, `select public.ac_equipo_guardar($1, 'Compras', null, 'todas', true, '{GOP}')`, [id(2)], 'Una persona sin ADMIN no se da roles');
await falla(2, `insert into public.usuario_roles (usuario_id, rol) values ($1, 'ADMIN')`, [id(2)], 'Nadie inserta roles directo (ni el admin)');
await falla(1, `insert into public.usuario_roles (usuario_id, rol) values ($1, 'GOP')`, [id(2)], 'El admin tampoco: todo pasa por la función');
await falla(2, `update public.usuarios set area = 'Gerencia' where id = $1`, [id(2)], 'Nadie cambia su área con UPDATE directo');
await como(2, `update public.usuarios set nombre = 'Persona Nueva Pérez' where id = $1`, [id(2)]);
check((await adm(`select nombre from public.usuarios where id = $1`, [id(2)]))[0].nombre === 'Persona Nueva Pérez', 'Cada quien corrige su nombre');

await como(1, `select public.ac_equipo_guardar($1, 'Compras', $2, 'nac', true, '{JEFE_COMPRAS_N}')`, [id(3), id(1)]);
const p3 = (await como(3, `select public.mi_perfil() p`))[0].p;
check(
    p3.area === 'Compras' && p3.roles.includes('JEFE_COMPRAS_N') && p3.ve_precios && p3.es_compras && p3.ambito === 'nac',
    'El admin asigna área, jefe, ámbito y roles',
);
const h = await como(1, `select accion, de, a, usuario_id from public.historial where tabla = 'usuarios' and registro_id = $1 order by id`, [id(3)]);
check(
    h.some((x) => x.accion === 'equipo_area' && x.de === 'Sin área' && x.a === 'Compras' && x.usuario_id === id(1)) &&
        h.some((x) => x.accion === 'equipo_roles' && x.a === 'JEFE_COMPRAS_N'),
    'Queda en el historial: quién, de y a (' + h.length + ' registros)',
);
await como(1, `select public.ac_equipo_guardar($1, 'Compras', $2, 'nac', true, '{}')`, [id(3), id(1)]);
check((await adm(`select count(*)::int n from public.usuario_roles where usuario_id = $1`, [id(3)]))[0].n === 0, 'Quitar roles también funciona');

await falla(1, `select public.ac_equipo_guardar($1, 'Marketing', null, 'todas', true, '{}')`, [id(3)], 'Un área fuera de la lista no se acepta');
await falla(1, `select public.ac_equipo_guardar($1, 'Compras', null, 'todas', true, '{SUPERJEFE}')`, [id(3)], 'Un rol fuera de la lista no se acepta');
await falla(1, `select public.ac_equipo_guardar($1, 'Compras', $1, 'todas', true, '{}')`, [id(3)], 'Nadie es su propio jefe');
await falla(1, `select public.ac_equipo_guardar($1, 'Administración', null, 'todas', true, '{}')`, [id(1)], 'No se queda la app sin administrador');
await como(1, `select public.ac_equipo_guardar($1, 'Administración', null, 'todas', true, '{ADMIN}')`, [id(2)]);
await como(1, `select public.ac_equipo_guardar($1, 'Administración', null, 'todas', true, '{}')`, [id(1)]);
check(!(await como(1, `select public.mi_perfil() p`))[0].p.es_admin, 'Con otro administrador nombrado, sí se puede quitar el rol');

await como(2, `select public.ac_equipo_guardar($1, 'Compras', null, 'todas', false, '{}')`, [id(3)]);
await falla(3, `select public.ac_solicitud_emitir(gen_random_uuid())`, [], 'Una persona desactivada no hace acciones');
check(!(await como(3, `select public.mi_perfil() p`))[0].p.ve_precios, 'Y deja de ver precios');

const proy = (
    await adm(
        `insert into public.proyectos (codigo, nombre, cliente, estado) values ('P-900','Proyecto de prueba','Cliente','Estudio de mercado') returning id`,
    )
)[0].id;
await alta(4, 'sinarea@inroprin.com', 'Sin Área');
check(
    (await como(4, `select * from public.acciones_disponibles('proyectos', $1)`, [proy])).length === 0,
    'Sin área ni roles: no tiene acciones sobre un proyecto sin gerente',
);
await falla(4, `select public.ac_proyecto_resultado($1, true)`, [proy], 'Ni puede marcarlo ganado');
await como(2, `select public.ac_equipo_guardar($1, 'Comercial', null, 'todas', true, '{}')`, [id(4)]);
check((await como(4, `select * from public.acciones_disponibles('proyectos', $1)`, [proy])).length === 2, 'Con área Comercial, sí (ganado / perdido)');
await como(2, `select public.ac_equipo_guardar($1, 'Comercial', null, 'todas', false, '{}')`, [id(4)]);
check((await como(4, `select * from public.acciones_disponibles('proyectos', $1)`, [proy])).length === 0, 'Desactivada, ya no ve botones');

console.log('\n2. Permisos (como en Supabase)');
const priv = async (rol, fn) => (await adm(`select has_function_privilege($1, $2, 'execute') p`, [rol, fn]))[0].p;
check(!(await priv('anon', 'public.inropay_actualizar(uuid, text, date, text, text)')), 'Sin sesión (anon) nadie marca pagos como pagados');
check(!(await priv('authenticated', 'public.inropay_actualizar(uuid, text, date, text, text)')), 'Con sesión tampoco: solo el servidor');
check(!(await priv('anon', 'public.ac_oc_aprobar_gop(uuid, boolean)')), 'anon no ejecuta acciones');
check(
    (await priv('authenticated', 'public.ac_oc_aprobar_gop(uuid, boolean)')) && (await priv('authenticated', 'public.mi_perfil()')),
    'authenticated sí ejecuta las acciones y mi_perfil',
);
check(!(await adm(`select has_table_privilege('anon', 'public.ordenes', 'select') p`))[0].p, 'anon no lee tablas');
check(
    !(await priv('anon', 'public.mi_perfil()')) &&
        !(await priv('anon', 'public.ac_equipo_guardar(uuid, text, uuid, text, boolean, text[])')) &&
        !(await priv('anon', 'public.acciones_disponibles(text, uuid)')),
    'Las funciones de Equipo tampoco quedan abiertas sin sesión',
);
const abiertas = (
    await adm(
        `select count(*)::int n from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and has_function_privilege('anon', p.oid, 'execute') and p.proname not like 'pglite%'`,
    )
)[0].n;
check(abiertas === 0, 'Ninguna función de public queda abierta a anon (' + abiertas + ')');

console.log(`\n${ok} correctas, ${mal} con error`);
process.exit(mal ? 1 : 0);
