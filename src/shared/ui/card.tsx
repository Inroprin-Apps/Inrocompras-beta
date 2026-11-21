// The basic pieces every page uses: card, KPI, chip and the segmented switch.
import type { ReactNode } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { Hueco } from './hueco.tsx';

/**
 * The one card of the app (his decision, 21/10/2026): the segmented switch's look — white, a single
 * thin control-grey border, no shadow, moderate corners. Every boxed surface takes it from here
 * (Card, Kpi, and any box written by hand: `className={CARD}`), so the look changes in one place.
 */
export const CARD = 'rounded-card border border-line bg-surface';

export function Card({ title, note, children, className = '' }: { title?: ReactNode; note?: ReactNode; children: ReactNode; className?: string }) {
    return (
        <section className={`min-w-0 ${CARD} px-[22px] py-5 ${className}`}>
            {(title || note) && (
                <div className="mb-3.5 flex flex-wrap items-baseline justify-between gap-2.5">
                    {title && <h2 className="text-heading font-semibold">{title}</h2>}
                    {note && <span className="text-small text-ink-3">{note}</span>}
                </div>
            )}
            {children}
        </section>
    );
}

/**
 * La tarjeta de un indicador (KPI): la etiqueta arriba a la izquierda, una pastilla de estado opcional arriba a la
 * derecha, la cifra grande, y abajo una nota y, si lleva a un detalle, una flecha ↗.
 *
 * `value` null = todavía viaja: la tarjeta, la etiqueta y el tamaño se dibujan y la cifra es un hueco.
 * `unit`: lo que acompaña a la cifra («días», «SPI»), más chico y en gris, para que la cifra mande.
 * `tag`: la pastilla de estado («Al día», «-2 días», «Riesgo»); lleva el tono de siempre (ok, warn, danger, info, muted).
 * `risk`: algo está mal (por corregir, faltante, viejo). La etiqueta pasa a rojo; la tarjeta y la cifra se quedan como todas.
 * No es para una cifra que solo resta, como las notas de crédito: eso no es una alerta.
 * `href`: la tarjeta entera es un enlace al detalle, con la flecha ↗ abajo a la derecha.
 */
export function Kpi({
    label,
    value,
    children,
    risk = false,
    tag,
    unit,
    href,
}: {
    label: string;
    value: ReactNode | null;
    children?: ReactNode;
    risk?: boolean;
    tag?: { text: ReactNode; tone: keyof typeof CHIP };
    unit?: ReactNode;
    href?: string;
}) {
    const cuerpo = (
        <>
            <div className="flex min-h-7 items-start justify-between gap-2">
                <span className={`pt-0.5 text-small font-medium ${risk ? 'text-danger-strong' : 'text-ink-2'}`}>{label}</span>
                {tag && <Chip tone={tag.tone}>{tag.text}</Chip>}
            </div>
            <div className="mt-2 truncate text-display leading-tight font-semibold">
                {value === null ? (
                    <Hueco className="h-[26px] w-36" />
                ) : (
                    <>
                        {value}
                        {unit && <span className="ml-1.5 text-subtitle font-medium text-ink-2">{unit}</span>}
                    </>
                )}
            </div>
            <div className="mt-3 flex items-end justify-between gap-2">
                <div className="min-w-0">{value === null ? <Hueco className="h-3.5 w-28" /> : children}</div>
                {href && <ArrowUpRight size={16} aria-hidden className="flex-none text-ink-3" />}
            </div>
        </>
    );
    const clase = `block min-w-0 ${CARD} px-[18px] pt-4 pb-4`;
    return href ? (
        <a
            href={href}
            className={`${clase} text-ink no-underline transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary`}
        >
            {cuerpo}
        </a>
    ) : (
        <div className={clase}>{cuerpo}</div>
    );
}

export const KpiNote = ({ children }: { children: ReactNode }) => <div className="text-small text-ink-2">{children}</div>;

const CHIP = {
    ok: 'bg-success-soft text-success-strong',
    warn: 'bg-warning-soft text-warning-strong',
    danger: 'bg-danger-soft text-danger-strong',
    info: 'bg-primary-soft text-primary-strong',
    muted: 'bg-surface-3 text-ink-2',
};
export function Chip({ tone, children, title }: { tone: keyof typeof CHIP; children: ReactNode; title?: string }) {
    return (
        <span title={title} className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-small font-medium whitespace-nowrap ${CHIP[tone]}`}>
            {children}
        </span>
    );
}

export function Segmented<T extends string>({
    options,
    value,
    onChange,
}: {
    options: { value: T; label: string; title?: string }[];
    value: T;
    onChange: (v: T) => void;
}) {
    return (
        <div className="inline-flex rounded-control border border-control bg-surface p-[3px]">
            {options.map((o) => (
                <button
                    key={o.value}
                    type="button"
                    title={o.title}
                    onClick={() => onChange(o.value)}
                    className={`rounded-inner px-3 py-1.5 text-small font-medium whitespace-nowrap ${o.value === value ? 'bg-primary text-on-fill' : 'text-ink-2 hover:bg-surface-2 hover:text-ink active:bg-surface-3'} focus-visible:outline-2 focus-visible:outline-primary`}
                >
                    {o.label}
                </button>
            ))}
        </div>
    );
}
