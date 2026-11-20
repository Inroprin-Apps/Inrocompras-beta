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
    filtrarSolicitudes,
    ordenarSolicitudes,
    tonoEstado,
    type OrdenSolicitud,
    type Pestana,
} from '@/modules/solicitudes/application/views.ts';
import { FilterRow, SearchBox, SectionTitle, T } from '@/shared/ui/bits.tsx';
import { Button } from '@/shared/ui/button.tsx';
import { Chip } from '@/shared/ui/card.tsx';
import { dmy } from '@/shared/ui/format.ts';
import { Lista, ListaVacia } from '@/shared/ui/lista-estado.tsx';
import { Pager, SortSelect, usePaged } from '@/shared/ui/pager.tsx';
import { SelectMenu } from '@/shared/ui/select-menu.tsx';
import { usePerfil } from '../_components/perfil.tsx';
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

const vista$ = urlState(
    { ...FILTROS_SOLICITUD, orden: 'recientes' as OrdenSolicitud, page: '1', ver: '' },
    { pestana: 'pestana', estado: 'estado', tipo: 'tipo', proyecto: 'proyecto', texto: 'texto', orden: 'orden', page: 'pag', ver: 'ver' },
    { pestana: PESTANAS, estado: ['', ...ESTADOS_SOLICITUD], tipo: ['', ...TIPOS_SOLICITUD], orden: ORDENES.map((o) => o.value) },
);

export function SolicitudesView() {
    const perfil = usePerfil();
    const estado = solicitudesStore.use();
    const proyectos = proyectosStore.use().data ?? [];
    const gente = personasStore.use().data;
    const teToca = teTocaStore.use().data;
    const v = vista$.use();
    const [creando, setCreando] = useState(false);

    const porLiberar = useMemo(() => new Set((teToca ?? []).filter((t) => t.tabla === 'solicitudes' && t.paso === 'Liberar solicitud').map((t) => t.id)), [teToca]);
    const nombreProyecto = useMemo(() => {
        const m = new Map(proyectos.map((p) => [p.id, p.nombre]));
        return (id: string | null) => (id ? (m.get(id) ?? '') : '');
    }, [proyectos]);
    const ctx = useMemo(() => ({ yo: perfil.id, porLiberar, nombreProyecto }), [perfil.id, porLiberar, nombreProyecto]);

    const lista = useMemo(() => ordenarSolicitudes(filtrarSolicitudes(estado.data ?? [], v, ctx), v.orden), [estado.data, v, ctx]);
    const conteo = (p: Pestana) => filtrarSolicitudes(estado.data ?? [], { ...FILTROS_SOLICITUD, pestana: p }, ctx).length;
    const pag = usePaged(lista, lista, 25, vista$.usePage());
    const quien = (id: string) => gente?.find((g) => g.id === id)?.nombre ?? '';
    const proyectosConSolicitud = useMemo(() => {
        const ids = new Set((estado.data ?? []).map((s) => s.proyectoId).filter(Boolean));
        return proyectos.filter((p) => ids.has(p.id));
    }, [estado.data, proyectos]);

    const vacia =
        v.pestana === 'liberar' ? (
            <ListaVacia titulo="Nada por liberar">Aquí aparecen las solicitudes de las etapas que apruebas o de las personas a tu cargo.</ListaVacia>
        ) : v.pestana === 'mias' && !(estado.data ?? []).some((s) => s.solicitanteId === perfil.id) ? (
            <ListaVacia titulo="Aún no tienes solicitudes">Crea una con «Nueva solicitud»: eliges el proyecto o a tu jefe, escribes el sustento y agregas los ítems.</ListaVacia>
        ) : (
            <ListaVacia titulo="Ninguna solicitud coincide">Prueba con otra búsqueda o quita los filtros.</ListaVacia>
        );

    return (
        <>
            <div className="flex items-start gap-3">
                <div className="flex-1">
                    <SectionTitle title="Solicitudes" />
                </div>
                <Button onClick={() => setCreando(true)}>
                    <Plus size={16} /> Nueva solicitud
                </Button>
            </div>
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
                <SortSelect value={v.orden} onChange={(orden) => vista$.set({ orden })} options={ORDENES} />
            </FilterRow>
            <Lista estado={{ data: estado.data ? lista : null, error: estado.error }} onReintentar={() => void solicitudesStore.retry()} vacia={vacia}>
                {() => (
                    <>
                        <div className="overflow-x-auto">
                            <table className={T.table}>
                                <thead>
                                    <tr className={T.headRow}>
                                        <th className={T.th}>Solicitud</th>
                                        <th className={T.th}>Destino</th>
                                        <th className={T.th}>Estado</th>
                                        <th className={T.th}>Solicitante</th>
                                        <th className={T.thNum}>Ítems</th>
                                        <th className={T.thNum}>Creada</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pag.rows.map((s) => (
                                        <tr
                                            key={s.id}
                                            tabIndex={0}
                                            className={`${T.row} cursor-pointer ${v.ver === s.id ? 'bg-primary-soft' : ''}`}
                                            onClick={() => vista$.set({ ver: s.id })}
                                            onKeyDown={(e) => e.key === 'Enter' && vista$.set({ ver: s.id })}
                                        >
                                            <td className={T.td}>
                                                <div className="font-medium">{s.numero || 'Borrador sin número'}</div>
                                                <div className={`${T.sub} max-w-72 truncate`}>{s.sustento || 'Sin sustento'}</div>
                                            </td>
                                            <td className={T.td}>
                                                {s.tipo === 'Proyecto' ? nombreProyecto(s.proyectoId) || 'Proyecto' : 'Administrativa'}
                                                {s.tipo === 'Administrativa' && s.jefeId && <div className={T.sub}>Libera {quien(s.jefeId)}</div>}
                                            </td>
                                            <td className={T.td}>
                                                <Chip tone={tonoEstado(s.estado)}>{s.estado}</Chip>
                                                {porLiberar.has(s.id) && <div className="mt-1 text-caption font-medium text-primary-strong">Te toca liberar</div>}
                                            </td>
                                            <td className={T.td}>{quien(s.solicitanteId) || <span className="text-ink-3">—</span>}</td>
                                            <td className={T.tdNum}>{s.nItems}</td>
                                            <td className={T.tdNum}>{dmy(s.creado)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <Pager paged={pag} />
                    </>
                )}
            </Lista>
            {v.ver && <FichaSolicitud id={v.ver} onCerrar={() => vista$.set({ ver: '' })} onAbrir={(id) => vista$.set({ ver: id })} />}
            {creando && <FormSolicitud onCerrar={() => setCreando(false)} onCreado={(id) => (setCreando(false), vista$.set({ ver: id, pestana: 'mias' }))} />}
        </>
    );
}
