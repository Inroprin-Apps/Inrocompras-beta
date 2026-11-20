'use client';

import { useMemo, useState } from 'react';
import { Code, DocTable, Page, PageHeader, Rules, Section } from '../../../../guia/doc.tsx';
import { Example } from '../../../../guia/example.tsx';
import { DOCS, ESTADO_LABEL, ESTADO_TONE } from '../../../../guia/data.ts';
import { T } from '../../../../ui/bits.tsx';
import { LINK_CLASS } from '../../../../ui/button.tsx';
import { Chip } from '../../../../ui/card.tsx';
import { dmy, money } from '../../../../ui/format.ts';
import { Pager, usePaged } from '../../../../ui/pager.tsx';

export default function Tablas() {
    const [size, setSize] = useState(8);
    const list = useMemo(() => DOCS.slice(0, 40), []);
    const paged = usePaged(list, size, size);

    return (
        <Page href="/componentes/tablas">
            <PageHeader
                eyebrow="Componentes"
                title="Tablas y paginación"
                lead={
                    <>
                        Las clases de una tabla de datos están en <Code>T</Code> (<Code>ui/bits.tsx</Code>): cabecera, celda, celda numérica y sub-línea. Las
                        listas largas se cortan en páginas con <Code>usePaged</Code> + <Code>Pager</Code>: solo se dibuja una página de filas.
                    </>
                }
            />

            <Section title="Tabla con paginación" blurb="Cambia el tamaño de página para ver cómo se ajusta el paginador.">
                <Example
                    code={`const paged = usePaged(list, filtros); // vuelve a la página 1 cuando cambian los filtros

<table className={T.table}>
    <thead>
        <tr className={T.headRow}>
            <th className={T.th}>Comprobante</th>
            <th className={T.th}>Proveedor</th>
            <th className={T.th}>Estado</th>
            <th className={T.thNum}>Total</th>
        </tr>
    </thead>
    <tbody>
        {paged.rows.map((d) => (
            <tr key={d.id} className={T.row}>
                <td className={T.td}>
                    <a className={LINK_CLASS} href={…}>{d.serie}</a>
                    <div className={T.sub}>{dmy(d.fecha)}</div>
                </td>
                <td className={T.td}>{d.nombre}<div className={T.sub}>{d.ruc}</div></td>
                <td className={T.td}><Chip tone={ESTADO_TONE[d.estado]}>{ESTADO_LABEL[d.estado]}</Chip></td>
                <td className={T.tdNum}>{money(d.total, d.moneda)}</td>
            </tr>
        ))}
    </tbody>
</table>
<Pager paged={paged} />`}
                >
                    <div className="mb-3 flex items-center gap-2 text-small text-ink-3">
                        Filas por página:
                        {[5, 8, 15].map((n) => (
                            <button
                                key={n}
                                type="button"
                                onClick={() => setSize(n)}
                                className={`rounded-inner px-2 py-0.5 font-medium ${n === size ? 'bg-primary text-on-fill' : 'text-ink-2 hover:bg-surface-2'}`}
                            >
                                {n}
                            </button>
                        ))}
                    </div>
                    <div className="overflow-x-auto">
                        <table className={`${T.table} min-w-[36rem]`}>
                            <thead>
                                <tr className={T.headRow}>
                                    <th className={T.th}>Comprobante</th>
                                    <th className={T.th}>Proveedor</th>
                                    <th className={T.th}>Estado</th>
                                    <th className={T.thNum}>Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paged.rows.map((d) => (
                                    <tr key={d.id} className={T.row}>
                                        <td className={T.td}>
                                            <a className={LINK_CLASS} href="#">
                                                {d.serie}
                                            </a>
                                            <div className={T.sub}>{dmy(d.fecha)}</div>
                                        </td>
                                        <td className={T.td}>
                                            {d.nombre}
                                            <div className={T.sub}>{d.ruc}</div>
                                        </td>
                                        <td className={T.td}>
                                            <Chip tone={ESTADO_TONE[d.estado]}>{ESTADO_LABEL[d.estado]}</Chip>
                                        </td>
                                        <td className={`${T.tdNum} ${d.estado === 'anulado' ? 'text-ink-3 line-through' : ''}`}>{money(d.total, d.moneda)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <Pager paged={paged} />
                </Example>
            </Section>

            <Section title="Las clases">
                <DocTable
                    head={['Clase', 'Para']}
                    rows={[
                        [<Code key="a">T.th / T.thNum</Code>, 'Cabecera: text-caption en mayúsculas, ink-3. La numérica a la derecha.'],
                        [<Code key="a">T.td / T.tdNum</Code>, 'Celda; la numérica a la derecha, tabular-nums, sin cortar.'],
                        [<Code key="a">T.sub</Code>, 'Sub-línea debajo del dato principal (fecha bajo la serie, RUC bajo el nombre).'],
                        [<Code key="a">T.row</Code>, 'Fila con su divisor y el gris al pasar el cursor.'],
                    ]}
                />
            </Section>

            <Section title="Reglas">
                <Rules
                    items={[
                        ['Los números a la derecha, el texto a la izquierda.', 'Y la cabecera de la columna, alineada como su contenido.'],
                        ['Dos datos por celda como mucho: el principal y su sub-línea.', 'Mejor que más columnas: la tabla cabe sin desplazar.'],
                        ['La moneda va en cada monto (S/, US$), no en la cabecera.', 'Una tabla puede mezclar monedas.'],
                        ['Si la fila abre un detalle, toda la fila es clicable y se marca con surface-2 al pasar.', ''],
                        ['En móvil la tabla se desplaza dentro de su tarjeta (overflow-x-auto), nunca la página.', ''],
                    ]}
                />
            </Section>
        </Page>
    );
}
