// Las piezas con que se escribe cada página de la guía: cabecera, sección, regla, sí/no.
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Check, X } from 'lucide-react';
import { CARD } from '../ui/card.tsx';
import { FLAT } from './nav.ts';

export function PageHeader({ eyebrow, title, lead }: { eyebrow?: string; title: string; lead: ReactNode }) {
    return (
        <header className="flex flex-col gap-2 border-b border-divider pb-6">
            {eyebrow && <p className="text-caption font-medium tracking-[.06em] text-primary uppercase">{eyebrow}</p>}
            <h1 className="text-title font-semibold tracking-tight">{title}</h1>
            <div className="max-w-2xl text-body text-ink-2">{lead}</div>
        </header>
    );
}

const slug = (t: string) =>
    t
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

export function Section({ title, blurb, children }: { title: string; blurb?: ReactNode; children: ReactNode }) {
    const id = slug(title);
    return (
        <section id={id} className="flex scroll-mt-20 flex-col gap-4">
            <div className="flex flex-col gap-1">
                <h2 className="group text-subtitle font-semibold">
                    {title}
                    <a
                        href={`#${id}`}
                        className="ml-2 text-ink-3 no-underline opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                        aria-label={`Enlace a ${title}`}
                    >
                        #
                    </a>
                </h2>
                {blurb && <div className="max-w-2xl text-ui text-ink-2">{blurb}</div>}
            </div>
            {children}
        </section>
    );
}

/** Una lista de reglas cortas, cada una con su porqué. */
export function Rules({ items }: { items: [rule: ReactNode, why?: ReactNode][] }) {
    return (
        <ul className={`flex flex-col divide-y divide-divider ${CARD}`}>
            {items.map(([rule, why], i) => (
                <li key={i} className="flex gap-3 px-4 py-3">
                    <span className="mt-0.5 flex size-5 flex-none items-center justify-center rounded-full bg-primary-soft text-caption font-semibold text-primary-strong">
                        {i + 1}
                    </span>
                    <div className="flex flex-col gap-0.5">
                        <p className="text-ui font-medium">{rule}</p>
                        {why && <p className="text-small text-ink-2">{why}</p>}
                    </div>
                </li>
            ))}
        </ul>
    );
}

/** Sí / No lado a lado: el ejemplo bueno y el que se evita, cada uno con su razón. */
export function DoDont({ good, bad, goodNote, badNote }: { good: ReactNode; bad: ReactNode; goodNote: ReactNode; badNote: ReactNode }) {
    return (
        <div className="grid gap-3 md:grid-cols-2">
            {[
                { ok: true, body: good, note: goodNote },
                { ok: false, body: bad, note: badNote },
            ].map(({ ok, body, note }) => (
                <figure key={String(ok)} className={`flex flex-col overflow-hidden ${CARD}`}>
                    <div className="flex min-h-28 flex-1 items-center justify-center bg-surface-2 p-5">{body}</div>
                    <figcaption className={`flex gap-2 border-t-2 px-4 py-3 text-small ${ok ? 'border-success' : 'border-danger'}`}>
                        <span className={`mt-px flex-none ${ok ? 'text-success-strong' : 'text-danger-strong'}`}>
                            {ok ? <Check size={16} /> : <X size={16} />}
                        </span>
                        <span>
                            <b className={ok ? 'text-success-strong' : 'text-danger-strong'}>{ok ? 'Sí. ' : 'No. '}</b>
                            <span className="text-ink-2">{note}</span>
                        </span>
                    </figcaption>
                </figure>
            ))}
        </div>
    );
}

/** Una tabla sencilla de la guía (props, tokens, equivalencias). */
export function DocTable({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
    return (
        <div className={`overflow-x-auto ${CARD}`}>
            <table className="w-full min-w-[32rem] text-ui">
                <thead>
                    <tr className="border-b border-divider text-left">
                        {head.map((h) => (
                            <th key={h} className="px-4 py-2.5 text-caption font-medium tracking-[.05em] text-ink-3 uppercase">
                                {h}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-divider">
                    {rows.map((r, i) => (
                        <tr key={i}>
                            {r.map((c, j) => (
                                <td key={j} className="px-4 py-2.5 align-top">
                                    {c}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export const Code = ({ children }: { children: ReactNode }) => (
    <code className="rounded-[5px] bg-surface-3 px-1.5 py-0.5 text-[0.9em] text-ink select-all">{children}</code>
);

/** «Anterior / Siguiente» al pie de cada página, en el orden del menú. */
export function PageNav({ href }: { href: string }) {
    const i = FLAT.findIndex((x) => x.href === href);
    const prev = FLAT[i - 1];
    const next = FLAT[i + 1];
    return (
        <nav className="mt-6 grid gap-3 border-t border-divider pt-6 sm:grid-cols-2">
            {prev ? (
                <Link href={prev.href} className={`${CARD} px-4 py-3 no-underline hover:border-primary-line hover:bg-surface-2`}>
                    <span className="block text-small text-ink-3">← Anterior</span>
                    <span className="text-ui font-medium text-ink">{prev.label}</span>
                </Link>
            ) : (
                <span />
            )}
            {next && (
                <Link href={next.href} className={`${CARD} px-4 py-3 text-right no-underline hover:border-primary-line hover:bg-surface-2`}>
                    <span className="block text-small text-ink-3">Siguiente →</span>
                    <span className="text-ui font-medium text-ink">{next.label}</span>
                </Link>
            )}
        </nav>
    );
}

/** El marco de cada página: cabecera, contenido y navegación al pie. */
export function Page({ href, children }: { href: string; children: ReactNode }) {
    return (
        <article className="flex flex-col gap-12">
            {children}
            <PageNav href={href} />
        </article>
    );
}
