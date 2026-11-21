import { Download, Plus, Trash2 } from 'lucide-react';
import { Code, DocTable, DoDont, Page, PageHeader, Rules, Section } from '../../../../guia/doc.tsx';
import { Example } from '../../../../guia/example.tsx';
import { Button, BUTTON_SIZES, BUTTON_VARIANTS, buttonClass, LINK_CLASS } from '../../../../ui/button.tsx';
import { CARD } from '../../../../ui/card.tsx';

export const metadata = { title: 'Botones y enlaces' };

// Los cinco estados pintados a mano, uno al lado del otro: un hover o un pulsado no se pueden
// fotografiar, y sin verlos juntos no hay forma de juzgar si el paso se lee.
const ring = 'outline-2 outline-offset-2 outline-primary';
const grey = 'bg-disabled text-disabled-ink';
const STATES: { variant: string; states: string[] }[] = [
    { variant: 'primary', states: ['bg-primary text-on-fill', 'bg-primary-hover text-on-fill', 'bg-primary-active text-on-fill', `bg-primary text-on-fill ${ring}`, grey] },
    {
        variant: 'secondary',
        states: [
            'border border-control bg-surface text-ink',
            'border border-control bg-surface-2 text-ink',
            'border border-control bg-surface-3 text-ink',
            `border border-control bg-surface text-ink ${ring}`,
            `border border-disabled ${grey}`,
        ],
    },
    { variant: 'ghost', states: ['text-ink-2', 'bg-surface-2 text-ink', 'bg-surface-3 text-ink', `text-ink-2 ${ring}`, 'text-disabled-ink'] },
    { variant: 'danger', states: ['bg-danger text-on-fill', 'bg-danger-hover text-on-fill', 'bg-danger-active text-on-fill', `bg-danger text-on-fill ${ring}`, grey] },
];
const HEADS = ['normal', 'encima', 'pulsado', 'foco (Tab)', 'deshabilitado'];

export default function Botones() {
    return (
        <Page href="/componentes/botones">
            <PageHeader
                eyebrow="Componentes"
                title="Botones y enlaces"
                lead={
                    <>
                        Un solo juego de clases en <Code>ui/button.tsx</Code>: <Code>Button</Code> para un botón y <Code>buttonClass()</Code> para que un{' '}
                        <Code>&lt;a&gt;</Code> o un <Code>Link</Code> se vistan igual. Dos ejes: la variante (su rol) y el tamaño.
                    </>
                }
            />

            <Section title="Variantes y tamaños" blurb="Los de verdad: pasa el mouse, mantén el clic y llega con Tab.">
                <Example
                    code={`import { Button } from '@/shared/ui/button.tsx';

<Button>Guardar</Button>
<Button variant="secondary">Cancelar</Button>
<Button variant="ghost">Ver detalle</Button>
<Button variant="danger">Eliminar</Button>
<Button size="lg">Entrar con Google</Button>
<Button disabled>Guardando…</Button>`}
                >
                    <div className="flex flex-col gap-3">
                        {BUTTON_SIZES.map((size) => (
                            <div key={size} className="flex flex-wrap items-center gap-2.5">
                                <code className="w-8 shrink-0 text-small text-ink-3">{size}</code>
                                {BUTTON_VARIANTS.map((v) => (
                                    <Button key={v} variant={v} size={size}>
                                        {v}
                                    </Button>
                                ))}
                                <Button size={size} disabled>
                                    deshabilitado
                                </Button>
                            </div>
                        ))}
                    </div>
                </Example>
                <DocTable
                    head={['Variante', 'Cuándo']}
                    rows={[
                        [<Code key="a">primary</Code>, 'La acción principal de la pantalla. Una sola por pantalla.'],
                        [<Code key="a">secondary</Code>, 'La alternativa razonable: cancelar, volver, exportar, una acción junto a la principal.'],
                        [<Code key="a">ghost</Code>, 'Acciones de fila o de barra: solo un fondo bajo el cursor.'],
                        [<Code key="a">danger</Code>, 'Algo que borra o no se puede deshacer.'],
                    ]}
                />
            </Section>

            <Section
                title="Los cinco estados"
                blurb="La misma regla para todas las variantes: encima un peldaño más oscuro, pulsado el más oscuro (tokens -hover / -active con color-mix), foco con anillo afuera sin tocar el fondo, deshabilitado gris. Pintados a mano para compararlos."
            >
                <div className={`overflow-x-auto ${CARD}`}>
                    <table className="w-full min-w-[40rem] text-ui">
                        <thead>
                            <tr className="border-b border-divider text-left text-small text-ink-3">
                                <th className="px-3 py-2 font-medium">variante</th>
                                {HEADS.map((h) => (
                                    <th key={h} className="px-3 py-2 font-medium">
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-divider">
                            {STATES.map((r) => (
                                <tr key={r.variant}>
                                    <td className="px-3 py-2">
                                        <code className="text-small text-ink-2">{r.variant}</code>
                                    </td>
                                    {r.states.map((cls, i) => (
                                        <td key={i} className="px-3 py-3">
                                            <span className={`inline-flex items-center rounded-control px-3.5 py-2 font-medium ${cls}`}>Texto</span>
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Section>

            <Section title="Con icono">
                <Example
                    code={`<Button><Plus size={16} /> Nueva orden</Button>
<Button variant="secondary"><Download size={16} /> Exportar Excel</Button>
<Button variant="ghost" className="px-2" aria-label="Eliminar" title="Eliminar"><Trash2 size={16} /></Button>`}
                >
                    <div className="flex flex-wrap items-center gap-2.5">
                        <Button>
                            <Plus size={16} /> Nueva orden
                        </Button>
                        <Button variant="secondary">
                            <Download size={16} /> Exportar Excel
                        </Button>
                        <Button variant="ghost" className="px-2" aria-label="Eliminar" title="Eliminar">
                            <Trash2 size={16} />
                        </Button>
                    </div>
                </Example>
            </Section>

            <Section title="Enlaces" blurb="Dentro de un texto o una tabla, el enlace es azul y se subraya bajo el cursor. Si sale de la app, lo dice con ↗.">
                <Example
                    code={`import { LINK_CLASS, buttonClass } from '@/shared/ui/button.tsx';

<a href={driveFile(id)} target="_blank" rel="noreferrer" className={LINK_CLASS}>F001-00012345 ↗</a>
<Link href="/compras/nueva" className={buttonClass('primary')}>Nueva compra</Link>`}
                >
                    <div className="flex flex-wrap items-center gap-5">
                        <a href="#" className={LINK_CLASS}>
                            F001-00012345 ↗
                        </a>
                        <a href="#" className={buttonClass('primary')}>
                            Un enlace vestido de botón
                        </a>
                    </div>
                </Example>
            </Section>

            <Section title="Reglas">
                <Rules
                    items={[
                        ['El texto del botón es un verbo con su objeto: «Guardar orden», «Exportar Excel».', 'Nunca «OK», «Aceptar» o «Sí» sueltos: el usuario tiene que saber qué va a pasar sin leer el resto.'],
                        ['Mientras la acción viaja, el botón se deshabilita y dice qué hace: «Guardando…».', 'Así nadie hace doble clic y se crean dos registros.'],
                        ['La acción principal va a la derecha; la de cancelar, a su izquierda.', 'En formularios y diálogos, en todas las apps.'],
                        ['Si navega, es un enlace (<a>, Link); si hace algo, es un <button>.', 'Un botón que navega no se puede abrir en otra pestaña.'],
                    ]}
                />
                <DoDont
                    good={
                        <div className="flex gap-2.5">
                            <Button variant="secondary">Cancelar</Button>
                            <Button>Guardar orden</Button>
                        </div>
                    }
                    goodNote="Una principal azul, la alternativa en secundario, y el verbo dice qué pasa."
                    bad={
                        <div className="flex gap-2.5">
                            <Button>Cancelar</Button>
                            <Button>OK</Button>
                        </div>
                    }
                    badNote="Dos azules: ninguno es el principal. «OK» no dice qué se acepta."
                />
            </Section>
        </Page>
    );
}
