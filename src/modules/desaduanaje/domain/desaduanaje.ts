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

// ───────────────────────── Checklist (réplica de app.des_docs_faltantes) ─────────────────────────
export interface ItemChecklist {
    campo: keyof Checklist;
    /** Columna chk_* que se marca. */
    columna: 'chk_factura' | 'chk_bl' | 'chk_cert_origen' | 'chk_seguro' | 'chk_permiso';
    etiqueta: string;
    /** El tipo de documento que, subido, también lo cumple. */
    tipoDoc: string;
    /** El nombre con el que lo dice la base en «Falta: …». */
    falta: string;
    marcado: boolean;
    subido: boolean;
    cumple: boolean;
}

const ITEMS: Omit<ItemChecklist, 'marcado' | 'subido' | 'cumple'>[] = [
    { campo: 'factura', columna: 'chk_factura', etiqueta: 'Factura comercial', tipoDoc: 'Factura comercial', falta: 'Factura comercial' },
    { campo: 'bl', columna: 'chk_bl', etiqueta: 'BL / AWB', tipoDoc: 'BL / AWB', falta: 'BL / AWB' },
    { campo: 'certOrigen', columna: 'chk_cert_origen', etiqueta: 'Certificado de origen', tipoDoc: 'Certificado de origen', falta: 'Certificado de origen' },
    { campo: 'seguro', columna: 'chk_seguro', etiqueta: 'Póliza de seguro', tipoDoc: 'Póliza de seguro', falta: 'Seguro' },
    { campo: 'permiso', columna: 'chk_permiso', etiqueta: 'Permiso (MTC / DIGESA)', tipoDoc: 'Permiso (MTC / DIGESA)', falta: 'Permiso' },
];

/** Los documentos del checklist: un documento cuenta si se marcó o si se subió el archivo (el permiso, solo si se requiere). */
export function checklist(d: { chk: Checklist; requierePermiso: boolean }, tiposSubidos: readonly string[]): ItemChecklist[] {
    return ITEMS.filter((i) => i.campo !== 'permiso' || d.requierePermiso).map((i) => {
        const marcado = d.chk[i.campo];
        const subido = tiposSubidos.includes(i.tipoDoc);
        return { ...i, marcado, subido, cumple: marcado || subido };
    });
}

/** Lo que falta, con las mismas palabras que la base (app.des_docs_faltantes). */
export const faltantes = (d: { chk: Checklist; requierePermiso: boolean }, tiposSubidos: readonly string[]) =>
    checklist(d, tiposSubidos).filter((i) => !i.cumple).map((i) => i.falta);

// ───────────────────────── TC de costeo ─────────────────────────
export type OrigenTc = 'soles' | 'congelado' | 'vigente' | 'referencial';
export interface TcSugerido {
    tc: number | null;
    origen: OrigenTc;
    nota: string;
}

/** El TC congelado del desaduanaje (decisión 19/11: se congela al numerar la DAM; antes es el referencial). */
export const tcDe = (d: { tcUsd: number | null; tcEur: number | null; tcGbp: number | null }, moneda: string) =>
    moneda === 'USD' ? d.tcUsd : moneda === 'EUR' ? d.tcEur : moneda === 'GBP' ? d.tcGbp : moneda === 'PEN' ? 1 : null;

/** El TC de costeo vigente a una fecha (el último registrado con vigente_desde ≤ fecha), o null. */
export function tcVigente(tcs: readonly TcCosteo[], moneda: string, fecha: string): number | null {
    let mejor: TcCosteo | null = null;
    for (const t of tcs) if (t.moneda === moneda && t.vigenteDesde <= fecha && (!mejor || t.vigenteDesde > mejor.vigenteDesde)) mejor = t;
    return mejor?.tc ?? null;
}

/**
 * El TC que se sugiere para un gasto: en soles, 1; con la DAM numerada, el congelado del desaduanaje;
 * si no, el TC de costeo vigente a la fecha del comprobante (u hoy); si no hay, el referencial del desaduanaje.
 */
export function tcSugerido(
    moneda: string,
    fecha: string,
    d: { tcUsd: number | null; tcEur: number | null; tcGbp: number | null; fechaNumeracion: string | null },
    tcs: readonly TcCosteo[],
): TcSugerido {
    if (moneda === 'PEN') return { tc: 1, origen: 'soles', nota: 'En soles el TC es 1.' };
    const congelado = tcDe(d, moneda);
    if (d.fechaNumeracion && congelado != null) return { tc: congelado, origen: 'congelado', nota: 'TC congelado al numerar la DAM.' };
    const vigente = tcVigente(tcs, moneda, fecha);
    if (vigente != null) return { tc: vigente, origen: 'vigente', nota: 'TC de costeo vigente a la fecha del comprobante.' };
    return { tc: congelado, origen: 'referencial', nota: 'No hay TC de costeo registrado: es el referencial de la moneda.' };
}

// ───────────────────────── Totales del costeo ─────────────────────────
export interface TotalesCosteo {
    exwS: number;
    /** Gastos que entran al costo (las notas de crédito restan). */
    gastosCostoS: number;
    /** Gastos registrados que no entran al costo (IGV, percepción…). */
    gastosFueraS: number;
    adValoremS: number;
    costoTotalS: number;
    /** Factor de importación = costo total / EXW, o null sin EXW. */
    fi: number | null;
}

const signo = (g: Pick<GastoDes, 'tipoComprobante'>) => (g.tipoComprobante === 'Nota de crédito' ? -1 : 1);
const r2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Los totales con lo calculado en la base (exw_s y ad_valorem_s de cada producto, que escribe app.des_calcular)
 * y los gastos registrados hasta ahora: así se ve qué cambia si se vuelve a calcular.
 */
export function totalesCosteo(productos: readonly Pick<ProductoDes, 'exwS' | 'adValoremS'>[], gastos: readonly Pick<GastoDes, 'entraCosto' | 'montoS' | 'tipoComprobante'>[]): TotalesCosteo {
    const exwS = r2(productos.reduce((a, p) => a + (p.exwS ?? 0), 0));
    const adValoremS = r2(productos.reduce((a, p) => a + (p.adValoremS ?? 0), 0));
    const gastosCostoS = r2(gastos.filter((g) => g.entraCosto).reduce((a, g) => a + signo(g) * g.montoS, 0));
    const gastosFueraS = r2(gastos.filter((g) => !g.entraCosto).reduce((a, g) => a + signo(g) * g.montoS, 0));
    const costoTotalS = r2(exwS + gastosCostoS + adValoremS);
    return { exwS, gastosCostoS, gastosFueraS, adValoremS, costoTotalS, fi: exwS ? Math.round((costoTotalS / exwS) * 1e6) / 1e6 : null };
}

/** ¿Lo que muestra el costeo guardado ya incluye todos los gastos? (si no, hay que volver a calcular). */
export const costeoDesactualizado = (d: Pick<DesaduanajeDetalle, 'gastosCostoS' | 'estado'>, t: TotalesCosteo) =>
    d.estado !== 'Costeo cerrado' && Math.abs((d.gastosCostoS ?? 0) - t.gastosCostoS) >= 0.01;

// ───────────────────────── Gastos ─────────────────────────
export const montoS = (monto: number, tc: number) => Math.round(monto * tc * 100) / 100;

/** Qué falta para guardar un gasto (en palabras), o null. */
export function faltaEnGasto(g: NuevoGasto): string | null {
    if (!g.concepto) return 'Elige el concepto del gasto.';
    if (g.montoSinIgv == null || !(g.montoSinIgv > 0)) return 'Escribe el monto sin IGV, mayor que cero (una nota de crédito también va en positivo).';
    if (g.moneda !== 'PEN' && (g.tcCosteo == null || !(g.tcCosteo > 0))) return 'Escribe el tipo de cambio de costeo.';
    if (g.rucEmisor.trim() && !/^\d{11}$/.test(g.rucEmisor.trim())) return 'El RUC del emisor tiene 11 dígitos.';
    return null;
}

export const gastoVacio = (moneda: MonedaGasto = 'USD'): NuevoGasto => ({
    concepto: '',
    emisor: '',
    rucEmisor: '',
    tipoComprobante: 'Factura',
    nComprobante: '',
    fechaComprobante: null,
    moneda,
    montoSinIgv: null,
    tcCosteo: null,
    ocHijaId: null,
    comentario: '',
});

export const aNuevoGasto = (g: GastoDes): NuevoGasto => ({
    concepto: g.concepto,
    emisor: g.emisor,
    rucEmisor: g.rucEmisor,
    tipoComprobante: g.tipoComprobante,
    nComprobante: g.nComprobante,
    fechaComprobante: g.fechaComprobante,
    moneda: g.moneda,
    montoSinIgv: g.montoSinIgv,
    tcCosteo: g.tcCosteo,
    ocHijaId: g.ocHijaId,
    comentario: g.comentario,
});

// ───────────────────────── Lista: filtros y orden ─────────────────────────
export interface FiltrosDes {
    estado: '' | EstadoDes | 'abiertos';
    tipo: '' | TipoDes;
    texto: string;
}
export const FILTROS_DES: FiltrosDes = { estado: '', tipo: '', texto: '' };

const plano = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function filtrarDes(lista: readonly Desaduanaje[], f: FiltrosDes): Desaduanaje[] {
    const palabras = plano(f.texto).split(/\s+/).filter(Boolean);
    return lista.filter((d) => {
        if (f.estado === 'abiertos' ? d.estado === 'Costeo cerrado' : f.estado && d.estado !== f.estado) return false;
        if (f.tipo && d.tipo !== f.tipo) return false;
        if (!palabras.length) return true;
        const t = plano(`${d.numero} ${d.romano} ${d.ordenNumero} ${d.proveedor} ${d.proyecto} ${d.nDam} ${d.blAwb}`);
        return palabras.every((w) => t.includes(w));
    });
}

export type OrdenDes = 'recientes' | 'numero' | 'llegada';
export function ordenarDes(lista: readonly Desaduanaje[], o: OrdenDes): Desaduanaje[] {
    const c = [...lista];
    if (o === 'numero') return c.sort((a, b) => b.numero.localeCompare(a.numero, 'es', { numeric: true }));
    if (o === 'llegada') {
        const f = (d: Desaduanaje) => d.fechaLlegada ?? d.fechaLlegadaEst ?? '9999';
        return c.sort((a, b) => f(a).localeCompare(f(b)));
    }
    return c.sort((a, b) => b.creado.localeCompare(a.creado));
}

/** «DES-2026-0001 (I)». */
export const nombreDes = (d: { numero: string; romano: string }) => `${d.numero || 'Desaduanaje'}${d.romano ? ` (${d.romano})` : ''}`;

/** La fecha más relevante del estado actual, para la lista. */
export function fechaDelEstado(d: Desaduanaje): { etiqueta: string; fecha: string | null } {
    if (d.fechaAlmacen) return { etiqueta: 'En almacén', fecha: d.fechaAlmacen };
    if (d.fechaLevante) return { etiqueta: 'Levante', fecha: d.fechaLevante };
    if (d.fechaLlegada) return { etiqueta: 'Llegó', fecha: d.fechaLlegada };
    if (d.fechaLlegadaEst) return { etiqueta: 'Llegada estimada', fecha: d.fechaLlegadaEst };
    if (d.fechaEmbarque) return { etiqueta: 'Embarque', fecha: d.fechaEmbarque };
    return { etiqueta: '', fecha: null };
}

export function filtrarOcs(lista: readonly OcElegible[], texto: string): OcElegible[] {
    const palabras = plano(texto).split(/\s+/).filter(Boolean);
    if (!palabras.length) return [...lista];
    return lista.filter((o) => {
        const t = plano(`${o.numero} ${o.proveedor} ${o.proyecto}`);
        return palabras.every((w) => t.includes(w));
    });
}

// ───────────────────────── Formato ─────────────────────────
const fmt = new Map<string, Intl.NumberFormat>();
export function monto(n: number, moneda = 'PEN'): string {
    try {
        if (!fmt.has(moneda)) fmt.set(moneda, new Intl.NumberFormat('es-PE', { style: 'currency', currency: moneda, minimumFractionDigits: 2, maximumFractionDigits: 2 }));
        return fmt.get(moneda)!.format(n);
    } catch {
        return `${moneda} ${n.toFixed(2)}`;
    }
}
export const numero = (n: number, dec = 3) => new Intl.NumberFormat('es-PE', { maximumFractionDigits: dec }).format(n);
export const porcentaje = (n: number | null) => (n == null ? '—' : new Intl.NumberFormat('es-PE', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 2 }).format(n));
export const factor = (n: number | null) => (n == null ? '—' : new Intl.NumberFormat('es-PE', { minimumFractionDigits: 4, maximumFractionDigits: 4 }).format(n));
export const tc = (n: number | null) => (n == null ? '—' : new Intl.NumberFormat('es-PE', { minimumFractionDigits: 3, maximumFractionDigits: 6 }).format(n));

/** Lee un número escrito a mano («1,234.5», «1234,5»). */
export function leerNumero(t: string): number | null {
    const s = t.trim().replace(/\s/g, '');
    if (!s) return null;
    const norm = s.includes(',') && !s.includes('.') ? s.replace(',', '.') : s.replace(/,/g, '');
    const n = Number(norm);
    return Number.isFinite(n) ? n : null;
}
