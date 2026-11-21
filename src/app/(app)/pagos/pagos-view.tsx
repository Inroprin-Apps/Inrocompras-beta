'use client';

// Pagos: las cuotas de las órdenes. Finanzas atiende (programa, paga, observa; también en bloque), Compras solicita,
// subsana y divide las de sus órdenes, y el resto que ve precios solo lee. Lo que cada quien puede hacer lo dice la
// base en la ficha (acciones_disponibles('pagos', id)); la lista solo agrupa y filtra.
// URL: ?tab=&estado=&vence=&prov=&moneda=&texto=&orden=&pag=&ver=  (la bandeja enlaza /pagos?ver=<id>).
import { useMemo, useState } from 'react';
import { CalendarClock } from 'lucide-react';
import { monto } from '@/modules/ordenes/application/views.ts';
import {
    ESTADOS_PAGO,
    FILTROS_PAGO,
    MONEDAS_PAGO,
    VENCE,
    dePestana,
    filtrarPagos,
    hoyLima,
    ordenarPagos,
    resumenPagos,
    seleccionable,
    type OrdenPago,
    type PestanaPago,
    type Vence,
} from '@/modules/pagos/application/views.ts';
import { FilterRow, SearchBox, SectionTitle, T } from '@/shared/ui/bits.tsx';
import { Button } from '@/shared/ui/button.tsx';
import { Kpi, KpiNote, Segmented } from '@/shared/ui/card.tsx';
import { Lista, ListaVacia } from '@/shared/ui/lista-estado.tsx';
import { Pager, SortSelect, usePaged } from '@/shared/ui/pager.tsx';
import { SelectMenu } from '@/shared/ui/select-menu.tsx';
import { usePerfil } from '../_components/perfil.tsx';
import { urlState } from '../_lib/url-state.ts';
import { FichaPago } from './ficha-pago.tsx';
import { ProgramarBloque } from './programar-bloque.tsx';
import { pagosStore } from './store.ts';
import { FilaPago, TarjetaPago } from './filas-pago.tsx';

const ORDENES: { value: OrdenPago; label: string }[] = [
    { value: 'limite', label: 'Fecha límite' },
    { value: 'recientes', label: 'Más recientes' },
    { value: 'monto', label: 'Monto' },
    { value: 'orden', label: 'Orden' },
];
const PESTANAS: PestanaPago[] = ['atender', 'mias', 'todas'];
const NOMBRE_PESTANA: Record<PestanaPago, string> = { atender: 'Por atender', mias: 'Mías', todas: 'Todas' };

const vista$ = urlState(
    { tab: '', ...FILTROS_PAGO, orden: 'limite' as OrdenPago, page: '1', ver: '' },
    { tab: 'tab', estado: 'estado', vence: 'vence', proveedor: 'prov', moneda: 'moneda', texto: 'texto', orden: 'orden', page: 'pag', ver: 'ver' },
    {
        tab: ['', ...PESTANAS],
        estado: ['', ...ESTADOS_PAGO],
        vence: VENCE.map((v) => v.value),
        moneda: ['', ...MONEDAS_PAGO],
        orden: ORDENES.map((o) => o.value),
    },
);

export function PagosView() {
    const perfil = usePerfil();
    const estado = pagosStore.use();
    const v = vista$.use();
    const hoy = hoyLima();
    const [marcadas, setMarcadas] = useState<Set<string>>(() => new Set());
    const [programando, setProgramando] = useState(false);

    const finanzas = perfil.area === 'Finanzas' || perfil.roles.includes('FINANZAS');
    const pestanas = PESTANAS.filter((p) => (p === 'atender' ? finanzas : p === 'mias' ? perfil.es_compras : true));
    const tab: PestanaPago = pestanas.includes(v.tab as PestanaPago) ? (v.tab as PestanaPago) : pestanas[0];

    const todas = useMemo(() => estado.data ?? [], [estado.data]);
    const base = useMemo(() => dePestana(todas, tab, perfil.id), [todas, tab, perfil.id]);
    const lista = useMemo(() => ordenarPagos(filtrarPagos(base, v, hoy), v.orden), [base, v, hoy]);
    const resumen = useMemo(
        () => (estado.data ? resumenPagos(dePestana(estado.data, tab === 'mias' ? 'mias' : 'todas', perfil.id), hoy) : null),
        [estado.data, tab, perfil.id, hoy],
    );
    const pag = usePaged(lista, lista, 25, vista$.usePage());
    const proveedores = useMemo(() => {
        const m = new Map<string, string>();
        for (const p of todas) if (p.proveedorId) m.set(p.proveedorId, p.proveedor);
        return [...m].sort((a, b) => a[1].localeCompare(b[1], 'es'));
    }, [todas]);

    if (!perfil.ve_precios) {
        return (
            <>
                <SectionTitle title="Pagos" />
                <ListaVacia titulo="Los pagos llevan montos">Tu perfil no ve precios. Si un ítem ya está pagado lo ves en Seguimiento.</ListaVacia>
            </>
        );
    }

    const enBloque = finanzas;
    const visiblesMarcables = lista.filter(seleccionable);
    const marcadasVivas = [...marcadas].filter((id) => todas.some((p) => p.id === id && seleccionable(p)));
    const alternar = (id: string) =>
        setMarcadas((m) => {
            const n = new Set(m);
            if (n.has(id)) n.delete(id);
            else n.add(id);
            return n;
        });
    const todasMarcadas = visiblesMarcables.length > 0 && visiblesMarcables.every((p) => marcadas.has(p.id));
    const alternarTodas = () => setMarcadas(todasMarcadas ? new Set() : new Set(visiblesMarcables.map((p) => p.id)));
    const conFiltros = Object.entries(FILTROS_PAGO).some(([k, d]) => v[k as keyof typeof FILTROS_PAGO] !== d);
    const soles = (x: number) => monto(x);

    return (
        <>
            <SectionTitle title="Pagos" />
            {pestanas.length > 1 && (
                <div className="mb-3.5 overflow-x-auto">
                    <Segmented
                        value={tab}
                        onChange={(t) => vista$.set({ tab: t })}
                        options={pestanas.map((p) => ({
                            value: p,
                            label: `${NOMBRE_PESTANA[p]}${estado.data ? ` (${dePestana(todas, p, perfil.id).length})` : ''}`,
                        }))}
                    />
                </div>
            )}
            <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
                <Kpi label="Por programar" value={resumen ? resumen.porProgramar.n : null}>
                    {resumen && <KpiNote>{soles(resumen.porProgramar.soles)}</KpiNote>}
                </Kpi>
                <Kpi label="Por pagar" value={resumen ? resumen.porPagar.n : null}>
                    {resumen && <KpiNote>{soles(resumen.porPagar.soles)}</KpiNote>}
                </Kpi>
                <Kpi label="Observadas" value={resumen ? resumen.observadas.n : null} risk={!!resumen?.observadas.n}>
                    {resumen && <KpiNote>{soles(resumen.observadas.soles)}</KpiNote>}
                </Kpi>
                <Kpi label="Pagado este mes" value={resumen ? soles(resumen.pagadoMes.soles) : null}>
                    {resumen && (
                        <KpiNote>
                            {resumen.pagadoMes.n} {resumen.pagadoMes.n === 1 ? 'cuota' : 'cuotas'}
                            {resumen.vencidas > 0 && <span className="text-danger-strong"> · {resumen.vencidas} vencidas</span>}
                        </KpiNote>
                    )}
                </Kpi>
            </div>
            <FilterRow>
                <SearchBox value={v.texto} onChange={(texto) => vista$.set({ texto })} placeholder="Busca por orden, proveedor, factura u operación" />
                <SelectMenu
                    label="Estado"
                    className="w-44"
                    value={v.estado}
                    onChange={(e) => vista$.set({ estado: e })}
                    options={[{ value: '', label: 'Todos los estados' }, ...ESTADOS_PAGO.map((e) => ({ value: e, label: e }))]}
                />
                <SelectMenu label="Fecha límite" className="w-48" value={v.vence} onChange={(x) => vista$.set({ vence: x as Vence })} options={VENCE} />
                <SelectMenu
                    label="Proveedor"
                    className="w-52"
                    value={v.proveedor}
                    onChange={(proveedor) => vista$.set({ proveedor })}
                    options={[{ value: '', label: 'Todos los proveedores' }, ...proveedores.map(([id, nombre]) => ({ value: id, label: nombre }))]}
                />
                <SelectMenu
                    label="Moneda"
                    className="w-36"
                    value={v.moneda}
                    onChange={(moneda) => vista$.set({ moneda })}
                    options={[{ value: '', label: 'Toda moneda' }, ...MONEDAS_PAGO.map((m) => ({ value: m, label: m }))]}
                />
                <SortSelect value={v.orden} onChange={(orden) => vista$.set({ orden })} options={ORDENES} />
            </FilterRow>
            {enBloque && marcadasVivas.length > 0 && (
                <div className="sticky top-0 z-10 mb-3 flex flex-wrap items-center gap-2.5 rounded-card border border-primary-line bg-primary-soft px-4 py-2.5">
                    <span className="flex-1 text-ui font-medium text-primary-strong">
                        {marcadasVivas.length} {marcadasVivas.length === 1 ? 'cuota marcada' : 'cuotas marcadas'}
                    </span>
                    <Button variant="secondary" onClick={() => setMarcadas(new Set())}>
                        Desmarcar
                    </Button>
                    <Button onClick={() => setProgramando(true)}>
                        <CalendarClock size={16} /> Programar en una fecha
                    </Button>
                </div>
            )}
            <Lista
                estado={{ data: estado.data ? lista : null, error: estado.error }}
                onReintentar={() => void pagosStore.retry()}
                vacia={
                    <ListaVacia
                        titulo={
                            conFiltros
                                ? 'Ninguna cuota coincide'
                                : tab === 'atender'
                                  ? 'No hay pagos por atender'
                                  : tab === 'mias'
                                    ? 'Tus órdenes aún no tienen cuotas'
                                    : 'Aún no hay cuotas'
                        }
                    >
                        {conFiltros
                            ? 'Prueba con otra búsqueda o quita algún filtro.'
                            : tab === 'atender'
                              ? 'Aquí aparecen las cuotas que Compras solicita y las que ya programaste.'
                              : 'Las cuotas se generan cuando una orden queda aprobada.'}
                    </ListaVacia>
                }
            >
                {() => (
                    <>
                        <ul className="flex flex-col gap-2 md:hidden">
                            {pag.rows.map((p) => (
                                <TarjetaPago
                                    key={p.id}
                                    p={p}
                                    hoy={hoy}
                                    activa={v.ver === p.id}
                                    marcable={enBloque && seleccionable(p)}
                                    marcada={marcadas.has(p.id)}
                                    onMarcar={() => alternar(p.id)}
                                    onAbrir={() => vista$.set({ ver: p.id })}
                                />
                            ))}
                        </ul>
                        <div className="hidden overflow-x-auto md:block">
                            <table className={T.table}>
                                <thead>
                                    <tr className={T.headRow}>
                                        {enBloque && (
                                            <th className={`${T.th} w-10`}>
                                                <input
                                                    type="checkbox"
                                                    aria-label="Marcar todas las solicitadas"
                                                    checked={todasMarcadas}
                                                    disabled={!visiblesMarcables.length}
                                                    onChange={alternarTodas}
                                                    className="size-4 accent-primary"
                                                />
                                            </th>
                                        )}
                                        <th className={T.th}>Orden y proveedor</th>
                                        <th className={T.th}>Cuota</th>
                                        <th className={`${T.thNum} text-right`}>Monto</th>
                                        <th className={`${T.thNum} text-right`}>Retención y neto</th>
                                        <th className={T.thNum}>Fecha límite</th>
                                        <th className={T.th}>Estado</th>
                                        <th className={T.th}>InroPay</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pag.rows.map((p) => (
                                        <FilaPago
                                            key={p.id}
                                            p={p}
                                            hoy={hoy}
                                            activa={v.ver === p.id}
                                            enBloque={enBloque}
                                            marcada={marcadas.has(p.id)}
                                            onMarcar={() => alternar(p.id)}
                                            onAbrir={() => vista$.set({ ver: p.id })}
                                        />
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <Pager paged={pag} />
                    </>
                )}
            </Lista>
            {v.ver && <FichaPago id={v.ver} onCerrar={() => vista$.set({ ver: '' })} />}
            {programando && (
                <ProgramarBloque
                    cuotas={todas.filter((p) => marcadasVivas.includes(p.id))}
                    onCerrar={(hechas) => {
                        setProgramando(false);
                        if (hechas.length) setMarcadas((m) => new Set([...m].filter((id) => !hechas.includes(id))));
                    }}
                />
            )}
        </>
    );
}
