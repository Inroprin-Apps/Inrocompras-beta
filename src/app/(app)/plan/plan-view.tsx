'use client';

// Plan de compras (docs/05): una fila por ítem de requerimiento del proyecto elegido, con su saldo, validación
// técnica, canal, fechas, semáforo, criticidad, órdenes y si está pagado. Filtros en la URL
// (?proyecto=&estado=&canal=&semaforo=&validacion=&texto=&pag=). Lee public.plan_compras (sin montos: Planeamiento
// también lo ve). Compras e Importaciones marcan líneas y pulsan «Generar OC» (el carrito): si una línea no se puede
// marcar, se explica por qué (bloqueada, sin saldo, otro canal u otro proyecto).
import { useMemo, useState } from 'react';
import { ShoppingCart } from 'lucide-react';
import {
    ESTADOS_PLAN,
    FILTROS_PLAN,
    SEMAFOROS,
    calcular,
    filtrarPlan,
    hoyLima,
    motivoNoMarcar,
    ordenarPlan,
    resumir,
    type FilaPlan,
} from '@/modules/plan/application/views.ts';
import { FilterRow, SearchBox, SectionTitle, T } from '@/shared/ui/bits.tsx';
import { Button } from '@/shared/ui/button.tsx';
import { Kpi } from '@/shared/ui/card.tsx';
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
import { FilaTabla, TarjetaPlan } from './filas-plan.tsx';

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
