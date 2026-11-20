// Plan de compras (docs/05): la línea del plan = el ítem del requerimiento. PURO.
// Las fechas límite, el semáforo, la criticidad y los bloqueos son cálculos de pantalla (no se guardan):
//   fecha límite de la OC = fecha meta − plazo de entrega − (importación: 5 de desaduanaje + 10 de contingencia)
//   semáforo: vencida si pasó la fecha límite y aún hay saldo; ámbar si faltan `diasAlerta` días o menos
//   criticidad por plazo: > 120 fuera de plazo; ≥ 100 muy crítico; ≥ 60 crítico; ≥ 30 normal; menos, sencillo
//   orden de atención: criticidad y después días a la fecha límite
// La base vuelve a validar todo al crear la orden (ac_oc_crear): esto solo explica antes por qué no se puede.

export type Canal = 'Nacional' | 'Importación';

export interface OcDeLinea {
    id: string;
    numero: string | null;
    estatus: string;
}

export interface LineaPlan {
    itemId: string;
    requerimientoId: string;
    requerimiento: string | null;
    rqSidige: string;
    reqEstado: string;
    proyectoId: string | null;
    nItem: number | null;
    tipo: string;
    codigoCliente: string;
    sku: string;
    descripcion: string;
    unidad: string;
    cantidad: number;
    saldo: number;
    canal: Canal | null;
    plazoDias: number | null;
    fechaMeta: string | null;
    incluidoEn: string | null;
    anulado: boolean;
    validacion: string;
    marca: string;
    modelo: string;
    /** Solo llega a quien ve precios (plan_compras). */
    presupuestoUnit: number | null;
    monedaPpto: string | null;
    ordenes: OcDeLinea[];
    pagado: boolean;
}

export interface ConfigPlan {
    /** Hoy en Lima, «AAAA-MM-DD». */
    hoy: string;
    diasAlerta: number;
    exigirValidacion: boolean;
}

export const DIAS_DESADUANAJE = 5;
export const DIAS_CONTINGENCIA = 10;

// ── Fechas («AAAA-MM-DD», sin horas: se cuentan días de calendario) ──
const aDia = (iso: string) => Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10))) / 86_400_000;
const deDia = (d: number) => new Date(d * 86_400_000).toISOString().slice(0, 10);
export const sumarDias = (iso: string, n: number) => deDia(aDia(iso) + n);
export const diasEntre = (desde: string, hasta: string) => Math.round(aDia(hasta) - aDia(desde));

/** Hoy en America/Lima como «AAAA-MM-DD». */
export function hoyLima(ahora = new Date()): string {
    const p = Object.fromEntries(
        new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(ahora).map((x) => [x.type, x.value]),
    );
    return `${p.year}-${p.month}-${p.day}`;
}

export function fechaLimite(l: Pick<LineaPlan, 'fechaMeta' | 'plazoDias' | 'canal'>): string | null {
    if (!l.fechaMeta) return null;
    const extra = l.canal === 'Importación' ? DIAS_DESADUANAJE + DIAS_CONTINGENCIA : 0;
    return sumarDias(l.fechaMeta, -((l.plazoDias ?? 0) + extra));
}

export type Semaforo = 'vencida' | 'ambar' | 'a_tiempo' | 'sin_fecha' | 'cubierta';
export const SEMAFOROS: { value: Semaforo; label: string }[] = [
    { value: 'vencida', label: 'Vencida' },
    { value: 'ambar', label: 'Por vencer' },
    { value: 'a_tiempo', label: 'A tiempo' },
    { value: 'sin_fecha', label: 'Sin fecha meta' },
    { value: 'cubierta', label: 'Con OC' },
];
export const etiquetaSemaforo = (s: Semaforo) => SEMAFOROS.find((x) => x.value === s)!.label;
export const tonoSemaforo = (s: Semaforo): 'danger' | 'warn' | 'ok' | 'muted' | 'info' =>
    s === 'vencida' ? 'danger' : s === 'ambar' ? 'warn' : s === 'a_tiempo' ? 'ok' : s === 'cubierta' ? 'info' : 'muted';

export function semaforo(l: Pick<LineaPlan, 'fechaMeta' | 'plazoDias' | 'canal' | 'saldo'>, c: Pick<ConfigPlan, 'hoy' | 'diasAlerta'>): Semaforo {
    if (l.saldo <= 0) return 'cubierta';
    const lim = fechaLimite(l);
    if (!lim) return 'sin_fecha';
    const d = diasEntre(c.hoy, lim);
    if (d < 0) return 'vencida';
    if (d <= c.diasAlerta) return 'ambar';
    return 'a_tiempo';
}

export const CRITICIDADES = ['Fuera de plazo', 'Muy crítico', 'Crítico', 'Normal', 'Sencillo', 'Sin plazo'] as const;
export type Criticidad = (typeof CRITICIDADES)[number];
export function criticidad(plazoDias: number | null): Criticidad {
    if (plazoDias == null) return 'Sin plazo';
    if (plazoDias > 120) return 'Fuera de plazo';
    if (plazoDias >= 100) return 'Muy crítico';
    if (plazoDias >= 60) return 'Crítico';
    if (plazoDias >= 30) return 'Normal';
    return 'Sencillo';
}
export const tonoCriticidad = (c: Criticidad): 'danger' | 'warn' | 'info' | 'muted' =>
    c === 'Fuera de plazo' || c === 'Muy crítico' ? 'danger' : c === 'Crítico' ? 'warn' : c === 'Sin plazo' ? 'muted' : 'info';

/** Por qué no se puede comprar la línea (en palabras), o null. `padre`: la descripción del equipo que la incluye. */
export function bloqueo(l: LineaPlan, c: Pick<ConfigPlan, 'exigirValidacion'>, padre?: string): string | null {
    if (l.anulado) return 'El ítem está anulado.';
    if (l.incluidoEn) return `Va incluido en «${padre ?? 'su equipo'}»: no se compra aparte.`;
    if (l.reqEstado !== 'Emitido') return 'El requerimiento aún no está emitido: lo emite Planeamiento.';
    if (c.exigirValidacion && l.validacion !== 'Validado' && l.validacion !== 'No aplica')
        return l.validacion === 'Observado' ? 'Técnica observó el ítem: espera su validación.' : 'Falta la validación técnica (marca y modelo).';
    if (!l.canal) return 'Falta definir el canal (nacional o importación).';
    return null;
}

export type EstadoPlan = 'por_comprar' | 'con_oc' | 'pagado';
export const ESTADOS_PLAN: { value: EstadoPlan; label: string }[] = [
    { value: 'por_comprar', label: 'Por comprar' },
    { value: 'con_oc', label: 'Con OC' },
    { value: 'pagado', label: 'Pagado' },
];

/** Una línea con todo lo calculado para pintar. */
export interface FilaPlan extends LineaPlan {
    fechaLimite: string | null;
    diasALimite: number | null;
    semaforo: Semaforo;
    criticidad: Criticidad;
    bloqueo: string | null;
    /** Accesorio incluido en otra línea de la lista: se pinta debajo de su equipo. */
    nivel: 0 | 1;
}

export function calcular(lista: LineaPlan[], c: ConfigPlan): FilaPlan[] {
    const desc = new Map(lista.map((l) => [l.itemId, l.descripcion]));
    return lista.map((l) => {
        const lim = fechaLimite(l);
        return {
            ...l,
            fechaLimite: lim,
            diasALimite: lim ? diasEntre(c.hoy, lim) : null,
            semaforo: semaforo(l, c),
            criticidad: criticidad(l.plazoDias),
            bloqueo: bloqueo(l, c, l.incluidoEn ? desc.get(l.incluidoEn) : undefined),
            nivel: 0,
        };
    });
}

export interface FiltrosPlan {
    estado: '' | EstadoPlan;
    canal: '' | Canal;
    semaforo: '' | Semaforo;
    validacion: '' | 'pendiente';
    texto: string;
}
export const FILTROS_PLAN: FiltrosPlan = { estado: '', canal: '', semaforo: '', validacion: '', texto: '' };

const plano = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function filtrarPlan(lista: FilaPlan[], f: FiltrosPlan): FilaPlan[] {
    const palabras = plano(f.texto).split(/\s+/).filter(Boolean);
    return lista.filter((l) => {
        if (f.estado === 'por_comprar' && !(l.saldo > 0 && !l.anulado && !l.incluidoEn)) return false;
        if (f.estado === 'con_oc' && l.ordenes.length === 0) return false;
        if (f.estado === 'pagado' && !l.pagado) return false;
        if (f.canal && l.canal !== f.canal) return false;
        if (f.semaforo && l.semaforo !== f.semaforo) return false;
        if (f.validacion === 'pendiente' && (l.validacion === 'Validado' || l.validacion === 'No aplica' || l.anulado)) return false;
        if (!palabras.length) return true;
        const t = plano(`${l.codigoCliente} ${l.sku} ${l.descripcion} ${l.requerimiento ?? ''} ${l.rqSidige} ${l.marca} ${l.modelo} ${l.ordenes.map((o) => o.numero ?? '').join(' ')}`);
        return palabras.every((w) => t.includes(w));
    });
}

const rangoCrit = (c: Criticidad) => CRITICIDADES.indexOf(c);

/** Orden de atención: criticidad, días a la fecha límite (sin fecha al final), N° de ítem. Los accesorios, bajo su equipo. */
export function ordenarPlan(lista: FilaPlan[]): FilaPlan[] {
    const cmp = (a: FilaPlan, b: FilaPlan) =>
        rangoCrit(a.criticidad) - rangoCrit(b.criticidad) ||
        (a.diasALimite ?? Infinity) - (b.diasALimite ?? Infinity) ||
        (a.nItem ?? 0) - (b.nItem ?? 0) ||
        a.descripcion.localeCompare(b.descripcion, 'es');
    const ids = new Set(lista.map((l) => l.itemId));
    const hijos = new Map<string, FilaPlan[]>();
    const raiz: FilaPlan[] = [];
    for (const l of lista) {
        if (l.incluidoEn && ids.has(l.incluidoEn)) hijos.set(l.incluidoEn, [...(hijos.get(l.incluidoEn) ?? []), l]);
        else raiz.push(l);
    }
    const out: FilaPlan[] = [];
    for (const l of raiz.sort(cmp)) {
        out.push(l);
        for (const h of (hijos.get(l.itemId) ?? []).sort(cmp)) out.push({ ...h, nivel: 1 });
    }
    return out;
}

export interface ResumenPlan {
    lineas: number;
    porComprar: number;
    vencidas: number;
    porVencer: number;
    validacionPendiente: number;
    conOc: number;
}
export function resumir(lista: FilaPlan[]): ResumenPlan {
    const vivas = lista.filter((l) => !l.anulado && !l.incluidoEn);
    return {
        lineas: vivas.length,
        porComprar: vivas.filter((l) => l.saldo > 0).length,
        vencidas: vivas.filter((l) => l.semaforo === 'vencida').length,
        porVencer: vivas.filter((l) => l.semaforo === 'ambar').length,
        validacionPendiente: vivas.filter((l) => l.validacion === 'Pendiente' || l.validacion === 'Observado').length,
        conOc: vivas.filter((l) => l.ordenes.length > 0).length,
    };
}

// ── El carrito «Generar OC» ──
/** Por qué no se puede marcar esta línea junto con las ya marcadas (en palabras), o null. */
export function motivoNoMarcar(l: FilaPlan, marcadas: FilaPlan[]): string | null {
    if (l.bloqueo) return l.bloqueo;
    if (l.saldo <= 0) return 'Ya no tiene saldo: está cubierta por sus órdenes. Si necesitas más, agrega una demasía en la orden.';
    const otra = marcadas.find((m) => m.itemId !== l.itemId);
    if (otra && otra.canal !== l.canal)
        return `Es de canal ${l.canal?.toLowerCase()} y ya marcaste líneas de ${otra.canal?.toLowerCase()}: una orden es de un solo canal.`;
    if (otra && otra.proyectoId !== l.proyectoId) return 'Una orden es de un solo proyecto: genera una por proyecto.';
    return null;
}

export interface LineaCarrito {
    itemId: string;
    descripcion: string;
    unidad: string;
    saldo: number;
    cantidad: string;
    precio: string;
    descripcionProv: string;
}

/** Las líneas del formulario: la cantidad por defecto es el saldo y el precio, el presupuesto si es de la misma moneda. */
export function lineasCarrito(marcadas: FilaPlan[], moneda: string): LineaCarrito[] {
    return marcadas.map((l) => ({
        itemId: l.itemId,
        descripcion: l.descripcion,
        unidad: l.unidad,
        saldo: l.saldo,
        cantidad: String(l.saldo),
        precio: l.presupuestoUnit != null && (l.monedaPpto ?? 'PEN') === moneda ? String(l.presupuestoUnit) : '',
        descripcionProv: '',
    }));
}

/** Qué falta en una línea del carrito, o null. `leer` convierte el texto escrito en número. */
export function faltaEnLineaCarrito(l: LineaCarrito, leer: (t: string) => number | null): string | null {
    const c = leer(l.cantidad);
    const p = leer(l.precio);
    if (c === null || c <= 0) return `«${l.descripcion}»: escribe una cantidad mayor que cero.`;
    if (c > l.saldo + 0.0001) return `«${l.descripcion}»: el saldo es ${l.saldo}. Lo que exceda va como demasía, desde la orden.`;
    if (p === null || p < 0) return `«${l.descripcion}»: escribe el precio unitario.`;
    return null;
}
