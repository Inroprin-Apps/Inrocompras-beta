// Pagos: las cuotas de las órdenes (AppSheet: Pagos). PURO: tipos, filtros, orden, KPIs y presentación.
// Las reglas (quién solicita, programa, paga, observa, subsana, divide) viven en la base (0003 ac_pago_*):
// la pantalla pregunta acciones_disponibles('pagos', id) y muestra lo que devuelve.

import { palabrasDe, plano } from '@/shared/texto.ts';

export const ESTADOS_PAGO = ['Plan', 'Solicitado', 'Programado', 'Pagado', 'Observado Finanzas', 'Anulado'] as const;
export type EstadoPago = (typeof ESTADOS_PAGO)[number];
export const TIPOS_PAGO = ['Adelanto', 'Valorización', 'Pago parcial', 'Saldo', 'Pago total', 'Caja chica', 'Reembolso'] as const;
export const MONEDAS_PAGO = ['PEN', 'USD', 'EUR', 'GBP'] as const;

export interface FacturaPago {
    id: string;
    numero: string;
    fecha: string | null;
    monto: number | null;
    moneda: string | null;
}

export interface Pago {
    id: string;
    ordenId: string;
    ordenNumero: string;
    ordenEstatus: string;
    procedencia: string;
    proveedorId: string | null;
    proveedor: string;
    compradorId: string;
    moneda: string;
    nCuota: number;
    tipo: string;
    hito: string;
    porcentaje: number | null;
    monto: number;
    /** El monto de la cuota en soles, con el tipo de cambio de la orden (monto_soles / monto). */
    montoSoles: number;
    aplicaRetencion: boolean;
    retencion: number;
    neto: number | null;
    fechaLimite: string | null;
    fechaProgramada: string | null;
    fechaPago: string | null;
    estado: EstadoPago;
    factura: FacturaPago | null;
    sustento: string;
    nOperacion: string;
    voucherId: string | null;
    motivoObs: string;
    detalleObs: string;
    inropayRef: string;
    comentario: string;
    creado: string;
}

// ── Fechas (America/Lima) ──
/** Hoy en Lima como AAAA-MM-DD. */
export function hoyLima(ahora: Date = new Date()): string {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit' }).format(ahora);
}
const sumarDias = (iso: string, dias: number) => {
    const d = new Date(`${iso}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + dias);
    return d.toISOString().slice(0, 10);
};
const PENDIENTES: readonly string[] = ['Plan', 'Solicitado', 'Programado', 'Observado Finanzas'];
/** Vencida: aún no pagada (ni anulada) y con la fecha límite antes de hoy. */
export const vencida = (p: Pick<Pago, 'estado' | 'fechaLimite'>, hoy: string) => PENDIENTES.includes(p.estado) && !!p.fechaLimite && p.fechaLimite < hoy;
/** La fecha de pago (timestamptz) como día de Lima. */
export const diaPago = (p: Pick<Pago, 'fechaPago'>) => (p.fechaPago ? (p.fechaPago.length > 10 ? hoyLima(new Date(p.fechaPago)) : p.fechaPago) : null);

// ── Lista ──
export type PestanaPago = 'atender' | 'mias' | 'todas';
export type Vence = '' | 'vencidas' | 'semana' | 'mes' | 'sin';
export const VENCE: { value: Vence; label: string }[] = [
    { value: '', label: 'Cualquier fecha límite' },
    { value: 'vencidas', label: 'Vencidas' },
    { value: 'semana', label: 'Vencen en 7 días' },
    { value: 'mes', label: 'Vencen en 30 días' },
    { value: 'sin', label: 'Sin fecha límite' },
];

export interface FiltrosPago {
    estado: string;
    vence: Vence;
    proveedor: string;
    moneda: string;
    texto: string;
}
export const FILTROS_PAGO: FiltrosPago = { estado: '', vence: '', proveedor: '', moneda: '', texto: '' };

export function filtrarPagos(lista: Pago[], f: FiltrosPago, hoy: string): Pago[] {
    const palabras = palabrasDe(f.texto);
    const semana = sumarDias(hoy, 7);
    const mes = sumarDias(hoy, 30);
    return lista.filter((p) => {
        if (f.estado && p.estado !== f.estado) return false;
        if (f.proveedor && p.proveedorId !== f.proveedor) return false;
        if (f.moneda && p.moneda !== f.moneda) return false;
        if (f.vence === 'vencidas' && !vencida(p, hoy)) return false;
        if (f.vence === 'semana' && !(PENDIENTES.includes(p.estado) && p.fechaLimite && p.fechaLimite >= hoy && p.fechaLimite <= semana)) return false;
        if (f.vence === 'mes' && !(PENDIENTES.includes(p.estado) && p.fechaLimite && p.fechaLimite >= hoy && p.fechaLimite <= mes)) return false;
        if (f.vence === 'sin' && p.fechaLimite) return false;
        if (!palabras.length) return true;
        const t = plano(`${p.ordenNumero} ${p.proveedor} ${p.tipo} ${p.hito} ${p.estado} ${p.inropayRef} ${p.nOperacion} ${p.factura?.numero ?? ''}`);
        return palabras.every((w) => t.includes(w));
    });
}

/**
 * Pestañas: «Por atender» (Finanzas: lo solicitado y lo programado), «Mías» (Compras: las cuotas de sus órdenes)
 * y «Todas». Solo agrupan lo que la persona ya ve; lo que puede hacer lo dice la base en la ficha.
 */
export function dePestana(lista: Pago[], p: PestanaPago, yo: string): Pago[] {
    if (p === 'atender') return lista.filter((x) => x.estado === 'Solicitado' || x.estado === 'Programado');
    if (p === 'mias') return lista.filter((x) => x.compradorId === yo && x.estado !== 'Anulado');
    return lista;
}

export type OrdenPago = 'limite' | 'recientes' | 'monto' | 'orden';
export function ordenarPagos(lista: Pago[], o: OrdenPago): Pago[] {
    const c = [...lista];
    if (o === 'monto') return c.sort((a, b) => b.montoSoles - a.montoSoles);
    if (o === 'orden') return c.sort((a, b) => a.ordenNumero.localeCompare(b.ordenNumero, 'es', { numeric: true }) || a.nCuota - b.nCuota);
    if (o === 'recientes') return c.sort((a, b) => b.creado.localeCompare(a.creado));
    // Por fecha límite: lo que vence antes arriba; sin fecha al final.
    return c.sort(
        (a, b) =>
            (a.fechaLimite ?? '9999').localeCompare(b.fechaLimite ?? '9999') ||
            a.ordenNumero.localeCompare(b.ordenNumero, 'es', { numeric: true }) ||
            a.nCuota - b.nCuota,
    );
}

// ── KPIs ──
export interface ResumenPagos {
    porProgramar: { n: number; soles: number };
    porPagar: { n: number; soles: number };
    observadas: { n: number; soles: number };
    pagadoMes: { n: number; soles: number };
    vencidas: number;
}
export function resumenPagos(lista: Pago[], hoy: string): ResumenPagos {
    const mes = hoy.slice(0, 7);
    const r: ResumenPagos = {
        porProgramar: { n: 0, soles: 0 },
        porPagar: { n: 0, soles: 0 },
        observadas: { n: 0, soles: 0 },
        pagadoMes: { n: 0, soles: 0 },
        vencidas: 0,
    };
    const suma = (k: Exclude<keyof ResumenPagos, 'vencidas'>, p: Pago) => {
        r[k].n++;
        r[k].soles += p.montoSoles;
    };
    for (const p of lista) {
        if (p.estado === 'Solicitado') suma('porProgramar', p);
        else if (p.estado === 'Programado') suma('porPagar', p);
        else if (p.estado === 'Observado Finanzas') suma('observadas', p);
        else if (p.estado === 'Pagado' && diaPago(p)?.slice(0, 7) === mes) suma('pagadoMes', p);
        if (vencida(p, hoy)) r.vencidas++;
    }
    return r;
}

// ── Acciones en bloque ──
/** Lo que se ofrece marcar para programar en bloque (la base decide al hacerlo y dice por qué falla). */
export const seleccionable = (p: Pick<Pago, 'estado'>) => p.estado === 'Solicitado';

export interface ResultadoBloque {
    id: string;
    nombre: string;
    error: string | null;
}
export function resumenBloque(rs: ResultadoBloque[]): { hechas: number; fallidas: ResultadoBloque[] } {
    const fallidas = rs.filter((r) => r.error);
    return { hechas: rs.length - fallidas.length, fallidas };
}

// ── Presentación ──
export type TonoChip = 'ok' | 'warn' | 'danger' | 'info' | 'muted';
export function tonoPago(e: string): TonoChip {
    if (e === 'Pagado') return 'ok';
    if (e === 'Observado Finanzas') return 'warn';
    if (e === 'Anulado') return 'muted';
    if (e === 'Plan') return 'muted';
    return 'info';
}

/** «INROPRIN-NAC-2026-0001 · cuota 1». */
export const nombrePago = (p: Pick<Pago, 'ordenNumero' | 'nCuota'>) => `${p.ordenNumero || 'Orden'} · cuota ${formatoCuota(p.nCuota)}`;
export const formatoCuota = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

/** El hilo de fases de la cuota (docs/03 §Cuota de pago). -1: anulada. */
export const FASES_PAGO = ['Plan', 'Solicitado', 'Programado', 'Pagado'];
export function fasePago(e: string): number {
    if (e === 'Anulado') return -1;
    if (e === 'Observado Finanzas') return 1;
    return Math.max(0, FASES_PAGO.indexOf(e));
}

/** Una nota junto a las fases, según el estado. */
export function notaPago(p: Pick<Pago, 'estado' | 'motivoObs' | 'detalleObs' | 'factura' | 'sustento' | 'tipo'>): string | null {
    if (p.estado === 'Observado Finanzas')
        return `Finanzas observó la cuota: ${p.motivoObs || 'sin motivo'}${p.detalleObs ? ` («${p.detalleObs}»)` : ''}. Corrige lo que pide y subsánala.`;
    if (p.estado === 'Plan' && !p.factura && p.tipo !== 'Adelanto' && p.tipo !== 'Caja chica')
        return 'Sube la factura con el monto de la cuota y se solicita sola. Sin factura, al solicitar escribe el sustento.';
    if (p.estado === 'Anulado') return 'La cuota quedó anulada.';
    return null;
}
