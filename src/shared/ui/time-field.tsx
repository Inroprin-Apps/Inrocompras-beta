'use client';

// UNA HORA DEL DÍA, ESCRITA O ELEGIDA (en lugar de <input type="time">). Viene de GRAMA (shared/ui/time-field).
// Una caja de texto que lee «15:30», «1530» o «3pm» (`parseClock`), una lista de cada media hora debajo, y las
// flechas del teclado que la mueven un cuarto de hora.
//
// EL TEXTO ES SU PROPIO ESTADO y solo se vuelve valor cuando se lee como una hora: un «15:» a medio escribir se
// queda en pantalla, no borra el campo. Al salir (blur) se ordena a `HH:MM`, o vuelve a la última buena si no
// se puede leer.
//
// `live` envía cada hora TERMINADA mientras se escribe (formularios con botón Guardar, que si no leerían el valor
// de antes del blur); sin él, el valor sale en el blur o al elegir (filas donde cada valor es una escritura).
import { useCallback, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { CONTROL } from './bits.tsx';
import { CLOCK_SLOTS, isFinishedClock, parseClock, shiftClock } from './clock-text.ts';
import { FloatingPanel } from './floating-panel.tsx';
import { useDismissOnOutside } from './use-dismiss-on-outside.ts';

export function TimeField({
    value,
    onChange,
    live,
    label,
    placeholder,
    disabled = false,
    className = '',
}: {
    /** `HH:MM`, o `''`. */
    value: string;
    onChange: (clock: string) => void;
    live: boolean;
    label: string;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
}) {
    const [text, setText] = useState(value);
    const [seen, setSeen] = useState(value);
    if (value !== seen) {
        setSeen(value);
        setText(value);
    }
    const [open, setOpen] = useState(false);
    const listId = useId();
    const anchorRef = useRef<HTMLInputElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const roots = useMemo(() => [anchorRef, panelRef], []);
    const close = useCallback(() => setOpen(false), []);
    useDismissOnOutside(open, roots, close);

    // Lo que sale también se marca como VISTO: cuando el padre lo devuelve no es un cambio de afuera, así que el
    // texto que se está escribiendo no se reemplaza por su forma ordenada a medias.
    const emit = (clock: string) => {
        setSeen(clock);
        onChange(clock);
    };

    const send = (clock: string) => {
        setText(clock);
        if (clock !== value) emit(clock);
    };

    const settle = () => {
        if (text.trim() === '') return send('');
        const clock = parseClock(text);
        if (clock === null) setText(value);
        else send(clock);
    };

    const step = (minutes: number) => {
        const next = shiftClock(parseClock(text) ?? parseClock(placeholder ?? '') ?? '08:00', minutes);
        setText(next);
        if (live) emit(next);
    };

    return (
        <>
            <input
                ref={anchorRef}
                type="text"
                inputMode="numeric"
                autoComplete="off"
                value={text}
                placeholder={placeholder ?? 'hh:mm'}
                disabled={disabled}
                aria-label={label}
                role="combobox"
                aria-autocomplete="none"
                aria-haspopup="listbox"
                aria-controls={listId}
                aria-expanded={open}
                onClick={() => setOpen(true)}
                onChange={(event) => {
                    setText(event.target.value);
                    if (live && isFinishedClock(event.target.value)) emit(parseClock(event.target.value) as string);
                }}
                onBlur={() => {
                    setOpen(false);
                    settle();
                }}
                onKeyDown={(event) => {
                    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
                        event.preventDefault();
                        step(event.key === 'ArrowUp' ? 15 : -15);
                    } else if (event.key === 'Enter') {
                        // Sin prevenir: dentro de un `EnterForm` el Enter igual guarda, con el valor ya ordenado enviado.
                        setOpen(false);
                        settle();
                    } else if (event.key === 'Escape' && open) {
                        event.preventDefault();
                        setOpen(false);
                    }
                }}
                className={`${CONTROL} w-24 tabular-nums ${className}`}
            />
            <FloatingPanel open={open} anchorRef={anchorRef} panelRef={panelRef} label={label} className="p-1">
                {/* Ningún mousedown llega a la caja desde aquí (ni en la barra de desplazamiento): la desenfocaría, y un blur cierra la lista. */}
                <div onMouseDown={(event) => event.preventDefault()} className="max-h-60 w-28 overflow-y-auto">
                    <SlotList
                        id={listId}
                        current={parseClock(text)}
                        onPick={(clock) => {
                            send(clock);
                            setOpen(false);
                        }}
                    />
                </div>
            </FloatingPanel>
        </>
    );
}

function SlotList({ id, current, onPick }: { id: string; current: string | null; onPick: (clock: string) => void }) {
    const listRef = useRef<HTMLUListElement>(null);
    // Abre desplazada a la hora escrita (o a la media hora más cercana), no a medianoche.
    const near = current === null ? '08:00' : `${current.slice(0, 2)}:${current.slice(3) < '30' ? '00' : '30'}`;
    useLayoutEffect(() => {
        listRef.current?.querySelector(`[data-clock="${near}"]`)?.scrollIntoView({ block: 'center' });
    }, [near]);

    return (
        <ul ref={listRef} id={id} role="listbox">
            {CLOCK_SLOTS.map((clock) => (
                <li key={clock}>
                    <button
                        type="button"
                        role="option"
                        aria-selected={clock === current}
                        data-clock={clock}
                        tabIndex={-1}
                        // Deja el foco en la caja: un blur aquí ordenaría primero el texto viejo.
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => onPick(clock)}
                        className={`w-full rounded-inner px-2 py-1 text-left text-ui tabular-nums hover:bg-surface-2 ${clock === current ? 'font-medium text-primary' : 'text-ink'}`}
                    >
                        {clock}
                    </button>
                </li>
            ))}
        </ul>
    );
}
