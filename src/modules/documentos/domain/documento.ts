// Documentos del legajo (AppSheet: Documentos_OC, Des_Documentos, fichas técnicas). PURO.
// El archivo sube a Supabase Storage (staging: documentos/<uid>/<uuid>-<nombre>) y la base encola su paso a
// Drive y, si es cotización o factura, su lectura (app.al_registrar_documento).

export const TIPOS_ORDEN = [
    'Cotización',
    'Factura',
    'Guía de remisión',
    'Correo de sustento',
    'Validación técnica',
    'Acta de conformidad',
    'Nota de crédito',
    'Voucher de pago',
    'Otro',
] as const;
export const TIPOS_DESADUANAJE = [
    'Factura comercial',
    'Packing list',
    'BL / AWB',
    'Certificado de origen',
    'Póliza de seguro',
    'Permiso (MTC / DIGESA)',
    'DAM',
    'Comprobante de gasto',
    'Otro',
] as const;
export type TipoDoc = (typeof TIPOS_ORDEN)[number] | (typeof TIPOS_DESADUANAJE)[number] | 'Ficha técnica' | 'PDF OC interna' | 'PDF OC proveedor';

export type EstadoDoc = 'Subido' | 'Archivando' | 'Archivado' | 'Error' | 'Reemplazado';
export type EstadoLectura = 'Pendiente' | 'Leído' | 'Confirmado' | 'Error' | 'No aplica' | null;

/** Lo que propuso el lector (texto del PDF o Gemini): la persona lo revisa y confirma. */
export interface Lectura {
    ruc?: string | null;
    razonSocial?: string | null;
    numero?: string | null;
    fecha?: string | null;
    moneda?: string | null;
    subtotal?: number | null;
    igv?: number | null;
    total?: number | null;
    aviso?: string | null;
}

export interface Documento {
    id: string;
    ordenId: string | null;
    desaduanajeId: string | null;
    tipo: TipoDoc;
    nombre: string;
    mime: string;
    numero: string;
    fecha: string | null;
    monto: number | null;
    moneda: string | null;
    rucEmisor: string;
    storagePath: string | null;
    driveUrl: string | null;
    estado: EstadoDoc;
    lectura: Lectura | null;
    lecturaEstado: EstadoLectura;
    subidoPor: string;
    creado: string;
}

/** A quién pertenece un documento: una orden, un desaduanaje o un ítem de solicitud (ficha técnica). */
export type Dueno = { ordenId: string } | { desaduanajeId: string } | { solicitudItemId: string };

export interface NuevoDocumento {
    tipo: TipoDoc;
    numero?: string;
    fecha?: string | null;
    monto?: number | null;
    moneda?: string | null;
}

const LIMITE = 25 * 1024 * 1024; // = file_size_limit del bucket (0004_supabase.sql)
const MIMES = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'application/xml',
    'text/xml',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];
export const ACEPTA = '.pdf,.jpg,.jpeg,.png,.xml,.xlsx';

/** Por qué no se puede subir este archivo (en palabras), o null. */
export function problemaArchivo(a: { name: string; size: number; type: string }): string | null {
    if (a.size > LIMITE) return `«${a.name}» pesa más de 25 MB.`;
    if (a.type && !MIMES.includes(a.type)) return `«${a.name}» no es PDF, imagen, XML ni Excel.`;
    return null;
}

/** Ruta en Storage: la primera carpeta es el uid (lo exige la política «subir a mi carpeta»). */
export function rutaStorage(uid: string, nombre: string, id: string): string {
    const limpio = nombre
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^A-Za-z0-9._-]+/g, '-')
        .replace(/-+/g, '-')
        .slice(-80);
    return `${uid}/${id}-${limpio}`;
}

/** Una factura con monto pide sola la cuota que calza (app.al_subir_factura): por eso se pide el monto. */
export const pideMonto = (t: TipoDoc) => t === 'Factura' || t === 'Nota de crédito' || t === 'Comprobante de gasto';

export const tonoDoc = (d: Documento): 'ok' | 'warn' | 'danger' | 'muted' | 'info' =>
    d.estado === 'Archivado' ? 'ok' : d.estado === 'Error' ? 'danger' : d.estado === 'Reemplazado' ? 'muted' : 'info';
export const etiquetaEstadoDoc = (d: Documento) =>
    d.estado === 'Archivado' ? 'En Drive' : d.estado === 'Subido' || d.estado === 'Archivando' ? 'Pasando a Drive' : d.estado;
