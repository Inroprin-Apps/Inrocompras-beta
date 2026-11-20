'use client';

// La píldora-desplegable de filtro: el control redondeado de las barras de herramientas. Viene de GRAMA
// (shared/ui/filter-pill). Distinta de `SelectMenu`, que es un control de FORMULARIO (rectangular, con
// borde de campo): esto acota una lista que ya se ve, y por eso se lee como un filtro y no como un dato.
//
// `label` fija el texto («Ordenar») y deja el valor elegido para el desplegable; sin él, la píldora
// muestra la opción activa, que es lo que se quiere cuando el valor ES el filtro («Todos» → «Pendientes»).
import { useCallback, useRef, useState, type ReactNode } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { useDismissOnOutside } from './use-dismiss-on-outside.ts';

export function FilterPill<T extends string>({
    icon,
    label,
    value,
    options,
    onChange,
    active,
    className = '',
}: {
    icon?: ReactNode;
    label?: string;
    value: T;
    options: readonly { value: T; label: string }[];
    onChange: (value: T) => void;
    /** Por defecto, activo = algo distinto de la primera opción (la neutra: «Todos», «Recientes»). */
    active?: boolean;
    className?: string;
}) {
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);
    const close = useCallback(() => setOpen(false), []);
    useDismissOnOutside(open, rootRef, close);

    const selected = options.find((o) => o.value === value);
    const isActive = active ?? (options.length > 0 && value !== options[0].value);

    return (
        <div ref={rootRef} className={`relative ${className}`}>
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                aria-haspopup="listbox"
                aria-expanded={open}
                className={`inline-flex h-9 max-w-[15rem] items-center gap-1.5 rounded-full border px-3.5 text-ui font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                    isActive ? 'border-primary bg-primary-soft text-primary-strong' : 'border-control bg-surface text-ink hover:border-control-hover'
                }`}
            >
                {icon && <span className="shrink-0">{icon}</span>}
                <span className="truncate">{label ?? selected?.label ?? ''}</span>
                <ChevronDown size={13} className="shrink-0 text-ink-2" aria-hidden="true" />
            </button>
            {open && (
                <div role="listbox" className="absolute left-0 z-20 mt-1 w-60 rounded-control border border-line bg-surface p-1 shadow-float">
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
                            className="flex w-full items-center justify-between gap-2 rounded-inner px-2.5 py-1.5 text-left text-ui hover:bg-surface-2 focus-visible:bg-surface-2 focus-visible:outline-none"
                        >
                            <span className={`truncate ${o.value === value ? 'font-medium text-primary' : 'text-ink'}`}>{o.label}</span>
                            {o.value === value && <Check size={14} className="shrink-0 text-primary" aria-hidden="true" />}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
