'use client';

// El diálogo (modal) que la guía tenía pendiente: un <dialog> nativo (foco atrapado, Esc cierra, fondo
// inerte, el foco vuelve a donde estaba) vestido como la tarjeta de la app. En el celular sube desde abajo.
// Un solo botón principal, a la derecha; «Cancelar» (secundario) a su izquierda.
//
// Formularios (guía, «Formulario»):
//   - `onEnviar`: el contenido va en un <form> y Enter guarda (como EnterForm). El botón principal va con
//     type="submit" y sin onClick; si está disabled (guardando), Enter no envía.
//   - Cambios sin guardar: `const { cerrar, aviso } = useCerrarConCambios(sucio, onCerrar)`, y se pasa
//     `onCerrar={cerrar}` y `aviso={aviso}` al diálogo, y `onClick={cerrar}` a «Cancelar». El primer intento de
//     cerrar con cambios avisa; el segundo descarta.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { TriangleAlert, X } from 'lucide-react';
import { Button } from './button.tsx';

export function Dialog({
    abierto,
    onCerrar,
    titulo,
    descripcion,
    children,
    pie,
    onEnviar,
    aviso,
}: {
    abierto: boolean;
    onCerrar: () => void;
    titulo: string;
    descripcion?: ReactNode;
    children?: ReactNode;
    pie?: ReactNode;
    /** Si se da, Enter envía el formulario (el botón principal va con type="submit"). */
    onEnviar?: () => void;
    /** Un aviso sobre el pie (p. ej. el de cambios sin guardar de useCerrarConCambios). */
    aviso?: ReactNode;
}) {
    const ref = useRef<HTMLDialogElement>(null);
    useEffect(() => {
        const d = ref.current;
        if (!d) return;
        if (abierto && !d.open) d.showModal();
        if (!abierto && d.open) d.close();
    }, [abierto]);
    const cuerpo = (
        <>
            {children && <div className="flex flex-col gap-4 overflow-y-auto px-5 py-4">{children}</div>}
            {aviso && <div className="border-t border-divider px-5 py-3">{aviso}</div>}
            {pie && <div className="flex flex-wrap justify-end gap-2 border-t border-divider px-5 py-3">{pie}</div>}
        </>
    );
    return (
        <dialog
            ref={ref}
            onClose={onCerrar}
            onCancel={(e) => {
                e.preventDefault();
                onCerrar();
            }}
            onClick={(e) => e.target === ref.current && onCerrar()}
            className="m-0 mt-auto w-full max-w-none rounded-t-card border border-line bg-surface p-0 text-ink shadow-float backdrop:bg-ink/30 sm:m-auto sm:w-[460px] sm:rounded-card"
        >
            {abierto && (
                <div className="flex max-h-[85dvh] flex-col">
                    <div className="flex items-start gap-3 border-b border-divider px-5 py-4">
                        <div className="min-w-0 flex-1">
                            <h2 className="text-heading font-semibold">{titulo}</h2>
                            {descripcion && <p className="mt-0.5 text-small text-ink-2">{descripcion}</p>}
                        </div>
                        <Button variant="ghost" iconOnly aria-label="Cerrar" onClick={onCerrar}>
                            <X size={18} />
                        </Button>
                    </div>
                    {onEnviar ? (
                        <form
                            noValidate
                            className="flex min-h-0 flex-col"
                            onSubmit={(e) => {
                                e.preventDefault();
                                onEnviar();
                            }}
                        >
                            {cuerpo}
                        </form>
                    ) : (
                        cuerpo
                    )}
                </div>
            )}
        </dialog>
    );
}

/** Avisa antes de cerrar un formulario con cambios sin guardar (guía: «Perder un formulario largo es lo que más molesta»). */
export function useCerrarConCambios(sucio: boolean, onCerrar: () => void) {
    const [avisado, setAvisado] = useState(false);
    const cerrar = () => {
        if (sucio && !avisado) return setAvisado(true);
        onCerrar();
    };
    const aviso =
        sucio && avisado ? (
            <p role="alert" className="flex items-start gap-2 text-small text-ink">
                <TriangleAlert size={16} aria-hidden className="mt-px flex-none text-warning-strong" />
                Tienes cambios sin guardar. Pulsa Cancelar otra vez para descartarlos, o guarda.
            </p>
        ) : null;
    return { cerrar, aviso };
}
