'use client';

// Requerimientos: la lista (filtros en la URL: ?estado=&proyecto=&area=&texto=&orden=&pag=&ver=) y la ficha lateral.
// La bandeja enlaza también /requerimientos?anulacion=<id>: se abre la ficha de su requerimiento con esa anulación marcada.
import { useEffect, useMemo } from 'react';
import {
    ESTADOS_REQ,
    FILTROS_REQ,
    filtrarRequerimientos,
    ordenarRequerimientos,
    tonoEstado,
    type OrdenReq,
} from '@/modules/requerimientos/application/views.ts';
import { AREAS } from '@/shared/tipos.ts';
import { FilterRow, Notice, SearchBox, SectionTitle, T } from '@/shared/ui/bits.tsx';
import { Chip } from '@/shared/ui/card.tsx';
import { dmy } from '@/shared/ui/format.ts';
import { Lista, ListaVacia } from '@/shared/ui/lista-estado.tsx';
import { Pager, SortSelect, usePaged } from '@/shared/ui/pager.tsx';
import { SelectMenu } from '@/shared/ui/select-menu.tsx';
import { urlState } from '../_lib/url-state.ts';
import { proyectosStore } from '../proyectos/store.ts';
import { FichaRequerimiento } from './ficha-requerimiento.tsx';
import { anulacionReqStore, requerimientosStore } from './store.ts';

const ORDENES: { value: OrdenReq; label: string }[] = [
    { value: 'recientes', label: 'Más recientes' },
    { value: 'antiguos', label: 'Más antiguos' },
    { value: 'numero', label: 'Número' },
];

const vista$ = urlState(
    { ...FILTROS_REQ, orden: 'recientes' as OrdenReq, page: '1', ver: '', anulacion: '' },
    { estado: 'estado', proyecto: 'proyecto', area: 'area', texto: 'texto', orden: 'orden', page: 'pag', ver: 'ver', anulacion: 'anulacion' },
    { estado: ['', ...ESTADOS_REQ], orden: ORDENES.map((o) => o.value), area: ['', ...AREAS] },
);

export function RequerimientosView() {
    const estado = requerimientosStore.use();
    const proyectosLeidos = proyectosStore.use().data;
    const proyectos = useMemo(() => proyectosLeidos ?? [], [proyectosLeidos]);
    const v = vista$.use();
    const deAnulacion = anulacionReqStore.use(v.anulacion || null);

    // Enlace de la bandeja: ?anulacion=<id> abre el requerimiento de esa anulación.
    useEffect(() => {
        if (v.anulacion && deAnulacion.data && v.ver !== deAnulacion.data) vista$.set({ ver: deAnulacion.data });
    }, [v.anulacion, v.ver, deAnulacion.data]);

    const nombreProyecto = useMemo(() => {
        const m = new Map(proyectos.map((p) => [p.id, p.nombre]));
        return (id: string | null) => (id ? (m.get(id) ?? '') : '');
    }, [proyectos]);
    const lista = useMemo(() => ordenarRequerimientos(filtrarRequerimientos(estado.data ?? [], v, nombreProyecto), v.orden), [estado.data, v, nombreProyecto]);
    const pag = usePaged(lista, lista, 25, vista$.usePage());
    const areas = useMemo(() => [...new Set((estado.data ?? []).map((r) => r.areaEmisora))].sort(), [estado.data]);
    const conReq = useMemo(() => {
        const ids = new Set((estado.data ?? []).map((r) => r.proyectoId).filter(Boolean));
        return proyectos.filter((p) => ids.has(p.id));
    }, [estado.data, proyectos]);

    return (
        <>
            <SectionTitle title="Requerimientos" />
            {v.anulacion && deAnulacion.error && (
                <Notice tone="danger" onClose={() => vista$.set({ anulacion: '' })}>
                    {deAnulacion.error}
                </Notice>
            )}
            <FilterRow>
                <SearchBox value={v.texto} onChange={(texto) => vista$.set({ texto })} placeholder="Busca por N° RC, RQ del SIDIGE, motivo o proyecto" />
                <SelectMenu
                    label="Estado"
                    className="w-48"
                    value={v.estado}
                    onChange={(e) => vista$.set({ estado: e as typeof v.estado })}
                    options={[{ value: '', label: 'Todos los estados' }, ...ESTADOS_REQ.map((e) => ({ value: e, label: e }))]}
                />
                <SelectMenu
                    label="Proyecto"
                    className="w-60"
                    value={v.proyecto}
                    onChange={(proyecto) => vista$.set({ proyecto })}
                    options={[{ value: '', label: 'Todos los proyectos' }, ...conReq.map((p) => ({ value: p.id, label: p.nombre }))]}
                />
                {areas.length > 1 && (
                    <SelectMenu
                        label="Área emisora"
                        className="w-48"
                        value={v.area}
                        onChange={(area) => vista$.set({ area })}
                        options={[{ value: '', label: 'Todas las áreas' }, ...areas.map((a) => ({ value: a, label: a }))]}
                    />
                )}
                <SortSelect value={v.orden} onChange={(orden) => vista$.set({ orden })} options={ORDENES} />
            </FilterRow>
            <Lista
                estado={{ data: estado.data ? lista : null, error: estado.error }}
                onReintentar={() => void requerimientosStore.retry()}
                vacia={
                    <ListaVacia titulo={estado.data?.length ? 'Ningún requerimiento coincide' : 'Aún no hay requerimientos'}>
                        {estado.data?.length
                            ? 'Prueba con otra búsqueda o quita los filtros.'
                            : 'Nacen solos al liberarse una solicitud. Planeamiento los completa y los emite.'}
                    </ListaVacia>
                }
            >
                {() => (
                    <>
                        <div className="overflow-x-auto">
                            <table className={T.table}>
                                <thead>
                                    <tr className={T.headRow}>
                                        <th className={T.th}>Requerimiento</th>
                                        <th className={T.th}>Proyecto o motivo</th>
                                        <th className={`${T.th} hidden sm:table-cell`}>Estado</th>
                                        <th className={`${T.th} hidden md:table-cell`}>Área emisora</th>
                                        <th className={`${T.thNum} hidden sm:table-cell`}>Ítems</th>
                                        <th className={`${T.thNum} hidden sm:table-cell`}>Creado</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pag.rows.map((r) => (
                                        <tr
                                            key={r.id}
                                            tabIndex={0}
                                            className={`${T.row} cursor-pointer ${v.ver === r.id ? 'bg-primary-soft' : ''}`}
                                            onClick={() => vista$.set({ ver: r.id, anulacion: '' })}
                                            onKeyDown={(e) => e.key === 'Enter' && vista$.set({ ver: r.id, anulacion: '' })}
                                        >
                                            <td className={T.td}>
                                                <div className="font-medium">{r.numero || 'En proceso, sin número'}</div>
                                                {r.rqSidige && <div className={T.sub}>RQ SIDIGE {r.rqSidige}</div>}
                                                <div className="mt-1 sm:hidden">
                                                    <Chip tone={tonoEstado(r.estado)}>{r.estado}</Chip>
                                                </div>
                                            </td>
                                            <td className={T.td}>
                                                <div className="max-w-80 truncate">{nombreProyecto(r.proyectoId) || r.motivo || '—'}</div>
                                                {r.tipoCompra && <div className={T.sub}>{r.tipoCompra}</div>}
                                            </td>
                                            <td className={`${T.td} hidden sm:table-cell`}>
                                                <Chip tone={tonoEstado(r.estado)}>{r.estado}</Chip>
                                            </td>
                                            <td className={`${T.td} hidden md:table-cell`}>{r.areaEmisora}</td>
                                            <td className={`${T.tdNum} hidden sm:table-cell`}>{r.nItems}</td>
                                            <td className={`${T.tdNum} hidden sm:table-cell`}>{dmy(r.creado)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <Pager paged={pag} />
                    </>
                )}
            </Lista>
            {v.ver && <FichaRequerimiento id={v.ver} anulacionMarcada={v.anulacion} onCerrar={() => vista$.set({ ver: '', anulacion: '' })} />}
        </>
    );
}
