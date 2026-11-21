import Link from 'next/link';
import { ArrowRight, Blocks, LayoutTemplate, MessageSquareText, Palette } from 'lucide-react';
import { Page, PageHeader, Section } from '../../../guia/doc.tsx';
import { CARD } from '../../../ui/card.tsx';
import { Chip } from '../../../ui/card.tsx';

const PARTS = [
    {
        icon: Palette,
        title: 'Fundamentos',
        text: 'Color por rol, escala tipográfica, radios, espaciado e iconos. Los tokens de globals.css.',
        href: '/fundamentos/color',
    },
    {
        icon: Blocks,
        title: 'Componentes',
        text: 'Botones, campos, filtros, tarjetas, KPI, chips, avisos, tablas y gráficos, vivos y con su código.',
        href: '/componentes/botones',
    },
    {
        icon: LayoutTemplate,
        title: 'Patrones',
        text: 'Pantallas completas: listado con filtros, tablero con KPI, formulario y los estados vacío, carga y error.',
        href: '/patrones/listado',
    },
    {
        icon: MessageSquareText,
        title: 'Experiencia',
        text: 'Cómo se escriben botones, avisos y errores; montos y fechas; teclado y accesibilidad.',
        href: '/ux/redaccion',
    },
];

export default function Home() {
    return (
        <Page href="/introduccion">
            <PageHeader
                eyebrow="Guía UI/UX · v0.1"
                title="Una sola forma de hacer las apps de INROPRIN"
                lead={
                    <>
                        Esta guía junta lo que las apps de la empresa pintan y cómo se comportan, para que INROCONTA y las que vengan se vean y se usen igual.
                        Cada pieza está viva: pasa el mouse, haz clic, llega con Tab y copia su código.
                    </>
                }
            />

            <Section title="Qué hay aquí">
                <div className="grid gap-3 sm:grid-cols-2">
                    {PARTS.map(({ icon: Icon, title, text, href }) => (
                        <Link
                            key={href}
                            href={href}
                            className={`group flex flex-col gap-2 ${CARD} p-5 no-underline transition-colors hover:border-primary-line hover:bg-surface-2`}
                        >
                            <span className="flex size-9 items-center justify-center rounded-control bg-primary-soft text-primary">
                                <Icon size={18} />
                            </span>
                            <span className="text-heading font-semibold text-ink">{title}</span>
                            <span className="text-ui text-ink-2">{text}</span>
                            <span className="mt-1 inline-flex items-center gap-1 text-small font-medium text-primary">
                                Ver <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
                            </span>
                        </Link>
                    ))}
                </div>
            </Section>

            <Section
                title="De dónde sale"
                blurb={
                    <>
                        Del trabajo hecho en INROCONTA (su página <code>/dev/colores</code>): los tokens por rol, los cinco estados de botón y los componentes
                        de <code>shared/ui</code>. Aquí se ordena lo que allí quedó como lista de trabajo (la tipografía y los radios ahora tienen nombre) y se
                        agregan los ejemplos y las reglas de uso.
                    </>
                }
            >
                <div className={`flex flex-col gap-3 ${CARD} p-5`}>
                    <div className="flex flex-wrap gap-2">
                        <Chip tone="ok">Next.js 16</Chip>
                        <Chip tone="ok">React 19</Chip>
                        <Chip tone="ok">TypeScript</Chip>
                        <Chip tone="ok">Tailwind 4</Chip>
                        <Chip tone="info">Montserrat</Chip>
                        <Chip tone="info">lucide-react</Chip>
                        <Chip tone="info">sonner</Chip>
                    </div>
                    <p className="text-ui text-ink-2">
                        El código de cada componente está en <code>src/ui/</code> y los tokens en <code>src/app/globals.css</code>. Eso es lo que se copia a una
                        app; <code>src/guia/</code> y <code>src/app/</code> son solo la guía.{' '}
                        <Link href="/uso" className="font-medium">
                            Cómo usarla en una app →
                        </Link>
                    </p>
                </div>
            </Section>

            <Section title="Estado de cada parte" blurb="Lo marcado «propuesta» todavía no está en INROCONTA: se decide aquí y luego se lleva.">
                <ul className={`flex flex-col divide-y divide-divider ${CARD}`}>
                    {(
                        [
                            ['Color por rol', 'ok', 'Igual que INROCONTA'],
                            ['Botones, controles, tarjetas, KPI, chips, avisos, toasts', 'ok', 'Igual que INROCONTA'],
                            ['Escala tipográfica con nombre (8 pasos)', 'info', 'Propuesta: reemplaza los 10 tamaños en px'],
                            ['Radios con nombre (inner, control, card)', 'info', 'Propuesta'],
                            ['Campos de formulario (Field, Input, Checkbox)', 'info', 'Propuesta: nuevo'],
                            ['Modo oscuro', 'muted', 'Pendiente'],
                            ['Paquete compartido entre apps', 'muted', 'Pendiente'],
                        ] as const
                    ).map(([what, tone, note]) => (
                        <li key={what} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
                            <span className="text-ui">{what}</span>
                            <Chip tone={tone}>{note}</Chip>
                        </li>
                    ))}
                </ul>
            </Section>
        </Page>
    );
}
