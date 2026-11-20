'use client';

// El diálogo (modal) que la guía tenía pendiente: un <dialog> nativo (foco atrapado, Esc cierra, fondo
// inerte) vestido como la tarjeta de la app. En el celular sube desde abajo y ocupa el ancho.
// Un solo botón principal; el de cancelar es secundario. Las acciones peligrosas usan `peligro`.
import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { Button } from './button.tsx';

export function Dialog({
    abierto,
    onCerrar,
    titulo,
    descripcion,
    children,
    pie,
}: {
    abierto: boolean;
    onCerrar: () => void;
    titulo: string;
    descripcion?: ReactNode;
    children?: ReactNode;
    pie?: ReactNode;
}) {
    const ref = useRef<HTMLDialogElement>(null);
    useEffect(() => {
        const d = ref.current;
        if (!d) return;
        if (abierto && !d.open) d.showModal();
        if (!abierto && d.open) d.close();
    }, [abierto]);
    return (
        <dialog
            ref={ref}
            onClose={onCerrar}
            onCancel={(e) => (e.preventDefault(), onCerrar())}
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
                    {children && <div className="flex flex-col gap-4 overflow-y-auto px-5 py-4">{children}</div>}
                    {pie && <div className="flex flex-wrap justify-end gap-2 border-t border-divider px-5 py-3">{pie}</div>}
                </div>
            )}
        </dialog>
    );
}
