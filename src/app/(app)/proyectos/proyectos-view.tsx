'use client';

// Proyectos: la lista (filtros y página en la URL: ?estado=&texto=&orden=&pag=&ver=) y la ficha lateral
// con los datos, las etapas y sus aprobadores, «Lo que te toca» (ganado / perdido) y el historial.
// PATRÓN DE REFERENCIA para las demás pantallas: store → urlState → lista con sus 5 estados → ficha.
import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import {
    ESTADOS_PROYECTO,
    FILTROS_PROYECTO,
    filtrarProyectos,
    ordenarProyectos,
    tonoEstado,
    type OrdenProyecto,
    type Proyecto,
} from '@/modules/proyectos/application/views.ts';
import { FilterRow, SearchBox, SectionTitle, T } from '@/shared/ui/bits.tsx';
import { Button } from '@/shared/ui/button.tsx';
import { Chip } from '@/shared/ui/card.tsx';
import { dmy } from '@/shared/ui/format.ts';
import { Lista, ListaVacia } from '@/shared/ui/lista-estado.tsx';
import { Pager, SortSelect, usePaged } from '@/shared/ui/pager.tsx';
import { SelectMenu } from '@/shared/ui/select-menu.tsx';
import { usePerfil } from '../_components/perfil.tsx';
import { personasStore } from '../_lib/stores.ts';
import { urlState } from '../_lib/url-state.ts';
import { FichaProyecto } from './ficha-proyecto.tsx';
import { FormProyecto } from './form-proyecto.tsx';
import { proyectosStore } from './store.ts';

const ORDENES: { value: OrdenProyecto; label: string }[] = [
    { value: 'recientes', label: 'Más recientes' },
    { value: 'nombre', label: 'Nombre' },
    { value: 'codigo', label: 'Código' },
];

const vista$ = urlState(
    { ...FILTROS_PROYECTO, orden: 'recientes' as OrdenProyecto, page: '1', ver: '' },
    { estado: 'estado', texto: 'texto', orden: 'orden', page: 'pag', ver: 'ver' },
    { estado: ['', ...ESTADOS_PROYECTO], orden: ORDENES.map((o) => o.value) },
);

/** Quién da de alta proyectos (comodidad: lo decide RLS, «alta» en 0002_seguridad.sql). */
const puedeCrear = (area: string, admin: boolean) => admin || ['Comercial', 'Control de Gestión', 'Gerencia', 'Planeamiento'].includes(area);

export function ProyectosView() {
    const perfil = usePerfil();
    const estado = proyectosStore.use();
    const gente = personasStore.use().data;
    const v = vista$.use();
    const [creando, setCreando] = useState(false);

    const lista = useMemo(() => ordenarProyectos(filtrarProyectos(estado.data ?? [], v), v.orden), [estado.data, v]);
    const pag = usePaged(lista, lista, 25, vista$.usePage());
    const abierto = estado.data?.find((p) => p.id === v.ver) ?? null;
    const gerente = (p: Proyecto) => gente?.find((g) => g.id === p.gerenteId)?.nombre ?? '';

    return (
        <>
            <div className="flex items-start gap-3">
                <div className="flex-1">
                    <SectionTitle title="Proyectos" />
                </div>
                {puedeCrear(perfil.area, perfil.es_admin) && (
                    <Button onClick={() => setCreando(true)}>
                        <Plus size={16} /> Nuevo proyecto
                    </Button>
                )}
            </div>
            <FilterRow>
                <SearchBox value={v.texto} onChange={(texto) => vista$.set({ texto })} placeholder="Busca por código, nombre o cliente" />
                <SelectMenu
                    label="Estado"
                    className="w-52"
                    value={v.estado}
                    onChange={(e) => vista$.set({ estado: e as typeof v.estado })}
                    options={[{ value: '', label: 'Todos los estados' }, ...ESTADOS_PROYECTO.map((e) => ({ value: e, label: e }))]}
                />
                <SortSelect value={v.orden} onChange={(orden) => vista$.set({ orden })} options={ORDENES} />
            </FilterRow>
            <Lista
                estado={{ data: estado.data ? lista : null, error: estado.error }}
                onReintentar={() => void proyectosStore.retry()}
                vacia={
                    <ListaVacia titulo={estado.data?.length ? 'Ningún proyecto coincide' : 'Aún no hay proyectos'}>
                        {estado.data?.length
                            ? 'Prueba con otra búsqueda o quita el filtro de estado.'
                            : 'Comercial, Control de Gestión o Planeamiento los dan de alta con «Nuevo proyecto».'}
                    </ListaVacia>
                }
            >
                {() => (
                    <>
                        <div className="overflow-x-auto">
                            <table className={T.table}>
                                <thead>
                                    <tr className={T.headRow}>
                                        <th className={T.th}>Proyecto</th>
                                        <th className={T.th}>Cliente</th>
                                        <th className={T.th}>Estado</th>
                                        <th className={T.th}>Gerente</th>
                                        <th className={T.thNum}>Fecha meta</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pag.rows.map((p) => (
                                        <tr
                                            key={p.id}
                                            tabIndex={0}
                                            className={`${T.row} cursor-pointer ${v.ver === p.id ? 'bg-primary-soft' : ''}`}
                                            onClick={() => vista$.set({ ver: p.id })}
                                            onKeyDown={(e) => e.key === 'Enter' && vista$.set({ ver: p.id })}
                                        >
                                            <td className={T.td}>
                                                <div className="font-medium">{p.nombre}</div>
                                                <div className={T.sub}>{p.codigo || 'Sin código'}</div>
                                            </td>
                                            <td className={T.td}>{p.cliente || <span className="text-ink-3">—</span>}</td>
                                            <td className={T.td}>
                                                <Chip tone={tonoEstado(p.estado)}>{p.estado}</Chip>
                                            </td>
                                            <td className={T.td}>{gerente(p) || <span className="text-ink-3">—</span>}</td>
                                            <td className={T.tdNum}>{p.fechaMeta ? dmy(p.fechaMeta) : '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <Pager paged={pag} />
                    </>
                )}
            </Lista>
            {abierto && <FichaProyecto proyecto={abierto} onCerrar={() => vista$.set({ ver: '' })} />}
            {creando && <FormProyecto onCerrar={() => setCreando(false)} onCreado={(id) => (setCreando(false), vista$.set({ ver: id }))} />}
        </>
    );
}
