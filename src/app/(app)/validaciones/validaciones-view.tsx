'use client';

// Validaciones técnicas (C-16): los ítems agrupados por requerimiento, por defecto los pendientes. Se marcan uno o
// varios y se registra el resultado en bloque (ac_item_tecnica por ítem); si alguno falla, se dice cuál y por qué.
// Filtros en la URL (?estado=&proyecto=&texto=&ver=); ?ver=<item_id> abre la ficha del ítem (así enlaza la bandeja).
import { useMemo, useState } from 'react';
import { CheckCheck } from 'lucide-react';
import {
    FILTROS_TECNICA,
    VALIDACIONES,
    agruparPorRequerimiento,
    filtrarTecnica,
    tonoValidacion,
    type ItemTecnica,
} from '@/modules/requerimientos/application/views.ts';
import { FilterRow, Notice, SearchBox, SectionTitle } from '@/shared/ui/bits.tsx';
import { Button } from '@/shared/ui/button.tsx';
import { Chip } from '@/shared/ui/card.tsx';
import { Lista, ListaVacia } from '@/shared/ui/lista-estado.tsx';
import { SelectMenu } from '@/shared/ui/select-menu.tsx';
import { usePerfil } from '../_components/perfil.tsx';
import { urlState } from '../_lib/url-state.ts';
import { proyectosStore } from '../proyectos/store.ts';
import { FichaItemTecnica } from './ficha-item.tsx';
import { DialogoTecnica, type Fallo } from './form-tecnica.tsx';
import { tecnicaStore } from './store.ts';

const fmtNum = new Intl.NumberFormat('es-PE', { maximumFractionDigits: 3 });

const vista$ = urlState(
    { ...FILTROS_TECNICA, ver: '' },
    { estado: 'estado', proyecto: 'proyecto', texto: 'texto', ver: 'ver' },
    { estado: ['', ...VALIDACIONES] },
);

export function ValidacionesView() {
    const perfil = usePerfil();
    const estado = tecnicaStore.use();
    const proyectosLeidos = proyectosStore.use().data;
    const proyectos = useMemo(() => proyectosLeidos ?? [], [proyectosLeidos]);
    const v = vista$.use();
    const [marcados, setMarcados] = useState<Set<string>>(new Set());
    const [dialogo, setDialogo] = useState(false);
    const [fallos, setFallos] = useState<Fallo[]>([]);

    const nombreProyecto = useMemo(() => {
        const m = new Map(proyectos.map((p) => [p.id, p.nombre]));
        return (id: string | null) => (id ? (m.get(id) ?? '') : '');
    }, [proyectos]);
    const lista = useMemo(() => filtrarTecnica(estado.data ?? [], v, nombreProyecto), [estado.data, v, nombreProyecto]);
    const grupos = useMemo(() => agruparPorRequerimiento(lista), [lista]);
    const visibles = new Set(lista.map((i) => i.id));
    const elegidos = lista.filter((i) => marcados.has(i.id));
    const conItems = useMemo(() => {
        const ids = new Set((estado.data ?? []).map((i) => i.req.proyectoId).filter(Boolean));
        return proyectos.filter((p) => ids.has(p.id));
    }, [estado.data, proyectos]);
    // Comodidad: la base decide (app.p_item_tecnica); quien no es de Técnica ve la lista sin casillas.
    const valida = perfil.area === 'Técnica' || perfil.roles.includes('TECNICA');

    const alternar = (ids: string[], on: boolean) =>
        setMarcados((m) => {
            const n = new Set(m);
            for (const id of ids)
                if (on) n.add(id);
                else n.delete(id);
            return n;
        });

    return (
        <>
            <SectionTitle title="Validaciones técnicas" />
            {!valida && (
                <Notice tone="info" cerrable={false}>
                    La validación técnica la registra el área Técnica. Aquí puedes ver en qué está cada ítem.
                </Notice>
            )}
            {fallos.length > 0 && (
                <Notice tone="danger" onClose={() => setFallos([])}>
                    <p className="font-medium">No se registraron {fallos.length} ítems:</p>
                    <ul className="mt-1 list-disc pl-5">
                        {fallos.map((f) => (
                            <li key={f.item.id}>
                                {f.item.descripcion}: {f.mensaje}
                            </li>
                        ))}
                    </ul>
                </Notice>
            )}
            <FilterRow>
                <SearchBox value={v.texto} onChange={(texto) => vista$.set({ texto })} placeholder="Busca por descripción, código, marca o requerimiento" />
                <SelectMenu
                    label="Validación"
                    className="w-48"
                    value={v.estado}
                    onChange={(e) => vista$.set({ estado: e as typeof v.estado })}
                    options={[{ value: '', label: 'Todas' }, ...VALIDACIONES.map((e) => ({ value: e, label: e === 'Pendiente' ? 'Pendientes' : e }))]}
                />
                <SelectMenu
                    label="Proyecto"
                    className="w-60"
                    value={v.proyecto}
                    onChange={(proyecto) => vista$.set({ proyecto })}
                    options={[{ value: '', label: 'Todos los proyectos' }, ...conItems.map((p) => ({ value: p.id, label: p.nombre }))]}
                />
            </FilterRow>
            {valida && elegidos.length > 0 && (
                <div className="sticky top-2 z-10 mb-3 flex flex-wrap items-center gap-3 rounded-card border border-primary-line bg-primary-soft px-4 py-2.5">
                    <span className="flex-1 text-ui font-medium text-primary-strong">
                        {elegidos.length} {elegidos.length === 1 ? 'ítem marcado' : 'ítems marcados'}
                    </span>
                    <Button variant="ghost" onClick={() => setMarcados(new Set())}>
                        Quitar marcas
                    </Button>
                    <Button onClick={() => setDialogo(true)}>
                        <CheckCheck size={16} /> Validar {elegidos.length}
                    </Button>
                </div>
            )}
            <Lista
                estado={{ data: estado.data ? lista : null, error: estado.error }}
                onReintentar={() => void tecnicaStore.retry()}
                vacia={
                    <ListaVacia titulo={v.estado === 'Pendiente' && !v.texto && !v.proyecto ? 'No hay ítems por validar' : 'Ningún ítem coincide'}>
                        {v.estado === 'Pendiente' && !v.texto && !v.proyecto
                            ? 'Los ítems llegan aquí cuando nace un requerimiento. Para revisar lo ya validado, elige «Todas».'
                            : 'Prueba con otra búsqueda o quita los filtros.'}
                    </ListaVacia>
                }
            >
                {() => (
                    <div className="flex flex-col gap-4">
                        {grupos.map((g) => {
                            const ids = g.items.map((i) => i.id);
                            const todos = ids.every((id) => marcados.has(id));
                            return (
                                <section key={g.req.id} className="rounded-card border border-line bg-surface">
                                    <header className="flex items-center gap-3 border-b border-divider px-4 py-3">
                                        {valida && (
                                            <input
                                                type="checkbox"
                                                className="size-4 flex-none accent-primary"
                                                aria-label={`Marcar todos los ítems de ${g.req.numero || 'este requerimiento'}`}
                                                checked={todos}
                                                onChange={(e) => alternar(ids, e.target.checked)}
                                            />
                                        )}
                                        <div className="min-w-0 flex-1">
                                            <h2 className="text-heading font-semibold">{g.req.numero || 'Requerimiento en proceso'}</h2>
                                            <div className="truncate text-small text-ink-2">{nombreProyecto(g.req.proyectoId) || g.req.motivo}</div>
                                        </div>
                                        <span className="rounded-full bg-surface-3 px-2 py-px text-caption font-medium tabular-nums">{g.items.length}</span>
                                    </header>
                                    <ul>
                                        {g.items.map((i) => (
                                            <FilaTecnica
                                                key={i.id}
                                                i={i}
                                                valida={valida}
                                                marcado={marcados.has(i.id)}
                                                abierto={v.ver === i.id}
                                                onMarcar={(on) => alternar([i.id], on)}
                                                onAbrir={() => vista$.set({ ver: i.id })}
                                            />
                                        ))}
                                    </ul>
                                </section>
                            );
                        })}
                    </div>
                )}
            </Lista>
            {v.ver && <FichaItemTecnica id={v.ver} valida={valida} onCerrar={() => vista$.set({ ver: '' })} />}
            {dialogo && (
                <DialogoTecnica
                    items={elegidos.filter((i) => visibles.has(i.id))}
                    onCerrar={() => setDialogo(false)}
                    onHecho={(f) => {
                        setDialogo(false);
                        setFallos(f);
                        setMarcados(new Set(f.map((x) => x.item.id)));
                    }}
                />
            )}
        </>
    );
}

function FilaTecnica({
    i,
    valida,
    marcado,
    abierto,
    onMarcar,
    onAbrir,
}: {
    i: ItemTecnica;
    valida: boolean;
    marcado: boolean;
    abierto: boolean;
    onMarcar: (on: boolean) => void;
    onAbrir: () => void;
}) {
    return (
        <li
            className={`flex items-start gap-3 border-b border-divider px-4 py-3 last:border-b-0 ${abierto ? 'bg-primary-soft' : marcado ? 'bg-surface-2' : ''}`}
        >
            {valida && (
                <input
                    type="checkbox"
                    className="mt-1 size-4 flex-none accent-primary"
                    aria-label={`Marcar ${i.descripcion}`}
                    checked={marcado}
                    onChange={(e) => onMarcar(e.target.checked)}
                />
            )}
            <button type="button" onClick={onAbrir} className="min-w-0 flex-1 cursor-pointer text-left focus-visible:outline-2 focus-visible:outline-primary">
                <div className="text-ui font-medium break-words">
                    <span className="mr-1.5 text-ink-3 tabular-nums">{i.nItem ?? '—'}</span>
                    {i.descripcion}
                </div>
                <div className="text-small text-ink-2">
                    {[`${fmtNum.format(i.cantidad)} ${i.unidad}`, i.tipo, i.codigoCliente, i.codigoSidige && `SKU ${i.codigoSidige}`, i.canal]
                        .filter(Boolean)
                        .join(' · ')}
                </div>
                {(i.marca || i.modelo) && <div className="text-small text-ink-2">{[i.marca, i.modelo].filter(Boolean).join(' · ')}</div>}
                {i.validacionTecnica === 'Observado' && i.tecMotivo && <div className="text-small text-warning-strong">«{i.tecMotivo}»</div>}
            </button>
            <Chip tone={tonoValidacion(i.validacionTecnica)}>{i.validacionTecnica}</Chip>
        </li>
    );
}
