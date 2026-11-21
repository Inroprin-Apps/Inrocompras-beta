// Prueba de 0030 (Hito 3): ac_oc_recalcular y plan_compras sobre Postgres real (PGlite).
//   node supabase/tests/ordenes_plan.test.mjs
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
for (const f of ['0005_equipo.sql', '0006_correcciones_null.sql', '0007_permisos_supabase.sql', '0008_permisos_equipo.sql', '0030_ordenes_plan.sql'])
    await db.exec(leer('migrations/' + f));
await db.exec(`grant usage, select on all sequences in schema public to authenticated;`);

// Personas de prueba (inventadas)
const U = {
    sol: ['44444444-0000-0000-0000-000000000001', 'Comercial', []],
    ger: ['44444444-0000-0000-0000-000000000002', 'Proyectos', []],
    pcp: ['44444444-0000-0000-0000-000000000003', 'Planeamiento', []],
    tec: ['44444444-0000-0000-0000-000000000004', 'Técnica', ['TECNICA']],
    com: ['44444444-0000-0000-0000-000000000005', 'Compras', []],
    cg: ['44444444-0000-0000-0000-000000000007', 'Control de Gestión', ['CONTROL_GESTION']],
    gop: ['44444444-0000-0000-0000-000000000008', 'Gerencia', ['GOP']],
    inac: ['44444444-0000-0000-0000-000000000009', 'Compras', []],
};
for (const [k, [id, area, roles]] of Object.entries(U)) {
    await db.query(`insert into public.usuarios (id, email, nombre, area) values ($1, $2, $3, $4)`, [id, k + '@inroprin.com', 'Persona ' + k, area]);
    for (const r of roles) await db.query(`insert into public.usuario_roles (usuario_id, rol) values ($1, $2)`, [id, r]);
}
await db.query(`update public.usuarios set activo = false where id = $1`, [U.inac[0]]);

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

// Un requerimiento emitido con 3 ítems (uno incluido en otro) y uno sin validar.
const proy = (
    await adm(
        `insert into public.proyectos (codigo, nombre, cliente, estado, gerente_id, fecha_meta) values ('P-T30','Proyecto 30','Cliente','Ganado',$1, current_date + 90) returning id`,
        [U.ger[0]],
    )
)[0].id;
const etapa = (
    await adm(`insert into public.proyecto_etapas (proyecto_id, nombre, orden, aprobadores) values ($1,'General',1,array[$2::uuid]) returning id`, [
        proy,
        U.ger[0],
    ])
)[0].id;
const sol = (
    await uno(
        'sol',
        `insert into public.solicitudes (tipo, proyecto_id, etapa_id, solicitante_id, sustento) values ('Proyecto',$1,$2,$3,'Equipos') returning id`,
        [proy, etapa, U.sol[0]],
    )
).id;
await como(
    'sol',
    `insert into public.solicitud_items (solicitud_id, n_item, descripcion, cantidad, canal, presupuesto_unit, moneda_ppto) values ($1,1,'Torno',10,'Nacional',300,'PEN'),($1,2,'Llave del torno',10,'Nacional',null,null),($1,3,'Fresadora',2,'Importación',9000,'USD')`,
    [sol],
);
await como('sol', `select public.ac_solicitud_emitir($1)`, [sol]);
const req = (await uno('ger', `select public.ac_solicitud_liberar($1) r`, [sol])).r.requerimiento_id;
const items = await adm(`select id, descripcion from public.requerimiento_items where requerimiento_id = $1 order by n_item`, [req]);
await adm(`update public.requerimiento_items set incluido_en = $1 where id = $2`, [items[0].id, items[1].id]);

console.log('\n1. plan_compras');
let plan = await como('com', `select * from public.plan_compras($1)`, [proy]);
check(plan.length === 3, 'Compras ve las 3 líneas del proyecto');
check(
    plan.every((p) => p.req_estado === 'En Proceso'),
    'Con el requerimiento aún en proceso (bloqueado para comprar)',
);
check(Number(plan.find((p) => p.item_id === items[0].id).saldo) === 10, 'Saldo inicial = cantidad');
check(Number(plan.find((p) => p.item_id === items[0].id).presupuesto_unit) === 300, 'Compras ve el presupuesto unitario');
check(plan.find((p) => p.item_id === items[1].id).incluido_en === items[0].id, 'El accesorio trae el equipo en el que va incluido');
const planPcp = await como('pcp', `select * from public.plan_compras($1)`, [proy]);
check(planPcp.length === 3 && planPcp.every((p) => p.presupuesto_unit === null && p.moneda_ppto === null), 'Planeamiento ve el plan sin presupuesto');
check((await como('inac', `select * from public.plan_compras($1)`, [proy])).length === 0, 'Una persona inactiva no ve nada');
check((await como('com', `select * from public.plan_compras(null, true)`)).length === 0, '«Sin proyecto» no trae las del proyecto');
check((await como('com', `select * from public.plan_compras()`)).length >= 3, 'Sin filtros trae todo');
await como('com', `update public.requerimiento_items set validacion_tecnica = 'Validado' where id = $1`, [items[0].id]).catch(() => {});
check(
    (await adm(`select validacion_tecnica v from public.requerimiento_items where id = $1`, [items[0].id]))[0].v === 'Pendiente',
    'Compras no valida con un UPDATE directo',
);

await como('pcp', `update public.requerimientos set tipo_compra = 'Nacional/Importaciones', destino = 'Almacén', concepto_general = 'Equipos' where id = $1`, [
    req,
]);
await como('pcp', `select public.ac_req_emitir($1)`, [req]);
await como('tec', `select public.ac_item_tecnica($1, 'Validado', 'MarcaT', 'T-1')`, [items[0].id]);

console.log('\n2. ac_oc_recalcular');
const prov = (await uno('com', `insert into public.proveedores (ruc, razon_social, correo) values ('20100047218','Proveedor 30 SAC','v@p.pe') returning id`))
    .id;
const oc = (
    await uno('com', `select public.ac_oc_crear($1,'Nacional','PEN',$2::jsonb) r`, [
        prov,
        JSON.stringify([{ item_id: items[0].id, cantidad: 4, precio_unit: 100 }]),
    ])
).r.id;
plan = await como('pcp', `select * from public.plan_compras($1)`, [proy]);
const fila = plan.find((p) => p.item_id === items[0].id);
check(Number(fila.saldo) === 6 && fila.ordenes.length === 1 && fila.ordenes[0].estatus === 'Borrador', 'Planeamiento ve el saldo (6) y la OC en borrador');
check((await como('pcp', `select count(*)::int n from public.ordenes`))[0].n === 0, 'Pero no lee la tabla de órdenes');

await como('com', `update public.oc_lineas set precio_unit = 1500 where orden_id = $1`, [oc]);
let o = (await adm(`select monto, tipo_aprobacion from public.ordenes where id = $1`, [oc]))[0];
check(Number(o.monto) === 472, 'Tras editar la línea el monto queda viejo (472) hasta recalcular');
await falla('cg', `select public.ac_oc_recalcular($1)`, [oc], 'Control de Gestión no recalcula', /Compras o Importaciones/);
await falla('pcp', `select public.ac_oc_recalcular($1)`, [oc], 'Planeamiento tampoco', /Compras o Importaciones/);
await falla('inac', `select public.ac_oc_recalcular($1)`, [oc], 'Ni una persona inactiva', /no está activo/);
await falla('com', `select public.ac_oc_recalcular($1)`, ['99999999-0000-0000-0000-000000000000'], 'Una orden que no existe', /No existe/);
const r = (await uno('com', `select public.ac_oc_recalcular($1) r`, [oc])).r;
o = (await adm(`select subtotal, igv, monto, monto_soles, tipo_aprobacion, estatus from public.ordenes where id = $1`, [oc]))[0];
check(Number(o.subtotal) === 6000 && Number(o.igv) === 1080 && Number(o.monto) === 7080, 'Compras recalcula: 6,000 + 1,080 = ' + o.monto);
check(o.tipo_aprobacion === 'Aprobación Conjunta' && r.tipo_aprobacion === 'Aprobación Conjunta', 'Y la ruta pasa a conjunta (≥ S/ 5,000)');
check(o.estatus === 'Borrador', 'Sin cambiar el estatus');

await como('com', `update public.ordenes set moneda = 'USD' where id = $1`, [oc]);
await como('com', `select public.ac_oc_recalcular($1)`, [oc]);
const tasa = Number((await adm(`select tasa_a_soles t from public.monedas where id = 'USD'`))[0].t);
o = (await adm(`select monto, monto_soles from public.ordenes where id = $1`, [oc]))[0];
check(Number(o.monto_soles) === Math.round(7080 * tasa * 100) / 100, 'Al cambiar la moneda, el monto en soles usa la tasa (' + o.monto_soles + ')');

// Emitida y con VB de CG ya no es editable: no recalcula.
await adm(`update public.ordenes set moneda = 'PEN' where id = $1`, [oc]);
await como('com', `select public.ac_oc_recalcular($1)`, [oc]);
await como('com', `insert into public.documentos (orden_id, tipo_doc, nombre_archivo, subido_por) values ($1,'Cotización','c.pdf',$2)`, [oc, U.com[0]]);
await como('com', `select public.ac_oc_emitir($1)`, [oc]);
check((await uno('com', `select public.ac_oc_recalcular($1) r`, [oc])).r.ok, 'Pendiente sin firmas: aún se recalcula');
await como('cg', `select public.ac_oc_validar_ppto($1, 'Presupuestado')`, [oc]);
await falla('com', `select public.ac_oc_recalcular($1)`, [oc], 'Con el VB de CG ya no', /no se puede editar/);

console.log('\n3. El saldo vuelve si la orden se anula');
await como('gop', `select public.ac_oc_rechazar($1, 'No va')`, [oc]);
plan = await como('com', `select * from public.plan_compras($1)`, [proy]);
check(
    Number(plan.find((p) => p.item_id === items[0].id).saldo) === 10 && plan.find((p) => p.item_id === items[0].id).ordenes.length === 0,
    'Rechazada: saldo 10 y sin OC en el plan',
);

console.log('\n4. Saldo al editar líneas y oc_edicion');
const oc2 = (
    await uno('com', `select public.ac_oc_crear($1,'Nacional','PEN',$2::jsonb) r`, [
        prov,
        JSON.stringify([{ item_id: items[0].id, cantidad: 6, precio_unit: 10 }]),
    ])
).r.id;
const l2 = (await adm(`select id from public.oc_lineas where orden_id = $1`, [oc2]))[0].id;
let ed = (await uno('com', `select public.oc_edicion($1) e`, [oc2])).e;
check(ed.editar === null && ed.demasia[l2] === null, 'Compras puede editar el borrador y agregar demasía a su línea');
ed = (await uno('cg', `select public.oc_edicion($1) e`, [oc2])).e;
check(ed.editar !== null && ed.demasia[l2] !== null, 'Control de Gestión no: ' + ed.editar);
check((await uno('inac', `select public.oc_edicion($1) e`, [oc2])).e === null, 'Una persona inactiva no recibe nada');
await falla(
    'com',
    `update public.oc_lineas set cantidad = 11 where id = $1`,
    [l2],
    'Subir la cantidad por encima del saldo con un UPDATE directo',
    /saldo es 10/,
);
await como('com', `update public.oc_lineas set cantidad = 10 where id = $1`, [l2]);
check(Number((await adm(`select cantidad from public.oc_lineas where id = $1`, [l2]))[0].cantidad) === 10, 'Hasta el saldo sí');
await falla(
    'com',
    `insert into public.oc_lineas (orden_id, item_id, descripcion, cantidad, precio_unit) values ($1,$2,'Torno',1,10)`,
    [oc2, items[0].id],
    'Ni una línea nueva del mismo ítem sin saldo',
    /saldo es 0/,
);
await como('com', `select public.ac_oc_demasia($1, 2, 'Repuesto')`, [l2]);
check(
    (await adm(`select count(*)::int n from public.oc_lineas where orden_id = $1 and es_demasia and demasia_estado = 'Pendiente'`, [oc2]))[0].n === 1,
    'Lo que excede va como demasía (Pendiente)',
);
ed = (await uno('com', `select public.oc_edicion($1) e`, [oc2])).e;
check(ed.demasia[l2] !== null, 'Y no se agrega otra demasía del mismo ítem: ' + ed.demasia[l2]);

console.log(`\n${ok} bien, ${mal} mal`);
process.exit(mal ? 1 : 0);
