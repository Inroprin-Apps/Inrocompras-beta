// El cuadrito de texto que explica un icono al posar el cursor. Viene de GRAMA (shared/ui/tooltip).
//
// Existe porque el `title` del navegador tarda casi un segundo, se comporta distinto en cada navegador y
// no se puede vestir. SIN JAVASCRIPT NI DEPENDENCIAS: `group-hover` y posición absoluta. Aparece también
// con el foco de TECLADO (`:focus-visible`, no `focus-within`: un clic también deja el foco en el botón y
// el cuadrito se quedaría pegado hasta pulsar en otro sitio).
//
// Vestido de FLOTANTE, no de tarjeta: fondo oscuro y la sombra de los desplegables. Una tarjeta vive en la
// página; esto vive encima de ella. OJO: un ancestro con `overflow-hidden` lo recorta.
import type { ReactNode } from 'react';

export function Tooltip({
    text,
    children,
    className = '',
    align = 'center',
}: {
    /** Lo que se explica. Frase entera: quien se detiene aquí es porque no lo dio por obvio. */
    text: string;
    children: ReactNode;
    className?: string;
    /** Hacia dónde crece, para que no se salga por el borde de la pantalla. */
    align?: 'center' | 'left' | 'right';
}) {
    const side = align === 'center' ? 'left-1/2 -translate-x-1/2' : align === 'left' ? 'left-0' : 'right-0';
    return (
        <span className={`group/tip relative inline-flex ${className}`}>
            {children}
            <span
                role="tooltip"
                className={`pointer-events-none absolute bottom-full z-50 mb-1.5 hidden w-max max-w-[16rem] rounded-inner bg-ink px-2.5 py-1.5 text-caption leading-snug font-medium text-on-fill shadow-float group-hover/tip:block group-has-[:focus-visible]/tip:block ${side}`}
            >
                {text}
            </span>
        </span>
    );
}
