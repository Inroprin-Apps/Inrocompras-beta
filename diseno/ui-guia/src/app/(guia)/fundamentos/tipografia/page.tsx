import { Code, DocTable, DoDont, Page, PageHeader, Rules, Section } from '../../../../guia/doc.tsx';
import { CARD } from '../../../../ui/card.tsx';

export const metadata = { title: 'Tipografía' };

const SCALE = [
    { cls: 'text-display', px: '24', weight: 'font-semibold', role: 'Cifra de KPI', sample: 'S/ 1,234,567.89' },
    { cls: 'text-title', px: '21', weight: 'font-semibold', role: 'Título de pantalla', sample: 'Comprobantes recibidos' },
    { cls: 'text-subtitle', px: '17', weight: 'font-semibold', role: 'Título de bloque grande (página de guía, modal)', sample: 'Resumen del mes' },
    { cls: 'text-heading', px: '15', weight: 'font-semibold', role: 'Título de tarjeta', sample: 'Ventas por cliente' },
    { cls: 'text-body', px: '14', weight: '', role: 'Cuerpo de texto corrido (body)', sample: 'El robot descargó 132 comprobantes de SUNAT.' },
    { cls: 'text-ui', px: '13', weight: '', role: 'Tabla, control, botón, menú, aviso', sample: 'Proveedor Andino SAC · 20512345678' },
    { cls: 'text-small', px: '12', weight: '', role: 'Nota de tarjeta y KPI, chip, ayuda de campo', sample: '132 comprobantes · 4 por revisar' },
    {
        cls: 'text-caption',
        px: '11',
        weight: 'font-medium tracking-[.06em] uppercase',
        role: 'Cabecera de tabla, etiqueta de KPI (en mayúsculas), sub-línea',
        sample: 'Ventas del mes',
    },
];

export default function Tipografia() {
    return (
        <Page href="/fundamentos/tipografia">
            <PageHeader
                eyebrow="Fundamentos"
                title="Tipografía"
                lead={
                    <>
                        Montserrat en tres pesos (400, 500 y 600), cuerpo a 14 px, y una escala de <b>ocho pasos con nombre</b>. Los pasos ya traen su interlineado:{' '}
                        <Code>text-ui</Code> basta.
                    </>
                }
            />

            <Section title="La escala">
                <ul className={`flex flex-col divide-y divide-divider ${CARD}`}>
                    {SCALE.map((s) => (
                        <li key={s.cls} className="grid gap-1 px-4 py-3.5 sm:grid-cols-[9rem_1fr] sm:items-baseline sm:gap-4">
                            <div className="flex items-baseline gap-2">
                                <code className="text-small font-medium">{s.cls}</code>
                                <span className="text-caption text-ink-3">{s.px}px</span>
                            </div>
                            <div className="flex min-w-0 flex-col gap-0.5">
                                <span className={`truncate ${s.cls} ${s.weight}`}>{s.sample}</span>
                                <span className="text-small text-ink-3">{s.role}</span>
                            </div>
                        </li>
                    ))}
                </ul>
            </Section>

            <Section
                title="Desde INROCONTA"
                blurb="Diez tamaños en px, varios a medio punto de distancia, se pliegan en la escala. Al llevar un componente de INROCONTA a la guía se reemplaza la clase de la izquierda por la de la derecha."
            >
                <DocTable
                    head={['Antes (INROCONTA)', 'Ahora', 'Nota']}
                    rows={[
                        [<Code key="a">text-2xl</Code>, <Code key="b">text-display</Code>, 'igual (24 px)'],
                        [<Code key="a">text-[21px]</Code>, <Code key="b">text-title</Code>, 'igual'],
                        [<Code key="a">text-[17px]</Code>, <Code key="b">text-subtitle</Code>, 'igual'],
                        [<Code key="a">text-[15px]</Code>, <Code key="b">text-heading</Code>, 'igual'],
                        [<Code key="a">text-[14px]</Code>, <Code key="b">text-body</Code>, 'igual'],
                        [<Code key="a">text-[13.5px] · text-[13px]</Code>, <Code key="b">text-ui</Code>, 'tablas y controles bajan medio punto'],
                        [<Code key="a">text-[12.5px] · text-xs</Code>, <Code key="b">text-small</Code>, 'chips y segmentado bajan medio punto'],
                        [<Code key="a">text-[11.5px] · text-[11px]</Code>, <Code key="b">text-caption</Code>, 'la sub-línea de tabla baja medio punto'],
                    ]}
                />
            </Section>

            <Section title="Reglas">
                <Rules
                    items={[
                        ['Las cifras van con tabular-nums y alineadas a la derecha.', 'Así los miles y los decimales quedan uno sobre otro y se comparan de un vistazo.'],
                        ['Los pesos: 400 texto, 500 etiquetas, botones y chips, 600 títulos y cifras.', 'Montserrat es ancha y pesa mucho: nada de 700 ni 800.'],
                        ['Las mayúsculas solo en text-caption con tracking-[.06em].', 'Para cabeceras de tabla y etiquetas de KPI. Un título en mayúsculas se lee peor.'],
                        ['El texto corrido no pasa de unos 70 caracteres por línea (max-w-2xl).', 'Las líneas muy largas cansan.'],
                    ]}
                />
                <DoDont
                    good={
                        <div className="w-48 text-right text-ui tabular-nums">
                            <div>1,234.50</div>
                            <div>98,010.00</div>
                            <div>7.25</div>
                        </div>
                    }
                    goodNote="tabular-nums y a la derecha: las cifras se alinean."
                    bad={
                        <div className="w-48 text-ui">
                            <div>1,234.50</div>
                            <div>98,010.00</div>
                            <div>7.25</div>
                        </div>
                    }
                    badNote="A la izquierda y con dígitos proporcionales: no se puede comparar."
                />
            </Section>
        </Page>
    );
}
