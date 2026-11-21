'use client';

// Desaduanaje: la lista (filtros, orden y página en la URL: ?estado=&tipo=&texto=&orden=&pag=&ver=) y la ficha lateral.
// «Te toca» y las notificaciones enlazan con ?ver=<id>. «Nuevo desaduanaje» elige una OC de importación aprobada
// y llama a ac_des_crear (la base dice si se puede). En el celular la lista es de tarjetas.
import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import {
    ESTADOS_DES,
    FILTROS_DES,
    TIPOS_DES,
    factor,
    fechaDelEstado,
    filtrarDes,
    nombreDes,
    ordenarDes,
    tonoEstadoDes,
    type Desaduanaje,
    type FiltrosDes,
    type OrdenDes,
} from '@/modules/desaduanaje/application/views.ts';
import { FilterRow, SearchBox, T } from '@/shared/ui/bits.tsx';
import { Button } from '@/shared/ui/button.tsx';
import { Chip } from '@/shared/ui/card.tsx';
import { Encabezado } from '@/shared/ui/encabezado.tsx';
import { dmy } from '@/shared/ui/format.ts';
import { Lista, ListaVacia } from '@/shared/ui/lista-estado.tsx';
import { Pager, SortSelect, usePaged } from '@/shared/ui/pager.tsx';
import { SelectMenu } from '@/shared/ui/select-menu.tsx';
import { usePerfil } from '../_components/perfil.tsx';
import { urlState } from '../_lib/url-state.ts';
import { FichaDesaduanaje } from './ficha-desaduanaje.tsx';
import { FormNuevo } from './form-nuevo.tsx';
import { desaduanajesStore } from './store.ts';

const ORDENES: { value: OrdenDes; label: string }[] = [
    { value: 'recientes', label: 'Más recientes' },
    { value: 'numero', label: 'Número' },
    { value: 'llegada', label: 'Llegada' },
];

const vista$ = urlState(
    { ...FILTROS_DES, orden: 'recientes' as OrdenDes, page: '1', ver: '' },
    { estado: 'estado', tipo: 'tipo', texto: 'texto', orden: 'orden', page: 'pag', ver: 'ver' },
    { estado: ['', 'abiertos', ...ESTADOS_DES], tipo: ['', ...TIPOS_DES], orden: ORDENES.map((o) => o.value) },
);

export function DesaduanajeView() {
    const perfil = usePerfil();
    const estado = desaduanajesStore.use();
    const v = vista$.use();
    const [creando, setCreando] = useState(false);

    const lista = useMemo(() => ordenarDes(filtrarDes(estado.data ?? [], v), v.orden), [estado.data, v]);
    const pag = usePaged(lista, lista, 25, vista$.usePage());
    const conFiltros = v.estado !== '' || v.tipo !== '' || v.texto !== '';

    if (!perfil.ve_precios) {
        return (
            <>
                <Encabezado titulo="Desaduanaje" />
                <ListaVacia titulo="El desaduanaje lleva montos">
                    Tu perfil no ve precios. Pide a Importaciones el avance de tu importación o míralo en Seguimiento.
                </ListaVacia>
            </>
        );
    }

    return (
        <>
            <Encabezado
                titulo="Desaduanaje"
                actualizado={estado.actualizado}
                accion={
                    perfil.es_compras && (
                        <Button onClick={() => setCreando(true)}>
                            <Plus size={16} aria-hidden /> Nuevo desaduanaje
                        </Button>
                    )
                }
            />
            <FilterRow>
                <SearchBox value={v.texto} onChange={(texto) => vista$.set({ texto })} placeholder="Busca por número, OC, proveedor, DAM o BL" />
                <SelectMenu
                    label="Estado"
                    className="w-56"
                    value={v.estado}
                    onChange={(e) => vista$.set({ estado: e as FiltrosDes['estado'] })}
                    options={[
                        { value: '', label: 'Todos los estados' },
                        { value: 'abiertos', label: 'Sin costeo cerrado' },
                        ...ESTADOS_DES.map((e) => ({ value: e, label: e })),
                    ]}
                />
                <SelectMenu
                    label="Tipo"
                    className="w-44"
                    value={v.tipo}
                    onChange={(t) => vista$.set({ tipo: t as FiltrosDes['tipo'] })}
                    options={[{ value: '', label: 'Todos los tipos' }, ...TIPOS_DES.map((t) => ({ value: t, label: t }))]}
                />
                <SortSelect value={v.orden} onChange={(orden) => vista$.set({ orden })} options={ORDENES} />
            </FilterRow>
            <Lista
                estado={{ data: estado.data ? lista : null, error: estado.error }}
                onReintentar={() => void desaduanajesStore.retry()}
                vacia={
                    <ListaVacia titulo={conFiltros && estado.data?.length ? 'Ningún desaduanaje coincide' : 'Aún no hay desaduanajes'}>
                        {conFiltros && estado.data?.length ? (
                            <>
                                Prueba con otra búsqueda o quita los filtros.
                                <div className="mt-4">
                                    <Button variant="secondary" onClick={() => vista$.set({ ...FILTROS_DES })}>
                                        Quitar filtros
                                    </Button>
                                </div>
                            </>
                        ) : (
                            'Importaciones los crea con «Nuevo desaduanaje» desde una orden de importación aprobada.'
                        )}
                    </ListaVacia>
                }
            >
                {() => (
                    <>
                        <div className="hidden overflow-x-auto md:block">
                            <table className={T.table}>
                                <thead>
                                    <tr className={T.headRow}>
                                        <th className={T.th}>Desaduanaje</th>
                                        <th className={T.th}>OC y proveedor</th>
                                        <th className={T.th}>Estado</th>
                                        <th className={T.th}>Fechas</th>
                                        <th className={`${T.thNum} text-right`}>FI</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pag.rows.map((d) => (
                                        <tr
                                            key={d.id}
                                            tabIndex={0}
                                            className={`${T.row} cursor-pointer focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary ${v.ver === d.id ? 'bg-primary-soft' : ''}`}
                                            onClick={() => vista$.set({ ver: d.id })}
                                            onKeyDown={(e) => e.key === 'Enter' && vista$.set({ ver: d.id })}
                                        >
                                            <td className={T.td}>
                                                <div className="font-medium">{nombreDes(d)}</div>
                                                <div className={T.sub}>
                                                    {d.tipo} · {d.alcance}
                                                    {d.nDam && ` · DAM ${d.nDam}`}
                                                </div>
                                            </td>
                                            <td className={T.td}>
                                                <div>{d.ordenNumero || 'Sin número'}</div>
                                                <div className={T.sub}>{d.proveedor || 'Sin proveedor'}</div>
                                            </td>
                                            <td className={T.td}>
                                                <Chip tone={tonoEstadoDes(d.estado)}>{d.estado}</Chip>
                                                {d.versionCosteo > 0 && <div className={T.sub}>Costeo v{d.versionCosteo}</div>}
                                            </td>
                                            <td className={T.td}>
                                                <Fechas d={d} />
                                            </td>
                                            <td className={`${T.tdNum} text-right`}>{factor(d.fi)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <ul className="flex flex-col gap-2 md:hidden">
                            {pag.rows.map((d) => (
                                <li key={d.id}>
                                    <button
                                        type="button"
                                        onClick={() => vista$.set({ ver: d.id })}
                                        className={`w-full rounded-card border border-line px-4 py-3 text-left ${v.ver === d.id ? 'bg-primary-soft' : 'bg-surface hover:bg-surface-2'} focus-visible:outline-2 focus-visible:outline-primary`}
                                    >
                                        <div className="flex items-start gap-2">
                                            <div className="min-w-0 flex-1">
                                                <div className="text-ui font-medium">{nombreDes(d)}</div>
                                                <div className="truncate text-small text-ink-2">
                                                    {d.ordenNumero} · {d.proveedor || 'Sin proveedor'}
                                                </div>
                                            </div>
                                            <Chip tone={tonoEstadoDes(d.estado)}>{d.estado}</Chip>
                                        </div>
                                        <div className="mt-1.5 flex items-center gap-2 text-small text-ink-2">
                                            <span className="flex-1">
                                                <Fechas d={d} />
                                            </span>
                                            {d.fi != null && <span className="tabular-nums">FI {factor(d.fi)}</span>}
                                        </div>
                                    </button>
                                </li>
                            ))}
                        </ul>
                        <Pager paged={pag} />
                    </>
                )}
            </Lista>
            {v.ver && <FichaDesaduanaje id={v.ver} onCerrar={() => vista$.set({ ver: '' })} />}
            {creando && <FormNuevo onCerrar={() => setCreando(false)} onCreado={(id) => (setCreando(false), vista$.set({ ver: id }))} />}
        </>
    );
}

function Fechas({ d }: { d: Desaduanaje }) {
    const f = fechaDelEstado(d);
    if (!f.fecha) return <span className="text-ink-3">{d.tipo}</span>;
    return (
        <span>
            {f.etiqueta} {dmy(f.fecha)}
        </span>
    );
}
