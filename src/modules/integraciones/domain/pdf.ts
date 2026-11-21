// El PDF de la orden (docs/07 §6). PURO: los datos que lleva, los textos (español o inglés) y el nombre del archivo.
// Versión interna (con aprobaciones y proyecto) y versión proveedor (con la descripción del proveedor; en
// inglés si es importación). Las dos salen de los MISMOS datos de la base.

export type VersionPdf = 'interna' | 'proveedor';
export type Idioma = 'es' | 'en';

export interface LineaPdf {
    nLinea: number;
    descripcion: string;
    descripcionProv: string | null;
    unidad: string;
    cantidad: number;
    precioUnit: number;
    subtotal: number;
    esDemasia: boolean;
    demasiaEstado: string | null;
}

export interface OrdenPdf {
    id: string;
    numero: string | null;
    revision: number;
    clase: string;
    procedencia: string;
    fecha: string;
    moneda: string;
    tipoImpuesto: string;
    subtotal: number;
    igv: number;
    monto: number;
    formaPago: string;
    pctAdelanto: number | null;
    hitoSaldo: string | null;
    diasCredito: number | null;
    lugarEntrega: string | null;
    plazoEntregaDias: number | null;
    terminos: string | null;
    incoterm: string | null;
    penalidadPctDia: number | null;
    penalidadTopePct: number | null;
    empresa: { razonSocial: string; ruc: string | null; direccion: string | null };
    proveedor: { razonSocial: string; ruc: string | null; pais: string | null } | null;
    proyecto: { codigo: string | null; nombre: string } | null;
    aprobaciones: {
        ppto: string | null;
        cgFecha: string | null;
        gop: string | null;
        gopFecha: string | null;
        gaf: string | null;
        gafFecha: string | null;
        tipo: string | null;
    };
    comprador: { id: string; nombre: string };
    lineas: LineaPdf[];
}

export const TEXTOS = {
    es: {
        titulo: 'ORDEN DE COMPRA',
        srv: 'ORDEN DE SERVICIO',
        borrador: 'BORRADOR',
        prov: 'Proveedor',
        fecha: 'Fecha',
        moneda: 'Moneda',
        pago: 'Forma de pago',
        entrega: 'Lugar de entrega',
        plazo: 'Plazo de entrega',
        dias: 'días',
        item: 'N°',
        desc: 'Descripción',
        und: 'Und.',
        cant: 'Cant.',
        pu: 'P. unit.',
        total: 'Total',
        sub: 'Subtotal',
        igv: 'IGV 18 %',
        tot: 'Total',
        terminos: 'Términos y condiciones',
        aprob: 'Aprobaciones',
        rev: 'Revisión',
        proyecto: 'Proyecto',
        comprador: 'Comprador',
        pendiente: 'pendiente',
        adelanto: 'adelanto',
        saldo: 'saldo',
        penal: (p: number, t: number) => `Penalidad por demora: ${p} % por día, hasta ${t} % del monto.`,
    },
    en: {
        titulo: 'PURCHASE ORDER',
        srv: 'SERVICE ORDER',
        borrador: 'DRAFT',
        prov: 'Supplier',
        fecha: 'Date',
        moneda: 'Currency',
        pago: 'Payment terms',
        entrega: 'Delivery place',
        plazo: 'Lead time',
        dias: 'days',
        item: '#',
        desc: 'Description',
        und: 'Unit',
        cant: 'Qty',
        pu: 'Unit price',
        total: 'Amount',
        sub: 'Subtotal',
        igv: 'VAT',
        tot: 'Total',
        terminos: 'Terms and conditions',
        aprob: 'Approvals',
        rev: 'Revision',
        proyecto: 'Project',
        comprador: 'Buyer',
        pendiente: 'pending',
        adelanto: 'advance',
        saldo: 'balance',
        penal: (p: number, t: number) => `Late delivery penalty: ${p}% per day, up to ${t}% of the order amount.`,
    },
} as const;

/** El de importación para el proveedor va en inglés; lo demás, en español. */
export const idiomaPdf = (version: VersionPdf, procedencia: string): Idioma => (version === 'proveedor' && procedencia === 'Importación' ? 'en' : 'es');

/** Las líneas que van en el PDF (sin demasías rechazadas), en orden. */
export const lineasPdf = (o: OrdenPdf) => o.lineas.filter((l) => !(l.esDemasia && l.demasiaEstado === 'Rechazada')).sort((a, b) => a.nLinea - b.nLinea);

const FORMAS_EN: Record<string, string> = {
    Contado: 'Cash',
    Crédito: 'Credit',
    Adelanto: 'Advance',
    'Tarjeta de crédito': 'Credit card',
    'Caja chica': 'Petty cash',
    'Contra entrega': 'Cash on delivery',
    Letra: 'Bill of exchange',
};

export function formaPagoTexto(o: OrdenPdf, idioma: Idioma): string {
    const t = TEXTOS[idioma];
    const forma = idioma === 'en' ? (FORMAS_EN[o.formaPago] ?? o.formaPago) : o.formaPago;
    if (o.formaPago === 'Adelanto' && o.pctAdelanto) return `${Math.round(o.pctAdelanto * 100)} % ${t.adelanto}, ${t.saldo} ${o.hitoSaldo ?? ''}`.trim();
    if ((o.formaPago === 'Crédito' || o.formaPago === 'Letra') && o.diasCredito) return `${forma} ${o.diasCredito} ${t.dias}`;
    return forma;
}

/** 1234.5 → «1,234.50» (es-PE). */
export const numeroPdf = (n: number | null | undefined, decimales = 2) =>
    new Intl.NumberFormat('es-PE', { minimumFractionDigits: decimales, maximumFractionDigits: decimales }).format(n ?? 0);

/** INROPRIN-NAC-2026-0025.pdf · …-interna.pdf · …-rev2.pdf */
export function nombrePdf(o: Pick<OrdenPdf, 'numero' | 'revision'>, version: VersionPdf): string {
    return `${o.numero ?? 'borrador'}${version === 'interna' ? '-interna' : ''}${o.revision ? `-rev${o.revision}` : ''}.pdf`;
}

export const tipoDocPdf = (version: VersionPdf) => (version === 'interna' ? 'PDF OC interna' : 'PDF OC proveedor');
export const versionDe = (payload: Record<string, unknown>): VersionPdf => (payload.version === 'proveedor' ? 'proveedor' : 'interna');
