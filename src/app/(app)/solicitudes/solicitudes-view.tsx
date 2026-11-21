'use client';

// Solicitudes: pestañas «Mis solicitudes» / «Por liberar» / «Todas», filtros en la URL
// (?pestana=&estado=&tipo=&proyecto=&texto=&orden=&pag=&ver=) y la ficha lateral (?ver=<id>: así enlazan
// la bandeja y las notificaciones). «Por liberar» son las que la base dice que te toca liberar (te_toca).
import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import {
    ESTADOS_SOLICITUD,
    FILTROS_SOLICITUD,
    PESTANAS,
    TIPOS_SOLICITUD,
    columnasSolicitudes,
    filtrarSolicitudes,
    ordenarSolicitudes,
    tonoEstado,
    type OrdenSolicitud,
    type Pestana,
    type Solicitud,
} from '@/modules/solicitudes/application/views.ts';
import { solicitudes } from '@/modules/solicitudes/composition.ts';
import { FilterRow, SearchBox, T } from '@/shared/ui/bits.tsx';
import { Button } from '@/shared/ui/button.tsx';
import { Chip } from '@/shared/ui/card.tsx';
import { Encabezado } from '@/shared/ui/encabezado.tsx';
import { dmy } from '@/shared/ui/format.ts';
import { Lista, ListaVacia } from '@/shared/ui/lista-estado.tsx';
import { Pager, SortSelect, usePaged } from '@/shared/ui/pager.tsx';
import { SelectMenu } from '@/shared/ui/select-menu.tsx';
import { BotonExportar } from '../_components/exportar.tsx';
import { usePerfil } from '../_components/perfil.tsx';
import { useBorrarConDeshacer } from '../_lib/deshacer.ts';
import { personasStore, teTocaStore } from '../_lib/stores.ts';
import { urlState } from '../_lib/url-state.ts';
import { proyectosStore } from '../proyectos/store.ts';
import { FichaSolicitud } from './ficha-solicitud.tsx';
import { FormSolicitud } from './form-solicitud.tsx';
import { BarraPestanas } from './pestanas.tsx';
import { solicitudesStore } from './store.ts';

const ORDENES: { value: OrdenSolicitud; label: string }[] = [
    { value: 'recientes', label: 'Más recientes' },
    { value: 'antiguas', label: 'Más antiguas' },
    { value: 'numero', label: 'Número' },
];

/** La fila abre la ficha: se toca entera, se ve el foco del teclado. */
const FILA = 'cursor-pointer focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary';

const vista$ = urlState(
    { ...FILTROS_SOLICITUD, orden: 'recientes' as OrdenSolicitud, page: '1', ver: '' },
    { pestana: 'pestana', estado: 'estado', tipo: 'tipo', proyecto: 'proyecto', texto: 'texto', orden: 'orden', page: 'pag', ver: 'ver' },
    { pestana: PESTANAS, estado: ['', ...ESTADOS_SOLICITUD], tipo: ['', ...TIPOS_SOLICITUD], orden: ORDENES.map((o) => o.value) },
);

export function SolicitudesView() {
    const perfil = usePerfil();
    const leido = solicitudesStore.use();
    const { ocultos, borrar } = useBorrarConDeshacer();
    const estado = useMemo(() => ({ ...leido, data: leido.data?.filter((s) => !ocultos.has(s.id)) ?? null }), [leido, ocultos]);
    const proyectosLeidos = proyectosStore.use().data;
    const proyectos = useMemo(() => proyectosLeidos ?? [], [proyectosLeidos]);
    const gente = personasStore.use().data;
    const teToca = teTocaStore.use().data;
    const v = vista$.use();
    const [creando, setCreando] = useState(false);

    const porLiberar = useMemo(
        () => new Set((teToca ?? []).filter((t) => t.tabla === 'solicitudes' && t.paso === 'Liberar solicitud').map((t) => t.id)),
        [teToca],
    );
    const nombreProyecto = useMemo(() => {
        const m = new Map(proyectos.map((p) => [p.id, p.nombre]));
        return (id: string | null) => (id ? (m.get(id) ?? '') : '');
    }, [proyectos]);
    const ctx = useMemo(() => ({ yo: perfil.id, porLiberar, nombreProyecto }), [perfil.id, porLiberar, nombreProyecto]);

    const lista = useMemo(() => ordenarSolicitudes(filtrarSolicitudes(estado.data ?? [], v, ctx), v.orden), [estado.data, v, ctx]);
    const conteo = (p: Pestana) => filtrarSolicitudes(estado.data ?? [], { ...FILTROS_SOLICITUD, pestana: p }, ctx).length;
    const pag = usePaged(lista, lista, 25, vista$.usePage());
    const quien = (id: string | null) => (id ? (gente?.find((g) => g.id === id)?.nombre ?? '') : '');
    const columnas = columnasSolicitudes({ nombreProyecto, nombrePersona: quien });
    const proyectosConSolicitud = useMemo(() => {
        const ids = new Set((estado.data ?? []).map((s) => s.proyectoId).filter(Boolean));
        return proyectos.filter((p) => ids.has(p.id));
    }, [estado.data, proyectos]);

    const conFiltros = !!(v.texto || v.estado || v.tipo || v.proyecto);
    const quitarFiltros = () => vista$.set({ texto: '', estado: '', tipo: '', proyecto: '' });
    const eliminarBorrador = (s: Solicitud) => {
        vista$.set({ ver: '' });
        const que = s.numero || (s.sustento.trim() ? `«${s.sustento.trim().slice(0, 40)}»` : 'de solicitud');
        borrar(s.id, { aviso: `Borrador ${que} eliminado.`, ejecutar: () => solicitudes().borrar(s.id), tocadas: ['solicitudes'] });
    };

    const vacia = conFiltros ? (
        <ListaVacia titulo="Ninguna solicitud coincide">
            Prueba con otra búsqueda o quita los filtros.
            <div className="mt-4">
                <Button variant="secondary" onClick={quitarFiltros}>
                    Quitar filtros
                </Button>
            </div>
        </ListaVacia>
    ) : v.pestana === 'liberar' ? (
        <ListaVacia titulo="Nada por liberar">Aquí aparecen las solicitudes de las etapas que apruebas o de las personas a tu cargo.</ListaVacia>
    ) : v.pestana === 'mias' && !(estado.data ?? []).some((s) => s.solicitanteId === perfil.id) ? (
        <ListaVacia titulo="Aún no tienes solicitudes">
            Crea una con «Nueva solicitud»: eliges el proyecto o a tu jefe, escribes el sustento y agregas los ítems.
        </ListaVacia>
    ) : (
        <ListaVacia titulo="No hay solicitudes">Las solicitudes que puedes ver aparecen aquí en cuanto alguien las crea.</ListaVacia>
    );

    return (
        <>
            <Encabezado
                titulo="Solicitudes"
                actualizado={estado.actualizado}
                accion={
                    <Button onClick={() => setCreando(true)}>
                        <Plus size={16} /> Nueva solicitud
                    </Button>
                }
            />
            <BarraPestanas
                activa={v.pestana}
                onCambiar={(pestana) => vista$.set({ pestana })}
                pestanas={[
                    { key: 'mias', label: 'Mis solicitudes', count: estado.data ? conteo('mias') : undefined },
                    { key: 'liberar', label: 'Por liberar', count: estado.data && teToca ? conteo('liberar') : undefined },
                    { key: 'todas', label: 'Todas' },
                ]}
            />
            <FilterRow>
                <SearchBox value={v.texto} onChange={(texto) => vista$.set({ texto })} placeholder="Busca por número, sustento o proyecto" />
                <SelectMenu
                    label="Estado"
                    className="w-52"
                    value={v.estado}
                    onChange={(e) => vista$.set({ estado: e as typeof v.estado })}
                    options={[{ value: '', label: 'Todos los estados' }, ...ESTADOS_SOLICITUD.map((e) => ({ value: e, label: e }))]}
                />
                <SelectMenu
                    label="Tipo"
                    className="w-44"
                    value={v.tipo}
                    onChange={(t) => vista$.set({ tipo: t as typeof v.tipo })}
                    options={[{ value: '', label: 'Todos los tipos' }, ...TIPOS_SOLICITUD.map((t) => ({ value: t, label: t }))]}
                />
                <SelectMenu
                    label="Proyecto"
                    className="w-60"
                    value={v.proyecto}
                    onChange={(proyecto) => vista$.set({ proyecto })}
                    options={[{ value: '', label: 'Todos los proyectos' }, ...proyectosConSolicitud.map((p) => ({ value: p.id, label: p.nombre }))]}
                />
                <div className="flex flex-wrap items-center gap-2.5 sm:ml-auto">
                    <SortSelect value={v.orden} onChange={(orden) => vista$.set({ orden })} options={ORDENES} />
                    <BotonExportar nombre="Solicitudes" columnas={columnas} filas={estado.data ? lista : []} />
                </div>
            </FilterRow>
            <Lista estado={{ data: estado.data ? lista : null, error: estado.error }} onReintentar={() => void solicitudesStore.retry()} vacia={vacia}>
                {() => (
                    <>
                        <p className="mb-2 text-small text-ink-3">
                            {lista.length} {lista.length === 1 ? 'solicitud' : 'solicitudes'}
                        </p>
                        <div className="overflow-x-auto">
                            <table className={T.table}>
                                <thead>
                                    <tr className={T.headRow}>
                                        <th className={T.th}>Solicitud</th>
                                        <th className={T.th}>Destino</th>
                                        <th className={`${T.th} hidden sm:table-cell`}>Estado</th>
                                        <th className={`${T.th} hidden md:table-cell`}>Solicitante</th>
                                        <th className={`${T.thNum} hidden sm:table-cell`}>Ítems</th>
                                        <th className={`${T.thNum} hidden sm:table-cell`}>Creada</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pag.rows.map((s) => (
                                        <tr
                                            key={s.id}
                                            tabIndex={0}
                                            className={`${T.row} ${FILA} ${v.ver === s.id ? 'bg-primary-soft' : ''}`}
                                            onClick={() => vista$.set({ ver: s.id })}
                                            onKeyDown={(e) => e.key === 'Enter' && vista$.set({ ver: s.id })}
                                        >
                                            <td className={T.td}>
                                                <div className="font-medium whitespace-nowrap">{s.numero || 'Borrador sin número'}</div>
                                                <div className={`${T.sub} max-w-72 truncate`}>{s.sustento || 'Sin sustento'}</div>
                                                <div className="mt-1 sm:hidden">
                                                    <Chip tone={tonoEstado(s.estado)}>{s.estado}</Chip>
                                                </div>
                                            </td>
                                            <td className={T.td}>
                                                {s.tipo === 'Proyecto' ? nombreProyecto(s.proyectoId) || 'Proyecto' : 'Administrativa'}
                                                {s.tipo === 'Administrativa' && s.jefeId && <div className={T.sub}>Libera {quien(s.jefeId)}</div>}
                                            </td>
                                            <td className={`${T.td} hidden sm:table-cell`}>
                                                <Chip tone={tonoEstado(s.estado)}>{s.estado}</Chip>
                                                {porLiberar.has(s.id) && (
                                                    <div className="mt-1 text-caption font-medium text-primary-strong">Te toca liberar</div>
                                                )}
                                            </td>
                                            <td className={`${T.td} hidden md:table-cell`}>
                                                {quien(s.solicitanteId) || <span className="text-ink-3">—</span>}
                                            </td>
                                            <td className={`${T.tdNum} hidden sm:table-cell`}>{s.nItems}</td>
                                            <td className={`${T.tdNum} hidden sm:table-cell`}>{dmy(s.creado)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <Pager paged={pag} />
                    </>
                )}
            </Lista>
            {v.ver && (
                <FichaSolicitud
                    id={v.ver}
                    onCerrar={() => vista$.set({ ver: '' })}
                    onAbrir={(id) => vista$.set({ ver: id })}
                    onEliminarBorrador={eliminarBorrador}
                />
            )}
            {creando && <FormSolicitud onCerrar={() => setCreando(false)} onCreado={(id) => (setCreando(false), vista$.set({ ver: id, pestana: 'mias' }))} />}
        </>
    );
}
