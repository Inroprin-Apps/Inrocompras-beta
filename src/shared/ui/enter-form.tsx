'use client';

// UN FORMULARIO DONDE ENTER GUARDA Y, SI SE PIDE, ESCAPE CANCELA. Viene de GRAMA (shared/ui/enter-form).
//
// Los formularios eran un `<div>` con un botón `onClick`, así que después de escribir había que ir a buscar
// «Guardar» con el ratón. Con un `<form>` de verdad el Enter lo pone el NAVEGADOR en cualquier casilla —sin repetir
// un `onKeyDown` en cada una— y respeta lo ya decidido: si el botón de guardar está `disabled` (guardando, nombre
// corto), el Enter no envía nada. Por eso ese botón va con `type="submit"` y sin `onClick`.
//
// `noValidate`, porque quien valida es la acción (con su mensaje en el toast), igual que al pulsar el botón: los
// `min`/`max` de las casillas son para las flechas, no una segunda regla.
//
// ESCAPE es opcional (`onCancel`): lo llevan las filas que se editan en su sitio, donde cancelar es volver a como
// estaba. No se lo pone un diálogo con mucho escrito, donde una tecla no debe tirar el trabajo. Con un desplegable
// abierto el Escape es SUYO y no se lleva el formulario con él.
//
// DOS COSAS QUE MIRAR ANTES DE ENVOLVER ALGO CON ESTO: todo `<button>` crudo de dentro sin `type` pasa a ser de ENVÍO
// (`Button` ya nace `button`); y una casilla cuyo Enter significa otra cosa (añadir una etiqueta, bajar de fila)
// tiene que hacer `preventDefault()` en su `onKeyDown`, o además guardará. Y no se anida: un `<form>` dentro de otro
// no es HTML válido.
import type { ReactNode } from 'react';

export function EnterForm({
    onSubmit,
    onCancel,
    className,
    children,
}: {
    onSubmit: () => void;
    onCancel?: () => void;
    className?: string;
    children: ReactNode;
}) {
    return (
        <form
            noValidate
            className={className}
            onSubmit={(event) => {
                event.preventDefault();
                onSubmit();
            }}
            onKeyDown={(event) => {
                if (event.key !== 'Escape' || onCancel === undefined) return;
                if (event.target instanceof Element && event.target.closest('[aria-expanded="true"]')) return;
                event.preventDefault();
                onCancel();
            }}
        >
            {children}
        </form>
    );
}
