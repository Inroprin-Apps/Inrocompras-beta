'use client';

// ELEGIR VARIOS: el desplegable para varios valores, para decidir algo (a qué grupos pertenece alguien) o para
// filtrar una lista. Viene de GRAMA (shared/ui/multi-choice).
//
// LO MARCADO ES LO ELEGIDO. Antes había un segundo, donde vacío significaba «sin filtro» y se dibujaba con todas
// las casillas marcadas: «Sin grupo por ahora» marcaba TODOS los grupos y nadie lo entendía. Ahora nada marcado
// lo dice `noneLabel`: «Sin grupo por ahora» donde significa ninguno, «todos los clientes» en un filtro donde
// significa sin filtro. Hay una fila «Seleccionar todos» que también limpia todo.
//
// Las casillas van a la DERECHA, después del texto, para que el ojo lea primero el nombre. Una línea `detail` bajo
// la etiqueta distingue dos opciones con el mismo título. Con muchas opciones aparece un buscador arriba. Se queda
// abierto mientras se marca y se cierra al pulsar fuera o con Escape, como el desplegable.
import { useCallback, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { useDismissOnOutside } from './use-dismiss-on-outside.ts';

/** Una opción. `detail` es la segunda línea que distingue dos opciones con la misma etiqueta. */
export interface ChoiceOption {
    value: string;
    label: string;
    detail?: string;
}

export function MultiChoice({
    values,
    onChange,
    options,
    noneLabel,
    countLabel,
    className = '',
}: {
    values: readonly string[];
    onChange: (values: string[]) => void;
    options: readonly ChoiceOption[];
    /** El texto del botón cuando no hay nada elegido, p. ej. «Ningún cliente por ahora». */
    noneLabel: string;
    /** El texto del botón para varios, p. ej. `(n) => `${n} clientes``. */
    countLabel: (chosen: number) => string;
    className?: string;
}) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const rootRef = useRef<HTMLDivElement>(null);

    const close = useCallback(() => setOpen(false), []);
    useDismissOnOutside(open, rootRef, close);

    // Los ids que ya no se ofrecen (otra organización, algo borrado) no cuentan.
    const chosen = values.filter((v) => options.some((o) => o.value === v));
    const allOn = options.length > 0 && chosen.length === options.length;

    const first = options.find((o) => o.value === chosen[0]);
    const label = chosen.length === 0 ? noneLabel : chosen.length === 1 && first ? first.label : countLabel(chosen.length);

    const toggle = (v: string) => onChange(chosen.includes(v) ? chosen.filter((x) => x !== v) : [...chosen, v]);

    const searchable = options.length > 8;
    const q = query.trim().toLowerCase();
    const visible = q === '' ? options : options.filter((o) => `${o.label} ${o.detail ?? ''}`.toLowerCase().includes(q));

    const row = 'flex w-full items-center justify-between gap-3 rounded-inner px-2.5 py-1.5 text-left text-ui hover:bg-surface-2 focus-visible:bg-surface-2 focus-visible:outline-none';

    return (
        <div ref={rootRef} className={`relative ${className}`}>
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                aria-haspopup="listbox"
                aria-expanded={open}
                className="flex w-full items-center justify-between gap-2 rounded-control border border-control bg-surface px-3 py-2 text-ui text-ink outline-none transition-colors hover:border-control-hover focus-visible:border-primary"
            >
                <span className={`truncate ${chosen.length === 0 ? 'text-ink-3' : ''}`}>{label}</span>
                <ChevronDown size={14} className="shrink-0 text-ink-3" aria-hidden="true" />
            </button>
            {open && (
                <div className="absolute left-0 z-20 mt-1 w-full min-w-[18rem] rounded-control border border-line bg-surface p-1 shadow-float">
                    {searchable && (
                        <input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Buscar…"
                            aria-label="Buscar"
                            autoFocus
                            className="mb-1 h-8 w-full rounded-inner border border-control bg-surface px-2 text-ui text-ink placeholder:text-ink-3 focus:border-primary focus:outline-none"
                        />
                    )}
                    {/* SELECCIONAR TODOS marca todo lo que hay, no solo lo que la búsqueda deja ver: un «todos» que dependiera de lo escrito sería otra cosa cada vez. */}
                    <button type="button" onClick={() => onChange(allOn ? [] : options.map((o) => o.value))} className={row}>
                        <span className={`truncate ${allOn ? 'font-medium text-primary' : 'text-ink'}`}>Seleccionar todos</span>
                        <Box on={allOn} partial={!allOn && chosen.length > 0} />
                    </button>
                    <div className="my-1 border-t border-divider" />
                    <div role="listbox" aria-multiselectable="true" className="max-h-72 overflow-auto">
                        {visible.map((o) => {
                            const on = chosen.includes(o.value);
                            return (
                                <button key={o.value} type="button" role="option" aria-selected={on} onClick={() => toggle(o.value)} className={row}>
                                    <span className="min-w-0">
                                        <span className={`block truncate ${on ? 'font-medium text-primary' : 'text-ink'}`}>{o.label}</span>
                                        {o.detail && <span className="block truncate text-small text-ink-2">{o.detail}</span>}
                                    </span>
                                    <Box on={on} />
                                </button>
                            );
                        })}
                        {visible.length === 0 && <p className="px-2.5 py-1.5 text-small text-ink-2">Nada coincide con «{query.trim()}».</p>}
                    </div>
                </div>
            )}
        </div>
    );
}

/** La casilla de una fila; `partial` dibuja el guion de «algunos, no todos». */
function Box({ on, partial = false }: { on: boolean; partial?: boolean }) {
    return (
        <span
            className={`grid size-4 shrink-0 place-items-center rounded-sm border ${on || partial ? 'border-primary bg-primary text-on-fill' : 'border-control bg-surface'}`}
            aria-hidden="true"
        >
            {on && <Check size={11} strokeWidth={3} />}
            {partial && <span className="h-0.5 w-2 rounded-full bg-current" />}
        </span>
    );
}
