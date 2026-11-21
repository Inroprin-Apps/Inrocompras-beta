import { Code, DocTable, Page, PageHeader, Rules, Section } from '../../../../guia/doc.tsx';
import { dayTime, dmy, limaDateTime, money, monthLabel, pct, thousands } from '../../../../ui/format.ts';

export const metadata = { title: 'Montos, fechas y números' };

export default function Formatos() {
    const iso = '2026-11-17T12:26:00Z';
    return (
        <Page href="/ux/formatos">
            <PageHeader
                eyebrow="Experiencia"
                title="Montos, fechas y números"
                lead={
                    <>
                        Todas las apps escriben un monto o una fecha de la misma forma. Las funciones están en <Code>ui/format.ts</Code>; nadie formatea a mano.
                        Los resultados de abajo los calcula esa misma función.
                    </>
                }
            />

            <Section title="Montos">
                <DocTable
                    head={['Llamada', 'Resultado', 'Dónde']}
                    rows={[
                        [<Code key="a">money(1234567.891)</Code>, money(1234567.891), 'Tablas, KPI, detalle'],
                        [<Code key="a">money(2500, &apos;USD&apos;)</Code>, money(2500, 'USD'), 'Siempre con su moneda'],
                        [<Code key="a">money(-480.5)</Code>, money(-480.5), 'Nota de crédito, saldo a favor'],
                        [<Code key="a">money(48210, &apos;PEN&apos;, true)</Code>, money(48210, 'PEN', true), 'Gráficos y textos cortos'],
                        [<Code key="a">money(3450000, &apos;PEN&apos;, true)</Code>, money(3450000, 'PEN', true), 'Gráficos y textos cortos'],
                    ]}
                />
            </Section>

            <Section title="Fechas y períodos">
                <DocTable
                    head={['Llamada', 'Resultado', 'Dónde']}
                    rows={[
                        [<Code key="a">dmy(&apos;2026-11-07&apos;)</Code>, dmy('2026-11-07'), 'Fecha de un documento'],
                        [<Code key="a">dayTime(iso)</Code>, dayTime(iso), 'Hora de un evento en una tabla (hora de Lima)'],
                        [<Code key="a">limaDateTime(iso)</Code>, limaDateTime(iso), 'Cuándo se actualizaron los datos'],
                        [<Code key="a">monthLabel(&apos;202611&apos;)</Code>, monthLabel('202611'), 'Eje de un gráfico, mes en una tabla'],
                    ]}
                />
            </Section>

            <Section title="Números">
                <DocTable
                    head={['Llamada', 'Resultado', 'Dónde']}
                    rows={[
                        [<Code key="a">thousands(12873)</Code>, thousands(12873), 'Conteos'],
                        [<Code key="a">pct(612, 712)</Code>, `${pct(612, 712)}%`, 'Porcentajes (redondeados, sin decimales)'],
                    ]}
                />
            </Section>

            <Section title="Reglas">
                <Rules
                    items={[
                        ['Coma para miles, punto para decimales: S/ 1,234.50.', 'Como en los comprobantes de SUNAT y en Excel de la oficina.'],
                        ['Siempre dos decimales en montos, salvo en la forma corta (S/ 48 mil).', ''],
                        [
                            'Las horas, en hora de Lima, aunque el servidor esté en otro sitio.',
                            'Las funciones ya lo hacen; un new Date().toLocaleString() suelto no.',
                        ],
                        ['Las fechas como dd/mm/aaaa; los meses en minúsculas abreviados (nov 26).', 'Nunca 11/17/2026 ni 2026-11-17 a la vista del usuario.'],
                        ['Los montos negativos con signo menos, no entre paréntesis.', ''],
                    ]}
                />
            </Section>
        </Page>
    );
}
