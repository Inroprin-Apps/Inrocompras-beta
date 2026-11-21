import { Code, DocTable, Page, PageHeader, Rules, Section } from '../../../../guia/doc.tsx';
import { CARD } from '../../../../ui/card.tsx';

export const metadata = { title: 'Espaciado, radios y bordes' };

const RADII = [
    { cls: 'rounded-md', px: '6', role: 'Pista de barra, hueco de carga' },
    { cls: 'rounded-inner', px: '7', role: 'Dentro de un control: segmento, botón de la barra de código' },
    { cls: 'rounded-lg', px: '8', role: 'Fila clicable, botón de paginación' },
    { cls: 'rounded-control', px: '9', role: 'Control (input, select) y botón' },
    { cls: 'rounded-xl', px: '12', role: 'Aviso' },
    { cls: 'rounded-card', px: '12', role: 'Tarjeta, KPI, toast' },
    { cls: 'rounded-full', px: '∞', role: 'Chip, insignia, punto' },
];

const SPACE = [
    { n: '1.5', px: 6, use: 'Etiqueta → control, icono → texto' },
    { n: '2.5', px: 10, use: 'Entre controles de una barra de filtros, entre botones' },
    { n: '3', px: 12, use: 'Entre tarjetas de una rejilla' },
    { n: '4', px: 16, use: 'Padding de un ejemplo o aviso; entre bloques de un formulario' },
    { n: '5', px: 20, use: 'Padding vertical de una tarjeta' },
    { n: '6', px: 24, use: 'Entre secciones de una pantalla' },
    { n: '12', px: 48, use: 'Entre secciones de una página de documentación' },
];

export default function Forma() {
    return (
        <Page href="/fundamentos/forma">
            <PageHeader
                eyebrow="Fundamentos"
                title="Espaciado, radios y bordes"
                lead="Formas tranquilas: bordes grises finos, sin sombras en la página, esquinas moderadas. Lo que se mueve o flota es lo único que lleva sombra."
            />

            <Section
                title="Radios"
                blurb={
                    <>
                        De dentro hacia fuera: cuanto más grande la pieza, más redonda, y lo que va dentro de otra lleva menos radio que ella. Tres tienen
                        nombre propio (<Code>inner</Code>, <Code>control</Code>, <Code>card</Code>); el resto es la escala de Tailwind.
                    </>
                }
            >
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
                    {RADII.map((r) => (
                        <li key={r.cls} className="flex flex-col gap-2">
                            <span className={`h-14 border border-line bg-surface ${r.cls}`} aria-hidden="true" />
                            <code className="text-small font-medium">{r.cls}</code>
                            <span className="text-caption text-ink-3">{r.px}px</span>
                            <span className="text-small text-ink-2">{r.role}</span>
                        </li>
                    ))}
                </ul>
            </Section>

            <Section title="Espaciado" blurb="La escala de 4 px de Tailwind. Estos son los pasos que se repiten y para qué.">
                <ul className={`flex flex-col divide-y divide-divider ${CARD}`}>
                    {SPACE.map((s) => (
                        <li key={s.n} className="flex items-center gap-4 px-4 py-2.5">
                            <code className="w-16 text-small font-medium">gap-{s.n}</code>
                            <span className="w-12 text-caption text-ink-3">{s.px}px</span>
                            <span className="h-3 flex-none rounded-sm bg-primary" style={{ width: s.px }} aria-hidden="true" />
                            <span className="text-ui text-ink-2">{s.use}</span>
                        </li>
                    ))}
                </ul>
            </Section>

            <Section title="Bordes y sombras">
                <div className="grid gap-3 sm:grid-cols-3">
                    <div className={`${CARD} p-4`}>
                        <p className="text-ui font-medium">Tarjeta</p>
                        <p className="text-small text-ink-2">border-line, sin sombra</p>
                    </div>
                    <div className="rounded-card border border-line bg-surface p-4 shadow-card">
                        <p className="text-ui font-medium">Flotante</p>
                        <p className="text-small text-ink-2">shadow-card: toast, menú</p>
                    </div>
                    <div className="rounded-card border border-line bg-surface p-4 shadow-float">
                        <p className="text-ui font-medium">Modal</p>
                        <p className="text-small text-ink-2">shadow-float: lo que tapa la página</p>
                    </div>
                </div>
                <DocTable
                    head={['Clase', 'Dónde']}
                    rows={[
                        [<Code key="a">border-line</Code>, 'Borde de la tarjeta: es decoración'],
                        [
                            <Code key="a">border-divider</Code>,
                            'Divisor entre filas dentro de una tarjeta y cabecera de tabla: un paso más marcado que el borde',
                        ],
                        [
                            <Code key="a">border-control</Code>,
                            'Borde de input, select, botón secundario y segmentado en reposo: tiene que dar ≥3:1 (WCAG 1.4.11)',
                        ],
                        [<Code key="a">border-primary</Code>, 'Control con foco'],
                        [<Code key="a">border-danger</Code>, 'Campo con error'],
                    ]}
                />
            </Section>

            <Section title="Reglas">
                <Rules
                    items={[
                        [
                            'Una tarjeta = CARD (rounded-card border border-line bg-surface).',
                            'Se importa la constante, no se reescribe: así el aspecto cambia en un solo sitio.',
                        ],
                        ['No se anidan tarjetas.', 'Dentro de una tarjeta se separa con border-line o con surface-2, no con otra tarjeta.'],
                        ['Sin sombra en lo que está quieto en la página.', 'La sombra dice «esto está encima»; si todo la tiene, no dice nada.'],
                    ]}
                />
            </Section>
        </Page>
    );
}
