'use client';

// Una pieza de UI de /dev/colores (la lista y su estado: src/guia/componentes.ts). Va en el mismo orden que
// los colores: sobre la línea si está aprobada, bajo ella si no.
import { Chip } from '../../../ui/card.tsx';
import { CARD } from '../../../ui/card.tsx';
import { NOT_PORTED, type ComponentEntry, type Origin } from '../../../guia/componentes.ts';
import { EXAMPLES } from './examples.tsx';

const ORIGIN: Record<Origin, { label: string; tone: 'info' | 'ok' | 'muted' }> = {
    inroconta: { label: 'INROCONTA', tone: 'muted' },
    grama: { label: 'De GRAMA', tone: 'info' },
    nuevo: { label: 'Nuevo', tone: 'ok' },
};

export function Entry({ c }: { c: ComponentEntry }) {
    const Example = EXAMPLES[c.id];
    return (
        <section id={c.id} className={`flex scroll-mt-6 flex-col ${CARD}`}>
            <header className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-divider px-5 py-3">
                <h3 className="text-heading font-semibold">{c.title}</h3>
                <Chip tone="muted">Pieza</Chip>
                <Chip tone={ORIGIN[c.origin].tone}>{ORIGIN[c.origin].label}</Chip>
                <code className="text-small text-ink-2">{c.source}</code>
                <span className="ml-auto">{c.status === 'aprobado' ? <Chip tone="ok">Aprobado</Chip> : <Chip tone="warn">Por aprobar</Chip>}</span>
            </header>
            <p className="px-5 pt-3 text-small text-ink-2">{c.note}</p>
            <div className="p-5">{Example ? <Example /> : <p className="text-small text-ink-2">Sin ejemplo todavía.</p>}</div>
        </section>
    );
}

export function NotPorted() {
    return (
        <section className="flex flex-col gap-2 pt-4">
            <h2 className="text-subtitle font-semibold">Lo de GRAMA que no se portó</h2>
            <ul className={`flex flex-col divide-y divide-divider ${CARD}`}>
                {NOT_PORTED.map((n) => (
                    <li key={n.name} className="flex flex-col gap-0.5 px-5 py-3">
                        <code className="text-small font-medium">{n.name}</code>
                        <span className="text-small text-ink-2">{n.why}</span>
                    </li>
                ))}
            </ul>
        </section>
    );
}
