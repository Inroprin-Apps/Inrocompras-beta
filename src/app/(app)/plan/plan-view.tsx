'use client';

// Plan de compras (docs/05): una fila por ítem de requerimiento del proyecto elegido, con su saldo, validación
// técnica, canal, fechas, semáforo, criticidad, órdenes y si está pagado. Filtros en la URL
// (?proyecto=&estado=&canal=&semaforo=&validacion=&texto=&pag=). Lee public.plan_compras (sin montos: Planeamiento
// también lo ve). Compras e Importaciones marcan líneas y pulsan «Generar OC» (el carrito): si una línea no se puede
// marcar, se explica por qué (bloqueada, sin saldo, otro canal u otro proyecto).
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ShoppingCart } from 'lucide-react';
import {
    ESTADOS_PLAN,
    FILTROS_PLAN,
    SEMAFOROS,
    calcular,
    etiquetaSemaforo,
    filtrarPlan,
    hoyLima,
    motivoNoMarcar,
    ordenarPlan,
    resumir,
    tonoCriticidad,
    tonoSemaforo,
    type FilaPlan,
} from '@/modules/plan/application/views.ts';
import { FilterRow, SearchBox, SectionTitle, T } from '@/shared/ui/bits.tsx';
import { Button } from '@/shared/ui/button.tsx';
import { Chip, Kpi } from '@/shared/ui/card.tsx';
import { dmy } from '@/shared/ui/format.ts';
import { Lista, ListaVacia } from '@/shared/ui/lista-estado.tsx';
import { Pager, usePaged } from '@/shared/ui/pager.tsx';
import { SelectMenu } from '@/shared/ui/select-menu.tsx';
import { toast } from '@/shared/ui/toaster.tsx';
import { usePerfil } from '../_components/perfil.tsx';
import { catalogosStore } from '../_lib/stores.ts';
import { urlState } from '../_lib/url-state.ts';
import { proyectosStore } from '../proyectos/store.ts';
import { FormGenerarOc } from './form-generar-oc.tsx';
import { planStore } from './store.ts';

const vista$ = urlState(
    { proyecto: '', ...FILTROS_PLAN, page: '1' },
    { proyecto: 'proyecto', estado: 'estado', canal: 'canal', semaforo: 'semaforo', validacion: 'validacion', texto: 'texto', page: 'pag' },
    {
        estado: ['', ...ESTADOS_PLAN.map((e) => e.value)],
        canal: ['', 'Nacional', 'Importación'],
        semaforo: ['', ...SEMAFOROS.map((s) => s.value)],
        validacion: ['', 'pendiente'],
    },
);

const cant = (n: number) => new Intl.NumberFormat('es-PE', { maximumFractionDigits: 3 }).format(n);

export function PlanView() {
    const perfil = usePerfil();
    const v = vista$.use();
    const proyectos = proyectosStore.use().data;
    const config = catalogosStore.use().data?.config;
    const [marcadas, setMarcadas] = useState<string[]>([]);
    const [carrito, setCarrito] = useState(false);

    // Sin proyecto en la URL: el primer proyecto ganado (o todo, si no hay ninguno).
    const ganados = (proyectos ?? []).filter((p) => p.estado === 'Ganado');
    const alcance = v.proyecto || (proyectos ? (ganados[0]?.id ?? 'todos') : null);
    const estado = planStore.use(alcance);
    const compra = perfil.es_compras;

    const cfg = useMemo(
        () => ({
            hoy: hoyLima(),
            diasAlerta: Number(config?.dias_alerta_plan ?? 7) || 7,
            exigirValidacion: config?.exigir_validacion_tecnica !== false,
        }),
        [config],
    );
    const filas = useMemo(() => (estado.data ? calcular(estado.data, cfg) : null), [estado.data, cfg]);
    const lista = useMemo(() => (filas ? ordenarPlan(filtrarPlan(filas, v)) : []), [filas, v]);
    const pag = usePaged(lista, lista, 50, vista$.usePage());
    const resumen = filas ? resumir(filas) : null;
    const elegidas = (filas ?? []).filter((f) => marcadas.includes(f.itemId));

    function cambiarAlcance(proyecto: string) {
        setMarcadas([]);
        vista$.set({ proyecto });
    }
    function marcar(f: FilaPlan) {
        if (marcadas.includes(f.itemId)) return setMarcadas(marcadas.filter((x) => x !== f.itemId));
        const motivo = motivoNoMarcar(f, elegidas);
        if (motivo) return toast.error(motivo);
        setMarcadas([...marcadas, f.itemId]);
    }

    const opcionesProyecto = [
        ...ganados.map((p) => ({ value: p.id, label: [p.codigo, p.nombre].filter(Boolean).join(' · ') })),
        ...(proyectos ?? [])
            .filter((p) => p.estado !== 'Ganado')
            .map((p) => ({ value: p.id, label: `${[p.codigo, p.nombre].filter(Boolean).join(' · ')} (${p.estado.toLowerCase()})` })),
        { value: 'sin', label: 'Sin proyecto (administrativas)' },
        { value: 'todos', label: 'Todos los proyectos' },
    ];
    const conFiltros = Object.entries(FILTROS_PLAN).some(([k, d]) => v[k as keyof typeof FILTROS_PLAN] !== d);

    return (
        <>
            <SectionTitle title="Plan de compras" />
            <FilterRow>
                <SelectMenu
                    label="Proyecto"
                    className="w-full sm:w-80"
                    value={alcance ?? ''}
                    onChange={cambiarAlcance}
                    options={opcionesProyecto}
                    placeholder="Cargando proyectos…"
                />
            </FilterRow>
            <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
                <Kpi label="Líneas" value={resumen?.lineas ?? null} />
                <Kpi label="Por comprar" value={resumen?.porComprar ?? null} />
                <Kpi label="Vencidas" value={resumen?.vencidas ?? null} risk={!!resumen?.vencidas} />
                <Kpi label={`Vencen en ${cfg.diasAlerta} días`} value={resumen?.porVencer ?? null} />
                <Kpi label="Sin validación técnica" value={resumen?.validacionPendiente ?? null} />
            </div>
            <FilterRow>
                <SearchBox value={v.texto} onChange={(texto) => vista$.set({ texto })} placeholder="Busca por código, SKU, descripción, RC u OC" />
                <SelectMenu
                    label="Estado"
                    className="w-40"
                    value={v.estado}
                    onChange={(e) => vista$.set({ estado: e as typeof v.estado })}
                    options={[{ value: '', label: 'Todo estado' }, ...ESTADOS_PLAN]}
                />
                <SelectMenu
                    label="Canal"
                    className="w-40"
                    value={v.canal}
                    onChange={(c) => vista$.set({ canal: c as typeof v.canal })}
                    options={[
                        { value: '', label: 'Todo canal' },
                        { value: 'Nacional', label: 'Nacional' },
                        { value: 'Importación', label: 'Importación' },
                    ]}
                />
                <SelectMenu
                    label="Semáforo"
                    className="w-44"
                    value={v.semaforo}
                    onChange={(s) => vista$.set({ semaforo: s as typeof v.semaforo })}
                    options={[{ value: '', label: 'Todo semáforo' }, ...SEMAFOROS]}
                />
                <SelectMenu
                    label="Validación técnica"
                    className="w-52"
                    value={v.validacion}
                    onChange={(x) => vista$.set({ validacion: x as typeof v.validacion })}
                    options={[
                        { value: '', label: 'Toda validación' },
                        { value: 'pendiente', label: 'Validación pendiente' },
                    ]}
                />
            </FilterRow>
            <Lista
                estado={{ data: filas ? lista : null, error: estado.error }}
                onReintentar={() => alcance && void planStore.reload(alcance)}
                vacia={
                    <ListaVacia titulo={conFiltros ? 'Ninguna línea coincide' : 'Este plan aún no tiene líneas'}>
                        {conFiltros
                            ? 'Prueba con otra búsqueda o quita algún filtro.'
                            : 'Las líneas llegan cuando se libera una solicitud del proyecto y se crea su requerimiento.'}
                    </ListaVacia>
                }
            >
                {() => (
                    <>
                        <ul className="flex flex-col gap-2 md:hidden">
                            {pag.rows.map((f) => (
                                <TarjetaPlan
                                    key={f.itemId}
                                    f={f}
                                    compra={compra}
                                    marcada={marcadas.includes(f.itemId)}
                                    onMarcar={() => marcar(f)}
                                    verOc={perfil.ve_precios}
                                />
                            ))}
                        </ul>
                        <div className="hidden overflow-x-auto md:block">
                            <table className={T.table}>
                                <thead>
                                    <tr className={T.headRow}>
                                        {compra && (
                                            <th className={T.th}>
                                                <span className="sr-only">Marcar</span>
                                            </th>
                                        )}
                                        <th className={T.th}>Ítem</th>
                                        <th className={`${T.thNum} text-right`}>Cantidad</th>
                                        <th className={`${T.thNum} text-right`}>Saldo</th>
                                        <th className={T.th}>Validación técnica</th>
                                        <th className={T.thNum}>Fechas</th>
                                        <th className={T.th}>Semáforo</th>
                                        <th className={T.th}>OC</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pag.rows.map((f) => (
                                        <FilaTabla
                                            key={f.itemId}
                                            f={f}
                                            compra={compra}
                                            marcada={marcadas.includes(f.itemId)}
                                            onMarcar={() => marcar(f)}
                                            verOc={perfil.ve_precios}
                                        />
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <Pager paged={pag} />
                    </>
                )}
            </Lista>
            {compra && elegidas.length > 0 && (
                <div className="sticky bottom-3 z-20 mt-4 flex flex-wrap items-center gap-3 rounded-card border border-primary-line bg-primary-soft px-4 py-3 shadow-float">
                    <ShoppingCart size={18} className="text-primary-strong" aria-hidden />
                    <span className="min-w-0 flex-1 text-ui">
                        <span className="font-semibold">{elegidas.length === 1 ? '1 línea' : `${elegidas.length} líneas`}</span> ·{' '}
                        {elegidas[0].canal?.toLowerCase()}
                    </span>
                    <Button variant="secondary" onClick={() => setMarcadas([])}>
                        Quitar todas
                    </Button>
                    <Button onClick={() => setCarrito(true)}>Generar OC</Button>
                </div>
            )}
            {carrito && <FormGenerarOc lineas={elegidas} onCerrar={() => setCarrito(false)} onCreada={() => setMarcadas([])} />}
        </>
    );
}

function Marca({ f, marcada, onMarcar }: { f: FilaPlan; marcada: boolean; onMarcar: () => void }) {
    const bloqueada = !!f.bloqueo || f.saldo <= 0;
    return (
        <input
            type="checkbox"
            checked={marcada}
            onChange={onMarcar}
            aria-label={`Marcar ${f.descripcion}`}
            title={f.bloqueo ?? (f.saldo <= 0 ? 'Sin saldo' : 'Marcar para generar la OC')}
            className={`size-4 cursor-pointer accent-primary ${bloqueada && !marcada ? 'opacity-40' : ''}`}
        />
    );
}

function Ocs({ f, verOc }: { f: FilaPlan; verOc: boolean }) {
    if (!f.ordenes.length) return <span className="text-ink-3">—</span>;
    return (
        <div className="flex flex-col gap-1">
            {f.ordenes.map((o) => (
                <div key={o.id} className="text-small">
                    {verOc ? (
                        <Link href={`/ordenes?ver=${o.id}`} className="font-medium text-primary hover:underline">
                            {o.numero ?? 'Borrador'}
                        </Link>
                    ) : (
                        <span className="font-medium">{o.numero ?? 'Borrador'}</span>
                    )}
                    {o.numero && <span className="text-ink-2"> · {o.estatus}</span>}
                </div>
            ))}
            {f.pagado && <Chip tone="ok">Pagado</Chip>}
        </div>
    );
}

function Validacion({ f }: { f: FilaPlan }) {
    const tono = f.validacion === 'Validado' || f.validacion === 'No aplica' ? 'ok' : f.validacion === 'Observado' ? 'warn' : 'muted';
    return (
        <>
            <Chip tone={tono}>{f.validacion}</Chip>
            {(f.marca || f.modelo) && <div className={T.sub}>{[f.marca, f.modelo].filter(Boolean).join(' · ')}</div>}
        </>
    );
}

function Fechas({ f }: { f: FilaPlan }) {
    if (!f.fechaMeta) return <span className="text-ink-3">Sin fecha meta</span>;
    return (
        <>
            <div title="Fecha límite para emitir la OC">Límite {f.fechaLimite ? dmy(f.fechaLimite) : '—'}</div>
            <div className={T.sub}>
                Meta {dmy(f.fechaMeta)}
                {f.plazoDias != null && ` · ${f.plazoDias} d de plazo`}
            </div>
        </>
    );
}

function Descripcion({ f }: { f: FilaPlan }) {
    return (
        <div className={f.nivel ? 'border-l-2 border-l-divider-strong pl-3' : ''}>
            <div className={`font-medium ${f.anulado ? 'text-ink-3 line-through' : ''}`}>
                {f.nivel ? <span className="text-ink-3">↳ </span> : null}
                {f.descripcion}
            </div>
            <div className={T.sub}>
                {[
                    f.canal ?? 'Sin canal',
                    f.codigoCliente && `Cód. ${f.codigoCliente}`,
                    f.sku && `SKU ${f.sku}`,
                    f.requerimiento ?? 'RC sin emitir',
                    f.rqSidige && `RQ ${f.rqSidige}`,
                ]
                    .filter(Boolean)
                    .join(' · ')}
            </div>
            {f.bloqueo && <div className="mt-1 text-small text-warning-strong">{f.bloqueo}</div>}
        </div>
    );
}

function FilaTabla({ f, compra, marcada, onMarcar, verOc }: { f: FilaPlan; compra: boolean; marcada: boolean; onMarcar: () => void; verOc: boolean }) {
    const diasTxt = f.saldo > 0 && f.diasALimite != null ? (f.diasALimite < 0 ? `hace ${-f.diasALimite} d` : `en ${f.diasALimite} d`) : '';
    return (
        <tr className={`${T.row} ${marcada ? 'bg-primary-soft' : ''}`}>
            {compra && (
                <td className={T.td}>
                    <Marca f={f} marcada={marcada} onMarcar={onMarcar} />
                </td>
            )}
            <td className={`${T.td} min-w-64`}>
                <Descripcion f={f} />
            </td>
            <td className={`${T.tdNum} text-right`}>
                {cant(f.cantidad)} <span className="text-ink-3">{f.unidad}</span>
            </td>
            <td className={`${T.tdNum} text-right font-medium`}>{cant(f.saldo)}</td>
            <td className={T.td}>
                <Validacion f={f} />
            </td>
            <td className={T.tdNum}>
                <Fechas f={f} />
            </td>
            <td className={T.td}>
                <div className="flex flex-col items-start gap-1">
                    <Chip tone={tonoSemaforo(f.semaforo)}>{etiquetaSemaforo(f.semaforo)}</Chip>
                    {diasTxt && <span className={T.sub}>{diasTxt}</span>}
                    <Chip tone={tonoCriticidad(f.criticidad)}>{f.criticidad}</Chip>
                </div>
            </td>
            <td className={T.td}>
                <Ocs f={f} verOc={verOc} />
            </td>
        </tr>
    );
}

function TarjetaPlan({ f, compra, marcada, onMarcar, verOc }: { f: FilaPlan; compra: boolean; marcada: boolean; onMarcar: () => void; verOc: boolean }) {
    return (
        <li className={`flex gap-3 rounded-card border border-line px-4 py-3 ${marcada ? 'bg-primary-soft' : 'bg-surface'} ${f.nivel ? 'ml-4' : ''}`}>
            {compra && (
                <div className="pt-0.5">
                    <Marca f={f} marcada={marcada} onMarcar={onMarcar} />
                </div>
            )}
            <div className="flex min-w-0 flex-1 flex-col gap-1.5 text-ui">
                <Descripcion f={f} />
                <div className="text-small text-ink-2">
                    Cantidad {cant(f.cantidad)} {f.unidad} · <span className="font-medium text-ink">saldo {cant(f.saldo)}</span>
                </div>
                <div className="text-small text-ink-2">
                    <Fechas f={f} />
                </div>
                <div className="flex flex-wrap gap-1.5">
                    <Chip tone={tonoSemaforo(f.semaforo)}>{etiquetaSemaforo(f.semaforo)}</Chip>
                    <Chip tone={tonoCriticidad(f.criticidad)}>{f.criticidad}</Chip>
                    <Validacion f={f} />
                </div>
                <Ocs f={f} verOc={verOc} />
            </div>
        </li>
    );
}
