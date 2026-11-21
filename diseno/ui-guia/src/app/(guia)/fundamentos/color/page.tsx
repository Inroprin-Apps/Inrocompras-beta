import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { Code, DoDont, Page, PageHeader, Section } from '../../../../guia/doc.tsx';
import { SwatchGrid } from '../../../../guia/swatch.tsx';
import { parseColorTokens } from '../../../../guia/tokens.ts';
import { CARD, Chip } from '../../../../ui/card.tsx';

export const metadata = { title: 'Color' };

const STATUS = [
    {
        role: 'danger',
        use: 'Error, riesgo, falta algo, se borra',
        soft: 'bg-danger-soft',
        solid: 'bg-danger',
        strong: 'bg-danger-strong',
        text: 'text-danger-strong',
    },
    {
        role: 'warning',
        use: 'Aviso, pendiente, por revisar',
        soft: 'bg-warning-soft',
        solid: 'bg-warning',
        strong: 'bg-warning-strong',
        text: 'text-warning-strong',
    },
    {
        role: 'success',
        use: 'Correcto, cuadrado, pagado',
        soft: 'bg-success-soft',
        solid: 'bg-success',
        strong: 'bg-success-strong',
        text: 'text-success-strong',
    },
    {
        role: 'info (primary)',
        use: 'Informativo, elegido',
        soft: 'bg-primary-soft',
        solid: 'bg-primary',
        strong: 'bg-primary-strong',
        text: 'text-primary-strong',
    },
];

export default async function Color() {
    // Los grupos y tokens salen de globals.css (sus anotaciones @grupo): no hay otra lista que mantener.
    const groups = parseColorTokens(await readFile(path.join(process.cwd(), 'src/app/globals.css'), 'utf8'));
    return (
        <Page href="/fundamentos/color">
            <PageHeader
                eyebrow="Fundamentos"
                title="Color"
                lead={
                    <>
                        Todo color se pide por su <b>rol</b> (para qué sirve), no por su valor. Los grupos y las muestras salen de <Code>globals.css</Code>: lo
                        que ves ES el token.
                    </>
                }
            />

            {groups.map((g) => (
                <Section
                    key={g.id}
                    title={g.title}
                    blurb={
                        <span className="flex flex-wrap items-center gap-2">
                            {g.status === 'aprobado' ? <Chip tone="ok">Aprobado</Chip> : <Chip tone="warn">Por aprobar</Chip>}
                            {g.note}
                        </span>
                    }
                >
                    <SwatchGrid
                        items={g.tokens.map((t) => ({
                            token: t.name,
                            role: t.use,
                            where: t.alias ? `= ${t.alias}` : t.mix ? 'mezcla' : undefined,
                        }))}
                    />
                </Section>
            ))}

            <Section
                title="Estado"
                blurb="Tres roles con las mismas tres piezas: sólido (barra, punto, insignia), fuerte (texto, y texto sobre el suave) y suave (chip, aviso). No hay «info» propio: lo informativo es el primario suave."
            >
                <ul className={`flex flex-col divide-y divide-divider ${CARD}`}>
                    {STATUS.map((s) => (
                        <li key={s.role} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
                            <span className="flex shrink-0 overflow-hidden rounded border border-line" aria-hidden="true">
                                <span className={`h-6 w-8 ${s.soft}`} />
                                <span className={`h-6 w-8 ${s.solid}`} />
                                <span className={`h-6 w-8 ${s.strong}`} />
                            </span>
                            <code className="w-28 text-small text-ink-2">{s.role}</code>
                            <span className="flex-1 text-ui">{s.use}</span>
                            <span className={`rounded-full px-2.5 py-1 text-small font-medium ${s.soft} ${s.text}`}>suave + fuerte</span>
                        </li>
                    ))}
                </ul>
            </Section>

            <Section title="Bien y mal">
                <DoDont
                    good={<Chip tone="danger">3 sin OC</Chip>}
                    goodNote="Fondo suave con su texto fuerte: legible y con el rol de un vistazo."
                    bad={<span className="rounded-full bg-[#e30613] px-2.5 py-1 text-small font-medium text-white">3 sin OC</span>}
                    badNote="Rojo de marca sólido con text-white y un hex suelto: grita, y no cambia si cambia la marca."
                />
                <DoDont
                    good={<p className="text-ui text-ink-2">Actualizado a las 07:00</p>}
                    goodNote="Texto secundario con ink-2: un gris sólido."
                    bad={<p className="text-ui text-ink/50">Actualizado a las 07:00</p>}
                    badNote="Tinta con alfa (text-ink/50): sobre un fondo gris se lee distinto."
                />
            </Section>
        </Page>
    );
}
