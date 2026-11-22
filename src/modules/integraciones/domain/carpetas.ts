// El legajo en Google Drive (docs/07 §2, docs/13 §1.1). PURO: los nombres de cada carpeta.
// Es la convención que Compras usa hoy y que INROCONTA lee por NOMBRE (su carpetaDeOC): si cambia, INROCONTA deja de
// reconocer las OC. La raíz es la carpeta madre (nacionales o importaciones; mientras se valida, una de prueba):
//   <madre> / NN) PROYECTO / OC AAAA - NNNN PROVEEDOR - PROYECTO / 001 Requerimiento · 002 Cotizaciones · 003 Orden ·
//                                                                 004 Documentos Contables · 005 Pagos · 006 Otros
//   Servicios: «OS AAAA - NNNN …». Importaciones: «OC NNN-AAAA PROVEEDOR - PROYECTO» (como en su carpeta madre).
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

/** Un nombre que Drive acepta y que se lee bien: sin barras ni saltos, sin espacios dobles, hasta 120 caracteres. */
export function nombreSeguro(t: string, max = 120): string {
    const limpio = t
        .replace(/[\\/\r\n\t]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    return limpio.length > max ? limpio.slice(0, max).trimEnd() : limpio;
}

export const nombreCarpetaDes = (numero: string, romano: string | null) => nombreSeguro(romano ? `${numero} (${romano})` : numero);

/** El proyecto de las OC administrativas (sin proyecto). */
export const PROYECTO_ADMINISTRATIVO = 'ADMINISTRATIVO';

/** «0200-2026» (o «INROPLAS 0200-2026») → número y año; null si el número no tiene esa forma. */
export function partesNumero(numero: string): { num: string; anio: string } | null {
    const m = /(\d{1,5})-(20\d{2})$/.exec(numero.trim());
    return m ? { num: m[1], anio: m[2] } : null;
}

/**
 * La carpeta de la OC, como la nombra Compras:
 *   nacional «OC 2026 - 0200 PROVEEDOR - PROYECTO», servicio «OS 2026 - 0911 …», importación «OC 172-2026 …».
 * Si el número no tiene la forma NNNN-AAAA (una OC antigua), va el número tal cual.
 */
export function nombreCarpetaOC(o: { numero: string; clase: string; procedencia: string; proveedor: string; proyecto: string | null }): string {
    const p = partesNumero(o.numero);
    const tipo = o.clase === 'Servicio' ? 'OS' : 'OC';
    const numero = !p ? o.numero : o.procedencia === 'Importación' ? `${tipo} ${p.num}-${p.anio}` : `${tipo} ${p.anio} - ${p.num}`;
    const resto = [o.proveedor.trim(), (o.proyecto ?? PROYECTO_ADMINISTRATIVO).trim()].filter(Boolean).join(' - ');
    return nombreSeguro(resto ? `${numero} ${resto}` : numero);
}

const plano = (t: string) =>
    t
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .toUpperCase();
const PROYECTO_EN_CARPETA = /^(\d{1,3})\)\s*(.+)$/;

/**
 * La carpeta del proyecto dentro de la madre: la que se llame «NN) <nombre del proyecto>» (sin importar mayúsculas ni
 * tildes) o, si no hay, una nueva con el número siguiente («07) NUEVO PROYECTO»).
 */
export function elegirCarpetaProyecto(hijas: readonly { id: string; nombre: string }[], proyecto: string): { id: string } | { crear: string } {
    const buscado = plano(proyecto);
    let mayor = 0;
    for (const h of hijas) {
        const m = PROYECTO_EN_CARPETA.exec(h.nombre.trim());
        if (!m) continue;
        mayor = Math.max(mayor, Number(m[1]));
        if (plano(m[2]) === buscado) return { id: h.id };
    }
    return { crear: nombreSeguro(`${String(mayor + 1).padStart(2, '0')}) ${buscado}`) };
}

/** Para buscar una carpeta por nombre en la API de Drive (q = "name = '…'"). */
export const escaparConsultaDrive = (t: string) => t.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
