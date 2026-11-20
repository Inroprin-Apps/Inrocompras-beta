// Procesador de la cola de trabajos (equivale a la cola de Apps Script del AppSheet: reservar_oc, pdf_oc, archivar_doc…).
// La base encola (0003_acciones.sql); este código, en el servidor, ejecuta.
// En Next.js: app/api/cola/route.ts →  export const GET = procesarCola  (Vercel Cron cada minuto, ver vercel.json)
// y también se llama justo después de cada acción para que el usuario no espere al cron.
//
// Dependencias: npm i @supabase/supabase-js
// Variables: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (solo servidor), CRON_SECRET, APP_URL
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { crearCarpetaOC, carpeta, subirArchivo, bajarArchivo } from './drive';
import { enviarCorreo, plantillas } from './correo';
import { leerDocumento } from './lector-documentos';
import { generarPdfOC } from './pdf-oc';

type Trabajo = { id: number; tipo: string; ref_tabla: string | null; ref_id: string | null; payload: Record<string, unknown>; intentos: number };

const MAX_INTENTOS = 5;

function admin(): SupabaseClient {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
}

export async function procesarCola(req: Request): Promise<Response> {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) return new Response('No autorizado', { status: 401 });
  const db = admin();
  const { data: trabajos } = await db.from('cola_trabajos').select('*').eq('estado', 'Pendiente')
    .lte('procesar_desde', new Date().toISOString()).order('id').limit(20);
  const hechos: number[] = [];
  for (const t of (trabajos ?? []) as Trabajo[]) {
    // toma el trabajo solo si sigue pendiente (evita que dos ejecuciones hagan lo mismo)
    const { data: tomado } = await db.from('cola_trabajos').update({ estado: 'En curso', intentos: t.intentos + 1 })
      .eq('id', t.id).eq('estado', 'Pendiente').select('id');
    if (!tomado?.length) continue;
    try {
      await ejecutar(db, t);
      await db.from('cola_trabajos').update({ estado: 'Hecho', terminado: new Date().toISOString(), error: null }).eq('id', t.id);
      hechos.push(t.id);
    } catch (e) {
      const fin = t.intentos + 1 >= MAX_INTENTOS;
      await db.from('cola_trabajos').update({
        estado: fin ? 'Error' : 'Pendiente', error: (e as Error).message.slice(0, 1000),
        procesar_desde: new Date(Date.now() + 60_000 * 2 ** t.intentos).toISOString(),   // reintento con espera creciente
      }).eq('id', t.id);
    }
  }
  return Response.json({ procesados: hechos.length });
}

async function ejecutar(db: SupabaseClient, t: Trabajo) {
  switch (t.tipo) {
    case 'crear_carpeta': return crearCarpeta(db, t);
    case 'archivar_doc': return archivarDoc(db, t);
    case 'pdf_oc': return pdfOC(db, t);
    case 'enviar_correo': return correoOC(db, t);
    case 'leer_documento': return leer(db, t);
    case 'notificar': return notificar(db, t);
    case 'inropay_solicitar': return inropay(db, t);
    case 'sidige_escribir': throw new Error('La escritura al SIDIGE no está habilitada en esta etapa (la hace la integración de Roberto).');
    default: throw new Error('Tipo de trabajo desconocido: ' + t.tipo);
  }
}

async function crearCarpeta(db: SupabaseClient, t: Trabajo) {
  if (t.ref_tabla === 'ordenes') {
    const { data: o } = await db.from('ordenes').select('numero, empresa_id, procedencia, clase, fecha, proveedores(razon_social)').eq('id', t.ref_id).single();
    if (!o?.numero) throw new Error('La orden aún no tiene número');
    const serie = `${o.empresa_id}-${o.clase === 'Servicio' ? 'SRV' : o.procedencia === 'Importación' ? 'IMP' : 'NAC'}`;
    const c = await crearCarpetaOC({ numero: o.numero, anio: new Date(o.fecha).getFullYear(), serie,
      proveedor: (o.proveedores as unknown as { razon_social: string } | null)?.razon_social ?? '' });
    await db.from('ordenes').update({ carpeta_drive_id: c.id, carpeta_drive_url: c.url }).eq('id', t.ref_id);
    // documentos subidos antes de que existiera la carpeta (p. ej. la cotización del borrador)
    const { data: docs } = await db.from('documentos').select('id').eq('orden_id', t.ref_id).eq('estado', 'Subido');
    for (const d of docs ?? []) await db.from('cola_trabajos').insert({ tipo: 'archivar_doc', ref_tabla: 'documentos', ref_id: d.id });
  } else if (t.ref_tabla === 'desaduanajes') {
    const { data: d } = await db.from('desaduanajes').select('numero, romano, ordenes(carpeta_drive_id)').eq('id', t.ref_id).single();
    const padre = (d?.ordenes as unknown as { carpeta_drive_id: string | null } | null)?.carpeta_drive_id;
    if (!padre) throw new Error('La OC dueña aún no tiene carpeta');
    const id = await carpeta(`${d!.numero} (${d!.romano})`, padre);
    await db.from('desaduanajes').update({ carpeta_drive_id: id, carpeta_drive_url: `https://drive.google.com/drive/folders/${id}` }).eq('id', t.ref_id);
  }
}

async function archivarDoc(db: SupabaseClient, t: Trabajo) {
  const { data: d } = await db.from('documentos').select('*, ordenes(carpeta_drive_id), desaduanajes(carpeta_drive_id)').eq('id', t.ref_id).single();
  if (!d) throw new Error('No existe el documento');
  if (d.drive_file_id) return;
  const carpetaOC = (d.desaduanajes as { carpeta_drive_id: string | null } | null)?.carpeta_drive_id
    ?? (d.ordenes as { carpeta_drive_id: string | null } | null)?.carpeta_drive_id;
  if (!carpetaOC) {
    if (!d.orden_id && !d.desaduanaje_id) return;         // ficha técnica de solicitud: se queda en Storage
    throw new Error('La carpeta aún no existe; se reintenta');
  }
  const { data: archivo, error } = await db.storage.from('documentos').download(d.storage_path);
  if (error || !archivo) throw new Error('No se pudo leer el archivo de Storage: ' + error?.message);
  const r = await subirArchivo({ carpetaOC, tipoDoc: d.tipo_doc, nombre: d.nombre_archivo, mime: d.mime, datos: new Uint8Array(await archivo.arrayBuffer()) });
  await db.from('documentos').update({ drive_file_id: r.id, drive_url: r.url, estado: 'Archivado' }).eq('id', d.id);
}

async function pdfOC(db: SupabaseClient, t: Trabajo) {
  const version = (t.payload.version as 'interna' | 'proveedor') ?? 'interna';
  const { pdf, nombre, ordenId, usuario } = await generarPdfOC(db, t.ref_id!, version);
  const ruta = `${usuario}/${crypto.randomUUID()}-${nombre}`;
  await db.storage.from('documentos').upload(ruta, pdf, { contentType: 'application/pdf' });
  const tipo = version === 'interna' ? 'PDF OC interna' : 'PDF OC proveedor';
  await db.from('documentos').update({ estado: 'Reemplazado' }).eq('orden_id', ordenId).eq('tipo_doc', tipo).neq('estado', 'Reemplazado');
  const { data: doc } = await db.from('documentos').insert({ orden_id: ordenId, tipo_doc: tipo, nombre_archivo: nombre, storage_path: ruta, subido_por: usuario })
    .select('id').single();
  await db.from('ordenes').update(version === 'interna' ? { pdf_interna_doc: doc!.id } : { pdf_proveedor_doc: doc!.id }).eq('id', ordenId);
}

async function correoOC(db: SupabaseClient, t: Trabajo) {
  const { data: o } = await db.from('ordenes').select('id, numero, procedencia, correo_envio, pdf_proveedor_doc, empresas(razon_social), proveedores(razon_social), usuarios!ordenes_comprador_id_fkey(nombre, email)')
    .eq('id', t.ref_id).single();
  if (!o) throw new Error('No existe la orden');
  if (!o.pdf_proveedor_doc) throw new Error('El PDF para el proveedor aún no está listo; se reintenta');
  const { data: doc } = await db.from('documentos').select('*').eq('id', o.pdf_proveedor_doc).single();
  const datos = doc!.drive_file_id ? await bajarArchivo(doc!.drive_file_id)
    : new Uint8Array(await (await db.storage.from('documentos').download(doc!.storage_path)).data!.arrayBuffer());
  const comprador = o.usuarios as unknown as { nombre: string; email: string };
  const p = plantillas.ocProveedor({ proveedor: (o.proveedores as unknown as { razon_social: string }).razon_social, numero: o.numero!,
    empresa: (o.empresas as unknown as { razon_social: string }).razon_social, comprador: comprador.nombre,
    idioma: o.procedencia === 'Importación' ? 'en' : 'es' });
  await enviarCorreo({ para: [String(t.payload.para ?? o.correo_envio)], cc: [comprador.email], responderA: comprador.email,
    asunto: p.asunto, html: p.html, adjuntos: [{ nombre: doc!.nombre_archivo, mime: 'application/pdf', datos }] });
  await db.from('ordenes').update({ envio_hecho: new Date().toISOString() }).eq('id', o.id);
  await db.from('historial').insert({ tabla: 'ordenes', registro_id: o.id, accion: 'correo_enviado', a: String(t.payload.para ?? o.correo_envio) });
}

async function leer(db: SupabaseClient, t: Trabajo) {
  const { data: d } = await db.from('documentos').select('id, storage_path, tipo_doc').eq('id', t.ref_id).single();
  const { data: archivo } = await db.storage.from('documentos').download(d!.storage_path);
  const lectura = await leerDocumento(new Uint8Array(await archivo!.arrayBuffer()), { detalle: d!.tipo_doc === 'Cotización' });
  // No se toca ningún dato del negocio: queda como propuesta para que la persona la confirme en pantalla.
  await db.from('documentos').update({ lectura, lectura_estado: 'Leído' }).eq('id', d!.id);
}

async function notificar(db: SupabaseClient, t: Trabajo) {
  const { data: n } = await db.from('notificaciones').select('*, usuarios(nombre, email, activo)').eq('id', t.payload.notificacion_id).single();
  const u = n?.usuarios as unknown as { nombre: string; email: string; activo: boolean } | null;
  if (!n || !n.correo || !u?.activo) return;
  const enlace = `${process.env.APP_URL}/${n.ref_tabla ?? ''}/${n.ref_id ?? ''}`;
  const p = plantillas.notificacion({ nombre: u.nombre.split(' ')[0], titulo: n.titulo, cuerpo: n.cuerpo, enlace });
  await enviarCorreo({ para: [u.email], asunto: p.asunto, html: p.html });
}

// InroPay (app de pagos de Finanzas): INROCOMPRAS solo envía la solicitud y lee el estado (decisión 17/11).
// El contrato está en docs/07_INTEGRACIONES.md §4. Mientras no exista el endpoint, Finanzas mueve los estados en INROCOMPRAS.
async function inropay(db: SupabaseClient, t: Trabajo) {
  const url = process.env.INROPAY_URL;
  if (!url) return;                       // sin InroPay configurado: no hace nada (Finanzas usa los botones de la app)
  const { data: g } = await db.from('pagos').select('*, ordenes(numero, moneda, proveedores(razon_social, ruc, cuentas))').eq('id', t.ref_id).single();
  const r = await fetch(`${url}/solicitudes`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${process.env.INROPAY_TOKEN}` },
    body: JSON.stringify({ origen: 'INROCOMPRAS', pago_id: g!.id, orden: g!.ordenes, cuota: g!.n_cuota, monto: g!.monto_pago,
      retencion: g!.monto_retencion, neto: g!.neto_referencial, fecha_limite: g!.fecha_limite_pago, factura_id: g!.factura_id }) });
  if (!r.ok) throw new Error('InroPay respondió ' + r.status);
  const { id } = await r.json();
  await db.from('pagos').update({ inropay_ref: id }).eq('id', g!.id);
}
