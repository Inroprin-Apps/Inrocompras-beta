'use client';

// Cerrar un desplegable al pulsar FUERA y con Escape. Viene de GRAMA (shared/ui/use-dismiss-on-outside).
//
// Sustituye al «telón» (`<div className="fixed inset-0" onClick=…>`), que parece equivalente y no lo es:
// un `fixed` deja de medirse contra la ventana si un ancestro tiene `transform` o `filter`, y aunque la
// cubra, cualquier cosa con más z-index (la barra fija, otro panel) se queda el clic y el menú sigue
// abierto. Además el telón se COMÍA el clic: para pulsar un botón con el menú abierto hacían falta dos.
// Escuchando en el documento, el mismo clic cierra el menú y llega a su destino.
//
// `pointerdown` y no `click`: cierra al APOYAR, cubre ratón, táctil y lápiz con un solo oyente. Los
// oyentes solo existen mientras está abierto.
import { useEffect, type RefObject } from 'react';

type Root = RefObject<HTMLElement | null>;

/** Admite varias raíces: un desplegable pintado en un portal tiene su contenido fuera del árbol del disparador. */
export function useDismissOnOutside(open: boolean, ref: Root | readonly Root[], onDismiss: () => void): void {
    useEffect(() => {
        if (!open) return;
        const roots: readonly Root[] = Array.isArray(ref) ? (ref as readonly Root[]) : [ref as Root];

        const onPointerDown = (event: PointerEvent) => {
            if (roots.some((root) => root.current?.contains(event.target as Node))) return;
            onDismiss();
        };
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && !event.defaultPrevented) onDismiss();
        };

        document.addEventListener('pointerdown', onPointerDown);
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('pointerdown', onPointerDown);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [open, ref, onDismiss]);
}
