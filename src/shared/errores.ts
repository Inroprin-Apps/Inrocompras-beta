// Lo que una lectura o una acción puede devolver como fallo, como VALOR (Result de neverthrow): el mensaje
// va en palabras para la pantalla. Las funciones ac_* de la base ya devuelven su motivo en español
// (app.p_*), y ese texto se muestra tal cual.
import { err, ok, type Result } from 'neverthrow';

export interface ErrorFuente {
    kind: 'permiso' | 'conexion' | 'regla' | 'no-encontrado' | 'fuente';
    message: string;
}

/** Traduce un error de Supabase/PostgREST/Postgres a un ErrorFuente con mensaje para la persona. */
export function errorFuente(e: { message?: string; code?: string } | null | undefined): ErrorFuente {
    const m = e?.message?.trim() ?? '';
    if (/Failed to fetch|NetworkError|fetch failed|Load failed/i.test(m))
        return { kind: 'conexion', message: 'Sin conexión. Revisa tu internet e inténtalo otra vez.' };
    if (e?.code === '42501' && /no est[aá] activo/i.test(m)) return { kind: 'permiso', message: m };
    if (e?.code === '42501' || /permission denied|row-level security/i.test(m))
        return { kind: 'permiso', message: 'No tienes permiso para hacer esto. Si crees que deberías, pídelo al administrador.' };
    // P0001: el motivo que escribe la base (app.p_*), ya en español y diciendo qué hacer. Va tal cual.
    if (e?.code === 'P0001' && m) return { kind: 'regla', message: m };
    if (e?.code === 'PGRST116') return { kind: 'no-encontrado', message: 'No se encontró. Puede que ya no exista: vuelve a la lista y búscalo otra vez.' };
    if (e?.code === '23505') return { kind: 'regla', message: 'Ya existe un registro con esos datos. Búscalo en la lista antes de crear otro.' };
    if (e?.code === '23514' || e?.code === '23502' || e?.code === '22P02' || e?.code === '22003')
        return { kind: 'regla', message: 'Algún dato no es válido. Revisa el formulario.' };
    // Lo demás es técnico: no se muestra (guía, «Vacío, carga y error»); queda en la consola para soporte.
    if (m) console.error('Error de la fuente:', e?.code ?? '', m);
    return { kind: 'fuente', message: 'No se pudo completar. Inténtalo otra vez en un momento; si sigue fallando, avisa a Sistemas.' };
}

/** Envuelve la respuesta { data, error } de supabase-js en un Result. */
export function resultado<T>(r: { data: T | null; error: { message?: string; code?: string } | null }): Result<T, ErrorFuente> {
    if (r.error) return err(errorFuente(r.error));
    return ok(r.data as T);
}

/** Igual, para lo que SIEMPRE debe venir (una fila pedida por id). */
export function resultadoUno<T>(
    r: { data: T | null; error: { message?: string; code?: string } | null },
    queNoEsta = 'No se encontró.',
): Result<T, ErrorFuente> {
    if (r.error) return err(errorFuente(r.error));
    if (r.data == null) return err({ kind: 'no-encontrado', message: queNoEsta });
    return ok(r.data);
}
