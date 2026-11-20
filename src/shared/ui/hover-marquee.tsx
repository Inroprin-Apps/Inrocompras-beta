'use client';

// UN TEXTO DE UNA LÍNEA QUE SE DESPLAZA HASTA SU FINAL MIENTRAS SU FILA ESTÁ BAJO EL CURSOR O CON EL FOCO. Viene de
// GRAMA (shared/ui/hover-marquee).
//
// En reposo es un `truncate` normal con sus puntos suspensivos. Solo cuando el texto NO cabe Y un ancestro marcado
// `marquee-host` está bajo el cursor (o con el foco) se desliza a la izquierda hasta que se ve la última letra, hace
// una pausa y vuelve: un título largo se lee entero sin ensanchar la columna ni abrir nada. Un título que cabe nunca
// se mueve.
//
// El HOST es un ancestro y no este span porque, en las listas donde se usa, el texto es `pointer-events-none` (toda
// la fila es un botón debajo), así que el span nunca recibe el hover.
//
// Medir escribe variables CSS directo en el nodo en vez de pasar por estado: la distancia cambia con cada cambio de
// tamaño de la columna y re-renderizar por eso no aporta nada. Con `prefers-reduced-motion` no se desliza: el texto
// bajo el cursor se parte en líneas (ver globals.css).
import { useEffect, useRef } from 'react';

export function HoverMarquee({ text, className = '' }: { text: string; className?: string }) {
    const outerRef = useRef<HTMLSpanElement>(null);

    useEffect(() => {
        const outer = outerRef.current;
        if (!outer) return;
        const measure = () => {
            const distance = outer.scrollWidth - outer.clientWidth;
            if (distance <= 1) {
                delete outer.dataset.overflow;
                return;
            }
            const rootPx = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
            outer.dataset.overflow = '';
            outer.style.setProperty('--marquee-shift', `-${distance / rootPx}rem`);
            // ~40 px por segundo moviéndose; la animación pasa el 30 % del tiempo quieta en los dos extremos, de ahí el 0.7.
            // Un desborde corto igual tarda dos segundos, o da tirones.
            outer.style.setProperty('--marquee-duration', `${Math.max(2, distance / 40) / 0.7}s`);
        };
        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(outer);
        return () => observer.disconnect();
        // `className` es dependencia a propósito: la fila activa se pone en negrita, lo que ensancha el texto sin
        // cambiar el tamaño de la caja, y el observador no lo notaría.
    }, [text, className]);

    return (
        <span ref={outerRef} className={`marquee block truncate ${className}`}>
            <span>{text}</span>
        </span>
    );
}
