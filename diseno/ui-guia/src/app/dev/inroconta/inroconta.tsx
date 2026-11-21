'use client';

// Cómo se vería INROCONTA con el diseño aprobado en /dev/colores: su menú (las secciones reales de la app), la persona que
// entró arriba a la derecha (como ya está en la app) y la pantalla «Resumen», con los KPI, el aviso del SSCO, las barras por
// mes, el desglose por tipo y la tabla. Solo lleva piezas aprobadas; los datos son inventados y dos secciones están
// dibujadas (Resumen y Facturas sin OC): las demás muestran un hueco.
import { useCallback, useMemo, useRef, useState } from 'react';
import { Bot, Boxes, Building2, FileSearch, FileWarning, FolderOpen, IdCard, Landmark, LayoutDashboard, Layers, LogOut, Percent, CircleDollarSign, Tag, Users } from 'lucide-react';
import { BarRow, Notice, SearchBox, SortTh, T } from '../../../ui/bits.tsx';
import { Button } from '../../../ui/button.tsx';
import { Card, Chip, Kpi, KpiNote, Segmented } from '../../../ui/card.tsx';
import { Chart, type ChartOption } from '../../../ui/chart/chart.tsx';
import { FilterPill } from '../../../ui/filter-pill.tsx';
import { FloatingPanel } from '../../../ui/floating-panel.tsx';
import { Hueco } from '../../../ui/hueco.tsx';
import { Pager, usePaged } from '../../../ui/pager.tsx';
import { PeriodPicker } from '../../../ui/period-picker.tsx';
import { Sidebar, type SidebarGroup } from '../../../ui/sidebar.tsx';
import { toast } from '../../../ui/toaster.tsx';
import { useDismissOnOutside } from '../../../ui/use-dismiss-on-outside.ts';
import { dmy, money } from '../../../ui/format.ts';
import { DOCS, ESTADO_LABEL, ESTADO_TONE, type Doc } from '../../../guia/data.ts';

const ICONO = 18;
const MENU: SidebarGroup[] = [
    {
        title: 'Comprobantes SUNAT',
        items: [
            { key: 'resumen', label: 'Resumen', href: '#resumen', icon: <LayoutDashboard size={ICONO} /> },
            { key: 'impuestos', label: 'Impuestos', href: '#impuestos', icon: <Percent size={ICONO} /> },
            { key: 'detracciones', label: 'Detracciones', href: '#detracciones', icon: <Landmark size={ICONO} />, badge: { count: 12, title: '12 por depositar' } },
            { key: 'retenciones', label: 'Retenciones', href: '#retenciones', icon: <CircleDollarSign size={ICONO} /> },
            { key: 'factura', label: 'Buscar factura', href: '#factura', icon: <FileSearch size={ICONO} /> },
            { key: 'ruc', label: 'Consulta RUC', href: '#ruc', icon: <IdCard size={ICONO} /> },
            { key: 'precios', label: 'Precios', href: '#precios', icon: <Tag size={ICONO} /> },
            { key: 'proveedores', label: 'Proveedores', href: '#proveedores', icon: <Building2 size={ICONO} /> },
            { key: 'oc', label: 'OC y centros de costo', href: '#oc', icon: <Layers size={ICONO} /> },
        ],
    },
    {
        title: 'Compras y legajo',
        items: [
            { key: 'legajo', label: 'Legajo por OC', href: '#legajo', icon: <FolderOpen size={ICONO} /> },
            { key: 'sinoc', label: 'Facturas sin OC', href: '#sinoc', icon: <FileWarning size={ICONO} />, badge: { count: 27, title: '27 sin orden de compra' } },
            { key: 'kardex', label: 'Kardex', href: '#kardex', icon: <Boxes size={ICONO} /> },
            { key: 'cambios', label: 'Cambios del robot', href: '#cambios', icon: <Bot size={ICONO} />, badge: { count: 3, title: '3 cambios nuevos' } },
        ],
    },
    {
        title: 'Administración',
        items: [{ key: 'usuarios', label: 'Usuarios', href: '#usuarios', icon: <Users size={ICONO} /> }],
    },
];

const MESES = ['202609', '202610', '202611'];
const ESTADOS = [
    { value: 'todos', label: 'Todos los estados' },
    { value: 'pendiente', label: 'Pendientes' },
    { value: 'pagado', label: 'Pagados' },
    { value: 'sin-oc', label: 'Sin orden de compra' },
];

const EJE = { color: 'var(--color-ink-2)' };
const POR_MES: ChartOption = {
    color: ['var(--color-chart-ink)'],
    grid: { left: 4, right: 12, top: 12, bottom: 4, containLabel: true },
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: ['jun', 'jul', 'ago', 'set', 'oct', 'nov'], axisLine: { lineStyle: { color: 'var(--color-control)' } }, axisTick: { show: false }, axisLabel: EJE },
    yAxis: { type: 'value', axisLabel: EJE, splitLine: { lineStyle: { color: 'var(--color-divider)' } } },
    series: [{ name: 'Compras', type: 'bar', data: [512, 586, 640, 598, 671, 722], barWidth: 28, itemStyle: { borderRadius: [3, 3, 0, 0] } }],
};
const POR_TIPO = [
    ['Factura', 'S/ 612 mil', 100],
    ['Boleta', 'S/ 118 mil', 19],
    ['Recibo por honorarios', 'S/ 64 mil', 10],
    ['Nota de débito', 'S/ 21 mil', 3],
] as const;

/** Quién entró, arriba a la derecha como en INROCONTA: su inicial y, al pulsar, su nombre, su correo y la salida. */
function MenuUsuario() {
    const [abierto, setAbierto] = useState(false);
    const ancla = useRef<HTMLButtonElement>(null);
    const panel = useRef<HTMLDivElement>(null);
    const raices = useMemo(() => [ancla, panel], []);
    const cerrar = useCallback(() => setAbierto(false), []);
    useDismissOnOutside(abierto, raices, cerrar);
    return (
        <>
            <button
                ref={ancla}
                type="button"
                onClick={() => setAbierto((a) => !a)}
                aria-label="Tu cuenta"
                aria-expanded={abierto}
                className="grid size-8 place-items-center rounded-full bg-primary-soft text-small font-semibold text-primary-strong outline-offset-2 hover:opacity-90 focus-visible:outline-2 focus-visible:outline-primary"
            >
                CR
            </button>
            <FloatingPanel open={abierto} anchorRef={ancla} panelRef={panel} label="Tu cuenta" className="w-64 p-3">
                <p className="text-ui font-semibold">Camila Ríos</p>
                <p className="truncate text-small text-ink-2">camila.rios@ejemplo.com</p>
                <div className="mt-3 border-t border-divider pt-3">
                    <Button variant="ghost" onClick={() => toast.info('Es una vista de ejemplo: no cierra ninguna sesión.')}>
                        <LogOut size={16} /> Cerrar sesión
                    </Button>
                </div>
            </FloatingPanel>
        </>
    );
}

/** La tabla de comprobantes con su paginador. */
function Tabla({ docs, filas = 6 }: { docs: Doc[]; filas?: number }) {
    type Col = 'serie' | 'nombre' | 'estado' | 'total';
    const [sort, setSort] = useState<{ col: Col; dir: 'asc' | 'desc' }>({ col: 'serie', dir: 'asc' });
    const lista = useMemo(
        () =>
            [...docs].sort((a, b) => {
                const r = a[sort.col] < b[sort.col] ? -1 : a[sort.col] > b[sort.col] ? 1 : 0;
                return sort.dir === 'asc' ? r : -r;
            }),
        [docs, sort],
    );
    const paged = usePaged(lista, `${sort.col}${sort.dir}${docs.length}`, filas);
    const th = (col: Col, label: string, fit = false) => (
        <SortTh label={label} fit={fit} active={sort.col === col} dir={sort.dir} onSort={() => setSort((s) => (s.col === col ? { col, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { col, dir: 'asc' }))} />
    );
    return (
        <>
            <div className="overflow-x-auto">
                <table className={`${T.table} min-w-[34rem]`}>
                    <thead>
                        <tr className={T.headRow}>
                            {th('serie', 'Comprobante')}
                            {th('nombre', 'Proveedor')}
                            {th('estado', 'Estado', true)}
                            {th('total', 'Total', true)}
                        </tr>
                    </thead>
                    <tbody>
                        {paged.rows.map((d) => (
                            <tr key={d.id} className={T.row}>
                                <td className={T.td}>
                                    <span className="font-semibold">{d.serie}</span>
                                    <div className={T.sub}>{dmy(d.fecha)}</div>
                                </td>
                                <td className={T.td}>
                                    {d.nombre}
                                    <div className={T.sub}>{d.ruc}</div>
                                </td>
                                <td className={`${T.td} w-px whitespace-nowrap`}>
                                    <Chip tone={ESTADO_TONE[d.estado]}>{ESTADO_LABEL[d.estado]}</Chip>
                                </td>
                                <td className={`${T.tdNum} w-px`}>{money(d.total, d.moneda)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <Pager paged={paged} />
        </>
    );
}

function Titulo({ children, derecha }: { children: string; derecha?: React.ReactNode }) {
    // pr-12: la esquina de arriba a la derecha es de quien entró (el menú de usuario).
    return (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 pr-12">
            <h1 className="text-title font-semibold">{children}</h1>
            {derecha}
        </div>
    );
}

function Resumen() {
    const [modo, setModo] = useState<'compras' | 'ventas'>('compras');
    const [periodo, setPeriodo] = useState('m202611');
    const [estado, setEstado] = useState('todos');
    const [q, setQ] = useState('');
    const docs = useMemo(() => DOCS.filter((d) => (estado === 'todos' || d.estado === estado) && (!q || `${d.nombre} ${d.ruc} ${d.serie}`.toLowerCase().includes(q.toLowerCase()))), [estado, q]);
    return (
        <>
            <Titulo
                derecha={
                    <Segmented
                        value={modo}
                        onChange={setModo}
                        options={[
                            { value: 'compras', label: 'Compras' },
                            { value: 'ventas', label: 'Ventas' },
                        ]}
                    />
                }
            >
                Resumen
            </Titulo>
            <div className="mb-4 flex flex-wrap items-center gap-2.5">
                <PeriodPicker value={periodo} onChange={setPeriodo} months={MESES} />
                <FilterPill value={estado} onChange={setEstado} options={ESTADOS} />
                <SearchBox value={q} onChange={setQ} placeholder="Buscar RUC o razón social" />
            </div>
            <Notice tone="danger">
                <b>3 facturas</b> de proveedores en la lista SSCO. Revísalas antes de pagar.
            </Notice>
            <div className="mb-4 grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
                <Kpi label={modo === 'compras' ? 'Compras del mes' : 'Ventas del mes'} value="S/ 722,261.20" tag={{ text: 'Al día', tone: 'ok' }} href="#">
                    <KpiNote>98 comprobantes</KpiNote>
                </Kpi>
                <Kpi label="Proveedores" value="41" unit="activos" href="#">
                    <KpiNote>4 nuevos este mes</KpiNote>
                </Kpi>
                <Kpi label="Notas de crédito" value="S/ 12,480.00" href="#">
                    <KpiNote>7 notas, ya restadas del total</KpiNote>
                </Kpi>
                <Kpi label="IGV del mes" value="S/ 110,176.14" href="#">
                    <KpiNote>Crédito fiscal</KpiNote>
                </Kpi>
                <Kpi label="Detracciones" value="12" unit="por depositar" tag={{ text: 'Vence en 3 días', tone: 'warn' }} href="#">
                    <KpiNote>S/ 18,420.00 en total</KpiNote>
                </Kpi>
                <Kpi label="En CONCAR" value="91" unit="de 98" risk tag={{ text: 'Faltan 7', tone: 'danger' }} href="#">
                    <KpiNote>7 comprobantes sin registrar</KpiNote>
                </Kpi>
            </div>
            <div className="mb-4 grid gap-3.5 lg:grid-cols-[1.55fr_1fr]">
                <Card title={`${modo === 'compras' ? 'Compras' : 'Ventas'} por mes`} note="miles de soles · notas de crédito restadas">
                    <Chart height="16rem" label="Compras por mes de junio a noviembre" option={POR_MES} />
                </Card>
                <Card title="Por tipo de comprobante" note="monto sin signo">
                    {POR_TIPO.map(([nombre, cifra, pct], i) => (
                        <BarRow key={nombre} label={nombre} figures={cifra} pct={pct} color={i === 0 ? 'primary' : 'teal'} />
                    ))}
                </Card>
            </div>
            <Card title="Comprobantes" note={`${docs.length} en total`}>
                <Tabla docs={docs} />
            </Card>
        </>
    );
}

function SinOc() {
    const docs = useMemo(() => DOCS.filter((d) => d.estado === 'sin-oc'), []);
    return (
        <>
            <Titulo>Facturas sin OC</Titulo>
            <Notice tone="warning">Estas facturas aún no tienen orden de compra. Asígnales una antes del cierre del mes.</Notice>
            <div className="mb-4 grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
                <Kpi label="Sin OC" value="27" unit="facturas" risk tag={{ text: 'Riesgo', tone: 'danger' }}>
                    <KpiNote>S/ 48,210.00 por sustentar</KpiNote>
                </Kpi>
                <Kpi label="Más antigua" value="38" unit="días" href="#">
                    <KpiNote>Transportes Rímac SRL</KpiNote>
                </Kpi>
            </div>
            <Card title="Facturas sin orden de compra" note={`${docs.length} en esta muestra`}>
                <Tabla docs={docs} />
            </Card>
        </>
    );
}

function Hueco3({ titulo }: { titulo: string }) {
    return (
        <>
            <Titulo>{titulo}</Titulo>
            <Card>
                <p className="mb-3 text-ui text-ink-2">Esta sección no está dibujada en la vista de ejemplo.</p>
                <div className="flex flex-col gap-2.5">
                    <Hueco className="h-3.5 w-64" />
                    <Hueco className="h-3.5 w-48" />
                    <Hueco className="h-3.5 w-56" />
                </div>
            </Card>
        </>
    );
}

export function Inroconta() {
    const [seccion, setSeccion] = useState('resumen');
    // Los enlaces del menú de este ejemplo no navegan: eligen la sección.
    const etiqueta = useMemo(() => Object.fromEntries(MENU.flatMap((g) => g.items.map((i) => [i.key, i.label]))), []);
    return (
        <div
            className="min-h-screen md:flex"
            onClickCapture={(e) => {
                const a = (e.target as HTMLElement).closest('aside a');
                if (a) {
                    e.preventDefault();
                    setSeccion(a.getAttribute('href')!.slice(1));
                }
            }}
        >
            <Sidebar activo={seccion} clave="ui-guia.inroconta.menu" marca={{ nombre: 'Inroconta', detalle: 'Contabilidad y legajo' }} grupos={MENU} />
            <main className="relative min-w-0 flex-1 p-4 md:px-7 md:pt-[22px] md:pb-10">
                {/* Quien entró, arriba a la derecha (los títulos le dejan sitio: pr-12). */}
                <div className="absolute top-3 right-4 md:top-4 md:right-7">
                    <MenuUsuario />
                </div>
                {seccion === 'resumen' ? <Resumen /> : seccion === 'sinoc' ? <SinOc /> : <Hueco3 titulo={etiqueta[seccion] ?? 'Sección'} />}
            </main>
        </div>
    );
}
