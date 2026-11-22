// Los puertos de las integraciones del servidor. Cada uno devuelve Result<T, Fallo> (neverthrow): un fallo dice
// si conviene reintentar o no (p. ej. «Drive no configurado» no se arregla reintentando).
import type { Result } from 'neverthrow';
import type { Correo, ModoCorreo } from '../../domain/correo.ts';
import type { EventoInroPay, PagoInroPay } from '../../domain/inropay.ts';
import type { LecturaDocumento } from '../../domain/lectura.ts';
import type { OrdenPdf, VersionPdf } from '../../domain/pdf.ts';
import type { Fallo, Trabajo } from '../../domain/trabajo.ts';

export type R<T> = Promise<Result<T, Fallo>>;

/** La cola en la base (app.cola_tomar / app.cola_terminar, solo service_role). */
export interface ColaPort {
    tomar(n: number): R<Trabajo[]>;
    /** Devuelve el estado en que quedó (Hecho, Descartado, Pendiente o Error). */
    terminar(id: number, ok: boolean, mensaje: string | null, final: 'Error' | 'Descartado' | null): R<string>;
    encolar(tipo: string, tabla: string, id: string, payload?: Record<string, unknown>): R<null>;
    /** Lo que corre una vez al día (public.correr_diarios: recordatorio de facturas). Idempotente en el día. */
    diarios(): R<Record<string, unknown>>;
}

export interface CarpetaDrive {
    id: string;
    url: string;
}

export interface DocumentoCola {
    id: string;
    tipoDoc: string;
    nombre: string;
    mime: string;
    storagePath: string | null;
    driveFileId: string | null;
    estado: string;
    ordenId: string | null;
    desaduanajeId: string | null;
    /** La carpeta del legajo donde va: la del desaduanaje si es suyo, si no la de su OC. */
    carpetaId: string | null;
}

export interface OrdenCarpeta {
    numero: string | null;
    empresaId: string;
    clase: string;
    procedencia: string;
    fecha: string | null;
    proveedor: string;
}

export interface OrdenCorreo {
    id: string;
    numero: string | null;
    procedencia: string;
    correoEnvio: string | null;
    empresa: string;
    proveedor: string;
    comprador: { nombre: string; email: string };
    pdfProveedor: DocumentoCola | null;
}

export interface NotificacionCorreo {
    titulo: string;
    cuerpo: string | null;
    tabla: string | null;
    refId: string | null;
    correo: boolean;
    usuario: { nombre: string; email: string; activo: boolean } | null;
}

/** Lo que los trabajos leen y escriben en la base (con service_role: sin RLS). */
export interface RepositorioPort {
    ordenCarpeta(id: string): R<OrdenCarpeta | null>;
    guardarCarpetaOrden(id: string, c: CarpetaDrive): R<null>;
    /** Los documentos de la orden aún sin archivar (subidos al borrador antes de que existiera la carpeta). */
    documentosSinArchivar(ordenId: string): R<string[]>;
    desaduanajeCarpeta(id: string): R<{ numero: string | null; romano: string | null; carpetaOC: string | null } | null>;
    guardarCarpetaDes(id: string, c: CarpetaDrive): R<null>;
    documento(id: string): R<DocumentoCola | null>;
    marcarArchivado(id: string, c: CarpetaDrive): R<null>;
    guardarLectura(id: string, lectura: LecturaDocumento): R<null>;
    ordenPdf(id: string): R<OrdenPdf | null>;
    /** Sube el PDF a Storage, marca el anterior «Reemplazado», registra el nuevo y lo enlaza en la orden. */
    registrarPdf(o: OrdenPdf, version: VersionPdf, nombre: string, pdf: Uint8Array): R<string>;
    ordenCorreo(id: string): R<OrdenCorreo | null>;
    marcarEnviada(id: string, para: string, modo: ModoCorreo): R<null>;
    notificacion(id: number): R<NotificacionCorreo | null>;
    pagoInroPay(id: string): R<PagoInroPay | null>;
    guardarInroPayRef(id: string, ref: string): R<null>;
    inropayActualizar(e: EventoInroPay): R<null>;
    bajarArchivo(storagePath: string): R<Uint8Array>;
}

export interface DrivePort {
    /** null si está configurado; si no, lo que falta (nombres de variables). */
    falta(): string[] | null;
    /** Crea (o encuentra) la ruta desde la raíz con sus subcarpetas. Idempotente. */
    carpetaOC(ruta: string[], subcarpetas: readonly string[]): R<CarpetaDrive>;
    carpeta(nombre: string, padre: string): R<CarpetaDrive>;
    subir(p: { carpeta: string; subcarpeta: string; nombre: string; mime: string; datos: Uint8Array }): R<CarpetaDrive>;
    bajar(fileId: string): R<Uint8Array>;
}

export interface CorreoPort {
    modo: ModoCorreo;
    /** null si el modo elegido está configurado; si no, lo que falta. */
    falta(): string[] | null;
    enviar(c: Correo): R<{ id: string }>;
}

export interface LectorPort {
    /** El texto del PDF (vacío si es escaneado o no es PDF). */
    texto(archivo: Uint8Array, mime: string): R<string>;
    /** Gemini. null si no hay GEMINI_API_KEY. */
    gemini: ((archivo: Uint8Array, mime: string, rucsPropios: string[]) => R<LecturaDocumento>) | null;
    rucsPropios: string[];
}

export interface PdfPort {
    generar(o: OrdenPdf, version: VersionPdf): R<Uint8Array>;
}

export interface InroPayPort {
    configurado: boolean;
    solicitar(cuerpo: Record<string, unknown>): R<{ id: string }>;
}

export interface ChatPort {
    /** Los espacios con webhook configurado (GOOGLE_CHAT_WEBHOOKS). */
    espacios(): string[];
    publicar(espacio: string, texto: string): R<null>;
}

export interface Integraciones {
    cola: ColaPort;
    repo: RepositorioPort;
    drive: DrivePort;
    correo: CorreoPort;
    lector: LectorPort;
    pdf: PdfPort;
    inropay: InroPayPort;
    chat: ChatPort;
    /** Para los enlaces de los correos (APP_URL). */
    appUrl: string;
}
