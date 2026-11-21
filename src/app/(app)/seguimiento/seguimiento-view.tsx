'use client';

// Seguimiento (C-18): en qué va cada ítem, SIN montos (seguimiento_items de la base). Para cualquiera: qué es, su
// validación técnica, si tiene OC, en qué estado y si está pagado. Filtros en la URL (?proyecto=&estado=&texto=&pag=).
import { useMemo } from 'react';
import {
    ESTADOS_COMPRA,
    ETIQUETA_COMPRA,
    FILTROS_SEGUIMIENTO,
    contarPorEstado,
    estadoCompra,
    filtrarSeguimiento,
    ordenarSeguimiento,
    type EstadoCompra,
} from '@/modules/requerimientos/application/views.ts';
import { FilterRow, SearchBox, SectionTitle, T } from '@/shared/ui/bits.tsx';
import { Chip } from '@/shared/ui/card.tsx';
import { dmy } from '@/shared/ui/format.ts';
import { Lista, ListaVacia } from '@/shared/ui/lista-estado.tsx';
import { Pager, usePaged } from '@/shared/ui/pager.tsx';
import { SelectMenu } from '@/shared/ui/select-menu.tsx';
import { urlState } from '../_lib/url-state.ts';
import { proyectosStore } from '../proyectos/store.ts';
import { BarraPestanas } from '../solicitudes/pestanas.tsx';
import { seguimientoStore } from './store.ts';

const fmtNum = new Intl.NumberFormat('es-PE', { maximumFractionDigits: 3 });
const TONO: Record<EstadoCompra, 'info' | 'warn' | 'ok'> = { por_comprar: 'info', con_oc: 'warn', pagado: 'ok' };

const vista$ = urlState(
    { ...FILTROS_SEGUIMIENTO, page: '1' },
    { proyecto: 'proyecto', estado: 'estado', texto: 'texto', page: 'pag' },
    { estado: ['', ...ESTADOS_COMPRA] },
);

export function SeguimientoView() {
    const v = vista$.use();
    const proyectos = (proyectosStore.use().data ?? []).filter((p) => p.estado !== 'Estudio de mercado' && p.estado !== 'Perdido');
    const estado = seguimientoStore.use(v.proyecto || 'todos');
    const lista = useMemo(() => ordenarSeguimiento(filtrarSeguimiento(estado.data ?? [], v)), [estado.data, v]);
    const conteo = useMemo(() => contarPorEstado(filtrarSeguimiento(estado.data ?? [], { estado: '', texto: v.texto })), [estado.data, v.texto]);
    const pag = usePaged(lista, lista, 30, vista$.usePage());
    const unProyecto = !!v.proyecto;

    return (
        <>
            <SectionTitle title="Seguimiento" />
            <BarraPestanas<'' | EstadoCompra>
                activa={v.estado}
                onCambiar={(e) => vista$.set({ estado: e })}
                pestanas={[
                    { key: '', label: 'Todos', count: estado.data ? conteo.por_comprar + conteo.con_oc + conteo.pagado : undefined },
                    ...ESTADOS_COMPRA.map((e) => ({ key: e, label: ETIQUETA_COMPRA[e], count: estado.data ? conteo[e] : undefined })),
                ]}
            />
            <FilterRow>
                <SearchBox value={v.texto} onChange={(texto) => vista$.set({ texto })} placeholder="Busca por descripción, código, SKU, RC u orden" />
                <SelectMenu
                    label="Proyecto"
                    className="w-64"
                    value={v.proyecto}
                    onChange={(proyecto) => vista$.set({ proyecto })}
                    options={[
                        { value: '', label: 'Todos los proyectos' },
                        ...proyectos.map((p) => ({ value: p.id, label: p.codigo ? `${p.codigo} · ${p.nombre}` : p.nombre })),
                    ]}
                />
            </FilterRow>
            <Lista
                estado={{ data: estado.data ? lista : null, error: estado.error }}
                onReintentar={() => void seguimientoStore.reload(v.proyecto || 'todos')}
                vacia={
                    <ListaVacia titulo={estado.data?.length ? 'Ningún ítem coincide' : 'Aún no hay ítems que seguir'}>
                        {estado.data?.length
                            ? 'Prueba con otra búsqueda o cambia de pestaña.'
                            : 'Aquí aparecen los ítems de los requerimientos en cuanto nacen.'}
                    </ListaVacia>
                }
            >
                {() => (
                    <>
                        {/* Celular: una tarjeta por ítem; desde tablet, la tabla. */}
                        <ul className="flex flex-col gap-2 md:hidden">
                            {pag.rows.map((f) => {
                                const e = estadoCompra(f);
                                return (
                                    <li key={f.itemId} className="rounded-card border border-line bg-surface px-4 py-3">
                                        <div className="flex items-start gap-2">
                                            <div className="min-w-0 flex-1 text-ui font-medium break-words">{f.descripcion}</div>
                                            <Chip tone={TONO[e]}>{ETIQUETA_COMPRA[e]}</Chip>
                                        </div>
                                        <div className="mt-0.5 text-small text-ink-2">
                                            {[
                                                f.proyecto || 'Administrativa',
                                                f.requerimiento || 'En proceso',
                                                `${fmtNum.format(f.saldo)} de ${fmtNum.format(f.cantidad)} por comprar`,
                                            ].join(' · ')}
                                        </div>
                                        <div className="text-small text-ink-3">
                                            {[`Técnica: ${f.validacionTecnica}`, f.ordenes, f.estadoOrden, f.fechaMeta && `meta ${dmy(f.fechaMeta)}`]
                                                .filter(Boolean)
                                                .join(' · ')}
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                        <div className="hidden overflow-x-auto md:block">
                            <table className={T.table}>
                                <thead>
                                    <tr className={T.headRow}>
                                        <th className={T.th}>Ítem</th>
                                        {!unProyecto && <th className={T.th}>Proyecto</th>}
                                        <th className={T.th}>Requerimiento</th>
                                        <th className={T.th}>Validación técnica</th>
                                        <th className={T.thNum}>Cantidad</th>
                                        <th className={T.thNum}>Por comprar</th>
                                        <th className={T.th}>Compra</th>
                                        <th className={T.thNum}>Fecha meta</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pag.rows.map((f) => {
                                        const e = estadoCompra(f);
                                        return (
                                            <tr key={f.itemId} className={T.row}>
                                                <td className={T.td}>
                                                    <div className="max-w-80 font-medium break-words">{f.descripcion}</div>
                                                    <div className={T.sub}>
                                                        {[f.codigoCliente, f.codigoSidige && `SKU ${f.codigoSidige}`].filter(Boolean).join(' · ') || '—'}
                                                    </div>
                                                </td>
                                                {!unProyecto && <td className={T.td}>{f.proyecto || <span className="text-ink-3">Administrativa</span>}</td>}
                                                <td className={T.td}>
                                                    {f.requerimiento || <span className="text-ink-3">En proceso</span>}
                                                    {f.rqSidige && <div className={T.sub}>RQ {f.rqSidige}</div>}
                                                </td>
                                                <td className={T.td}>
                                                    {f.validacionTecnica}
                                                    {(f.marca || f.modelo) && <div className={T.sub}>{[f.marca, f.modelo].filter(Boolean).join(' · ')}</div>}
                                                </td>
                                                <td className={T.tdNum}>{fmtNum.format(f.cantidad)}</td>
                                                <td className={T.tdNum}>{fmtNum.format(f.saldo)}</td>
                                                <td className={T.td}>
                                                    <Chip tone={TONO[e]}>{ETIQUETA_COMPRA[e]}</Chip>
                                                    {f.ordenes && <div className={T.sub}>{f.ordenes}</div>}
                                                    {f.estadoOrden && <div className={T.sub}>{f.estadoOrden}</div>}
                                                </td>
                                                <td className={T.tdNum}>{f.fechaMeta ? dmy(f.fechaMeta) : '—'}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        <Pager paged={pag} />
                    </>
                )}
            </Lista>
        </>
    );
}
