// La cola de trabajos (cola_trabajos): lo que la base encola y el servidor ejecuta en segundo plano.
// PURO: tipos y cómo termina cada trabajo. Ver docs/07_INTEGRACIONES.md y 0021_cola.sql.

export const TIPOS_TRABAJO = [
    'crear_carpeta',
    'archivar_doc',
    'pdf_oc',
    'enviar_correo',
    'leer_documento',
    'notificar',
    'inropay_solicitar',
    'sidige_escribir',
] as const;
export type TipoTrabajo = (typeof TIPOS_TRABAJO)[number];

export interface Trabajo {
    id: number;
    tipo: string;
    refTabla: string | null;
    refId: string | null;
    payload: Record<string, unknown>;
    intentos: number;
}

/** Cómo terminó bien un trabajo. `Descartado`: no había nada que hacer a propósito (SIDIGE, InroPay sin configurar…). */
export interface Desenlace {
    estado: 'Hecho' | 'Descartado';
    nota: string | null;
}
/** Cómo falló. `reintentar`: puede salir bien después (red, carpeta aún no creada). `final`: reintentar no sirve. */
export interface Fallo {
    tipo: 'reintentar' | 'final';
    mensaje: string;
}

export const hecho = (nota: string | null = null): Desenlace => ({ estado: 'Hecho', nota });
export const descartado = (nota: string): Desenlace => ({ estado: 'Descartado', nota });
export const reintentar = (mensaje: string): Fallo => ({ tipo: 'reintentar', mensaje });
export const final = (mensaje: string): Fallo => ({ tipo: 'final', mensaje });
/** Falta configurar una integración: queda en Error con lo que falta (el administrador lo reintenta al configurarla). */
export const noConfigurado = (servicio: string, falta: string[]): Fallo =>
    final(`${servicio} no configurado: falta ${falta.join(', ')}. Configúralo en Vercel y reintenta el trabajo.`);

/** Los argumentos de app.cola_terminar(id, ok, error, final) para un desenlace o un fallo. */
export function cierre(r: { ok: true; valor: Desenlace } | { ok: false; fallo: Fallo }): { ok: boolean; mensaje: string | null; final: 'Error' | 'Descartado' | null } {
    if (r.ok) return { ok: true, mensaje: r.valor.nota, final: r.valor.estado === 'Descartado' ? 'Descartado' : null };
    return { ok: false, mensaje: r.fallo.mensaje.slice(0, 1000), final: r.fallo.tipo === 'final' ? 'Error' : null };
}

/** El texto de un error cualquiera, corto. */
export const mensajeDe = (e: unknown) => (e instanceof Error ? e.message : String(e)).replace(/\s+/g, ' ').trim().slice(0, 500) || 'Falló sin mensaje.';

/** Cuántos trabajos tomar por vuelta y cuándo parar (una función de Vercel Hobby dura hasta 60 s). */
export const POR_VUELTA = 5;
export const PRESUPUESTO_MS = 45_000;

export interface ResumenCola {
    tomados: number;
    hechos: number;
    descartados: number;
    reintentar: number;
    errores: number;
    detalle: { id: number; tipo: string; estado: string; mensaje: string | null }[];
}
export const RESUMEN_VACIO: ResumenCola = { tomados: 0, hechos: 0, descartados: 0, reintentar: 0, errores: 0, detalle: [] };
