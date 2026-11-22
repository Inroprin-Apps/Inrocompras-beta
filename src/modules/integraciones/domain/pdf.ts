// El PDF de la orden (docs/07 §6). PURO: los datos que lleva, los textos (español o inglés) y el nombre del archivo.
// El formato es el que hoy recibe el proveedor (los formatos de Compras): cabecera de la empresa y del pedido, datos
// del proveedor con sus cuentas, detalle con concepto, código interno y código de proyecto, totales, adelantos y saldo,
// instrucciones de entrega y texto legal. Versión interna (además, las aprobaciones con fecha) y versión proveedor
// (descripción del proveedor; en inglés si es importación). Las dos salen de los MISMOS datos de la base.

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
    /** Concepto del ítem («Bien», «Servicios», «Mercadería»). */
    concepto: string | null;
    /** Código interno (SKU del generador, ME00…). */
    codInt: string | null;
    /** Código de proyecto (del cliente, MAT-165.1). */
    codProy: string | null;
}

export interface CuentaPdf {
    banco: string;
    numero: string;
    cci: string;
}

export interface PiePdf {
    horario: string;
    documentos: string[];
    nota: string;
    legal: string;
    enlace: string;
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
    empresa: { id: string; razonSocial: string; ruc: string | null; direccion: string | null };
    proveedor: {
        razonSocial: string;
        ruc: string | null;
        pais: string | null;
        direccion: string | null;
        atencion: string | null;
        telefono: string | null;
        correo: string | null;
        cuenta: CuentaPdf | null;
        detraccion: string | null;
    } | null;
    /** Del requerimiento y la solicitud de sus ítems. */
    pedido: { motivo: string | null; requerimientos: string[]; solicitado: string | null; supervisor: string | null };
    /** Iniciales de quien firmó: 1.ª aprobación (GOP) y 2.ª (GAF). */
    firmas: { primera: string | null; segunda: string | null };
    pie: PiePdf;
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
        nOc: 'N° OC',
        nOs: 'N° OS',
        borrador: 'BORRADOR',
        fecha: 'FECHA',
        rev: 'Revisión',
        razon: 'Razón social',
        ruc: 'RUC',
        direccion: 'Dirección',
        comprador: 'Comprador',
        entrega: 'Lugar de entrega',
        plazo: 'Tiempo de entrega',
        dias: 'días',
        motivo: 'Motivo de solicitud',
        proyecto: 'Proyecto',
        requerimiento: 'Requerimiento',
        solicitado: 'Solicitado',
        supervisor: 'Supervisor',
        aprob1: '1° Aprobación',
        aprob2: '2° Aprobación',
        datosProv: 'DATOS DEL PROVEEDOR',
        atencion: 'Atención',
        telefono: 'Teléfono',
        correo: 'Correo',
        moneda: 'Moneda',
        condicion: 'Condición de pago',
        nota: 'Nota',
        banco: 'Banco',
        cuenta: 'N° Cuenta corriente',
        cci: 'CCI',
        detraccion: 'N° Cuenta detracción',
        incoterm: 'Incoterm',
        detalle: 'DETALLE DE LA ORDEN',
        item: 'ITEM',
        cant: 'CANTIDAD',
        und: 'U.M.',
        concepto: 'CONCEPTO',
        codInt: 'COD INT.',
        codProy: 'COD. PROY',
        desc: 'DESCRIPCIÓN',
        pu: 'P. UNIT',
        total: 'P. TOTAL',
        sub: 'SUB TOTAL',
        igv: 'IGV 18%',
        tot: 'TOTAL',
        instrucciones: 'Instrucciones de entrega',
        documentos: 'Documentos requeridos',
        pct: '%',
        montoTit: 'Monto',
        adelantoTit: 'Adelanto',
        saldoTit: 'Saldo',
        terminos: 'Términos y condiciones',
        aprob: 'Aprobaciones (versión interna)',
        pendiente: 'pendiente',
        adelanto: 'adelanto',
        saldo: 'saldo',
        penal: (p: number, t: number) => `Penalidad por demora: ${p} % por día, hasta ${t} % del monto.`,
    },
    en: {
        titulo: 'PURCHASE ORDER',
        srv: 'SERVICE ORDER',
        nOc: 'PO No.',
        nOs: 'SO No.',
        borrador: 'DRAFT',
        fecha: 'DATE',
        rev: 'Revision',
        razon: 'Company name',
        ruc: 'Tax ID (RUC)',
        direccion: 'Address',
        comprador: 'Buyer',
        entrega: 'Delivery place',
        plazo: 'Lead time',
        dias: 'days',
        motivo: 'Purpose',
        proyecto: 'Project',
        requerimiento: 'Requisition',
        solicitado: 'Requested by',
        supervisor: 'Supervisor',
        aprob1: '1st approval',
        aprob2: '2nd approval',
        datosProv: 'SUPPLIER',
        atencion: 'Attention',
        telefono: 'Phone',
        correo: 'Email',
        moneda: 'Currency',
        condicion: 'Payment terms',
        nota: 'Note',
        banco: 'Bank',
        cuenta: 'Account No.',
        cci: 'CCI',
        detraccion: 'Detraction account',
        incoterm: 'Incoterm',
        detalle: 'ORDER DETAIL',
        item: 'ITEM',
        cant: 'QTY',
        und: 'UNIT',
        concepto: 'CATEGORY',
        codInt: 'INT. CODE',
        codProy: 'PROJ. CODE',
        desc: 'DESCRIPTION',
        pu: 'UNIT PRICE',
        total: 'AMOUNT',
        sub: 'SUBTOTAL',
        igv: 'VAT 18%',
        tot: 'TOTAL',
        instrucciones: 'Delivery instructions',
        documentos: 'Required documents',
        pct: '%',
        montoTit: 'Amount',
        adelantoTit: 'Advance',
        saldoTit: 'Balance',
        terminos: 'Terms and conditions',
        aprob: 'Approvals (internal copy)',
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

/** 0025-2026.pdf · …-interna.pdf · …-rev2.pdf */
export function nombrePdf(o: Pick<OrdenPdf, 'numero' | 'revision'>, version: VersionPdf): string {
    return `${o.numero ?? 'borrador'}${version === 'interna' ? '-interna' : ''}${o.revision ? `-rev${o.revision}` : ''}.pdf`;
}

export const tipoDocPdf = (version: VersionPdf) => (version === 'interna' ? 'PDF OC interna' : 'PDF OC proveedor');
export const versionDe = (payload: Record<string, unknown>): VersionPdf => (payload.version === 'proveedor' ? 'proveedor' : 'interna');

const PARTICULAS = new Set(['de', 'del', 'la', 'las', 'los', 'y']);
/** «Rosa Gómez Ruiz» → «RGR» (hasta tres iniciales, sin «de», «del»…), como firman las órdenes. */
export function iniciales(nombre: string | null | undefined): string | null {
    const ps = (nombre ?? '')
        .trim()
        .split(/\s+/)
        .filter((p) => p && !PARTICULAS.has(p.toLowerCase()));
    return ps.length
        ? ps
              .slice(0, 3)
              .map((p) => p[0].toUpperCase())
              .join('')
        : null;
}

/** La cuenta que va en la orden: la de la moneda de la orden, si hay; si no, la primera. */
export function cuentaPara(cuentas: readonly { banco: string; moneda: string; numero: string; cci: string }[], moneda: string): CuentaPdf | null {
    const c = cuentas.find((x) => x.moneda === moneda && (x.numero || x.cci)) ?? cuentas.find((x) => x.numero || x.cci);
    return c ? { banco: c.banco, numero: c.numero, cci: c.cci } : null;
}

const MONEDAS: Record<Idioma, Record<string, string>> = {
    es: { PEN: 'Soles', USD: 'Dólares', EUR: 'Euros', GBP: 'Libras' },
    en: { PEN: 'Peruvian soles', USD: 'US dollars', EUR: 'Euros', GBP: 'Pounds sterling' },
};
export const monedaPdf = (moneda: string, idioma: Idioma) => MONEDAS[idioma][moneda] ?? moneda;

/** «Condición de pago» como en la orden: forma, valor y unidad («Crédito · 30 · Días», «Adelanto · 50 · %»). */
export function condicionPago(
    o: Pick<OrdenPdf, 'formaPago' | 'pctAdelanto' | 'diasCredito'>,
    idioma: Idioma,
): { forma: string; valor: string; unidad: string } {
    const forma = idioma === 'en' ? (FORMAS_EN[o.formaPago] ?? o.formaPago) : o.formaPago;
    if (o.formaPago === 'Adelanto' && o.pctAdelanto) return { forma, valor: String(Math.round(o.pctAdelanto * 100)), unidad: '%' };
    if ((o.formaPago === 'Crédito' || o.formaPago === 'Letra') && o.diasCredito)
        return { forma, valor: String(o.diasCredito), unidad: idioma === 'en' ? 'days' : 'Días' };
    return { forma, valor: '', unidad: '' };
}

/** La «Nota» del pago: el adelanto con su saldo («Adelanto 50 %, saldo contra entrega»); nada en otras formas. */
export const notaPago = (o: OrdenPdf, idioma: Idioma) => (o.formaPago === 'Adelanto' && o.pctAdelanto ? formaPagoTexto(o, idioma) : '');

/** El cuadro de adelantos de la orden: Adelanto 01, 02 y 03 y el saldo, con su porcentaje y monto. */
export function adelantosPdf(o: Pick<OrdenPdf, 'formaPago' | 'pctAdelanto' | 'monto'>, idioma: Idioma) {
    const t = TEXTOS[idioma];
    const pct = o.formaPago === 'Adelanto' && o.pctAdelanto ? o.pctAdelanto : 0;
    const adelanto = Math.round(o.monto * pct * 100) / 100;
    return [
        { etiqueta: `${t.adelantoTit} 01`, pct, monto: adelanto },
        { etiqueta: `${t.adelantoTit} 02`, pct: 0, monto: 0 },
        { etiqueta: `${t.adelantoTit} 03`, pct: 0, monto: 0 },
        { etiqueta: t.saldoTit, pct: 1 - pct, monto: Math.round((o.monto - adelanto) * 100) / 100 },
    ];
}

/** «2026-11-16» → «16/11/2026». */
export const fechaPdf = (iso: string | null | undefined) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? '');
    return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
};

/** El pie en inglés para la orden de importación (el parámetro oc_pie está en español; el enlace es el mismo). */
const PIE_EN: Omit<PiePdf, 'enlace'> = {
    horario: 'Business hours: Monday to Friday, 8:30 a.m. to 4:00 p.m. (Lima time).',
    documentos: ['Purchase order', 'Commercial invoice', 'Packing list', 'Bill of lading or air waybill', 'Certificate of origin, if applicable'],
    nota: 'Shipments must include the requested documents; otherwise they cannot be received.',
    legal: 'This transaction is governed by our terms and conditions, including our Anti-Bribery and Environmental Policy, available at the link below and considered an integral part of this agreement. Accepting this order implies a commitment to prevent bribery in any transaction, project, activity or relationship.',
};
export const piePdf = (pie: PiePdf, idioma: Idioma): PiePdf => (idioma === 'en' ? { ...PIE_EN, enlace: pie.enlace } : pie);
