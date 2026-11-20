'use client';

// Lo común a todos los capítulos del manual: el gancho que arma sus animaciones, los tamaños de titular y la cáscara de
// una escena. Cada capítulo es un archivo en `capitulos/` y se anima solo, con su propia lista de escenas.
//
// Reglas del movimiento (valen para todos):
//  - Solo corre si la persona no pidió «reducir movimiento» (gsap.matchMedia). Sin movimiento todo se ve ya armado.
//  - Todo parte VISIBLE en el HTML; GSAP esconde y revela. Sin JavaScript la página se lee completa.
//  - Los colores que GSAP anima son los de la marca (HEX de marca-html.ts): no interpola variables CSS. El resto usa roles.
// Los titulares son de PRESENTACIÓN y salen de la escala de las apps (que llega a 24 px): el manual no es una pantalla de
// una app.
import { useEffect, useRef, useSyncExternalStore, type ReactNode } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

if (typeof window !== 'undefined') gsap.registerPlugin(ScrollTrigger);

export { gsap, ScrollTrigger };

export type Selector = ReturnType<typeof gsap.utils.selector>;

export const TITULAR = { fontSize: 'clamp(2.25rem, 5.5vw, 4.75rem)', lineHeight: 1.04, letterSpacing: '-0.02em' } as const;
export const TITULAR_M = { fontSize: 'clamp(1.75rem, 3.6vw, 3rem)', lineHeight: 1.08, letterSpacing: '-0.015em' } as const;
export const SUBTITULAR = { fontSize: 'clamp(1rem, 1.6vw, 1.25rem)', lineHeight: 1.5 } as const;

/** El margen común de una escena: el índice fijo ocupa la izquierda desde 1280 px. */
export const MARGEN = 'px-6 md:px-16 xl:pl-56';
/** Una escena fija: ocupa toda la pantalla y se queda mientras el scroll la anima. */
export const FIJA = `escena flex h-screen items-center overflow-hidden ${MARGEN}`;

/**
 * Arma las animaciones de un capítulo dentro de su caja (`q` busca solo ahí) y las deshace al salir. Devuelve la ref de la caja.
 * `construir` puede devolver una función de limpieza.
 */
export function useAnimacion(construir: (q: Selector) => void | (() => void)) {
    const raiz = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const el = raiz.current;
        if (!el) return;
        const mm = gsap.matchMedia();
        mm.add('(prefers-reduced-motion: no-preference)', () => construir(gsap.utils.selector(el)));
        return () => mm.revert();
        // El capítulo se arma una vez, al montarse.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    return raiz;
}

// --- Estados completos -------------------------------------------------------------------------------------------------------
// Una escena fija se anima con el scroll, y quedarse a medias se ve mal: cada escena dice en qué momentos de su animación está
// COMPLETA (un panel entero, un cubo ya relleno) y, cuando la persona deja de desplazarse, el manual la lleva al más cercano.
interface Zona {
    st: ScrollTrigger;
    /** Los avances (de 0 a 1 del recorrido de la escena) en que se ve completa. */
    progresos: number[];
}
const zonas = new Set<Zona>();

/** Registra los momentos completos de una escena: `tiempos` son segundos de su línea de tiempo `tl`. */
export function registrarEstados(st: ScrollTrigger | undefined, tl: gsap.core.Timeline, tiempos: number[]) {
    if (!st) return;
    const dura = tl.duration();
    zonas.add({ st, progresos: tiempos.map((t) => Math.min(1, Math.max(0, t / dura))) });
}

/** Dónde acomodar el scroll `y`: la posición del estado completo más cercano de la escena en que esté, o null si no está en ninguna. */
export function estadoMasCercano(y: number): number | null {
    const vivas = new Set(ScrollTrigger.getAll());
    for (const z of [...zonas]) {
        if (!vivas.has(z.st)) {
            zonas.delete(z); // la escena se deshizo (cambio de tamaño, recarga)
            continue;
        }
        const { start, end } = z.st;
        if (y < start - 1 || y > end + 1 || end <= start) continue;
        const p = (y - start) / (end - start);
        const mejor = z.progresos.reduce((m, q) => (Math.abs(q - p) < Math.abs(m - p) ? q : m), z.progresos[0]);
        return start + mejor * (end - start);
    }
    return null;
}

// --- El paso en que está la persona --------------------------------------------------------------------------------------------
// Las escenas con varios pasos (paneles, el cubo, las zonas de la pantalla) dicen en cuál están, y el índice lo muestra bajo la
// escena activa: así se sabe «exactamente» dónde se está, no solo en qué capítulo.
interface Paso {
    id: string;
    texto: string;
}
let paso: Paso | null = null;
const oyentes = new Set<() => void>();

/** Una escena anuncia su paso actual; `null` cuando no hay ninguno que decir. */
export function anunciarPaso(id: string, texto: string | null) {
    if (texto === null) {
        if (paso?.id !== id) return;
        paso = null;
    } else {
        if (paso?.id === id && paso.texto === texto) return;
        paso = { id, texto };
    }
    oyentes.forEach((f) => f());
}

export function usePaso(): Paso | null {
    return useSyncExternalStore(
        (f) => {
            oyentes.add(f);
            return () => void oyentes.delete(f);
        },
        () => paso,
        () => null,
    );
}

/** El rótulo de un capítulo: «02 · Color». */
export function Rotulo({ children }: { children: ReactNode }) {
    return <p className="text-ui font-semibold text-primary">{children}</p>;
}

/** Cada escena y cada capítulo pone su `id` aquí para que el índice sepa dónde está. */
export function Escena({ id, children, className = '' }: { id: string; children: ReactNode; className?: string }) {
    return (
        <section id={id} className={`relative ${className}`}>
            {children}
        </section>
    );
}
