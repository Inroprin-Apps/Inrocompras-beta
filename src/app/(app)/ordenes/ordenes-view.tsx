'use client';

// Órdenes: pestañas por rol («Mías» para Compras, «Por aprobar» para CG/GOP/GAF, «Todas»), filtros en la URL
// (?tab=&estatus=&aprob=&proc=&proyecto=&prov=&comprador=&texto=&orden=&pag=&ver=) y la ficha lateral.
// «Por aprobar» no repite la regla: son las órdenes que la base pone en tu «Te toca» (te_toca()).
// En el celular la lista es de tarjetas: el aprobador toca la orden y luego «Aprobar» (3 toques desde el menú).
import { useMemo } from 'react';
import {
    ESTADOS_APROBACION,
    ESTATUS,
    FILTROS_ORDEN,
    PROCEDENCIAS,
    dePestana,
    filtrarOrdenes,
    monto,
    nombreOrden,
    ordenarOrdenes,
    tonoAprobacion,
    tonoEstatus,
    type Orden,
    type OrdenOrden,
    type PestanaOrden,
} from '@/modules/ordenes/application/views.ts';
import { FilterRow, SearchBox, T } from '@/shared/ui/bits.tsx';
import { Button } from '@/shared/ui/button.tsx';
import { Chip, Segmented } from '@/shared/ui/card.tsx';
import { Encabezado } from '@/shared/ui/encabezado.tsx';
import { dmy } from '@/shared/ui/format.ts';
import { Lista, ListaVacia } from '@/shared/ui/lista-estado.tsx';
import { Pager, SortSelect, usePaged } from '@/shared/ui/pager.tsx';
import { SelectMenu } from '@/shared/ui/select-menu.tsx';
import { usePerfil } from '../_components/perfil.tsx';
import { personasStore, teTocaStore } from '../_lib/stores.ts';
import { urlState } from '../_lib/url-state.ts';
import { proyectosStore } from '../proyectos/store.ts';
import { FichaOrden } from './ficha-orden.tsx';
import { ordenesStore, proveedoresStore } from './store.ts';

const ORDENES: { value: OrdenOrden; label: string }[] = [
    { value: 'recientes', label: 'Más recientes' },
    { value: 'numero', label: 'Número' },
    { value: 'monto', label: 'Monto' },
];
const PESTANAS: PestanaOrden[] = ['mias', 'aprobar', 'todas'];
const PASOS_APROBAR = new Set(['Validar presupuesto', 'Aprobar orden']);

const vista$ = urlState(
    { tab: '', ...FILTROS_ORDEN, orden: 'recientes' as OrdenOrden, page: '1', ver: '' },
    {
        tab: 'tab',
        estatus: 'estatus',
        aprobacion: 'aprob',
        procedencia: 'proc',
        proyecto: 'proyecto',
        proveedor: 'prov',
        comprador: 'comprador',
        texto: 'texto',
        orden: 'orden',
        page: 'pag',
        ver: 'ver',
    },
    { tab: ['', ...PESTANAS], procedencia: ['', ...PROCEDENCIAS], orden: ORDENES.map((o) => o.value) },
);

export function OrdenesView() {
    const perfil = usePerfil();
    const estado = ordenesStore.use();
    const gente = personasStore.use().data;
    const proyectos = proyectosStore.use().data;
    const proveedores = proveedoresStore.use().data;
    const teToca = teTocaStore.use().data;
    const v = vista$.use();

    const aprobador = perfil.roles.some((r) => r === 'CONTROL_GESTION' || r === 'GOP' || r === 'GAF');
    const pestanas = PESTANAS.filter((p) => (p === 'mias' ? perfil.es_compras : p === 'aprobar' ? aprobador : true));
    const tab: PestanaOrden = pestanas.includes(v.tab as PestanaOrden) ? (v.tab as PestanaOrden) : pestanas[0];

    const porAprobar = useMemo(() => new Set((teToca ?? []).filter((t) => t.tabla === 'ordenes' && PASOS_APROBAR.has(t.paso)).map((t) => t.id)), [teToca]);
    const todas = estado.data ?? [];
    const cuenta = (p: PestanaOrden) => dePestana(todas, p, perfil.id, porAprobar).length;
    const lista = useMemo(
        () => ordenarOrdenes(filtrarOrdenes(dePestana(estado.data ?? [], tab, perfil.id, porAprobar), v), v.orden),
        [estado.data, tab, perfil.id, porAprobar, v],
    );
    const pag = usePaged(lista, lista, 25, vista$.usePage());
    const abierto = v.ver || null;
    const nombre = (id: string) => gente?.find((g) => g.id === id)?.nombre ?? '';

    if (!perfil.ve_precios) {
        return (
            <>
                <Encabezado titulo="Órdenes" />
                <ListaVacia titulo="Las órdenes llevan montos">
                    Tu perfil no ve precios. El avance de cada ítem (si tiene orden, su estado y si está pagado) está en Seguimiento.
                </ListaVacia>
            </>
        );
    }

    const compradores = [...new Set(todas.map((o) => o.compradorId))];
    const conFiltros = Object.entries(FILTROS_ORDEN).some(([k, d]) => v[k as keyof typeof FILTROS_ORDEN] !== d);

    return (
        <>
            <Encabezado titulo="Órdenes" actualizado={estado.actualizado} />
            {pestanas.length > 1 && (
                <div className="mb-3.5 overflow-x-auto">
                    <Segmented
                        value={tab}
                        onChange={(t) => vista$.set({ tab: t })}
                        options={pestanas.map((p) => ({
                            value: p,
                            label: `${p === 'mias' ? 'Mías' : p === 'aprobar' ? 'Por aprobar' : 'Todas'}${estado.data ? ` (${cuenta(p)})` : ''}`,
                        }))}
                    />
                </div>
            )}
            <FilterRow>
                <SearchBox value={v.texto} onChange={(texto) => vista$.set({ texto })} placeholder="Busca por número, proveedor o proyecto" />
                <SelectMenu
                    label="Estatus"
                    className="w-52"
                    value={v.estatus}
                    onChange={(estatus) => vista$.set({ estatus })}
                    options={[{ value: '', label: 'Todos los estatus' }, ...ESTATUS.map((e) => ({ value: e, label: e }))]}
                />
                <SelectMenu
                    label="Aprobación"
                    className="w-48"
                    value={v.aprobacion}
                    onChange={(aprobacion) => vista$.set({ aprobacion })}
                    options={[{ value: '', label: 'Toda aprobación' }, ...ESTADOS_APROBACION.map((e) => ({ value: e, label: e }))]}
                />
                <SelectMenu
                    label="Procedencia"
                    className="w-40"
                    value={v.procedencia}
                    onChange={(p) => vista$.set({ procedencia: p as typeof v.procedencia })}
                    options={[{ value: '', label: 'Toda procedencia' }, ...PROCEDENCIAS.map((e) => ({ value: e, label: e }))]}
                />
                <SelectMenu
                    label="Proyecto"
                    className="w-52"
                    value={v.proyecto}
                    onChange={(proyecto) => vista$.set({ proyecto })}
                    options={[
                        { value: '', label: 'Todos los proyectos' },
                        { value: 'sin', label: 'Sin proyecto' },
                        ...(proyectos ?? []).map((p) => ({ value: p.id, label: [p.codigo, p.nombre].filter(Boolean).join(' · ') })),
                    ]}
                />
                <SelectMenu
                    label="Proveedor"
                    className="w-52"
                    value={v.proveedor}
                    onChange={(proveedor) => vista$.set({ proveedor })}
                    options={[{ value: '', label: 'Todos los proveedores' }, ...(proveedores ?? []).map((p) => ({ value: p.id, label: p.razonSocial }))]}
                />
                {tab !== 'mias' && (
                    <SelectMenu
                        label="Comprador"
                        className="w-48"
                        value={v.comprador}
                        onChange={(comprador) => vista$.set({ comprador })}
                        options={[{ value: '', label: 'Todo comprador' }, ...compradores.map((id) => ({ value: id, label: nombre(id) || 'Otra persona' }))]}
                    />
                )}
                <SortSelect value={v.orden} onChange={(orden) => vista$.set({ orden })} options={ORDENES} />
            </FilterRow>
            <Lista
                estado={{ data: estado.data ? lista : null, error: estado.error }}
                onReintentar={() => void ordenesStore.retry()}
                vacia={
                    <ListaVacia
                        titulo={
                            conFiltros
                                ? 'Ninguna orden coincide'
                                : tab === 'aprobar'
                                  ? 'No tienes órdenes por aprobar'
                                  : tab === 'mias'
                                    ? 'Aún no tienes órdenes'
                                    : 'Aún no hay órdenes'
                        }
                    >
                        {conFiltros ? (
                            <>
                                <p>Prueba con otra búsqueda o quita los filtros.</p>
                                <Button className="mt-4" variant="secondary" onClick={() => vista$.set({ ...FILTROS_ORDEN })}>
                                    Quitar filtros
                                </Button>
                            </>
                        ) : tab === 'aprobar' ? (
                            'Aquí aparecen las que esperan tu firma.'
                        ) : perfil.es_compras ? (
                            'Las órdenes se generan desde el Plan de compras: marca las líneas y pulsa «Generar OC».'
                        ) : (
                            'Cuando Compras emita una orden, aparecerá aquí.'
                        )}
                    </ListaVacia>
                }
            >
                {() => (
                    <>
                        <ul className="flex flex-col gap-2 md:hidden">
                            {pag.rows.map((o) => (
                                <li key={o.id}>
                                    <button
                                        type="button"
                                        onClick={() => vista$.set({ ver: o.id })}
                                        className={`flex w-full flex-col gap-1.5 rounded-card border border-line px-4 py-3 text-left ${v.ver === o.id ? 'bg-primary-soft' : 'bg-surface'} focus-visible:outline-2 focus-visible:outline-primary active:bg-surface-2`}
                                    >
                                        <div className="flex items-start gap-2">
                                            <span className="min-w-0 flex-1 truncate text-ui font-semibold">{nombreOrden(o)}</span>
                                            <span className="text-ui font-medium tabular-nums">{monto(o.monto, o.moneda)}</span>
                                        </div>
                                        <div className="truncate text-small text-ink-2">
                                            {o.proveedor || 'Sin proveedor'}
                                            {o.proyecto && ` · ${o.proyecto}`}
                                        </div>
                                        <div className="flex flex-wrap gap-1.5">
                                            <Chip tone={tonoEstatus(o.estatus)}>{o.estatus}</Chip>
                                            {o.estadoAprobacion && o.estadoAprobacion !== o.estatus && (
                                                <Chip tone={tonoAprobacion(o.estadoAprobacion)}>{o.estadoAprobacion}</Chip>
                                            )}
                                        </div>
                                    </button>
                                </li>
                            ))}
                        </ul>
                        <div className="hidden overflow-x-auto md:block">
                            <table className={T.table}>
                                <thead>
                                    <tr className={T.headRow}>
                                        <th className={T.th}>Orden</th>
                                        <th className={T.th}>Proyecto</th>
                                        <th className={T.th}>Estatus</th>
                                        <th className={T.th}>Aprobación</th>
                                        <th className={`${T.thNum} text-right`}>Total</th>
                                        <th className={`${T.thNum} text-right`}>Fecha</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pag.rows.map((o) => (
                                        <FilaOrden key={o.id} o={o} activa={v.ver === o.id} comprador={nombre(o.compradorId)} />
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <Pager paged={pag} />
                    </>
                )}
            </Lista>
            {abierto && <FichaOrden id={abierto} onCerrar={() => vista$.set({ ver: '' })} />}
        </>
    );
}

function FilaOrden({ o, activa, comprador }: { o: Orden; activa: boolean; comprador: string }) {
    return (
        <tr
            tabIndex={0}
            className={`${T.row} cursor-pointer focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary ${activa ? 'bg-primary-soft' : ''}`}
            onClick={() => vista$.set({ ver: o.id })}
            onKeyDown={(e) => e.key === 'Enter' && vista$.set({ ver: o.id })}
        >
            <td className={T.td}>
                <div className="font-medium">{nombreOrden(o)}</div>
                <div className={T.sub}>
                    {o.proveedor || 'Sin proveedor'}
                    {comprador && ` · ${comprador}`}
                </div>
            </td>
            <td className={T.td}>{o.proyecto || <span className="text-ink-3">Sin proyecto</span>}</td>
            <td className={T.td}>
                <Chip tone={tonoEstatus(o.estatus)}>{o.estatus}</Chip>
            </td>
            <td className={T.td}>
                {o.estadoAprobacion ? <Chip tone={tonoAprobacion(o.estadoAprobacion)}>{o.estadoAprobacion}</Chip> : <span className="text-ink-3">—</span>}
                {o.tipoAprobacion && <div className={T.sub}>{o.tipoAprobacion}</div>}
            </td>
            <td className={`${T.tdNum} text-right`}>
                {monto(o.monto, o.moneda)}
                {o.moneda !== 'PEN' && <div className={T.sub}>{monto(o.montoSoles)}</div>}
            </td>
            <td className={`${T.tdNum} text-right`}>{dmy(o.fechaEmision ?? o.creado)}</td>
        </tr>
    );
}
