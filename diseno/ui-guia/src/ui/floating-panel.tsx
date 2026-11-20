'use client';

// Un panel que cuelga de un control, pintado en un PORTAL (el calendario y la lista de horas). Viene de GRAMA
// (shared/ui/floating-panel).
//
// En un portal porque, dentro de una lista o un árbol, cada fila es `relative` y cada tarjeta lleva un botón
// del tamaño completo: un panel que cuelga de una fila se pinta encima pero el puntero va a la tarjeta de
// abajo. El precio es colocarlo a mano: se mide desde el ancla, debajo de ella —o encima si abajo no cabe— y
// se vuelve a medir al desplazar (con `capture`: lo que se desplaza suele ser un contenedor, no la ventana) y
// al cambiar el tamaño.
//
// `data-floating` es lo que permite que uno viva DENTRO de otro: un clic en cualquiera cuenta como «dentro».
import { useCallback, useLayoutEffect, useState, type ReactNode, type RefObject, type SyntheticEvent } from 'react';
import { createPortal } from 'react-dom';

export function FloatingPanel({
    open,
    anchorRef,
    panelRef,
    className = '',
    children,
    label,
}: {
    open: boolean;
    anchorRef: RefObject<HTMLElement | null>;
    panelRef: RefObject<HTMLDivElement | null>;
    className?: string;
    children: ReactNode;
    /** Para el lector de pantalla: para qué sirve este panel. */
    label: string;
}) {
    const [place, setPlace] = useState<{ top: number; left: number } | null>(null);

    const measure = useCallback(() => {
        const anchor = anchorRef.current?.getBoundingClientRect();
        const panel = panelRef.current;
        if (!anchor || !panel) return;
        const gap = 6;
        const margin = 8;
        const height = panel.offsetHeight;
        const width = panel.offsetWidth;
        const below = anchor.bottom + gap;
        const fitsBelow = below + height <= window.innerHeight - margin;
        const top = fitsBelow || anchor.top - gap - height < margin ? below : anchor.top - gap - height;
        const left = Math.max(margin, Math.min(anchor.left, window.innerWidth - width - margin));
        setPlace({ top, left });
    }, [anchorRef, panelRef]);

    // Layout effect: el panel ya está en el DOM (pintado fuera de vista), así que se mide y se mueve a su
    // sitio antes de que el navegador pinte un solo cuadro en el lugar equivocado.
    useLayoutEffect(() => {
        if (!open) return;
        measure();
        window.addEventListener('scroll', measure, true);
        window.addEventListener('resize', measure);
        return () => {
            window.removeEventListener('scroll', measure, true);
            window.removeEventListener('resize', measure);
            setPlace(null);
        };
    }, [open, measure]);

    if (!open) return null;
    return createPortal(
        <div
            ref={panelRef}
            data-floating=""
            role="dialog"
            aria-label={label}
            // Los eventos de React suben por un portal por el árbol de COMPONENTES, no por el DOM: sin esto, un
            // clic en un día llegaría también a lo que contenga el campo (una fila que se pliega, un formulario).
            onClick={stop}
            onPointerDown={stop}
            onMouseDown={stop}
            onKeyDown={stop}
            style={place ?? { top: 0, left: 0, visibility: 'hidden' }}
            // Por encima de los diálogos: un campo de fecha puede vivir dentro de uno.
            className={`fixed z-[10000] rounded-control border border-line bg-surface shadow-float ${className}`}
        >
            {children}
        </div>,
        document.body,
    );
}

const stop = (event: SyntheticEvent) => event.stopPropagation();
