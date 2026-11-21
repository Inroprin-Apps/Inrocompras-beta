import { Code, DoDont, Page, PageHeader, Rules, Section } from '../../../../guia/doc.tsx';
import { Example } from '../../../../guia/example.tsx';
import { Card, CARD, Kpi, KpiNote } from '../../../../ui/card.tsx';

export const metadata = { title: 'Tarjetas y KPI' };

export default function Tarjetas() {
    return (
        <Page href="/componentes/tarjetas">
            <PageHeader
                eyebrow="Componentes"
                title="Tarjetas y KPI"
                lead={
                    <>
                        Una sola tarjeta: <Code>CARD</Code> en <Code>ui/card.tsx</Code>. Blanca, un borde gris fino, sin sombra, esquinas de 12 px. Toda caja la
                        toma de ahí, así el aspecto cambia en un solo sitio.
                    </>
                }
            />

            <Section title="Tarjeta">
                <Example
                    code={`<Card title="Ventas por cliente" note="noviembre 2026">
    …contenido…
</Card>

// Una caja escrita a mano lleva la misma constante:
<div className={\`\${CARD} p-4\`}>…</div>`}
                >
                    <div className="grid gap-3 sm:grid-cols-2">
                        <Card title="Ventas por cliente" note="noviembre 2026">
                            <p className="text-ui text-ink-2">El cuerpo de la tarjeta: una tabla, unas barras o un texto.</p>
                        </Card>
                        <div className={`${CARD} p-4`}>
                            <p className="text-ui font-medium">Caja a mano con CARD</p>
                            <p className="text-small text-ink-2">Mismo borde, radio y fondo.</p>
                        </div>
                    </div>
                </Example>
            </Section>

            <Section
                title="KPI"
                blurb="Etiqueta arriba, una pastilla de estado opcional a la derecha, la cifra grande con su unidad y una nota abajo; con href, la tarjeta es un enlace y lleva la flecha ↗. Con el valor aún viajando (value={null}), el hueco ocupa su sitio exacto. Cuando hay algo mal, la etiqueta pasa a rojo (risk) y la pastilla lo dice: la tarjeta y la cifra se quedan como todas."
            >
                <Example
                    code={`<Kpi label="Ventas del mes" value={money(1234567.89)}>
    <KpiNote>132 comprobantes</KpiNote>
</Kpi>
<Kpi label="Sin OC" value="27" unit="facturas" risk
     tag={{ text: 'Riesgo', tone: 'danger' }} href="/sin-oc">
    <KpiNote>S/ 48,210.00 por sustentar</KpiNote>
</Kpi>
<Kpi label="Compras del mes" value={null} />  {/* cargando */}`}
                >
                    <div className="grid gap-3 sm:grid-cols-3">
                        <Kpi label="Ventas del mes" value="S/ 1,234,567.89">
                            <KpiNote>132 comprobantes</KpiNote>
                        </Kpi>
                        <Kpi label="Sin OC" value="27" unit="facturas" risk tag={{ text: 'Riesgo', tone: 'danger' }} href="#">
                            <KpiNote>S/ 48,210.00 por sustentar</KpiNote>
                        </Kpi>
                        <Kpi label="Compras del mes" value={null} />
                    </div>
                </Example>
            </Section>

            <Section title="Reglas">
                <Rules
                    items={[
                        ['De 2 a 4 KPI por fila, y solo los que se miran todos los días.', 'Si todo es KPI, nada destaca.'],
                        ['La etiqueta roja y la pastilla de riesgo solo cuando hay algo que corregir.', 'Una cifra que solo resta (notas de crédito) no es una alerta.'],
                        ['No se anidan tarjetas.', 'Dentro de una tarjeta se separa con border-line o surface-2.'],
                    ]}
                />
                <DoDont
                    good={
                        <div className="w-56">
                            <Kpi label="Sin OC" value="27" risk tag={{ text: 'Riesgo', tone: 'danger' }}>
                                <KpiNote>por sustentar</KpiNote>
                            </Kpi>
                        </div>
                    }
                    goodNote="La etiqueta y la pastilla avisan sin teñir la tarjeta entera."
                    bad={
                        <div className="w-56 rounded-card border-2 border-danger bg-gradient-to-br from-danger-soft to-surface px-[18px] pt-4 pb-3.5">
                            <div className="mb-2 text-caption font-medium tracking-[.06em] text-danger uppercase">Sin OC</div>
                            <div className="text-display font-semibold text-danger">27</div>
                            <div className="mt-1.5 text-small text-danger">por sustentar</div>
                        </div>
                    }
                    badNote="Borde, degradado y cifra en rojo: grita más que el dato, y junto a otros KPI desordena la fila."
                />
            </Section>
        </Page>
    );
}
