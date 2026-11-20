// Requerimientos, sus ítems y las anulaciones (AppSheet: Requerimientos, Items, Anulaciones). PURO: tipos, filtros,
// orden y reglas de presentación. Quién emite, observa, anula o valida lo deciden las funciones de la base (0003/0010).

export const ESTADOS_REQ = ['En Proceso', 'Emitido', 'Observado', 'Anulado'] as const;
export type EstadoReq = (typeof ESTADOS_REQ)[number];

export const TIPOS_COMPRA = ['Nacional', 'Importación', 'Nacional/Importaciones'] as const;
export type TipoCompra = (typeof TIPOS_COMPRA)[number];

export const CANALES = ['Nacional', 'Importación'] as const;
export type Canal = (typeof CANALES)[number];

export const VALIDACIONES = ['Pendiente', 'Validado', 'Observado', 'No aplica'] as const;
export type Validacion = (typeof VALIDACIONES)[number];

export const CAUSAS_ANULACION = ['Error de emisión', 'Ya no se necesita', 'Cambio de especificación', 'Otro'] as const;
export type CausaAnulacion = (typeof CAUSAS_ANULACION)[number];

export const ESTADOS_ANULACION = ['Pendiente', 'Aprobada', 'Rechazada', 'Ejecutada', 'En Compras'] as const;
export type EstadoAnulacion = (typeof ESTADOS_ANULACION)[number];

export interface Requerimiento {
    id: string;
    numero: string;
    rqSidige: string;
    empresaId: string;
    areaEmisora: string;
    tipoCompra: TipoCompra | null;
    proyectoId: string | null;
    motivo: string;
    destino: string;
    direccion: string;
    receptor: string;
    conceptoGeneral: string;
    solicitudId: string | null;
    estado: EstadoReq;
    emisorId: string | null;
    fechaEmision: string | null;
    motivoObservacion: string;
    creado: string;
    nItems: number;
}

export interface ItemRequerimiento {
    id: string;
    requerimientoId: string;
    nItem: number | null;
    tipo: string;
    codigoCliente: string;
    codigoSidige: string;
    descripcion: string;
    unidad: string;
    cantidad: number;
    concepto: string;
    canal: Canal | null;
    plazoEntregaDias: number | null;
    fechaMeta: string | null;
    presupuestoUnit: number | null;
    monedaPpto: string | null;
    incluidoEn: string | null;
    anulado: boolean;
    validacionTecnica: Validacion;
    marca: string;
    modelo: string;
    tecPor: string | null;
    tecFecha: string | null;
    tecMotivo: string;
}

export interface Anulacion {
    id: string;
    requerimientoId: string;
    itemId: string | null;
    causa: CausaAnulacion;
    motivo: string;
    solicitadoPor: string;
    estado: EstadoAnulacion;
    aprobadoPor: string | null;
    fechaAprobacion: string | null;
    motivoRechazo: string;
    creado: string;
}

export interface RequerimientoDetalle {
    requerimiento: Requerimiento;
    items: ItemRequerimiento[];
    anulaciones: Anulacion[];
    solicitud: { id: string; numero: string; solicitanteId: string } | null;
}

/** Lo que el área emisora completa en la cabecera mientras está En Proceso (columnas que deja app.proteger). */
export interface CabeceraReq {
    empresaId: string;
    tipoCompra: TipoCompra | null;
    destino: string;
    direccion: string;
    receptor: string;
    conceptoGeneral: string;
}
export const aCabecera = (r: Requerimiento): CabeceraReq => ({
    empresaId: r.empresaId,
    tipoCompra: r.tipoCompra,
    destino: r.destino,
    direccion: r.direccion,
    receptor: r.receptor,
    conceptoGeneral: r.conceptoGeneral,
});

/** Lo que el área emisora completa en cada ítem. */
export interface EdicionItem {
    concepto: string;
    canal: Canal | null;
    fechaMeta: string | null;
    plazoEntregaDias: string;
}
export const aEdicionItem = (i: ItemRequerimiento): EdicionItem => ({
    concepto: i.concepto,
    canal: i.canal,
    fechaMeta: i.fechaMeta,
    plazoEntregaDias: i.plazoEntregaDias == null ? '' : String(i.plazoEntregaDias),
});

/** Qué falta en la cabecera para emitir (lo mismo que dirá la base, aquí solo como guía del formulario), o null. */
export function faltaEnCabecera(c: CabeceraReq): string | null {
    if (!c.empresaId) return 'Elige la empresa.';
    if (!c.tipoCompra) return 'Elige el tipo de compra.';
    if (!c.destino.trim()) return 'Escribe el destino.';
    return null;
}

export function faltaEnItem(e: EdicionItem): string | null {
    const p = e.plazoEntregaDias.trim();
    if (p && !/^\d{1,4}$/.test(p)) return 'El plazo de entrega va en días: un número entero.';
    return null;
}

export type TonoChip = 'ok' | 'warn' | 'danger' | 'info' | 'muted';
export function tonoEstado(e: EstadoReq): TonoChip {
    if (e === 'Emitido') return 'ok';
    if (e === 'Observado') return 'warn';
    if (e === 'Anulado') return 'danger';
    return 'info';
}
export function tonoValidacion(v: Validacion): TonoChip {
    if (v === 'Validado') return 'ok';
    if (v === 'Observado') return 'warn';
    if (v === 'No aplica') return 'muted';
    return 'info';
}
export function tonoAnulacion(e: EstadoAnulacion): TonoChip {
    if (e === 'Pendiente') return 'warn';
    if (e === 'Ejecutada' || e === 'Aprobada') return 'danger';
    if (e === 'En Compras') return 'warn';
    return 'muted';
}

/** Hilo de fases: En Proceso → Emitido. Observado vuelve al inicio (lo corrige el solicitante); Anulado corta el hilo. */
export const FASES_REQ = ['En Proceso', 'Emitido'];
export const faseActual = (e: EstadoReq) => (e === 'Anulado' ? -1 : e === 'Emitido' ? 1 : 0);

/** Comodidad para mostrar el lápiz: edita el área emisora mientras está En Proceso (RLS «editar» de 0002 decide). */
export const esEditable = (r: Requerimiento, miArea: string) => r.estado === 'En Proceso' && r.areaEmisora === miArea;

/** Hay una anulación pendiente del requerimiento entero o de ese ítem. */
export const anulacionPendiente = (anulaciones: Anulacion[], itemId: string | null) =>
    anulaciones.find((a) => a.estado === 'Pendiente' && a.itemId === itemId) ?? null;

// ── Lista ────────────────────────────────────────────────────────────────
export interface FiltrosReq {
    estado: '' | EstadoReq;
    proyecto: string;
    area: string;
    texto: string;
}
export const FILTROS_REQ: FiltrosReq = { estado: '', proyecto: '', area: '', texto: '' };

const plano = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function filtrarRequerimientos(lista: Requerimiento[], f: FiltrosReq, nombreProyecto?: (id: string | null) => string): Requerimiento[] {
    const palabras = plano(f.texto).split(/\s+/).filter(Boolean);
    return lista.filter((r) => {
        if (f.estado && r.estado !== f.estado) return false;
        if (f.proyecto && r.proyectoId !== f.proyecto) return false;
        if (f.area && r.areaEmisora !== f.area) return false;
        if (!palabras.length) return true;
        const t = plano(`${r.numero} ${r.rqSidige} ${r.motivo} ${r.destino} ${nombreProyecto?.(r.proyectoId) ?? ''}`);
        return palabras.every((w) => t.includes(w));
    });
}

export type OrdenReq = 'recientes' | 'antiguos' | 'numero';
export function ordenarRequerimientos(lista: Requerimiento[], o: OrdenReq): Requerimiento[] {
    const c = [...lista];
    if (o === 'numero') return c.sort((a, b) => (b.numero || '').localeCompare(a.numero || '', 'es', { numeric: true }));
    if (o === 'antiguos') return c.sort((a, b) => a.creado.localeCompare(b.creado));
    return c.sort((a, b) => b.creado.localeCompare(a.creado));
}

/** Los ítems con cada accesorio incluido justo debajo de su equipo. */
export function itemsAnidados(items: ItemRequerimiento[]): { item: ItemRequerimiento; nivel: 0 | 1 }[] {
    const orden = [...items].sort((a, b) => (a.nItem ?? 1e9) - (b.nItem ?? 1e9) || a.descripcion.localeCompare(b.descripcion, 'es'));
    const ids = new Set(orden.map((i) => i.id));
    const out: { item: ItemRequerimiento; nivel: 0 | 1 }[] = [];
    for (const i of orden) {
        if (i.incluidoEn && ids.has(i.incluidoEn)) continue;
        out.push({ item: i, nivel: 0 });
        for (const h of orden) if (h.incluidoEn === i.id) out.push({ item: h, nivel: 1 });
    }
    return out;
}

/** Cuántos ítems vivos hay en cada validación técnica. */
export function resumenTecnica(items: ItemRequerimiento[]): Record<Validacion, number> {
    const r: Record<Validacion, number> = { Pendiente: 0, Validado: 0, Observado: 0, 'No aplica': 0 };
    for (const i of items) if (!i.anulado) r[i.validacionTecnica]++;
    return r;
}

// ── Pedir anulación ────────────────────────────────────────────────────────────────
export interface PedidoAnulacion {
    itemId: string | null;
    causa: CausaAnulacion | '';
    motivo: string;
}
export function faltaEnAnulacion(p: PedidoAnulacion): string | null {
    if (!p.causa) return 'Elige la causa.';
    if (!p.motivo.trim()) return 'Escribe el motivo: lo lee quien decide.';
    return null;
}
