'use client';

import { useState } from 'react';
import { Code, Page, PageHeader, Rules, Section } from '../../../../guia/doc.tsx';
import { Example } from '../../../../guia/example.tsx';
import { BarRow, Ring, type BarColor } from '../../../../ui/bits.tsx';
import { Card } from '../../../../ui/card.tsx';
import { money, pct } from '../../../../ui/format.ts';

const CLIENTS = [
    { name: 'Cliente Norte SAC', total: 412300.5 },
    { name: 'Corporación Sur SA', total: 287940 },
    { name: 'Comercial Este EIRL', total: 154210.75 },
    { name: 'Industrias Oeste SAC', total: 98400 },
    { name: 'Otros (23)', total: 61230.2 },
];
const BARS: BarColor[] = ['primary', 'teal', 'success', 'warning', 'danger', 'muted'];

export default function Graficos() {
    const [chosen, setChosen] = useState(0);
    const max = CLIENTS[0].total;
    const sum = CLIENTS.reduce((a, c) => a + c.total, 0);

    return (
        <Page href="/componentes/graficos">
            <PageHeader
                eyebrow="Componentes"
                title="Barras y anillos"
                lead={
                    <>
                        Para la mayoría de los tableros bastan dos gráficos sencillos: la fila con barra (<Code>BarRow</Code>) para comparar y el anillo (
                        <Code>Ring</Code>) para un porcentaje. Para series en el tiempo se usa ECharts con estos mismos colores.
                    </>
                }
            />

            <Section title="Filas con barra" blurb="Haz clic en una fila: la elegida lleva fondo azul suave (sirve para filtrar el resto de la pantalla).">
                <Example
                    code={`<Card title="Ventas por cliente" note="noviembre 2026">
    {clients.map((c, i) => (
        <BarRow
            key={c.name}
            label={c.name}
            figures={\`\${money(c.total)} · \${pct(c.total, sum)}%\`}
            pct={pct(c.total, max)}
            chosen={chosen === i}
            onClick={() => setChosen(i)}
        />
    ))}
</Card>`}
                >
                    <Card title="Ventas por cliente" note="noviembre 2026">
                        {CLIENTS.map((c, i) => (
                            <BarRow
                                key={c.name}
                                label={c.name}
                                figures={`${money(c.total)} · ${pct(c.total, sum)}%`}
                                pct={pct(c.total, max)}
                                chosen={chosen === i}
                                onClick={() => setChosen(i)}
                            />
                        ))}
                    </Card>
                </Example>
            </Section>

            <Section
                title="Colores de barra"
                blurb="Siempre un rol: primary la serie principal, teal la segunda, y los de estado solo si la barra habla de un estado."
            >
                <Example code={`<BarRow label="Pagado" figures="72%" pct={72} color="success" />`}>
                    <div className="max-w-md">
                        {BARS.map((c, i) => (
                            <BarRow key={c} label={c} figures={`${(i + 1) * 15}%`} pct={(i + 1) * 15} color={c} />
                        ))}
                    </div>
                </Example>
            </Section>

            <Section title="Anillos">
                <Example
                    code={`<Ring pct={86} color="success">
    <b className="text-ink">Con OC</b><br />612 de 712 facturas
</Ring>`}
                >
                    <div className="grid gap-4 sm:grid-cols-3">
                        <Ring pct={86} color="success">
                            <b className="text-ui text-ink">Con OC</b>
                            <br />
                            612 de 712 facturas
                        </Ring>
                        <Ring pct={54} color="primary">
                            <b className="text-ui text-ink">Cobrado</b>
                            <br />
                            S/ 540 mil de S/ 1 M
                        </Ring>
                        <Ring pct={12} color="danger">
                            <b className="text-ui text-ink">Observadas</b>
                            <br />
                            86 por revisar
                        </Ring>
                    </div>
                </Example>
            </Section>

            <Section title="Reglas">
                <Rules
                    items={[
                        ['Cada barra lleva su cifra escrita.', 'La barra compara; la cifra informa. Sin la cifra, el usuario adivina.'],
                        ['Ordenadas de mayor a menor, y lo pequeño agrupado en «Otros (n)».', 'Más de 6–8 barras ya no se comparan.'],
                        ['Nada de gráficos de torta con más de 3 porciones, ni 3D.', 'Un anillo por porcentaje, o barras.'],
                        ['Los colores de ECharts salen de los tokens (getComputedStyle), no de su paleta por defecto.', ''],
                    ]}
                />
            </Section>
        </Page>
    );
}
