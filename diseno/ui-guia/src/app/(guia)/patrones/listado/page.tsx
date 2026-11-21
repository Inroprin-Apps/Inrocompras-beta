'use client';

import { useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { Page, PageHeader, Rules, Section } from '../../../../guia/doc.tsx';
import { Example } from '../../../../guia/example.tsx';
import { DOCS, ESTADO_LABEL, ESTADO_TONE, type Doc } from '../../../../guia/data.ts';
import { Empty, FilterRow, Notice, SearchBox, T } from '../../../../ui/bits.tsx';
import { Button, LINK_CLASS } from '../../../../ui/button.tsx';
import { Card, Chip } from '../../../../ui/card.tsx';
import { dmy, money, plain, thousands, words } from '../../../../ui/format.ts';
import { Pager, SortSelect, usePaged } from '../../../../ui/pager.tsx';
import { SelectMenu } from '../../../../ui/select-menu.tsx';
import { toast } from '../../../../ui/toaster.tsx';

type Sort = 'fecha' | 'monto' | 'nombre';

export default function Listado() {
    const [q, setQ] = useState('');
    const [estado, setEstado] = useState('todos');
    const [sort, setSort] = useState<Sort>('fecha');

    const list = useMemo(() => {
        const ws = words(q);
        const out = DOCS.filter((d) => (estado === 'todos' || d.estado === estado) && ws.every((w) => plain(`${d.nombre} ${d.ruc} ${d.serie}`).includes(w)));
        const by: Record<Sort, (a: Doc, b: Doc) => number> = {
            fecha: (a, b) => b.fecha.localeCompare(a.fecha),
            monto: (a, b) => b.total - a.total,
            nombre: (a, b) => a.nombre.localeCompare(b.nombre, 'es'),
        };
        return out.sort(by[sort]);
    }, [q, estado, sort]);
    const paged = usePaged(list, `${q}|${estado}|${sort}`, 10);
    const sinOc = DOCS.filter((d) => d.estado === 'sin-oc').length;

    return (
        <Page href="/patrones/listado">
            <PageHeader
                eyebrow="Patrones"
                title="Pantalla de listado"
                lead="La pantalla más común: un título, quizá un aviso, la barra de filtros y una tabla paginada dentro de una tarjeta. Este ejemplo funciona entero: busca, filtra, ordena y pasa de página."
            />

            <Section title="El ejemplo">
                <Example
                    code={`<h1 className="text-title font-semibold">Comprobantes recibidos</h1>
{sinOc > 0 && <Notice tone="danger">…</Notice>}
<Card>
    <FilterRow>
        <SearchBox … />
        <SelectMenu … />
        <div className="ml-auto flex items-center gap-2.5">
            <SortSelect … />
            <Button variant="secondary"><Download size={16} /> Exportar</Button>
        </div>
    </FilterRow>
    {list.length ? <table className={T.table}>…</table> : <Empty>…</Empty>}
    <Pager paged={paged} />
</Card>`}
                >
                    <div className="flex flex-col gap-4">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                            <h1 className="text-title font-semibold">Comprobantes recibidos</h1>
                            <span className="text-small text-ink-3">Actualizado hoy a las 07:00</span>
                        </div>
                        {sinOc > 0 && (
                            <Notice tone="danger">
                                <b>{sinOc} facturas sin orden de compra.</b>{' '}
                                <button type="button" className="font-medium underline" onClick={() => setEstado('sin-oc')}>
                                    Ver solo esas
                                </button>
                            </Notice>
                        )}
                        <Card>
                            <FilterRow>
                                <SearchBox value={q} onChange={setQ} placeholder="Buscar RUC, razón social o serie" />
                                <SelectMenu
                                    value={estado}
                                    onChange={setEstado}
                                    label="Estado"
                                    className="w-52"
                                    options={[
                                        { value: 'todos', label: 'Todos los estados' },
                                        ...Object.entries(ESTADO_LABEL).map(([value, label]) => ({ value, label })),
                                    ]}
                                />
                                <div className="flex flex-wrap items-center gap-2.5 sm:ml-auto">
                                    <SortSelect
                                        value={sort}
                                        onChange={setSort}
                                        options={[
                                            { value: 'fecha', label: 'Fecha' },
                                            { value: 'monto', label: 'Monto' },
                                            { value: 'nombre', label: 'Razón social' },
                                        ]}
                                    />
                                    <Button
                                        variant="secondary"
                                        onClick={() => toast.success(`Comprobantes.xlsx descargado (${thousands(list.length)} filas).`)}
                                    >
                                        <Download size={16} /> Exportar
                                    </Button>
                                </div>
                            </FilterRow>
                            <p className="mb-2 text-small text-ink-3">
                                {thousands(list.length)} {list.length === 1 ? 'comprobante' : 'comprobantes'}
                            </p>
                            {list.length ? (
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
                                                    <td className={`${T.tdNum} ${d.estado === 'anulado' ? 'text-ink-3 line-through' : ''}`}>
                                                        {money(d.total, d.moneda)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <Empty>
                                    Ningún comprobante coincide con «{q}».{' '}
                                    <button
                                        type="button"
                                        className={LINK_CLASS}
                                        onClick={() => {
                                            setQ('');
                                            setEstado('todos');
                                        }}
                                    >
                                        Quitar filtros
                                    </button>
                                </Empty>
                            )}
                            <Pager paged={paged} />
                        </Card>
                    </div>
                </Example>
            </Section>

            <Section title="Anatomía">
                <Rules
                    items={[
                        ['Título de pantalla (text-title) y, a su derecha, de cuándo son los datos.', 'El usuario siempre sabe si lo que ve está al día.'],
                        [
                            'El aviso, si lo hay, entre el título y la tarjeta, con un enlace que filtra lo que menciona.',
                            'El aviso lleva a la acción, no solo informa.',
                        ],
                        ['Filtros arriba a la izquierda; ordenar y exportar a la derecha.', 'Exportar descarga lo que se ve con los filtros puestos.'],
                        ['El conteo encima de la tabla.', '«128 comprobantes»: confirma que el filtro hizo algo.'],
                        ['El vacío ofrece salir de él: «Quitar filtros».', 'Un vacío sin salida obliga a deshacer filtro por filtro.'],
                    ]}
                />
            </Section>
        </Page>
    );
}
