// El legajo en Google Drive (docs/07 §2). PURO: los nombres y la ruta de cada carpeta.
//   Raíz / AAAA / EMPRESA-PROC / <N° OC – Proveedor> / 001 Requerimiento · 002 Cotizaciones · 003 Orden ·
//   004 Documentos Contables · 005 Pagos · 006 Otros
//   El desaduanaje va en una subcarpeta «DES-AAAA-0000 (I)» dentro de la carpeta de su OC dueña.

export const SUBCARPETAS_OC = ['001 Requerimiento', '002 Cotizaciones', '003 Orden', '004 Documentos Contables', '005 Pagos', '006 Otros'] as const;
export type Subcarpeta = (typeof SUBCARPETAS_OC)[number];

/** En qué subcarpeta va cada tipo de documento (documentos.tipo_doc). Lo que no está aquí va a «006 Otros». */
export const CARPETA_POR_TIPO: Record<string, Subcarpeta> = {
    Cotización: '002 Cotizaciones',
    'Ficha técnica': '001 Requerimiento',
    'Validación técnica': '001 Requerimiento',
    'PDF OC interna': '003 Orden',
    'PDF OC proveedor': '003 Orden',
    'Correo de sustento': '003 Orden',
    Factura: '004 Documentos Contables',
    'Guía de remisión': '004 Documentos Contables',
    'Nota de crédito': '004 Documentos Contables',
    'Acta de conformidad': '004 Documentos Contables',
    'Voucher de pago': '005 Pagos',
};
export const subcarpetaDe = (tipoDoc: string): Subcarpeta => CARPETA_POR_TIPO[tipoDoc] ?? '006 Otros';

/** La serie de la carpeta: INROPRIN-NAC, INROPRIN-IMP o INROPRIN-SRV. */
export function serieOC(o: { empresaId: string; clase: string; procedencia: string }): string {
    const proc = o.clase === 'Servicio' ? 'SRV' : o.procedencia === 'Importación' ? 'IMP' : 'NAC';
    return `${o.empresaId}-${proc}`;
}

/** Un nombre que Drive acepta y que se lee bien: sin barras ni saltos, sin espacios dobles, hasta 120 caracteres. */
export function nombreSeguro(t: string, max = 120): string {
    const limpio = t.replace(/[\\/\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim();
    return limpio.length > max ? limpio.slice(0, max).trimEnd() : limpio;
}

export const nombreCarpetaOC = (numero: string, proveedor: string) => nombreSeguro(proveedor.trim() ? `${numero} – ${proveedor}` : numero);
export const nombreCarpetaDes = (numero: string, romano: string | null) => nombreSeguro(romano ? `${numero} (${romano})` : numero);

/** El año de la carpeta: el de la fecha de la orden (AAAA-MM-DD), o el actual si no hay. */
export function anioDe(fecha: string | null, hoy = new Date()): string {
    return fecha && /^\d{4}/.test(fecha) ? fecha.slice(0, 4) : String(hoy.getFullYear());
}

/** La ruta desde la raíz hasta la carpeta de la OC (sin la raíz). */
export function rutaCarpetaOC(o: { numero: string; empresaId: string; clase: string; procedencia: string; fecha: string | null; proveedor: string }): string[] {
    return [anioDe(o.fecha), serieOC(o), nombreCarpetaOC(o.numero, o.proveedor)];
}

/** Para buscar una carpeta por nombre en la API de Drive (q = "name = '…'"). */
export const escaparConsultaDrive = (t: string) => t.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
