// Órdenes de compra (AppSheet: OC, Base de datos OC NAC, Pagos). PURO: tipos, filtros, orden y presentación.
// Las reglas (quién emite, aprueba, edita) viven en la base (0002/0003/0030): la UI pregunta y muestra.

import { palabrasDe, plano } from '@/shared/texto.ts';

export const PROCEDENCIAS = ['Nacional', 'Importación'] as const;
export type Procedencia = (typeof PROCEDENCIAS)[number];
export const FORMAS_PAGO = ['Contado', 'Crédito', 'Adelanto', 'Tarjeta de crédito', 'Caja chica', 'Contra entrega', 'Letra'] as const;
export type FormaPago = (typeof FORMAS_PAGO)[number];
export const MONEDAS = ['PEN', 'USD', 'EUR', 'GBP'] as const;
export const IMPUESTOS_NACIONAL = ['IGV 18%', 'Exonerado'] as const;
export const INCOTERMS = ['EXW', 'FOB', 'CIF', 'FCA', 'CFR', 'DAP', 'DDP'] as const;
export const CONDICIONES = ['Normal', 'Urgente'] as const;
export const HITOS_SALDO = ['Contra entrega', 'Contra BL', 'Contra fotos y video', 'Contra aprobación'] as const;

/** Los estatus que puede tomar una orden (check de 0001), para el filtro. */
export const ESTATUS = [
    'Borrador',
    'Pendiente de aprobación',
    'Observado por Ppto',
    'Observado por GOP',
    'Observado por GAF',
    'Legajo incompleto',
    'Adelanto pendiente',
    'Pago pendiente',
    'Crédito',
    'Crédito letra',
    'Tarjeta de crédito',
    'Caja chica',
    'Saldo pendiente',
    'Observado por Finanzas',
    'OC pagada',
    'OC cerrada',
    'En modificación',
    'Anulación solicitada',
    'Anulada',
] as const;
export const ESTADOS_APROBACION = ['Falta Aprobación', 'Aprobado para Compra', 'Observado', 'Rechazado'] as const;

export interface Orden {
    id: string;
    numero: string | null;
    estatus: string;
    estadoAprobacion: string | null;
    tipoAprobacion: string | null;
    procedencia: Procedencia;
    clase: string;
    proyectoId: string | null;
    proyecto: string;
    proveedorId: string | null;
    proveedor: string;
    compradorId: string;
    fecha: string;
    moneda: string;
    formaPago: FormaPago;
    monto: number;
    montoSoles: number;
    fechaEmision: string | null;
    creado: string;
}

export interface Linea {
    id: string;
    itemId: string | null;
    nLinea: number | null;
    descripcion: string;
    descripcionProv: string;
    unidad: string;
    cantidad: number;
    precioUnit: number;
    subtotal: number;
    esDemasia: boolean;
    demasiaEstado: 'Pendiente' | 'Aprobada' | 'Rechazada' | null;
    demasiaMotivo: string;
    codigoCliente: string;
    sku: string;
    validacionTecnica: string;
    marca: string;
    modelo: string;
    requerimiento: string;
}

export interface Cuota {
    id: string;
    nCuota: number;
    tipo: string;
    hito: string;
    porcentaje: number | null;
    monto: number;
    estado: string;
    fechaLimite: string | null;
    aplicaRetencion: boolean;
    retencion: number;
    neto: number | null;
}

export interface Firma {
    valor: string | null;
    por: string | null;
    fecha: string | null;
}

export interface Cabecera {
    proveedorId: string | null;
    moneda: string;
    tipoImpuesto: string;
    formaPago: FormaPago;
    pctAdelanto: number | null;
    hitoSaldo: string;
    diasCredito: number | null;
    condicion: string;
    concepto: string;
    lugarEntrega: string;
    plazoEntregaDias: number | null;
    terminos: string;
    incoterm: string;
    referenciaProv: string;
    correoEnvio: string;
}

export interface OrdenDetalle extends Orden {
    cabecera: Cabecera;
    subtotal: number;
    igv: number;
    tipoImpuesto: string;
    ppto: Firma;
    gop: Firma;
    gaf: Firma;
    motivoAprob: string;
    fechaAprobacion: string | null;
    revision: number;
    envioSolicitado: string | null;
    estadoPrevio: string | null;
    lineas: Linea[];
    cuotas: Cuota[];
}

export interface Proveedor {
    id: string;
    razonSocial: string;
    ruc: string;
    origen: 'Nacional' | 'Extranjero';
    pais: string;
    correo: string;
    evaluacionFin: string;
}

/** Lo que la base deja editar ahora (public.oc_edicion): motivo o null = sí. */
export interface Edicion {
    editar: string | null;
    demasia: Record<string, string | null>;
}

export interface LineaNueva {
    itemId: string;
    cantidad: number;
    precioUnit: number;
    descripcionProv: string;
}
export interface NuevaOrden {
    proveedorId: string;
    procedencia: Procedencia;
    moneda: string;
    formaPago: FormaPago;
    proyectoId: string | null;
    lineas: LineaNueva[];
}

// ── Presentación ──
export type TonoChip = 'ok' | 'warn' | 'danger' | 'info' | 'muted';

export function tonoEstatus(e: string): TonoChip {
    if (e === 'Anulada' || e === 'Rechazada') return 'danger';
    if (e.startsWith('Observado') || e === 'Anulación solicitada' || e === 'En modificación') return 'warn';
    if (e === 'OC pagada' || e === 'OC cerrada') return 'ok';
    if (e === 'Borrador') return 'muted';
    return 'info';
}
export function tonoAprobacion(e: string | null): TonoChip {
    if (!e) return 'muted';
    if (e === 'Aprobado para Compra') return 'ok';
    if (e.startsWith('Observado')) return 'warn';
    if (e === 'Rechazado') return 'danger';
    return 'info';
}

/** Hilo de fases de la ficha (docs/03 §Orden). */
export const FASES_ORDEN = ['Borrador', 'Por aprobar', 'Aprobada', 'Legajo', 'Pago', 'Pagada', 'Cerrada'];
const EN_PAGO = [
    'Pago pendiente',
    'Adelanto pendiente',
    'Crédito',
    'Crédito letra',
    'Tarjeta de crédito',
    'Caja chica',
    'Saldo pendiente',
    'Observado por Finanzas',
];

/** El paso en curso; -1 si la orden quedó anulada o rechazada. En modificación o con anulación pedida, el paso del que viene. */
export function faseOrden(o: { estatus: string; envioSolicitado?: string | null; estadoPrevio?: string | null }): number {
    const e = (o.estatus === 'En modificación' || o.estatus === 'Anulación solicitada') && o.estadoPrevio ? o.estadoPrevio : o.estatus;
    if (e === 'Borrador') return 0;
    if (e === 'Pendiente de aprobación' || (e.startsWith('Observado por') && e !== 'Observado por Finanzas')) return 1;
    if (e === 'Legajo incompleto') return o.envioSolicitado ? 3 : 2;
    if (EN_PAGO.includes(e)) return 4;
    if (e === 'OC pagada') return 5;
    if (e === 'OC cerrada') return 6;
    return -1;
}

/** Una línea lateral (observado/anulado/modificación) que se explica junto a las fases. */
export function lateral(o: { estatus: string }): string | null {
    if (o.estatus === 'Anulada' || o.estatus === 'Rechazada') return 'La orden quedó anulada.';
    if (o.estatus === 'Anulación solicitada') return 'Se pidió anular la orden: la decide la jefatura.';
    if (o.estatus === 'En modificación') return 'La orden está en modificación.';
    if (o.estatus === 'Observado por Finanzas') return 'Finanzas observó la orden.';
    if (o.estatus.startsWith('Observado por')) return `${o.estatus}: corrige y reenvía a aprobación.`;
    return null;
}

const SIMBOLOS: Record<string, string> = { PEN: 'S/', USD: 'US$', EUR: '€' };
/** El símbolo de la moneda: «S/», «US$», «€»; las demás, su código (GBP). */
export const simbolo = (moneda: string) => SIMBOLOS[moneda] ?? moneda;
/** «S/ 1,234.56», «US$ 10.00», «-S/ 5.00»: coma de miles, punto y dos decimales, el signo menos delante (guía, «Formatos»). */
export function monto(n: number, moneda = 'PEN'): string {
    const [entero, dec] = Math.abs(n).toFixed(2).split('.');
    const signo = n < 0 && Number(`${entero}.${dec}`) !== 0 ? '-' : '';
    return `${signo}${simbolo(moneda)} ${entero.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${dec}`;
}
export const cantidad = (n: number) => new Intl.NumberFormat('es-PE', { maximumFractionDigits: 3 }).format(n);

/** Título de una orden aún sin número. */
export const nombreOrden = (o: { numero: string | null; procedencia: string }) =>
    o.numero ?? `Borrador ${o.procedencia === 'Importación' ? 'de importación' : 'nacional'}`;

// ── Lista ──
export type PestanaOrden = 'mias' | 'aprobar' | 'todas';

export interface FiltrosOrden {
    estatus: string;
    aprobacion: string;
    procedencia: '' | Procedencia;
    proyecto: string;
    proveedor: string;
    comprador: string;
    texto: string;
}
export const FILTROS_ORDEN: FiltrosOrden = { estatus: '', aprobacion: '', procedencia: '', proyecto: '', proveedor: '', comprador: '', texto: '' };

export function filtrarOrdenes(lista: Orden[], f: FiltrosOrden): Orden[] {
    const palabras = palabrasDe(f.texto);
    return lista.filter((o) => {
        if (f.estatus && o.estatus !== f.estatus) return false;
        if (f.aprobacion && !(o.estadoAprobacion ?? '').startsWith(f.aprobacion)) return false;
        if (f.procedencia && o.procedencia !== f.procedencia) return false;
        if (f.proyecto && (f.proyecto === 'sin' ? o.proyectoId !== null : o.proyectoId !== f.proyecto)) return false;
        if (f.proveedor && o.proveedorId !== f.proveedor) return false;
        if (f.comprador && o.compradorId !== f.comprador) return false;
        if (!palabras.length) return true;
        const t = plano(`${o.numero ?? 'borrador'} ${o.proveedor} ${o.proyecto} ${o.estatus}`);
        return palabras.every((w) => t.includes(w));
    });
}

/** Pestañas: «Mías» (las que compré), «Por aprobar» (ids que la base pone en mi «Te toca»), «Todas». */
export function dePestana(lista: Orden[], p: PestanaOrden, yo: string, porAprobar: ReadonlySet<string>): Orden[] {
    if (p === 'mias') return lista.filter((o) => o.compradorId === yo);
    if (p === 'aprobar') return lista.filter((o) => porAprobar.has(o.id));
    return lista;
}

export type OrdenOrden = 'recientes' | 'numero' | 'monto';
export function ordenarOrdenes(lista: Orden[], o: OrdenOrden): Orden[] {
    const c = [...lista];
    if (o === 'numero') return c.sort((a, b) => (a.numero ?? '').localeCompare(b.numero ?? '', 'es', { numeric: true }));
    if (o === 'monto') return c.sort((a, b) => b.montoSoles - a.montoSoles);
    return c.sort((a, b) => (b.fechaEmision ?? b.creado).localeCompare(a.fechaEmision ?? a.creado));
}

// ── Formulario de cabecera ──
export const pideAdelanto = (f: FormaPago) => f === 'Adelanto';
export const pideCredito = (f: FormaPago) => f === 'Crédito' || f === 'Letra';

/** Qué falta en la cabecera (en palabras), o null. Solo lo de forma; lo demás lo dice la base al emitir. */
export function faltaEnCabecera(c: Cabecera): string | null {
    if (!c.proveedorId) return 'Elige el proveedor.';
    if (pideAdelanto(c.formaPago) && !(c.pctAdelanto && c.pctAdelanto > 0 && c.pctAdelanto < 1)) return 'Escribe el % de adelanto (entre 1 y 99).';
    if (pideCredito(c.formaPago) && !(c.diasCredito && c.diasCredito > 0)) return 'Escribe los días de crédito.';
    return null;
}

/** Totales de las líneas (lo que la base calculará; para mostrar mientras se edita). Excluye demasías rechazadas. */
export function totales(lineas: Pick<Linea, 'cantidad' | 'precioUnit' | 'esDemasia' | 'demasiaEstado'>[], tipoImpuesto: string) {
    const subtotal = lineas
        .filter((l) => !(l.esDemasia && l.demasiaEstado === 'Rechazada'))
        .reduce((s, l) => s + Math.round(l.cantidad * l.precioUnit * 100) / 100, 0);
    const igv = tipoImpuesto === 'IGV 18%' ? Math.round(subtotal * 18) / 100 : 0;
    return { subtotal, igv, total: subtotal + igv };
}

/** Lee un número escrito por la persona («1,250.5» o «1250,5»); null si no es número. */
export function leerNumero(t: string): number | null {
    const s = t.trim().replace(/\s/g, '');
    if (!s) return null;
    const norm = s.includes(',') && !s.includes('.') ? s.replace(',', '.') : s.replace(/,/g, '');
    const n = Number(norm);
    return Number.isFinite(n) ? n : null;
}
