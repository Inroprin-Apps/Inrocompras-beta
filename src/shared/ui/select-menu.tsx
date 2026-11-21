'use client';

// El desplegable de la marca, en lugar del <select> del navegador, para que todos se vean igual. Viene de
// GRAMA (shared/ui/select). Controlado (value + onChange). Como no es un control nativo, dentro de un
// formulario quien lo use manda su valor en un <input type="hidden">.
//
// Se cierra al elegir, al pulsar FUERA y con Escape (useDismissOnOutside). Se abre HACIA ARRIBA si abajo
// no cabe: cerca del pie de la pantalla la lista se abría hacia abajo y quedaba tapada.
import { useCallback, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { useDismissOnOutside } from './use-dismiss-on-outside.ts';

export interface SelectOption {
    value: string;
    label: string;
}

/** 248 = `max-h-60` de la lista + su margen. */
const LIST_HEIGHT = 248;

export function SelectMenu({
    value,
    onChange,
    options,
    label,
    id,
    'aria-invalid': invalid,
    'aria-describedby': describedBy,
    placeholder = 'Selecciona…',
    disabled = false,
    className = '',
}: {
    value: string;
    onChange: (value: string) => void;
    options: readonly SelectOption[];
    /** Nombre accesible del botón (el lector de pantalla lo anuncia). */
    label?: string;
    /** Lo que `Field` le pasa: así la etiqueta, la ayuda y el error quedan conectados. */
    id?: string;
    'aria-invalid'?: boolean;
    'aria-describedby'?: string;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
}) {
    const [open, setOpen] = useState(false);
    const [upward, setUpward] = useState(false);
    // Dentro de un diálogo (que recorta lo que desborda) la lista se abre en línea, empujando el contenido.
    const [enLinea, setEnLinea] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);
    const selected = options.find((o) => o.value === value);

    // Estable a propósito: si el cierre se recreara en cada render, el efecto del hook se volvería a suscribir.
    const close = useCallback(() => setOpen(false), []);
    useDismissOnOutside(open, rootRef, close);

    const toggle = () => {
        if (!open && rootRef.current) {
            const box = rootRef.current.getBoundingClientRect();
            const below = window.innerHeight - box.bottom;
            setEnLinea(!!rootRef.current.closest('dialog'));
            setUpward(below < LIST_HEIGHT && box.top > below);
        }
        setOpen((o) => !o);
    };

    return (
        <div ref={rootRef} className={`relative ${className}`}>
            <button
                type="button"
                disabled={disabled}
                onClick={toggle}
                id={id}
                aria-label={label}
                aria-invalid={invalid}
                aria-describedby={describedBy}
                aria-haspopup="listbox"
                aria-expanded={open}
                title={selected && selected.label.length > 28 ? selected.label : undefined}
                className="flex w-full items-center justify-between gap-2 rounded-control border border-control bg-surface px-3 py-2 text-ui text-ink outline-none transition-colors hover:border-control-hover focus-visible:border-primary aria-[invalid=true]:border-danger disabled:cursor-not-allowed disabled:border-disabled disabled:bg-disabled disabled:text-disabled-ink"
            >
                <span className={`truncate ${selected ? '' : 'text-ink-3'}`}>{selected ? selected.label : placeholder}</span>
                <ChevronDown size={14} className="shrink-0 text-ink-3" aria-hidden="true" />
            </button>
            {open && (
                <div
                    role="listbox"
                    className={`${enLinea ? 'relative mt-1' : `absolute left-0 z-20 ${upward ? 'bottom-full mb-1' : 'mt-1'}`} max-h-60 w-full overflow-auto rounded-control border border-line bg-surface p-1 shadow-float`}
                >
                    {options.map((o) => (
                        <button
                            key={o.value}
                            type="button"
                            role="option"
                            aria-selected={o.value === value}
                            onClick={() => {
                                onChange(o.value);
                                setOpen(false);
                            }}
                            className="flex min-h-11 w-full items-center justify-between gap-2 rounded-inner px-2.5 py-1.5 text-left text-ui hover:bg-surface-2 focus-visible:bg-surface-2 focus-visible:outline-none sm:min-h-0"
                        >
                            <span className={`break-words ${o.value === value ? 'font-medium text-primary' : 'text-ink'}`}>{o.label}</span>
                            {o.value === value && <Check size={14} className="shrink-0 text-primary" aria-hidden="true" />}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
