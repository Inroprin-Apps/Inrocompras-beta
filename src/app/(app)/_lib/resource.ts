'use client';

// Lo que una pantalla lee, guardado en el navegador UNA vez por pestaña (en el módulo, así sobrevive
// al cambiar de sección): volver a una pantalla no le pide nada al servidor. Se revalida al volver a la
// pestaña pasados REVALIDATE_MS y cuando una acción toca sus etiquetas (`refrescar`).
// Patrón de INROCONTA (src/app/(app)/_lib/resource.ts), con dos diferencias:
//   1) se lee con un cargador (Supabase con la sesión de la persona: RLS decide), no con una URL;
//   2) cada almacén declara etiquetas (las tablas que muestra) y `refrescar([...])` recarga los que tocan.
import { useEffect, useSyncExternalStore } from 'react';
import type { Result } from 'neverthrow';
import type { ErrorFuente } from '@/shared/errores.ts';

const REVALIDATE_MS = 5 * 60 * 1000;

export interface ResourceState<T> {
    data: T | null;
    error: string | null;
}

type Cargador<T> = () => Promise<Result<T, ErrorFuente>>;

// ── Bus de refresco: tras una acción, la pantalla dice qué tablas cambió y se recargan solo esos almacenes.
const recargas = new Map<string, Set<() => void>>();
function registrar(etiquetas: readonly string[], recargar: () => void) {
    for (const e of etiquetas) {
        if (!recargas.has(e)) recargas.set(e, new Set());
        recargas.get(e)!.add(recargar);
    }
}
/** Recarga (en segundo plano) todo almacén que muestre alguna de estas tablas. Sin argumentos, todos. */
export function refrescar(etiquetas?: readonly string[]) {
    const hechas = new Set<() => void>();
    for (const [e, fs] of recargas) {
        if (etiquetas && !etiquetas.includes(e)) continue;
        for (const f of fs) if (!hechas.has(f)) (hechas.add(f), f());
    }
}

async function leer<T>(cargar: Cargador<T>): Promise<T> {
    const r = await cargar();
    if (r.isErr()) throw new Error(r.error.message);
    return r.value;
}
const mensaje = (e: unknown) => (e instanceof Error ? e.message : 'No se pudo conectar con el servidor.');

export function resource<T>(cargar: Cargador<T>, etiquetas: readonly string[] = []) {
    let state: ResourceState<T> = { data: null, error: null };
    let checkedAt = 0;
    let inFlight: Promise<void> | null = null;
    let usado = false;
    const listeners = new Set<() => void>();
    const set = (next: ResourceState<T>) => {
        state = next;
        listeners.forEach((l) => l());
    };

    function load(): Promise<void> {
        if (inFlight) return inFlight;
        const read = leer(cargar)
            .then(
                (data) => set({ data, error: null }),
                (e: unknown) => {
                    // Una revalidación que falla sigue mostrando lo que hay.
                    if (!state.data) set({ data: null, error: mensaje(e) });
                },
            )
            .finally(() => {
                checkedAt = Date.now();
                inFlight = null;
            });
        inFlight = read;
        return read;
    }
    // Solo se recarga si alguien ya lo pidió alguna vez (no se leen pantallas que nadie abrió).
    registrar(etiquetas, () => usado && void load());

    function watch(listener: () => void) {
        listeners.add(listener);
        return () => void listeners.delete(listener);
    }

    function subscribe(listener: () => void) {
        listeners.add(listener);
        usado = true;
        if (!state.data && !state.error && !inFlight) void load();
        const onVisible = () => {
            if (document.visibilityState === 'visible' && Date.now() - checkedAt > REVALIDATE_MS) void load();
        };
        document.addEventListener('visibilitychange', onVisible);
        return () => {
            listeners.delete(listener);
            document.removeEventListener('visibilitychange', onVisible);
        };
    }

    const EMPTY: ResourceState<T> = { data: null, error: null };
    return {
        load,
        /** Reintentar tras un error (el botón «Reintentar» de la lista). */
        retry: () => {
            set({ data: state.data, error: null });
            return load();
        },
        /** Lo lee solo si no hay nada aquí ni en camino (precarga en tiempo ocioso). */
        warm: (): Promise<void> => (state.data ? Promise.resolve() : (inFlight ?? load())),
        /** Lo que hay ahora, SIN pedirlo (los contadores del menú). */
        peek: (): T | null =>
            useSyncExternalStore(
                watch,
                () => state.data,
                () => null,
            ),
        use: (): ResourceState<T> =>
            useSyncExternalStore(
                subscribe,
                () => state,
                () => EMPTY,
            ),
    };
}

/**
 * Una entrada por clave (una solicitud, una orden), pedida al usarse; clave `null` = nada que pedir.
 * Lo que una pantalla ABRE se pide al momento; lo que solo se PRECARGA espera en cola, de a uno.
 */
export function keyed<T>(cargarDe: (key: string) => Promise<Result<T, ErrorFuente>>, etiquetas: readonly string[] = []) {
    const states = new Map<string, ResourceState<T>>();
    const asked = new Set<string>();
    const listeners = new Set<() => void>();
    const notify = () => listeners.forEach((l) => l());
    let queue: string[] = [];
    let running = false;
    const open = new Set<string>();

    function ask(key: string, prefetching = false): Promise<void> {
        if (asked.has(key)) return Promise.resolve();
        asked.add(key);
        return leer(() => cargarDe(key))
            .then(
                (data) => void states.set(key, { data, error: null }),
                (e: unknown) => {
                    asked.delete(key);
                    if (!prefetching || open.has(key)) states.set(key, { data: null, error: mensaje(e) });
                },
            )
            .finally(notify);
    }
    // Tras una acción: lo abierto se vuelve a pedir; lo demás se olvida (se pedirá al abrirlo).
    registrar(etiquetas, () => {
        for (const k of [...asked]) if (!open.has(k)) (asked.delete(k), states.delete(k));
        for (const k of open) (asked.delete(k), void ask(k));
    });

    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', () => pump());
    function pump() {
        if (running || document.visibilityState === 'hidden') return;
        const key = queue.shift();
        if (key === undefined) return;
        running = true;
        void ask(key, true).finally(() => {
            running = false;
            pump();
        });
    }
    const pending = (k: string) => !asked.has(k) && !states.get(k)?.data;
    const subscribe = (l: () => void) => {
        listeners.add(l);
        return () => listeners.delete(l);
    };
    const LOADING: ResourceState<T> = { data: null, error: null };
    return {
        prefetch(key: string) {
            if (!pending(key)) return;
            queue = [key, ...queue.filter((k) => k !== key)];
            pump();
        },
        prefetchAll(keys: string[]) {
            queue = keys.filter(pending);
            pump();
        },
        /** Vuelve a pedir una clave (tras una acción sobre ella). */
        reload(key: string) {
            asked.delete(key);
            return ask(key);
        },
        use(key: string | null): ResourceState<T> {
            const get = () => (key ? (states.get(key) ?? LOADING) : LOADING);
            const s = useSyncExternalStore(subscribe, get, () => LOADING);
            useEffect(() => {
                if (!key) return;
                open.add(key);
                queue = queue.filter((k) => k !== key);
                void ask(key);
                return () => void open.delete(key);
            }, [key]);
            return s;
        },
    };
}
