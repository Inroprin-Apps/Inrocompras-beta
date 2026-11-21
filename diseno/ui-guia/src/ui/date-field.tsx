'use client';

// UN DÍA, ELEGIDO DE UN CALENDARIO (en lugar de <input type="date">). Viene de GRAMA (shared/ui/date-field).
// El nativo parte el día en dd · mm · aaaa con un orden que depende del idioma del navegador, admite años de
// seis cifras y, a medio escribir, informa vacío: así una fecha se borraba sola. Un botón que dice el día con
// palabras y abre un mes es un solo gesto.
//
// La cuadrícula del mes sale de `react-day-picker` (teclado, lector de pantalla y bordes de mes: lo difícil de
// hacer a mano), vestida con los tokens a través de `classNames`.
//
// LA CABECERA ES UN BOTÓN: pulsada cambia los días por todos los años a la vez, luego por los doce meses, luego
// otra vez por los días. Una fecha de hace décadas son tres pulsaciones y no una por mes.
import { useCallback, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { DayPicker } from 'react-day-picker';
import { es } from 'react-day-picker/locale';
import { Calendar, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { CONTROL } from './bits.tsx';
import { dateFromDay, dayFromDate, dayLabel } from './clock-text.ts';
import { FloatingPanel } from './floating-panel.tsx';
import { useDismissOnOutside } from './use-dismiss-on-outside.ts';

type View = 'days' | 'months' | 'years';

export function DateField({
    value,
    onChange,
    label,
    disabled = false,
    className = '',
    min,
    max,
}: {
    /** `aaaa-mm-dd`, o `''` sin día. */
    value: string;
    onChange: (day: string) => void;
    label: string;
    disabled?: boolean;
    className?: string;
    /** Primer y último día que se pueden elegir, `aaaa-mm-dd` (los dos extremos de un rango). */
    min?: string;
    max?: string;
}) {
    const [open, setOpen] = useState(false);
    const [view, setView] = useState<View>('days');
    /** El mes a la vista. Controlado, porque las cuadrículas de año y mes también lo mueven. */
    const [month, setMonth] = useState<Date>(() => new Date());
    const anchorRef = useRef<HTMLButtonElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const roots = useMemo(() => [anchorRef, panelRef], []);
    const close = useCallback(() => setOpen(false), []);
    useDismissOnOutside(open, roots, close);
    const hydrated = useHydrated();
    const selected = dateFromDay(value);
    const first = min ? dateFromDay(min) : undefined;
    const last = max ? dateFromDay(max) : undefined;
    const outOfRange = [first && { before: first }, last && { after: last }].filter((m) => m !== undefined);
    const today = dayFromDate(new Date());
    const todayFits = (!max || today <= max) && (!min || today >= min);
    const firstMonth = first ? monthIndex(first) : -Infinity;
    const lastMonth = last ? monthIndex(last) : Infinity;

    const toggle = () => {
        if (!open) {
            // Cada apertura empieza en los días, en el mes del valor —o el de hoy, o el último permitido si hoy ya pasó.
            setView('days');
            setMonth(selected ?? (todayFits || !last ? new Date() : last));
        }
        setOpen((o) => !o);
    };

    const pick = (day: string) => {
        onChange(day);
        setOpen(false);
        anchorRef.current?.focus();
    };

    const step = (by: number) => setMonth(new Date(month.getFullYear(), month.getMonth() + by, 1));

    return (
        <>
            <button
                ref={anchorRef}
                type="button"
                disabled={disabled}
                onClick={toggle}
                aria-haspopup="dialog"
                aria-expanded={open}
                aria-label={value === '' ? `${label}: sin fecha` : `${label}: ${dayLabel(value)}`}
                className={`${CONTROL} inline-flex items-center gap-2 whitespace-nowrap text-left ${className}`}
            >
                <Calendar size={14} className="shrink-0 text-ink-2" aria-hidden="true" />
                {/* El día se dice en la zona horaria del navegador, que el servidor no conoce: se escribe tras hidratar para que las dos pasadas pinten lo mismo. */}
                <span className={value === '' ? 'text-ink-3' : ''}>{!hydrated ? ' ' : value === '' ? 'Elegir fecha' : dayLabel(value)}</span>
            </button>
            <FloatingPanel open={open} anchorRef={anchorRef} panelRef={panelRef} label={label} className="p-3">
                <div
                    className="w-[15.75rem]"
                    onKeyDown={(event) => {
                        if (event.key !== 'Escape') return;
                        event.preventDefault();
                        // Escape sube a los días antes de cerrar.
                        if (view !== 'days') {
                            setView('days');
                            return;
                        }
                        setOpen(false);
                        anchorRef.current?.focus();
                    }}
                >
                    <div className="mb-1 flex h-8 items-center justify-between gap-1">
                        <button
                            type="button"
                            onClick={() => setView(view === 'years' ? 'days' : 'years')}
                            aria-expanded={view === 'years'}
                            aria-label={view === 'years' ? 'Volver a los días' : 'Elegir el año'}
                            className="inline-flex h-8 items-center gap-1 rounded-inner px-1.5 font-medium capitalize hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-primary"
                        >
                            {view === 'months' ? month.getFullYear() : `${monthWords.format(month)} ${month.getFullYear()}`}
                            <ChevronDown size={14} className={`text-ink-2 transition-transform ${view === 'years' ? 'rotate-180' : ''}`} aria-hidden="true" />
                        </button>
                        {view === 'days' && (
                            <span className="flex items-center gap-1">
                                <button type="button" onClick={() => step(-1)} disabled={monthIndex(month) <= firstMonth} aria-label="Mes anterior" className={NAV_BUTTON}>
                                    <ChevronLeft size={16} aria-hidden="true" />
                                </button>
                                <button type="button" onClick={() => step(1)} disabled={monthIndex(month) >= lastMonth} aria-label="Mes siguiente" className={NAV_BUTTON}>
                                    <ChevronRight size={16} aria-hidden="true" />
                                </button>
                            </span>
                        )}
                    </div>

                    {view === 'years' ? (
                        <YearGrid
                            from={first?.getFullYear() ?? new Date().getFullYear() - 100}
                            to={last?.getFullYear() ?? new Date().getFullYear() + 10}
                            active={month.getFullYear()}
                            onPick={(year) => {
                                // Dentro del rango: el mismo mes de un año donde no se permite cae en el más cercano que sí.
                                const target = Math.min(Math.max(year * 12 + month.getMonth(), firstMonth), lastMonth);
                                setMonth(new Date(Math.floor(target / 12), target % 12, 1));
                                setView('months');
                            }}
                        />
                    ) : view === 'months' ? (
                        <div className="grid grid-cols-3 gap-1">
                            {MONTHS.map((name, index) => {
                                const at = month.getFullYear() * 12 + index;
                                return (
                                    <button
                                        key={name}
                                        type="button"
                                        disabled={at < firstMonth || at > lastMonth}
                                        onClick={() => {
                                            setMonth(new Date(month.getFullYear(), index, 1));
                                            setView('days');
                                        }}
                                        className={`${GRID_BUTTON} ${index === month.getMonth() ? GRID_ON : ''}`}
                                    >
                                        {name}
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        <DayPicker
                            mode="single"
                            locale={es}
                            weekStartsOn={1}
                            showOutsideDays
                            autoFocus
                            hideNavigation
                            month={month}
                            onMonthChange={setMonth}
                            selected={selected}
                            disabled={outOfRange}
                            startMonth={first}
                            endMonth={last}
                            onSelect={(date) => date && pick(dayFromDate(date))}
                            classNames={CALENDAR_CLASSES}
                        />
                    )}
                    <div className="mt-2 flex items-center justify-between gap-2 border-t border-divider pt-2">
                        {/* «Hoy» solo si hoy se puede elegir: pasado `max` pondría un día que el propio calendario rechaza. */}
                        {todayFits ? (
                            <button type="button" onClick={() => pick(today)} className={FOOT_BUTTON}>
                                Hoy
                            </button>
                        ) : (
                            <span />
                        )}
                        {value !== '' && (
                            <button type="button" onClick={() => pick('')} className={FOOT_BUTTON}>
                                Quitar fecha
                            </button>
                        )}
                    </div>
                </div>
            </FloatingPanel>
        </>
    );
}

/** TODOS LOS AÑOS A LA VEZ, el más nuevo primero, en una caja que se desplaza y ya abre centrada en el año a la vista. */
function YearGrid({ from, to, active, onPick }: { from: number; to: number; active: number; onPick: (year: number) => void }) {
    const years = Array.from({ length: Math.max(0, to - from + 1) }, (_, index) => to - index);
    // Un ref callback y no un efecto: corre una vez, cuando la caja ya está en el DOM y se puede medir.
    const center = useCallback((box: HTMLDivElement | null) => {
        const on = box?.querySelector<HTMLElement>('[data-on]');
        if (box && on) box.scrollTop = on.offsetTop - box.clientHeight / 2 + on.offsetHeight / 2;
    }, []);

    return (
        <div ref={center} className="relative grid max-h-60 grid-cols-4 gap-1 overflow-y-auto pr-1">
            {years.map((year) => (
                <button key={year} type="button" data-on={year === active ? '' : undefined} onClick={() => onPick(year)} className={`${GRID_BUTTON} ${year === active ? GRID_ON : ''}`}>
                    {year}
                </button>
            ))}
        </div>
    );
}

/** Un mes como un solo número (año × 12 + mes), para que «antes» y «después» sean una comparación simple. */
const monthIndex = (date: Date) => date.getFullYear() * 12 + date.getMonth();

const monthWords = new Intl.DateTimeFormat('es-PE', { month: 'long' });
const shortMonth = new Intl.DateTimeFormat('es-PE', { month: 'short' });
const MONTHS = Array.from({ length: 12 }, (_, index) => shortMonth.format(new Date(2000, index, 1)).replace('.', ''));

// Hover = fondo, nunca borde. Deshabilitado = gris, nunca opacidad.
const FOOT_BUTTON = 'rounded-inner px-2 py-1 text-small font-medium text-primary hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-primary';
const NAV_BUTTON =
    'grid h-8 w-8 place-items-center rounded-inner text-ink-2 hover:bg-surface-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-primary disabled:text-disabled-ink disabled:hover:bg-transparent';
const GRID_BUTTON =
    'h-9 rounded-inner text-ui capitalize outline-none transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-primary disabled:text-disabled-ink disabled:hover:bg-transparent';
const GRID_ON = 'bg-primary font-medium text-on-fill hover:bg-primary-hover';

const CALENDAR_CLASSES = {
    root: 'relative text-ui text-ink',
    months: 'relative',
    // La cabecera y las flechas son nuestras (arriba), porque también abren las cuadrículas de año y mes.
    month_caption: 'hidden',
    month_grid: 'border-collapse',
    weekdays: 'flex',
    weekday: 'w-9 pb-1 text-center text-caption font-medium uppercase text-ink-2',
    week: 'flex',
    day: 'p-0 text-center',
    day_button: 'grid h-9 w-9 place-items-center rounded-inner outline-none transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-primary',
    // `!` porque un día elegido también puede ser hoy, y los dos pelearían por el color.
    selected: '[&>button]:bg-primary! [&>button]:font-medium [&>button]:text-on-fill! [&>button]:hover:bg-primary-hover',
    today: '[&>button]:font-semibold [&>button]:text-primary',
    outside: 'text-ink-3',
    disabled: 'text-disabled-ink',
    hidden: 'invisible',
};

const noop = () => () => {};

/** `true` una vez en el cliente: lo que el servidor no pudo saber ya se puede pintar. */
function useHydrated(): boolean {
    return useSyncExternalStore(
        noop,
        () => true,
        () => false,
    );
}
