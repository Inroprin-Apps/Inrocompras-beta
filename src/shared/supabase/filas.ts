// Leer filas de Supabase (snake_case, valores sueltos) en los adaptadores: una sola versión de cada conversión.
// PURO: no importa supabase-js; solo convierte valores.

export type Fila = Record<string, unknown>;

/** Texto; null → ''. */
export const s = (v: unknown) => (v == null ? '' : String(v));
/** Texto o null (null o '' → null). */
export const sn = (v: unknown) => (v == null || v === '' ? null : String(v));
/** Número; null o '' → 0. */
export const n = (v: unknown) => (v == null || v === '' ? 0 : Number(v));
/** Número o null (null o '' → null). */
export const nn = (v: unknown) => (v == null || v === '' ? null : Number(v));
/** Una fila embebida (PostgREST la trae como objeto o como lista de uno). */
export const uno = (v: unknown): Fila | null => (Array.isArray(v) ? ((v[0] as Fila) ?? null) : ((v as Fila) ?? null));
/** Filas embebidas (lista o nada). */
export const filas = (v: unknown) => (Array.isArray(v) ? (v as Fila[]) : []);
