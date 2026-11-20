// Google Drive: el legajo oficial vive en una Unidad compartida, igual que con el AppSheet.
// Una carpeta por OC con subcarpetas 001 Requerimiento · 002 Cotizaciones · 003 Orden · 004 Documentos Contables · 005 Pagos · 006 Otros.
// Una carpeta por desaduanaje (DES-AAAA-0000) dentro de la carpeta de su OC dueña.
//
// Autenticación: cuenta de servicio de Google Cloud agregada como «Administrador de contenido» de la Unidad compartida.
// No hace falta delegación de dominio para Drive si la cuenta de servicio es miembro de la unidad.
// Dependencias: npm i googleapis
// Variables: GOOGLE_SERVICE_ACCOUNT_JSON (el JSON completo, en Vercel como secreto), DRIVE_UNIDAD_ID, DRIVE_CARPETA_RAIZ_ID
import { google, drive_v3 } from 'googleapis';
import { Readable } from 'node:stream';

export const SUBCARPETAS_OC = ['001 Requerimiento', '002 Cotizaciones', '003 Orden', '004 Documentos Contables', '005 Pagos', '006 Otros'] as const;

// En qué subcarpeta va cada tipo de documento (tabla documentos.tipo_doc)
export const CARPETA_POR_TIPO: Record<string, (typeof SUBCARPETAS_OC)[number]> = {
  'Cotización': '002 Cotizaciones', 'Ficha técnica': '001 Requerimiento', 'Validación técnica': '001 Requerimiento',
  'PDF OC interna': '003 Orden', 'PDF OC proveedor': '003 Orden', 'Correo de sustento': '003 Orden',
  'Factura': '004 Documentos Contables', 'Guía de remisión': '004 Documentos Contables', 'Nota de crédito': '004 Documentos Contables',
  'Acta de conformidad': '004 Documentos Contables', 'Voucher de pago': '005 Pagos',
};

let cliente: drive_v3.Drive | null = null;
function drive(): drive_v3.Drive {
  if (cliente) return cliente;
  const cred = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON ?? '{}');
  const auth = new google.auth.GoogleAuth({ credentials: cred, scopes: ['https://www.googleapis.com/auth/drive'] });
  cliente = google.drive({ version: 'v3', auth });
  return cliente;
}

const comunes = { supportsAllDrives: true } as const;

async function buscarCarpeta(nombre: string, padre: string): Promise<string | null> {
  const q = `name = '${nombre.replace(/'/g, "\\'")}' and '${padre}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  const r = await drive().files.list({ q, fields: 'files(id)', includeItemsFromAllDrives: true, corpora: 'drive',
    driveId: process.env.DRIVE_UNIDAD_ID, ...comunes });
  return r.data.files?.[0]?.id ?? null;
}

export async function carpeta(nombre: string, padre: string): Promise<string> {
  const ya = await buscarCarpeta(nombre, padre);
  if (ya) return ya;
  const r = await drive().files.create({ requestBody: { name: nombre, mimeType: 'application/vnd.google-apps.folder', parents: [padre] },
    fields: 'id', ...comunes });
  return r.data.id!;
}

/** Crea (o encuentra) Raíz / AAAA / <EMPRESA-PROC> / <N° OC – Proveedor> con sus subcarpetas. Idempotente. */
export async function crearCarpetaOC(oc: { numero: string; anio: number; serie: string; proveedor: string }) {
  const raiz = process.env.DRIVE_CARPETA_RAIZ_ID!;
  const anio = await carpeta(String(oc.anio), raiz);
  const serie = await carpeta(oc.serie, anio);
  const principal = await carpeta(`${oc.numero} – ${oc.proveedor}`.slice(0, 120), serie);
  for (const s of SUBCARPETAS_OC) await carpeta(s, principal);
  const meta = await drive().files.get({ fileId: principal, fields: 'webViewLink', ...comunes });
  return { id: principal, url: meta.data.webViewLink ?? '' };
}

/** Sube un archivo a la subcarpeta que le toca. Devuelve id y link para guardar en documentos.drive_file_id/drive_url. */
export async function subirArchivo(p: { carpetaOC: string; tipoDoc: string; nombre: string; mime: string; datos: Uint8Array }) {
  const sub = await carpeta(CARPETA_POR_TIPO[p.tipoDoc] ?? '006 Otros', p.carpetaOC);
  const r = await drive().files.create({
    requestBody: { name: p.nombre, parents: [sub] },
    media: { mimeType: p.mime, body: Readable.from(Buffer.from(p.datos)) },
    fields: 'id, webViewLink', ...comunes,
  });
  return { id: r.data.id!, url: r.data.webViewLink ?? '' };
}

/** Para adjuntar al correo o reenviar: descarga un archivo de Drive. */
export async function bajarArchivo(fileId: string): Promise<Uint8Array> {
  const r = await drive().files.get({ fileId, alt: 'media', ...comunes }, { responseType: 'arraybuffer' });
  return new Uint8Array(r.data as ArrayBuffer);
}
