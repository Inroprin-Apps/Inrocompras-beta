// Desaduanaje y costeo de importaciones (AppSheet: Desaduanajes, Des_Docs, Des_Productos, Des_Gastos, Des_Costeo_Hist,
// TC_Costeo). PURO: tipos, filtros, orden y cálculos de pantalla. Las reglas (quién avanza, el TC que se congela al
// numerar la DAM, el reparto del costeo, quién reabre) viven en la base: 0003 (ac_des_*) y 0050.

export const ESTADOS_DES = ['Borrador', 'Documentos completos', 'DAM numerada', 'Llegada', 'Levante', 'En almacén', 'Costeo cerrado'] as const;
export type EstadoDes = (typeof ESTADOS_DES)[number];
export const TIPOS_DES = ['Marítimo', 'Aéreo', 'Courier'] as const;
export type TipoDes = (typeof TIPOS_DES)[number];
export const ALCANCES = ['Total', 'Parcial'] as const;
export type Alcance = (typeof ALCANCES)[number];
export const MONEDAS_DAM = ['USD', 'EUR'] as const;
export const MONEDAS_GASTO = ['USD', 'EUR', 'PEN'] as const;
export type MonedaGasto = (typeof MONEDAS_GASTO)[number];
export const TIPOS_COMPROBANTE = ['Factura', 'Nota de crédito', 'Nota de débito', 'Liquidación SUNAT/DAM', 'Recibo', 'Otro'] as const;
export type TipoComprobante = (typeof TIPOS_COMPROBANTE)[number];

/** El hilo de fases de la ficha: los siete estados en orden. */
export const FASES_DES: string[] = [...ESTADOS_DES];
export const faseDes = (e: EstadoDes) => ESTADOS_DES.indexOf(e);

export type TonoChip = 'ok' | 'warn' | 'danger' | 'info' | 'muted';
export const tonoEstadoDes = (e: EstadoDes): TonoChip => (e === 'Costeo cerrado' ? 'ok' : e === 'En almacén' ? 'warn' : e === 'Borrador' ? 'muted' : 'info');

/** Una fila de la lista. */
export interface Desaduanaje {
    id: string;
    numero: string;
    romano: string;
    estado: EstadoDes;
    tipo: TipoDes;
    alcance: Alcance;
    ordenId: string;
    ordenNumero: string;
    proveedor: string;
    proyecto: string;
    nDam: string;
    blAwb: string;
    fechaEmbarque: string | null;
    fechaLlegadaEst: string | null;
    fechaNumeracion: string | null;
    fechaLlegada: string | null;
    fechaLevante: string | null;
    fechaAlmacen: string | null;
    fi: number | null;
    versionCosteo: number;
    creado: string;
}

export interface Checklist {
    factura: boolean;
    bl: boolean;
    certOrigen: boolean;
    seguro: boolean;
    permiso: boolean;
}

/** Columnas que se editan directo (las que permite app.proteger en 0002). */
export interface DatosDes {
    agente: string;
    blAwb: string;
    fechaEmbarque: string | null;
    fechaLlegadaEst: string | null;
    monedaDam: string;
    requierePermiso: boolean;
    tipoPermiso: string;
    comentario: string;
}

export interface ProductoDes {
    id: string;
    ordenId: string;
    descripcion: string;
    esMuestra: boolean;
    cantidad: number;
    moneda: string;
    precioExw: number;
    adValoremUsd: number;
    exwS: number | null;
    pctReparto: number | null;
    gastosS: number | null;
    adValoremS: number | null;
    costoTotalS: number | null;
    costoUnitS: number | null;
    cantRecibida: number | null;
    incidencia: string;
}

export interface GastoDes {
    id: string;
    concepto: string;
    entraCosto: boolean;
    emisor: string;
    rucEmisor: string;
    tipoComprobante: TipoComprobante;
    nComprobante: string;
    fechaComprobante: string | null;
    moneda: MonedaGasto;
    montoSinIgv: number;
    tcCosteo: number;
    montoS: number;
    ocHijaId: string | null;
    ocHija: string;
    registradoPor: string;
    fechaRegistro: string;
    comentario: string;
}

export interface VersionCosteo {
    version: number;
    fecha: string;
    cerradoPor: string | null;
    motivo: string;
    fi: number | null;
    productos: { producto: string; cantidad: number; exwUnitS: number | null; fi: number | null; costoUnitS: number | null }[];
}

export interface DesaduanajeDetalle extends Desaduanaje, DatosDes {
    empresaId: string;
    ordenMoneda: string;
    tcUsd: number | null;
    tcEur: number | null;
    tcGbp: number | null;
    chk: Checklist;
    /** Tipos de documento subidos (un documento subido también cuenta en el checklist). */
    tiposSubidos: string[];
    carpetaDriveUrl: string;
    exwTotalS: number | null;
    gastosCostoS: number | null;
    cerradoPor: string | null;
    fechaCierre: string | null;
    motivoReapertura: string;
    creadoPor: string;
    productos: ProductoDes[];
    gastos: GastoDes[];
    versiones: VersionCosteo[];
}

export interface ConceptoGasto {
    concepto: string;
    entraCosto: boolean;
    reparto: 'Producto' | 'Valor';
    orden: number;
    activo: boolean;
}

export interface TcCosteo {
    moneda: string;
    tc: number;
    vigenteDesde: string;
}

/** Una OC que puede tener desaduanaje (importación aprobada, no anulada): para «Nuevo desaduanaje». */
export interface OcElegible {
    id: string;
    numero: string;
    proveedor: string;
    proyecto: string;
    moneda: string;
    monto: number;
    desaduanajes: number;
}

export interface NuevoGasto {
    concepto: string;
    emisor: string;
    rucEmisor: string;
    tipoComprobante: TipoComprobante;
    nComprobante: string;
    fechaComprobante: string | null;
    moneda: MonedaGasto;
    montoSinIgv: number | null;
    tcCosteo: number | null;
    ocHijaId: string | null;
    comentario: string;
}
