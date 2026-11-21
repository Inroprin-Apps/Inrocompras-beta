// Costeo: TC sugerido, totales, FI y gastos. PURO (el cálculo oficial lo hace app.des_calcular en la base).
import type { DesaduanajeDetalle, GastoDes, MonedaGasto, NuevoGasto, ProductoDes, TcCosteo } from './desaduanaje.ts';

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
export function totalesCosteo(
    productos: readonly Pick<ProductoDes, 'exwS' | 'adValoremS'>[],
    gastos: readonly Pick<GastoDes, 'entraCosto' | 'montoS' | 'tipoComprobante'>[],
): TotalesCosteo {
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
    if (g.montoSinIgv == null || !(g.montoSinIgv > 0))
        return 'El monto sin IGV tiene que ser mayor que cero (una nota de crédito también va en positivo). Usa punto para los decimales: 1250.50';
    if (g.moneda !== 'PEN' && (g.tcCosteo == null || !(g.tcCosteo > 0)))
        return 'Escribe el tipo de cambio de costeo, mayor que cero. Usa punto para los decimales: 3.785';
    if (g.rucEmisor.trim() && !/^\d{11}$/.test(g.rucEmisor.trim())) return 'El RUC del emisor tiene 11 dígitos. Revísalo o déjalo vacío.';
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
