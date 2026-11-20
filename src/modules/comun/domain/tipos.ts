// Lo transversal: personas, catálogos, la bandeja, las notificaciones y el historial. PURO.

export interface Persona {
    id: string;
    nombre: string;
    email: string;
    area: string;
    activo: boolean;
}

export interface Catalogos {
    empresas: { id: string; razonSocial: string }[];
    monedas: { id: string; nombre: string; tasaASoles: number }[];
    conceptos: { id: string; ambito: 'OC' | 'Item' | 'Gasto' }[];
    config: Record<string, unknown>;
}

export interface Pendiente {
    tabla: string;
    id: string;
    titulo: string;
    paso: string;
    desde: string | null;
}

export interface Notificacion {
    id: number;
    titulo: string;
    cuerpo: string | null;
    tabla: string | null;
    refId: string | null;
    leida: boolean;
    creado: string;
}

export interface Cambio {
    id: number;
    accion: string;
    de: string | null;
    a: string | null;
    motivo: string | null;
    usuarioId: string | null;
    ts: string;
}

/** Días completos desde una fecha ISO (null si no hay fecha). */
export function diasDesde(iso: string | null, hoy = Date.now()): number | null {
    if (!iso) return null;
    const t = new Date(iso).getTime();
    return Number.isNaN(t) ? null : Math.floor((hoy - t) / 86_400_000);
}

/** La bandeja agrupada por paso; dentro, lo que más espera primero. */
export function agruparPorPaso(lista: Pendiente[]): [string, Pendiente[]][] {
    const g = new Map<string, Pendiente[]>();
    for (const p of [...lista].sort((a, b) => (a.desde ?? '').localeCompare(b.desde ?? ''))) g.set(p.paso, [...(g.get(p.paso) ?? []), p]);
    return [...g.entries()];
}

/** La ruta de la ficha de cada tipo de registro (bandeja, notificaciones). */
export function rutaDe(tabla: string | null, id: string | null): string {
    const base: Record<string, string> = {
        solicitudes: '/solicitudes',
        requerimientos: '/requerimientos',
        requerimiento_items: '/validaciones',
        ordenes: '/ordenes',
        pagos: '/pagos',
        proveedores: '/proveedores',
        anulaciones: '/requerimientos',
        desaduanajes: '/desaduanaje',
        proyectos: '/proyectos',
    };
    const b = (tabla && base[tabla]) || '/';
    if (!id || b === '/') return b;
    return tabla === 'anulaciones' ? `${b}?anulacion=${id}` : `${b}?ver=${id}`;
}

const NOMBRE_ACCION: Record<string, string> = {
    emitir: 'Emitió',
    liberar: 'Liberó',
    rechazar: 'Rechazó',
    cancelar: 'Canceló',
    rehacer: 'Rehízo',
    reenviar: 'Reenvió',
    devolver: 'Pidió de vuelta',
    observar: 'Observó',
    crear: 'Creó',
    estatus: 'Cambió de estado',
    validar_ppto: 'Validó el presupuesto',
    observar_ppto: 'Observó el presupuesto',
    aprobar_gop: 'Aprobó (GOP)',
    aprobar_gop_sin_demasia: 'Aprobó sin demasía (GOP)',
    aprobar_gaf: 'Aprobó (GAF)',
    revocar: 'Revocó la aprobación',
    modificar: 'Abrió una modificación',
    confirmar_modificacion: 'Confirmó la modificación',
    pedir_anulacion: 'Pidió anular',
    anular: 'Anuló',
    rechazar_anulacion: 'Rechazó la anulación',
    anular_gerencia: 'Anuló (gerencia)',
    descartar: 'Descartó el borrador',
    enviar: 'Envió al proveedor',
    observar_finanzas: 'Finanzas observó',
    subsanar_finanzas: 'Finanzas levantó la observación',
    cerrar: 'Cerró',
    demasia: 'Agregó una demasía',
    solicitar: 'Solicitó',
    programar: 'Programó',
    pagado: 'Marcó pagado',
    subsanar: 'Subsanó',
    dividir: 'Dividió la cuota',
    inropay: 'InroPay actualizó',
    validacion_tecnica: 'Validación técnica',
    sku: 'Asignó SKU',
    rq_sidige: 'Anotó RQ del SIDIGE',
    aprobar: 'Aprobó',
    avanzar: 'Avanzó',
    cerrar_costeo: 'Cerró el costeo',
    reabrir: 'Reabrió el costeo',
    correccion_admin: 'Corrección del administrador',
    confirmar_lectura: 'Confirmó la lectura',
    evaluacion_fin: 'Evaluación financiera',
    verificar_retencion: 'Verificó la retención',
    ganado: 'Marcó ganado',
    perdido: 'Marcó perdido',
};
export const nombreAccion = (a: string) => NOMBRE_ACCION[a] ?? a.replace(/_/g, ' ');
