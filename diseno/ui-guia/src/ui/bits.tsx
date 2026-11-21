'use client';

// The pieces the sections share besides card and KPI: the labelled bar, the ring, the finder,
// «Ver más», the table classes, an empty line and a notice. Ports of filaBarra(), anillo(), the
// .tabla / .barra-filtros / .vacio styles of the Apps Script view.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowDown, ArrowUp, ChevronsUpDown, CircleAlert, CircleCheck, Info, TriangleAlert, X } from 'lucide-react';

/** The classes of a data table: header cell, cell, number cell, sub-line. */
export const T = {
    table: 'w-full border-separate border-spacing-0 text-ui',
    headRow: 'text-left',
    // Cabecera sin fondo, con su línea debajo (divider-strong) y bordes verticales solo en los lados externos (la línea va en la celda: con border-separate un borde en la fila no se pinta).
    th: 'border-y border-y-divider bg-surface-2 border-b-divider-strong first:border-l first:border-l-divider last:border-r last:border-r-divider px-3 py-3 text-small font-medium text-ink-2',
    thNum: 'border-y border-y-divider bg-surface-2 border-b-divider-strong first:border-l first:border-l-divider last:border-r last:border-r-divider px-3 py-3 text-small font-medium text-ink-2',
    // Filas holgadas (16 px arriba y abajo, 12 a los lados), como las de INROCONTA. La línea va en la celda: con
    // `border-separate` (que permite las esquinas redondeadas de la cabecera) un borde en la fila no se pinta.
    row: 'hover:bg-surface-2',
    td: 'border-b border-divider first:border-l last:border-r px-3 py-4 align-top',
    tdNum: 'border-b border-divider first:border-l last:border-r px-3 py-4 align-top whitespace-nowrap tabular-nums',
    sub: 'mt-0.5 text-caption text-ink-3',
};

/**
 * Cabecera ordenable: la flecha se ve siempre. Gris con dos puntas = se puede ordenar por aquí; azul con una punta =
 * ordenada así. Va dentro de `<th>`; `aria-sort` lo pone el `<th>`, no este botón.
 */
export function SortTh({
    label,
    active,
    dir,
    onSort,
    num = false,
    fit = false,
}: {
    label: string;
    active: boolean;
    dir: 'asc' | 'desc';
    onSort: () => void;
    num?: boolean;
    fit?: boolean;
}) {
    const Icon = !active ? ChevronsUpDown : dir === 'asc' ? ArrowUp : ArrowDown;
    return (
        <th
            scope="col"
            aria-sort={active ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}
            className={`${num ? T.thNum : T.th}${fit ? ' w-px whitespace-nowrap' : ''}`}
        >
            <button
                type="button"
                onClick={onSort}
                className={`inline-flex items-center gap-1.5 hover:text-ink focus-visible:outline-2 focus-visible:outline-primary ${active ? 'text-ink' : ''}`}
            >
                {label}
                <Icon size={12} className={`flex-none ${active ? 'text-primary' : 'text-ink-3'}`} aria-hidden />
            </button>
        </th>
    );
}

/** The colours a bar can take: a role, never a loose hex. */
export const BAR = {
    primary: 'bg-primary',
    teal: 'bg-teal',
    success: 'bg-success',
    warning: 'bg-warning',
    danger: 'bg-danger',
    muted: 'bg-ink-3',
} as const;
export type BarColor = keyof typeof BAR;

export function BarRow({
    label,
    figures,
    pct,
    color = 'primary',
    note,
    title,
    chosen = false,
    onClick,
}: {
    label: ReactNode;
    figures: ReactNode;
    pct: number;
    color?: BarColor;
    note?: string;
    title?: string;
    chosen?: boolean;
    onClick?: () => void;
}) {
    const body = (
        <>
            <div className="mb-[5px] flex items-baseline justify-between gap-2.5">
                <span className="truncate text-ui font-medium">{label}</span>
                <span className="text-small whitespace-nowrap text-ink-2">{figures}</span>
            </div>
            {note && <div className="-mt-0.5 mb-[5px] text-caption text-ink-3">{note}</div>}
            <div className="h-2 overflow-hidden rounded-md bg-surface-3">
                <span className={`block h-full rounded-md ${BAR[color]}`} style={{ width: `${Math.max(2, Math.min(100, pct))}%` }} />
            </div>
        </>
    );
    const cls = `-mx-2 mb-[7px] block w-[calc(100%+16px)] rounded-lg px-2 pt-0.5 pb-2 text-left ${chosen ? 'bg-primary-soft' : 'hover:bg-surface-2'}`;
    return onClick ? (
        <button type="button" title={title} aria-pressed={chosen} onClick={onClick} className={cls}>
            {body}
        </button>
    ) : (
        <div title={title} className={cls}>
            {body}
        </div>
    );
}

const RING = { primary: 'stroke-primary', teal: 'stroke-teal', success: 'stroke-success', warning: 'stroke-warning', danger: 'stroke-danger' } as const;

/** A percentage as a ring, with the figure inside; `children` go to its right. */
export function Ring({ pct, color = 'primary', children }: { pct: number; color?: keyof typeof RING; children?: ReactNode }) {
    const r = 24,
        c = 2 * Math.PI * r;
    return (
        <div className="flex items-center gap-3.5">
            <svg width="62" height="62" viewBox="0 0 62 62" className="flex-none">
                <circle cx="31" cy="31" r={r} fill="none" className="stroke-surface-3" strokeWidth="5" />
                <circle
                    cx="31"
                    cy="31"
                    r={r}
                    fill="none"
                    className={RING[color]}
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeDasharray={`${(c * pct) / 100} ${c}`}
                    transform="rotate(-90 31 31)"
                />
                <text x="31" y="35.5" textAnchor="middle" fontSize="13" fontWeight="600" className="fill-ink">
                    {pct}%
                </text>
            </svg>
            {children && <div className="min-w-0 text-small text-ink-2">{children}</div>}
        </div>
    );
}

/** The look of every form control: search box, select, period picker. */
export const CONTROL =
    'rounded-control border border-control bg-surface px-2.5 py-2 text-ui outline-none hover:border-control-hover focus:border-primary disabled:border-divider disabled:bg-disabled disabled:text-disabled-ink';

/** A search box that tells its value `delay` ms after the last key (the old view's 150 ms). */
export function SearchBox({
    value,
    onChange,
    placeholder,
    delay = 150,
    className = '',
    inputMode,
}: {
    value: string;
    onChange: (v: string) => void;
    placeholder: string;
    delay?: number;
    className?: string;
    inputMode?: 'numeric' | 'text';
}) {
    const [text, setText] = useState(value);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
    useEffect(() => setText(value), [value]);
    useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);
    return (
        <input
            type="search"
            value={text}
            inputMode={inputMode}
            placeholder={placeholder}
            onChange={(e) => {
                const v = e.target.value;
                setText(v);
                if (timer.current) clearTimeout(timer.current);
                timer.current = setTimeout(() => onChange(v), delay);
            }}
            className={`${CONTROL} min-w-[220px] flex-1 ${className}`}
        />
    );
}

export const FilterRow = ({ children }: { children: ReactNode }) => <div className="mb-3.5 flex flex-wrap items-center gap-2.5">{children}</div>;

export function TextButton({ children, onClick, className = '' }: { children: ReactNode; onClick: () => void; className?: string }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`rounded px-1 py-1.5 text-small font-medium text-primary hover:text-primary-strong active:text-primary-active focus-visible:outline-2 focus-visible:outline-primary ${className}`}
        >
            {children}
        </button>
    );
}

/** «Ver más» under a list cut at `shown` of `total`. */
export function MoreButton({ shown, total, onMore }: { shown: number; total: number; onMore: () => void }) {
    if (total <= shown) return null;
    return (
        <TextButton onClick={onMore} className="mt-2.5">
            Ver más ({total - shown} más)
        </TextButton>
    );
}

export const Empty = ({ children }: { children: ReactNode }) => <p className="py-2 text-ui text-ink-3">{children}</p>;

// El aviso se viste como el toast (src/ui/toaster.tsx): la tarjeta blanca de la app con borde gris fino, y la clase de aviso
// (error, advertencia, información o correcto) la dice solo el color del icono. Se diferencian en lo demás: el aviso vive en
// la página y se queda mientras sea cierto; el toast flota y se va solo. El icono del amarillo es marrón (warning-strong):
// amarillo sobre blanco no se ve. Se puede cerrar (la equis) para que no moleste; vuelve en cuanto se recarga la pantalla.
const NOTICE = {
    danger: { icono: 'text-danger', Icon: CircleAlert },
    warning: { icono: 'text-warning-strong', Icon: TriangleAlert },
    info: { icono: 'text-primary', Icon: Info },
    success: { icono: 'text-success', Icon: CircleCheck },
};
/**
 * `cerrable` (por defecto sí): la equis lo oculta. `onClose` avisa a la pantalla, por si quiere recordar que se cerró.
 * Un aviso que NO debe poder cerrarse (algo que bloquea el trabajo) pasa `cerrable={false}`.
 */
export function Notice({
    tone = 'danger',
    children,
    cerrable = true,
    onClose,
}: {
    tone?: keyof typeof NOTICE;
    children: ReactNode;
    cerrable?: boolean;
    onClose?: () => void;
}) {
    const [visible, setVisible] = useState(true);
    if (!visible) return null;
    const { icono, Icon } = NOTICE[tone];
    return (
        <div
            role={tone === 'danger' ? 'alert' : 'status'}
            className="mb-4 flex w-fit max-w-full items-start gap-3 rounded-card border border-line bg-surface px-4 py-3 text-ui text-ink"
        >
            <Icon size={18} aria-hidden className={`mt-px flex-none ${icono}`} />
            <div className="min-w-0">{children}</div>
            {cerrable && (
                <button
                    type="button"
                    onClick={() => {
                        setVisible(false);
                        onClose?.();
                    }}
                    aria-label="Cerrar el aviso"
                    className="-my-1 -mr-2 ml-1 flex-none cursor-pointer rounded-inner p-1 text-ink-3 hover:bg-surface-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-primary"
                >
                    <X size={16} />
                </button>
            )}
        </div>
    );
}

/** The title of a section that does not use the SUNAT filters. */
export function SectionTitle({ title }: { title: string }) {
    // pr-12: the top right corner belongs to the user's photo (UserMenu, in the layout).
    return <h1 className="mb-4 pr-12 text-title font-semibold">{title}</h1>;
}
