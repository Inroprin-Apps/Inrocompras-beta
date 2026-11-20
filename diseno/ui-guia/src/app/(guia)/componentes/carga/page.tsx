'use client';

import { useState } from 'react';
import { Code, DoDont, Page, PageHeader, Rules, Section } from '../../../../guia/doc.tsx';
import { Example } from '../../../../guia/example.tsx';
import { Button } from '../../../../ui/button.tsx';
import { Card, Kpi, KpiNote } from '../../../../ui/card.tsx';
import { Hueco } from '../../../../ui/hueco.tsx';

export default function Carga() {
    const [loading, setLoading] = useState(true);

    return (
        <Page href="/componentes/carga">
            <PageHeader
                eyebrow="Componentes"
                title="Carga (huecos)"
                lead={
                    <>
                        Mientras un valor viaja, en su sitio hay un <Code>Hueco</Code> del mismo tamaño. Solo cubre lo que depende del dato: títulos,
                        etiquetas, botones y la forma de la tarjeta son código y se dibujan de verdad. La pantalla de carga ES la pantalla final.
                    </>
                }
            />

            <Section title="Antes y después" blurb="Cambia entre cargando y cargado: nada se mueve.">
                <Example
                    code={`<Kpi label="Ventas del mes" value={data ? money(data.total) : null}>
    <KpiNote>{data?.count} comprobantes</KpiNote>
</Kpi>

// Un hueco suelto lleva los dos tamaños del elemento que reemplaza:
{data ? <span>{data.name}</span> : <Hueco className="h-3.5 w-40" />}`}
                >
                    <div className="mb-4">
                        <Button variant="secondary" onClick={() => setLoading(!loading)}>
                            {loading ? 'Ver cargado' : 'Ver cargando'}
                        </Button>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                        <Kpi label="Ventas del mes" value={loading ? null : 'S/ 1,234,567.89'}>
                            <KpiNote>132 comprobantes</KpiNote>
                        </Kpi>
                        <Kpi label="Compras del mes" value={loading ? null : 'S/ 876,540.10'}>
                            <KpiNote>98 comprobantes</KpiNote>
                        </Kpi>
                        <Kpi label="Sin OC" value={loading ? null : '27'} risk={!loading}>
                            <KpiNote>S/ 48,210.00 por sustentar</KpiNote>
                        </Kpi>
                    </div>
                    <div className="mt-3">
                        <Card title="Últimos comprobantes">
                            {['Proveedor Andino SAC', 'Tintas Lima Norte SAC', 'Cartones Huallaga SA'].map((n, i) => (
                                <div key={n} className="flex items-center justify-between border-b border-divider py-2.5 last:border-0">
                                    <span className="text-ui">{loading ? <Hueco className="h-3.5 w-44" /> : n}</span>
                                    <span className="text-ui tabular-nums">{loading ? <Hueco className="h-3.5 w-20" /> : `S/ ${(1240.5 * (i + 1)).toFixed(2)}`}</span>
                                </div>
                            ))}
                        </Card>
                    </div>
                </Example>
            </Section>

            <Section title="Reglas">
                <Rules
                    items={[
                        ['El hueco tiene el alto y el ancho del dato que espera.', 'Si no, al llegar el dato todo salta.'],
                        ['Sin spinners a pantalla completa ni desenfoques.', 'El usuario ya ve dónde va a estar cada cosa y puede ir leyendo lo que llega.'],
                        ['Si tarda más de ~10 s, se dice: «Sigue cargando: SUNAT está lento».', 'Un hueco que nunca se llena parece un error.'],
                    ]}
                />
                <DoDont
                    good={
                        <div className="w-56">
                            <Kpi label="Ventas del mes" value={null} />
                        </div>
                    }
                    goodNote="La tarjeta y su etiqueta reales, el hueco donde irá la cifra."
                    bad={
                        <div className="flex h-24 w-56 items-center justify-center">
                            <span className="size-8 animate-spin rounded-full border-4 border-surface-3 border-t-primary" />
                        </div>
                    }
                    badNote="Un spinner: no dice qué viene ni dónde, y al llegar el dato la pantalla cambia de forma."
                />
            </Section>
        </Page>
    );
}
