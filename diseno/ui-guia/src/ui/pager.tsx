'use client';

// Pages of a list that is already in the browser: every screen's long list is cut the same way, so
// only one page of rows is ever drawn (drawing rows is what costs, not filtering them). `usePaged`
// keeps the page and goes back to the first one when `reset` changes (a new filter or order).
import { useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { SelectMenu } from './select-menu.tsx';
import { thousands } from './format.ts';

export const PAGE_SIZE = 30;

export interface Paged<T> {
    rows: T[];
    page: number;
    pages: number;
    total: number;
    size: number;
    setPage: (p: number) => void;
}

/**
 * `control`: the page kept outside (in the URL: _lib/url-state.ts), which then goes back to 1 by
 * itself when a filter changes, so `reset` is not used. Without it the page lives here.
 */
export function usePaged<T>(list: T[], reset: unknown, size = PAGE_SIZE, control?: { page: number; setPage: (p: number) => void }): Paged<T> {
    const [state, setState] = useState({ page: 1, reset });
    // Changing what is listed starts again on page 1 (set while rendering: no extra paint).
    if (!control && state.reset !== reset) setState({ page: 1, reset });
    const pages = Math.max(1, Math.ceil(list.length / size));
    // Clamped only to draw: while the list travels a page 3 from a link is kept, not written back as 1.
    const wanted = control ? control.page : state.reset === reset ? state.page : 1;
    const page = Math.min(Math.max(1, wanted), pages);
    return {
        rows: list.slice((page - 1) * size, page * size),
        page,
        pages,
        total: list.length,
        size,
        setPage: control ? control.setPage : (p) => setState({ page: p, reset }),
    };
}

// The five states of every button (normal, hover, pressed, keyboard focus, disabled grey) and the hand.
const BTN =
    'cursor-pointer rounded-lg border border-control bg-surface text-small font-medium text-ink transition-colors duration-100 hover:bg-surface-2 active:bg-surface-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:border-transparent disabled:bg-disabled disabled:text-disabled-ink';

/**
 * El número de página que se escribe: Enter o salir del campo van a esa página; un valor fuera de rango se lleva al
 * extremo más cercano y uno que no es número vuelve a la página actual. `key={page}` en quien lo usa reinicia el borrador.
 */
function PageInput({ page, pages, setPage }: { page: number; pages: number; setPage: (p: number) => void }) {
    const [draft, setDraft] = useState(String(page));
    const go = () => {
        const n = parseInt(draft, 10);
        if (Number.isNaN(n)) return setDraft(String(page));
        const to = Math.min(Math.max(1, n), pages);
        setDraft(String(to));
        if (to !== page) setPage(to);
    };
    return (
        <input
            value={draft}
            onChange={(e) => setDraft(e.target.value.replace(/\D/g, '').slice(0, String(pages).length))}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
            onBlur={go}
            onFocus={(e) => e.currentTarget.select()}
            inputMode="numeric"
            aria-label={`Ir a la página (de 1 a ${pages})`}
            className="h-7 w-10 rounded-inner border border-control bg-surface px-1 text-center text-small text-ink tabular-nums outline-none hover:border-control-hover focus:border-primary"
        />
    );
}

const ICON_BTN = `${BTN} grid size-7 place-items-center`;

/** «1–30 de 128 · «« « Anterior · Página [ 1 ] de 5 · Siguiente » »»»; nothing when it all fits in one page. */
export function Pager<T>({ paged, className = 'mt-3' }: { paged: Paged<T>; className?: string }) {
    const { page, pages, total, size, setPage } = paged;
    if (pages <= 1) return null;
    return (
        <div className={`flex flex-wrap items-center justify-between gap-2.5 text-small text-ink-2 ${className}`}>
            <span className="tabular-nums">
                {thousands((page - 1) * size + 1)}–{thousands(Math.min(page * size, total))} de {thousands(total)}
            </span>
            <div className="flex items-center gap-1.5">
                <button type="button" className={ICON_BTN} disabled={page === 1} onClick={() => setPage(1)} aria-label="Primera página" title="Primera página">
                    <ChevronsLeft size={16} />
                </button>
                <button type="button" className={`${BTN} flex h-7 items-center gap-0.5 pr-3 pl-1.5`} disabled={page === 1} onClick={() => setPage(page - 1)}>
                    <ChevronLeft size={16} /> Anterior
                </button>
                <span className="flex items-center gap-2 px-1.5 tabular-nums">
                    Página <PageInput key={page} page={page} pages={pages} setPage={setPage} /> de {pages}
                </span>
                <button
                    type="button"
                    className={`${BTN} flex h-7 items-center gap-0.5 pr-1.5 pl-3`}
                    disabled={page === pages}
                    onClick={() => setPage(page + 1)}
                >
                    Siguiente <ChevronRight size={16} />
                </button>
                <button
                    type="button"
                    className={ICON_BTN}
                    disabled={page === pages}
                    onClick={() => setPage(pages)}
                    aria-label="Última página"
                    title="Última página"
                >
                    <ChevronsRight size={16} />
                </button>
            </div>
        </div>
    );
}

/** The «Ordenar por» menu every list uses (the dropdown, not the browser's select). */
export function SortSelect<S extends string>({ value, onChange, options }: { value: S; onChange: (v: S) => void; options: { value: S; label: string }[] }) {
    return (
        <span className="flex items-center gap-1.5 text-small text-ink-2">
            Ordenar por
            <SelectMenu value={value} onChange={(v) => onChange(v as S)} options={options} label="Ordenar por" className="w-48" />
        </span>
    );
}
