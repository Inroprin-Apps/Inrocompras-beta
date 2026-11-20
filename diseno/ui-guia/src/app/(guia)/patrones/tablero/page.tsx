'use client';

import { useState } from 'react';
import { Page, PageHeader, Rules, Section } from '../../../../guia/doc.tsx';
import { Example } from '../../../../guia/example.tsx';
import { BarRow, Ring } from '../../../../ui/bits.tsx';
import { Card, Kpi, KpiNote, Segmented } from '../../../../ui/card.tsx';
import { money, pct } from '../../../../ui/format.ts';
import { PeriodPicker } from '../../../../ui/period-picker.tsx';

const MONTHS = ['202609', '202610', '202611'];
const DATA = {
    ventas: [
        { name: 'Cliente Norte SAC', total: 412300.5 },
        { name: 'Corporación Sur SA', total: 287940 },
        { name: 'Comercial Este EIRL', total: 154210.75 },
        { name: 'Otros (23)', total: 98400 },
    ],
    compras: [
        { name: 'Papeles del Pacífico EIRL', total: 301200 },
        { name: 'Tintas Lima Norte SAC', total: 188450.3 },
        { name: 'Transportes Rímac SRL', total: 92300 },
        { name: 'Otros (41)', total: 140310.9 },
    ],
};

export default function Tablero() {
    const [period, setPeriod] = useState('m202611');
    const [view, setView] = useState<'ventas' | 'compras'>('ventas');
    const rows = DATA[view];
    const max = Math.max(...rows.map((r) => r.total));
    const sum = rows.reduce((a, r) => a + r.total, 0);

    return (
        <Page href="/patrones/tablero">
            <PageHeader
                eyebrow="Patrones"
                title="Tablero con KPI"
                lead="La pantalla de inicio de una app: lo que se mira cada mañana. Arriba los KPI, debajo el detalle que los explica, y un solo filtro de período para todo."
            />

            <Section title="El ejemplo">
                <Example
                    code={`<div className="flex flex-wrap items-center justify-between gap-3">
    <h1 className="text-title font-semibold">Resumen</h1>
    <PeriodPicker value={period} onChange={setPeriod} months={months} />
</div>
<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
    <Kpi label="Ventas" value={money(v)}><KpiNote>…</KpiNote></Kpi>
    …
</div>
<div className="grid gap-3 lg:grid-cols-[2fr_1fr]">
    <Card title="Por cliente" note={<Segmented … />}>{rows.map(… <BarRow … />)}</Card>
    <Card title="Cumplimiento">…<Ring … /></Card>
</div>`}
                >
                    <div className="flex flex-col gap-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <h1 className="text-title font-semibold">Resumen</h1>
                            <PeriodPicker value={period} onChange={setPeriod} months={MONTHS} />
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            <Kpi label="Ventas" value="S/ 952,851.25">
                                <KpiNote>
                                    <span className="font-medium text-success-strong">▲ 8 %</span> frente a octubre
                                </KpiNote>
                            </Kpi>
                            <Kpi label="Compras" value="S/ 722,261.20">
                                <KpiNote>
                                    <span className="font-medium text-danger-strong">▲ 14 %</span> frente a octubre
                                </KpiNote>
                            </Kpi>
                            <Kpi label="Por cobrar" value="S/ 318,400.00">
                                <KpiNote>12 facturas vencidas</KpiNote>
                            </Kpi>
                            <Kpi label="Sin OC" value="27" risk>
                                <KpiNote>S/ 48,210.00 por sustentar</KpiNote>
                            </Kpi>
                        </div>
                        <div className="grid gap-3 lg:grid-cols-[2fr_1fr]">
                            <Card
                                title={view === 'ventas' ? 'Ventas por cliente' : 'Compras por proveedor'}
                                note={
                                    <Segmented
                                        value={view}
                                        onChange={setView}
                                        options={[
                                            { value: 'ventas', label: 'Ventas' },
                                            { value: 'compras', label: 'Compras' },
                                        ]}
                                    />
                                }
                            >
                                {rows.map((r) => (
                                    <BarRow
                                        key={r.name}
                                        label={r.name}
                                        figures={`${money(r.total, 'PEN', true)} · ${pct(r.total, sum)}%`}
                                        pct={pct(r.total, max)}
                                        color={view === 'ventas' ? 'primary' : 'teal'}
                                    />
                                ))}
                            </Card>
                            <Card title="Cumplimiento">
                                <div className="flex flex-col gap-4">
                                    <Ring pct={86} color="success">
                                        <b className="text-ui text-ink">Con OC</b>
                                        <br />
                                        612 de 712
                                    </Ring>
                                    <Ring pct={64} color="primary">
                                        <b className="text-ui text-ink">Cobrado</b>
                                        <br />
                                        del mes
                                    </Ring>
                                </div>
                            </Card>
                        </div>
                    </div>
                </Example>
            </Section>

            <Section title="Anatomía">
                <Rules
                    items={[
                        ['Un solo filtro de período arriba a la derecha, que manda sobre toda la pantalla.', 'Si cada tarjeta tiene su propio filtro, nadie sabe qué período está mirando.'],
                        ['Cada KPI se compara con algo: el período anterior, una meta.', 'Una cifra sola no dice si es buena o mala.'],
                        ['La flecha lleva el color de lo que significa, no de su dirección.', 'Compras que suben es rojo; ventas que suben es verde.'],
                        ['Ventas en azul, compras en turquesa, siempre.', 'Así se reconocen sin leer la leyenda.'],
                        ['En móvil, los KPI de dos en dos y las tarjetas una debajo de otra.', ''],
                    ]}
                />
            </Section>
        </Page>
    );
}
