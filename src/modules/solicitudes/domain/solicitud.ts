// Solicitudes y sus ítems (AppSheet: Solicitudes, Solicitud_Items, Carga_items). PURO: tipos, filtros, orden y
// reglas de presentación. Las reglas de negocio (quién emite, libera, rechaza…) viven en la base (0002/0003):
// los botones salen de acciones_disponibles().

export const ESTADOS_SOLICITUD = ['Borrador', 'Pendiente Liberación', 'Observada', 'Liberada', 'En Req', 'Rechazada', 'Cancelada'] as const;
export type EstadoSolicitud = (typeof ESTADOS_SOLICITUD)[number];

export const TIPOS_SOLICITUD = ['Proyecto', 'Administrativa'] as const;
export type TipoSolicitud = (typeof TIPOS_SOLICITUD)[number];

/** Los mismos que valida el «check» de solicitud_items (0001). */
export const TIPOS_ITEM = ['Bienes', 'Accesorios', 'Servicio', 'Muestra'] as const;
export type TipoItem = (typeof TIPOS_ITEM)[number];

export const CANALES = ['Nacional', 'Importación'] as const;
export type Canal = (typeof CANALES)[number];

/** Sugerencias de unidad (la columna es texto libre; por defecto UND). */
export const UNIDADES = ['UND', 'CAJA', 'SET', 'KIT', 'PAQUETE', 'METRO', 'M2', 'M3', 'KG', 'LITRO', 'GALON', 'GLOBAL', 'SERVICIO'] as const;

export interface Solicitud {
    id: string;
    numero: string;
    tipo: TipoSolicitud;
    proyectoId: string | null;
    etapaId: string | null;
    jefeId: string | null;
    solicitanteId: string;
    sustento: string;
    estado: EstadoSolicitud;
    liberadoPor: string | null;
    fechaLiberacion: string | null;
    motivoRechazo: string;
    motivoObservacion: string;
    motivoCancelacion: string;
    nuevaSolicitudId: string | null;
    requerimientoId: string | null;
    estadoCarga: string | null;
    loteActual: string | null;
    creado: string;
    nItems: number;
}

export interface ItemSolicitud {
    id: string;
    solicitudId: string;
    nItem: number | null;
    tipo: TipoItem;
    codigoCliente: string;
    descripcion: string;
    detalle: string;
    unidad: string;
    cantidad: number;
    plazoAdquisicion: string | null;
    canal: Canal | null;
    presupuestoUnit: number | null;
    monedaPpto: string | null;
    incluidoEn: string | null;
    referenciaLink: string;
}

export type EstadoFila = 'Revision' | 'Error' | 'Procesado' | 'Descartado';
export interface FilaCarga {
    id: string;
    loteId: string;
    nFila: number;
    datos: Record<string, string>;
    estadoFila: EstadoFila;
    errores: string[];
}

/** Una solicitud con todo lo que muestra su ficha. */
export interface SolicitudDetalle {
    solicitud: Solicitud;
    items: ItemSolicitud[];
    /** Las filas del último lote cargado desde Excel (lote_actual). */
    carga: FilaCarga[];
    /** Número del requerimiento generado, si ya lo tiene. */
    requerimientoNumero: string | null;
    requerimientoEstado: string | null;
}

export interface NuevaSolicitud {
    tipo: TipoSolicitud;
    proyectoId: string | null;
    etapaId: string | null;
    jefeId: string | null;
    sustento: string;
}

export interface NuevoItem {
    id?: string;
    nItem: number | null;
    tipo: TipoItem;
    codigoCliente: string;
    descripcion: string;
    detalle: string;
    unidad: string;
    cantidad: string;
    plazoAdquisicion: string | null;
    canal: Canal | null;
    presupuestoUnit: string;
    monedaPpto: string | null;
    incluidoEn: string | null;
    referenciaLink: string;
}

export const ITEM_VACIO: NuevoItem = {
    nItem: null,
    tipo: 'Bienes',
    codigoCliente: '',
    descripcion: '',
    detalle: '',
    unidad: 'UND',
    cantidad: '',
    plazoAdquisicion: null,
    canal: null,
    presupuestoUnit: '',
    monedaPpto: 'PEN',
    incluidoEn: null,
    referenciaLink: '',
};

export const aNuevoItem = (i: ItemSolicitud): NuevoItem => ({
    id: i.id,
    nItem: i.nItem,
    tipo: i.tipo,
    codigoCliente: i.codigoCliente,
    descripcion: i.descripcion,
    detalle: i.detalle,
    unidad: i.unidad,
    cantidad: String(i.cantidad),
    plazoAdquisicion: i.plazoAdquisicion,
    canal: i.canal,
    presupuestoUnit: i.presupuestoUnit == null ? '' : String(i.presupuestoUnit),
    monedaPpto: i.monedaPpto ?? 'PEN',
    incluidoEn: i.incluidoEn,
    referenciaLink: i.referenciaLink,
});

export type TonoChip = 'ok' | 'warn' | 'danger' | 'info' | 'muted';
export function tonoEstado(e: EstadoSolicitud): TonoChip {
    if (e === 'Liberada' || e === 'En Req') return 'ok';
    if (e === 'Pendiente Liberación') return 'warn';
    if (e === 'Observada') return 'warn';
    if (e === 'Rechazada') return 'danger';
    if (e === 'Cancelada') return 'muted';
    return 'info';
}

/** Hilo de fases de la ficha. Rechazada o cancelada cortan el hilo; observada vuelve al principio (la corrige el solicitante). */
export const FASES_SOLICITUD = ['Borrador', 'Pendiente Liberación', 'Liberada', 'En Req'];
export function faseActual(e: EstadoSolicitud): number {
    if (e === 'Rechazada' || e === 'Cancelada') return -1;
    if (e === 'Observada') return 0;
    return FASES_SOLICITUD.indexOf(e);
}

/** Se editan cabecera e ítems solo en Borrador u Observada (RLS «editar» de 0002 decide; esto solo esconde botones). */
export const esEditable = (s: Solicitud, yo: string) => s.solicitanteId === yo && (s.estado === 'Borrador' || s.estado === 'Observada');

// ── Lista: pestañas y filtros ────────────────────────────────────────────────────────────────
export const PESTANAS = ['mias', 'liberar', 'todas'] as const;
export type Pestana = (typeof PESTANAS)[number];

export interface FiltrosSolicitud {
    pestana: Pestana;
    estado: '' | EstadoSolicitud;
    tipo: '' | TipoSolicitud;
    proyecto: string;
    texto: string;
}
export const FILTROS_SOLICITUD: FiltrosSolicitud = { pestana: 'mias', estado: '', tipo: '', proyecto: '', texto: '' };

const plano = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/**
 * `porLiberar`: los id que la base dice que me toca liberar (te_toca), para no repetir aquí quién aprueba.
 * `nombreProyecto`: para buscar también por el nombre del proyecto.
 */
export function filtrarSolicitudes(
    lista: Solicitud[],
    f: FiltrosSolicitud,
    ctx: { yo: string; porLiberar: ReadonlySet<string>; nombreProyecto?: (id: string | null) => string },
): Solicitud[] {
    const palabras = plano(f.texto).split(/\s+/).filter(Boolean);
    return lista.filter((s) => {
        if (f.pestana === 'mias' && s.solicitanteId !== ctx.yo) return false;
        if (f.pestana === 'liberar' && !ctx.porLiberar.has(s.id)) return false;
        if (f.estado && s.estado !== f.estado) return false;
        if (f.tipo && s.tipo !== f.tipo) return false;
        if (f.proyecto && s.proyectoId !== f.proyecto) return false;
        if (!palabras.length) return true;
        const t = plano(`${s.numero} ${s.sustento} ${ctx.nombreProyecto?.(s.proyectoId) ?? ''}`);
        return palabras.every((w) => t.includes(w));
    });
}

export type OrdenSolicitud = 'recientes' | 'antiguas' | 'numero';
export function ordenarSolicitudes(lista: Solicitud[], o: OrdenSolicitud): Solicitud[] {
    const c = [...lista];
    if (o === 'numero') return c.sort((a, b) => (b.numero || '').localeCompare(a.numero || '', 'es', { numeric: true }));
    if (o === 'antiguas') return c.sort((a, b) => a.creado.localeCompare(b.creado));
    return c.sort((a, b) => b.creado.localeCompare(a.creado));
}

// ── Formularios ────────────────────────────────────────────────────────────────
/** Qué falta para crear la solicitud (en palabras), o null. */
export function faltaEnSolicitud(s: NuevaSolicitud): string | null {
    if (s.tipo === 'Proyecto') {
        if (!s.proyectoId) return 'Elige el proyecto.';
        if (!s.etapaId) return 'Elige la etapa del proyecto: sus aprobadores liberan la solicitud.';
    } else if (!s.jefeId) return 'Elige a tu jefe: él libera la solicitud.';
    if (!s.sustento.trim()) return 'Escribe el sustento: para qué se necesita.';
    return null;
}

/** Número escrito con coma o punto decimal. */
export function aNumero(t: string): number | null {
    const x = t.trim().replace(/\s/g, '');
    if (!x) return null;
    const n = Number(x.replace(',', '.'));
    return Number.isFinite(n) ? n : null;
}

/** Qué falta en un ítem (en palabras), o null. */
export function faltaEnItem(i: NuevoItem): string | null {
    if (!i.descripcion.trim()) return 'Escribe la descripción del ítem.';
    const c = aNumero(i.cantidad);
    if (c === null || c <= 0) return 'La cantidad debe ser un número mayor que cero.';
    if (!i.unidad.trim()) return 'Escribe la unidad (por ejemplo, UND).';
    if (i.presupuestoUnit.trim()) {
        const p = aNumero(i.presupuestoUnit);
        if (p === null || p < 0) return 'El presupuesto unitario debe ser un número.';
        if (!i.monedaPpto) return 'Elige la moneda del presupuesto.';
    }
    if (i.referenciaLink.trim() && !/^https?:\/\//i.test(i.referenciaLink.trim())) return 'El link de referencia debe empezar con http:// o https://.';
    return null;
}

/** El siguiente número de ítem (después del mayor que ya hay). */
export const siguienteNItem = (items: { nItem: number | null }[]) => items.reduce((m, i) => Math.max(m, i.nItem ?? 0), 0) + 1;

/** Los ítems que pueden contener accesorios: los que no son a su vez accesorios incluidos en otro. */
export const posiblesContenedores = (items: ItemSolicitud[], propio?: string) => items.filter((i) => i.id !== propio && !i.incluidoEn);

/** Ordena los ítems y pone cada accesorio incluido justo debajo de su equipo. */
export function itemsAnidados(items: ItemSolicitud[]): { item: ItemSolicitud; nivel: 0 | 1 }[] {
    const orden = [...items].sort((a, b) => (a.nItem ?? 1e9) - (b.nItem ?? 1e9) || a.descripcion.localeCompare(b.descripcion, 'es'));
    const ids = new Set(orden.map((i) => i.id));
    const out: { item: ItemSolicitud; nivel: 0 | 1 }[] = [];
    for (const i of orden) {
        if (i.incluidoEn && ids.has(i.incluidoEn)) continue;
        out.push({ item: i, nivel: 0 });
        for (const h of orden) if (h.incluidoEn === i.id) out.push({ item: h, nivel: 1 });
    }
    return out;
}

/** Resumen de la última carga: cuántas filas pasaron, con error y descartadas. */
export function resumenCarga(filas: FilaCarga[]) {
    const n = (e: EstadoFila) => filas.filter((f) => f.estadoFila === e).length;
    return { procesadas: n('Procesado'), conError: n('Error'), descartadas: n('Descartado'), enRevision: n('Revision'), total: filas.length };
}
