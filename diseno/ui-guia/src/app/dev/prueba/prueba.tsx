'use client';

// Una pantalla de ejemplo ("Compras de noviembre") armada SOLO con piezas y colores ya aprobados en /dev/colores.
// Solo con piezas y colores aprobados en /dev/colores.
import { useCallback, useMemo, useRef, useState } from 'react';
import { Download, FileDown, FileText, FolderOpen, House, Percent, Plus, Settings, ShoppingCart, TrendingUp, Users } from 'lucide-react';
import { BarRow, Notice, Ring, SearchBox, SortTh, T } from '../../../ui/bits.tsx';
import { Button, BUTTON_VARIANTS, buttonClass } from '../../../ui/button.tsx';
import { Card, Chip, Kpi, KpiNote, Segmented } from '../../../ui/card.tsx';
import { Chart, type ChartOption } from '../../../ui/chart/chart.tsx';
import { DateField } from '../../../ui/date-field.tsx';
import { DateTimeInput } from '../../../ui/date-time-input.tsx';
import { DropZone } from '../../../ui/drop-zone.tsx';
import { EnterForm } from '../../../ui/enter-form.tsx';
import { ErrorBoundary } from '../../../ui/error-boundary.tsx';
import { Checkbox, Field, Input } from '../../../ui/field.tsx';
import { FilterPill } from '../../../ui/filter-pill.tsx';
import { FloatingPanel } from '../../../ui/floating-panel.tsx';
import { HoverMarquee } from '../../../ui/hover-marquee.tsx';
import { Hueco } from '../../../ui/hueco.tsx';
import { CUBO_COLORES, CuboRombos, Rombos } from '../../../ui/marca.tsx';
import { MultiChoice } from '../../../ui/multi-choice.tsx';
import { PeriodPicker } from '../../../ui/period-picker.tsx';
import { SelectMenu } from '../../../ui/select-menu.tsx';
import { Sidebar, type SidebarGroup } from '../../../ui/sidebar.tsx';
import { Tabs } from '../../../ui/tabs.tsx';
import { TimeField } from '../../../ui/time-field.tsx';
import { toast } from '../../../ui/toaster.tsx';
import { Tooltip } from '../../../ui/tooltip.tsx';
import { useDismissOnOutside } from '../../../ui/use-dismiss-on-outside.ts';
import { Pager, usePaged } from '../../../ui/pager.tsx';
import { dmy, money } from '../../../ui/format.ts';
import { DOCS, ESTADO_LABEL, ESTADO_TONE } from '../../../guia/data.ts';
import { apiladas, area, conMeta, lineas, ranking, tendencia } from '../colores/usage.tsx';
import { piezas } from '../../../guia/papeleria.ts';

const MONTHS = ['202609', '202610', '202611'];
const ESTADOS = [
    { value: 'todos', label: 'Todos los estados' },
    { value: 'pendiente', label: 'Pendientes' },
    { value: 'pagado', label: 'Pagados' },
    { value: 'sin-oc', label: 'Sin orden de compra' },
];
const PROVEEDORES = [
    ['Papeles del Pacífico Exportaciones e Importaciones EIRL', 'S/ 412 mil', 100],
    ['Tintas Lima Norte SAC', 'S/ 288 mil', 70],
    ['Distribuidora Mayorista de Insumos Gráficos Chavín del Sur SAC', 'S/ 154 mil', 38],
    ['Transportes Rímac SRL', 'S/ 96 mil', 23],
] as const;

const EJE = { color: 'var(--color-ink-2)' };
const SERIES: ChartOption = {
    color: ['var(--color-chart-1)', 'var(--color-chart-2)', 'var(--color-chart-3)', 'var(--color-chart-5)'],
    grid: { left: 4, right: 12, top: 40, bottom: 4, containLabel: true },
    tooltip: { trigger: 'axis' },
    legend: { top: 0, left: 0, icon: 'roundRect', itemWidth: 12, itemHeight: 8, itemGap: 12, textStyle: { ...EJE, fontSize: 12 } },
    xAxis: { type: 'category', data: ['jul', 'ago', 'set', 'oct', 'nov'], axisLine: { lineStyle: { color: 'var(--color-control)' } }, axisTick: { show: false }, axisLabel: EJE },
    yAxis: { type: 'value', axisLabel: EJE, splitLine: { lineStyle: { color: 'var(--color-divider)' } } },
    series: [
        { name: 'Papel', type: 'bar', stack: 't', data: [320, 302, 301, 334, 390] },
        { name: 'Tintas', type: 'bar', stack: 't', data: [220, 182, 191, 234, 290] },
        { name: 'Transporte', type: 'bar', stack: 't', data: [150, 232, 201, 154, 190] },
        { name: 'Otros', type: 'bar', stack: 't', data: [40, 52, 36, 48, 60], itemStyle: { borderRadius: [3, 3, 0, 0] } },
    ],
};

const DIAS = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'];
const HORAS = ['8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19'];
/** Comprobantes por día y hora: números fijos, para que servidor y navegador pinten lo mismo. */
const CALOR = DIAS.map((_, d) =>
    HORAS.map((_, h) => (d > 4 ? Math.max(0, 18 - h * 2 + d) : Math.round(18 + 70 * Math.exp(-((h - 3 - (d % 2)) ** 2) / 8) + ((d * 7 + h * 5) % 11)))),
);

function MapaDeCalor() {
    const max = Math.max(...CALOR.flat());
    return (
        <div className="overflow-x-auto">
            <div className="grid min-w-[30rem] grid-cols-[2rem_repeat(12,minmax(0,1fr))] items-center gap-1 text-caption">
                <span />
                {HORAS.map((h) => (
                    <span key={h} className="text-center text-ink-3">
                        {h}h
                    </span>
                ))}
                {CALOR.map((fila, d) => (
                    <div key={DIAS[d]} className="contents">
                        <span className="text-ink-3">{DIAS[d]}</span>
                        {fila.map((v, h) => {
                            const p = Math.round((v / max) * 100);
                            return (
                                <span
                                    key={h}
                                    title={`${DIAS[d]} a las ${HORAS[h]} h: ${v} comprobantes`}
                                    className="flex h-8 items-center justify-center rounded font-medium"
                                    style={{
                                        background: p ? `color-mix(in oklch, var(--color-teal) ${p}%, var(--color-surface))` : 'var(--color-surface-3)',
                                        color: p > 55 ? 'var(--color-on-fill)' : 'var(--color-ink-2)',
                                    }}
                                >
                                    {v}
                                </span>
                            );
                        })}
                    </div>
                ))}
            </div>
        </div>
    );
}

function BarraDeEstado({ label, value, color, width }: { label: string; value: string; color: string; width: string }) {
    return (
        <div className="mb-3 last:mb-0">
            <div className="mb-1 flex justify-between text-small">
                <span className="font-medium">{label}</span>
                <span className="text-ink-2">{value}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-md bg-surface-3">
                <span className={`block h-full rounded-md ${color}`} style={{ width }} />
            </div>
        </div>
    );
}

function Bomba({ rota }: { rota: boolean }) {
    if (rota) throw new Error('El dato llegó con un formato raro.');
    return <p className="text-ui text-ink-2">Todo bien aquí dentro.</p>;
}

/** Una zona que se rompe sin llevarse la pantalla: el resto sigue funcionando. */
function FronteraEj() {
    const [rota, setRota] = useState(false);
    const [clave, setClave] = useState(0);
    return (
        <div className="flex flex-col gap-3">
            <ErrorBoundary label="prueba" resetKey={String(clave)} fallback={(e) => <Notice tone="danger">Esta zona no se pudo mostrar: {e.message} El resto de la pantalla sigue funcionando.</Notice>}>
                <Bomba rota={rota} />
            </ErrorBoundary>
            <div className="flex gap-2.5">
                <Button variant="secondary" onClick={() => setRota(true)}>
                    Romper esta zona
                </Button>
                <Button
                    variant="ghost"
                    onClick={() => {
                        setRota(false);
                        setClave((k) => k + 1);
                    }}
                >
                    Reintentar
                </Button>
            </div>
        </div>
    );
}

/** Formularios, botones, avisos y demás controles aprobados, todos juntos. */
function Controles() {
    const [ruc, setRuc] = useState('2051234567');
    const [ok, setOk] = useState(true);
    const [sel, setSel] = useState('');
    const [iso, setIso] = useState<string | null>(null);
    const [orden, setOrden] = useState('fecha');
    return (
        <div className="grid gap-4 lg:grid-cols-2">
            <Card title="Campos">
                <div className="grid gap-4">
                    <Field label="RUC" hint="11 dígitos." error={ruc.length !== 11 ? `El RUC tiene 11 dígitos; este tiene ${ruc.length}.` : undefined}>
                        {(p) => <Input {...p} inputMode="numeric" maxLength={11} value={ruc} onChange={(e) => setRuc(e.target.value.replace(/\D/g, ''))} />}
                    </Field>
                    <Field label="Referencia" optional>
                        {(p) => <Input {...p} placeholder="Ej. OC-2026-0142" />}
                    </Field>
                    <Field label="Estado SUNAT">{(p) => <Input {...p} defaultValue="ACTIVO · HABIDO" disabled />}</Field>
                    <SelectMenu value={sel} onChange={setSel} options={ESTADOS} label="Estado" placeholder="Elige un estado…" />
                    <DateTimeInput value={iso} onChange={setIso} label="Entrega" />
                    <Checkbox label="Afecta a detracción" hint="12 % sobre servicios." checked={ok} onChange={(e) => setOk(e.target.checked)} />
                </div>
            </Card>
            <div className="flex flex-col gap-4">
                <Card title="Botones">
                    <div className="flex flex-col gap-3">
                        <div className="flex flex-wrap items-center gap-2.5">
                            {BUTTON_VARIANTS.map((v) => (
                                <Button key={v} variant={v}>
                                    {v}
                                </Button>
                            ))}
                            <Button disabled>deshabilitado</Button>
                        </div>
                        <div className="flex flex-wrap items-center gap-2.5">
                            <Button variant="dashed">
                                <Plus size={16} /> Añadir proveedor
                            </Button>
                            <Button variant="secondary" size="lg">
                                lg
                            </Button>
                            <FilterPill
                                label="Ordenar"
                                value={orden}
                                onChange={setOrden}
                                options={[
                                    { value: 'fecha', label: 'Fecha (reciente primero)' },
                                    { value: 'monto', label: 'Monto (mayor primero)' },
                                ]}
                            />
                        </div>
                        <p className="text-small">
                            Ver{' '}
                            <a href="#" className="text-primary hover:underline">
                                F001-00012345 ↗
                            </a>
                        </p>
                    </div>
                </Card>
                <Card title="Avisos en la página">
                    <Notice tone="danger">
                        <b>3 facturas</b> de proveedores en la lista SSCO. Revísalas antes de pagar.
                    </Notice>
                    <Notice tone="warning">El robot no corrió hoy: los datos son de ayer a las 07:00.</Notice>
                    <Notice tone="info">Los datos se actualizan cada día a las 07:00.</Notice>
                    <Notice tone="success">Los datos están al día: la última lectura fue hoy a las 07:00.</Notice>
                </Card>
                <Card title="Frontera de error">
                    <FronteraEj />
                </Card>
                <Card title="Avisos que se van (toast)">
                    <div className="flex flex-wrap gap-2.5">
                        <Button onClick={() => toast.success('Orden OC-2026-0142 guardada.')}>Éxito</Button>
                        <Button variant="secondary" onClick={() => toast.success('nombre@inroprin.com ya no puede entrar.', { action: { label: 'Deshacer', onClick: () => {} } })}>
                            Con «Deshacer»
                        </Button>
                        <Button variant="danger" onClick={() => toast.error('No se pudo guardar: SUNAT no respondió.')}>
                            Error
                        </Button>
                        <Button variant="secondary" onClick={() => toast.info('Los datos se actualizaron a las 07:00.')}>
                            Información
                        </Button>
                    </div>
                </Card>
                <Card title="Chips">
                    <div className="flex flex-wrap items-center gap-2.5">
                        <Chip tone="ok">Pagado</Chip>
                        <Chip tone="warn">Por revisar</Chip>
                        <Chip tone="danger">Sin OC</Chip>
                        <Chip tone="info">Nuevo</Chip>
                        <Chip tone="muted">Anulado</Chip>
                    </div>
                </Card>
                <Card title="Pestañas en píldora">
                    <Tabs
                        variant="chips"
                        hash={false}
                        tabs={[
                            { key: 'a', label: 'Pendientes', count: 12 },
                            { key: 'b', label: 'Pagados', count: 48 },
                        ]}
                        panels={{ a: <p className="text-ui text-ink-2">Contenido de «Pendientes».</p>, b: <p className="text-ui text-ink-2">Contenido de «Pagados».</p> }}
                    />
                </Card>
            </div>
        </div>
    );
}

/** «Nueva orden»: un panel flotante con un formulario que se guarda con Enter. */
function NuevaOrden() {
    const [open, setOpen] = useState(false);
    const [prov, setProv] = useState('');
    const [dia, setDia] = useState('');
    const [hora, setHora] = useState('');
    const anchor = useRef<HTMLButtonElement>(null);
    const panel = useRef<HTMLDivElement>(null);
    const roots = useMemo(() => [anchor, panel], []);
    const close = useCallback(() => setOpen(false), []);
    useDismissOnOutside(open, roots, close);
    return (
        <>
            <button ref={anchor} type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)} className={buttonClass('primary')}>
                <Plus size={16} /> Nueva orden
            </button>
            <FloatingPanel open={open} anchorRef={anchor} panelRef={panel} label="Nueva orden de compra" className="w-80 p-4">
                <EnterForm
                    onSubmit={() => {
                        toast.success(`Orden para «${prov || 'sin proveedor'}» guardada.`);
                        setOpen(false);
                    }}
                    onCancel={close}
                    className="flex flex-col gap-3"
                >
                    <Field label="Proveedor" hint="Escribe y pulsa Enter para guardar.">{(p) => <Input {...p} value={prov} onChange={(e) => setProv(e.target.value)} />}</Field>
                    <div className="flex items-end gap-2.5">
                        <DateField value={dia} onChange={setDia} label="Entrega" />
                        <TimeField value={hora} onChange={setHora} live={false} label="Hora" />
                    </div>
                    <div className="flex gap-2.5">
                        <Button type="submit" disabled={prov.trim().length < 3}>
                            Guardar
                        </Button>
                        <Button type="button" variant="ghost" onClick={close}>
                            Cancelar
                        </Button>
                    </div>
                </EnterForm>
            </FloatingPanel>
        </>
    );
}


/** Los dos adornos aprobados: los rombos sobre un título y el cubo en todas sus variantes y de fondo. */
function Marca() {
    return (
        <div className="grid gap-4 lg:grid-cols-2">
            <Card title="Rombos de la marca">
                <div className="flex gap-3">
                    <span aria-hidden className="w-px self-stretch bg-primary" />
                    <div className="flex flex-col gap-1.5">
                        <Rombos size={16} />
                        <h3 className="text-title font-semibold text-secondary">Compras de noviembre</h3>
                        <p className="text-ui text-ink-2">El sello va sobre el título, con una línea fina a la izquierda.</p>
                    </div>
                </div>
            </Card>
            <Card title="Cubo de rombos de fondo">
                <div className="relative flex min-h-40 flex-col justify-end overflow-hidden rounded-card border border-line p-4">
                    <CuboRombos size={220} color="gris" className="absolute -top-16 -right-14" />
                    <p className="relative max-w-56 text-heading font-semibold">No hay comprobantes en noviembre.</p>
                    <p className="relative mt-1 max-w-56 text-ui text-ink-2">Cuando llegue el primero, aparecerá aquí.</p>
                </div>
            </Card>
            <Card title="Variantes del cubo" className="lg:col-span-2">
                <div className="overflow-x-auto">
                    <div className="grid min-w-[34rem] grid-cols-[auto_repeat(7,1fr)] items-center gap-x-3 gap-y-3 text-small text-ink-2">
                        <span />
                        {CUBO_COLORES.map((c) => (
                            <span key={c} className="text-center">
                                {c}
                            </span>
                        ))}
                        {(['contorno', 'relleno'] as const).map((v) => (
                            <div key={v} className="contents">
                                <span>{v}</span>
                                {CUBO_COLORES.map((c) => (
                                    <span key={c} className={`flex items-center justify-center rounded-inner p-1 ${c === 'blanco' ? 'bg-primary' : ''}`}>
                                        <CuboRombos size={64} variante={v} color={c} />
                                    </span>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            </Card>
        </div>
    );
}

/**
 * La papelería: cada pieza con su vista previa y dos descargas (PDF para imprimir y Word para editar), y un .zip con todo.
 * Los archivos salen de `pnpm descargas` (scripts/generar-descargas.mjs) y están en public/descargas/<pieza>/.
 */
function Papeleria() {
    const lista = useMemo(() => piezas('/IconRoland.png'), []);
    return (
        <div className="flex flex-col gap-4">
            <Card title="Papelería de Roland Print" note="PDF y Word de cada pieza">
                <div className="flex flex-wrap items-center gap-3">
                    <a href="/descargas/papeleria-roland-print.zip" download className={buttonClass('primary')}>
                        <FileDown size={16} /> Descargar todo (.zip)
                    </a>
                    <p className="max-w-xl text-small text-ink-2">
                        El PDF va a tamaño real, una página por cara, listo para una papelería (sin sangrado ni marcas de corte). El Word trae el mismo diseño y los textos de la persona se escriben encima.
                    </p>
                </div>
            </Card>
            <div className="grid gap-4 md:grid-cols-2">
                {lista.map((p) => (
                    <section key={p.id} className="flex min-w-0 flex-col overflow-hidden rounded-card border border-line bg-surface">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={`/descargas/${p.slug}/vista-previa.png`} alt={`Vista previa: ${p.titulo}`} width={1200} height={630} className="block h-auto w-full border-b border-divider bg-surface-2" />
                        <div className="flex flex-1 flex-col gap-3 p-4">
                            <div>
                                <h3 className="text-heading font-semibold">{p.titulo}</h3>
                                <p className="text-small text-ink-3">{p.medida}</p>
                                <p className="mt-1.5 text-small text-ink-2">{p.nota}</p>
                            </div>
                            <div className="mt-auto flex flex-wrap gap-2.5">
                                <a href={`/descargas/${p.slug}/${p.slug}.pdf`} download className={buttonClass('primary')}>
                                    <FileDown size={16} /> PDF
                                </a>
                                <a href={`/descargas/${p.slug}/${p.slug}.docx`} download className={buttonClass('secondary')}>
                                    <FileDown size={16} /> Word
                                </a>
                            </div>
                        </div>
                    </section>
                ))}
            </div>
        </div>
    );
}

/** La tabla aprobada, con su paginador. El estado va en un chip. */
function Comprobantes() {
    type Col = 'serie' | 'nombre' | 'estado' | 'total';
    const [sort, setSort] = useState<{ col: Col; dir: 'asc' | 'desc' }>({ col: 'serie', dir: 'asc' });
    const list = [...DOCS.slice(0, 24)].sort((a, b) => {
        const r = a[sort.col] < b[sort.col] ? -1 : a[sort.col] > b[sort.col] ? 1 : 0;
        return sort.dir === 'asc' ? r : -r;
    });
    const paged = usePaged(list, `${sort.col}${sort.dir}`, 6);
    const th = (col: Col, label: string, fit = false) => (
        <SortTh label={label} fit={fit} active={sort.col === col} dir={sort.dir} onSort={() => setSort((s) => (s.col === col ? { col, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { col, dir: 'asc' }))} />
    );
    return (
        <Card title="Comprobantes de noviembre" note={`${list.length} en total`}>
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
        </Card>
    );
}

const MENU: SidebarGroup[] = [
    {
        title: 'Contabilidad',
        items: [
            { key: 'inicio', label: 'Inicio', href: '#', icon: <House size={18} /> },
            { key: 'comprobantes', label: 'Comprobantes', href: '#', icon: <FileText size={18} />, badge: { count: 27, title: '27 sin orden de compra' } },
            { key: 'compras', label: 'Compras', href: '#', icon: <ShoppingCart size={18} />, badge: { count: 98 } },
            { key: 'ventas', label: 'Ventas', href: '#', icon: <TrendingUp size={18} /> },
            { key: 'detracciones', label: 'Detracciones', href: '#', icon: <Percent size={18} />, badge: { count: 4, title: '4 nuevas' } },
            { key: 'legajo', label: 'Legajo', href: '#', icon: <FolderOpen size={18} /> },
        ],
    },
    {
        title: 'Administración',
        items: [
            { key: 'usuarios', label: 'Usuarios', href: '#', icon: <Users size={18} /> },
            { key: 'ajustes', label: 'Ajustes', href: '#', icon: <Settings size={18} /> },
        ],
    },
];

export function Prueba() {
    const [period, setPeriod] = useState('m202611');
    const [vista, setVista] = useState<'rec' | 'emi' | 'all'>('rec');
    const [q, setQ] = useState('');
    const [estado, setEstado] = useState('todos');
    const [clientes, setClientes] = useState<string[]>([]);
    const [elegida, setElegida] = useState(0);
    const [files, setFiles] = useState<string[]>([]);
    const [seccion, setSeccion] = useState('compras');
    // Los enlaces del menú de la prueba no navegan: eligen la sección activa.
    const grupos = useMemo(() => MENU.map((g) => ({ ...g, items: g.items.map((i) => ({ ...i, href: '#' + i.key })) })), []);

    const tabs = [
        { key: 'resumen', label: 'Resumen' },
        { key: 'comprobantes', label: 'Comprobantes', count: 24 },
        { key: 'graficos', label: 'Gráficos' },
        { key: 'proveedores', label: 'Proveedores', count: PROVEEDORES.length },
        { key: 'controles', label: 'Controles' },
        { key: 'marca', label: 'Marca' },
        { key: 'papeleria', label: 'Papelería' },
        { key: 'adjuntos', label: 'Adjuntos', count: files.length || undefined },
    ];
    const panels = {
        comprobantes: <Comprobantes />,
        resumen: (
            <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
                <Card title="Compras por línea" note="miles de soles">
                    <Chart height="17rem" label="Compras por línea de julio a noviembre" option={SERIES} />
                </Card>
                <Card title="Por proveedor" note="noviembre 2026">
                    {PROVEEDORES.slice(0, 3).map(([nombre, cifra, pct], i) => (
                        <BarRow key={nombre} label={nombre} figures={cifra} pct={pct} color={i === 1 ? 'teal' : 'primary'} chosen={elegida === i} onClick={() => setElegida(i)} />
                    ))}
                </Card>
                <Card title="Estado de los comprobantes">
                    <BarraDeEstado label="Pagados" value="612" color="bg-success" width="80%" />
                    <BarraDeEstado label="Pendientes" value="74" color="bg-warning" width="40%" />
                    <BarraDeEstado label="Sin orden de compra" value="26" color="bg-danger" width="20%" />
                </Card>
                <Card title="Ventas y compras" note="noviembre 2026">
                    <BarRow label="Ventas" figures="S/ 953 mil" pct={100} color="primary" />
                    <BarRow label="Compras" figures="S/ 722 mil" pct={76} color="teal" />
                    <BarRow label="Por cobrar" figures="S/ 318 mil" pct={33} color="warning" />
                </Card>
            </div>
        ),
        graficos: (
            <div className="grid gap-4 lg:grid-cols-2">
                <Card title="Ventas y compras" note="miles de soles">
                    <Chart height="15rem" label="Ventas y compras por mes" option={lineas} />
                </Card>
                <Card title="Compras por línea">
                    <Chart height="15rem" label="Compras por línea de producto" option={apiladas} />
                </Card>
                <Card title="Comprobantes por tipo">
                    <Chart height="15rem" label="Comprobantes por tipo a lo largo del año" option={area} />
                </Card>
                <Card title="Principales clientes">
                    <Chart height="15rem" label="Principales clientes por monto" option={ranking} />
                </Card>
                <Card title="Comprobantes por día">
                    <Chart height="15rem" label="Comprobantes por día y meta de 40" option={conMeta} />
                </Card>
                <Card title="Visitas al portal">
                    <Chart height="15rem" label="Visitas al portal por semana" option={tendencia} />
                </Card>
                <Card title="Mapa de calor: cuándo llegan los comprobantes" note="por día y hora" className="lg:col-span-2">
                    <MapaDeCalor />
                </Card>
            </div>
        ),
        controles: <Controles />,
        marca: <Marca />,
        papeleria: <Papeleria />,
        proveedores: (
            <Card title="Proveedores con más compras">
                <ul className="divide-y divide-divider">
                    {PROVEEDORES.map(([nombre, cifra]) => (
                        <li key={nombre} className="marquee-host -mx-2 flex items-center justify-between gap-4 rounded-lg px-2 py-2.5 hover:bg-surface-2">
                            <span className="min-w-0 flex-1 text-ui font-medium">
                                <HoverMarquee text={nombre} />
                            </span>
                            <span className="text-ui tabular-nums">{cifra}</span>
                        </li>
                    ))}
                </ul>
            </Card>
        ),
        adjuntos: (
            <Card title="Comprobantes adjuntos">
                <div className="grid max-w-lg gap-3">
                    <DropZone onFiles={(f) => setFiles(f.map((x) => x.name))} accept=".pdf,.xml" hint="PDF o XML, hasta 10 MB" />
                    <p className="text-small text-ink-2">{files.length ? `Elegiste: ${files.join(', ')}` : 'Aún no eliges ningún archivo.'}</p>
                </div>
            </Card>
        ),
    };

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
            <Sidebar
                activo={seccion}
                clave="ui-guia.prueba.menu"
                marca={{ nombre: 'Inroconta', detalle: 'Contabilidad y legajo' }}
                grupos={grupos}
                />
            <main className="mx-auto flex w-full min-w-0 max-w-6xl flex-1 flex-col gap-5 px-5 py-8">
                <header className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <h1 className="text-display font-semibold">Compras de noviembre</h1>
                        <p className="mt-1 text-ui text-ink-2">Solo con lo aprobado en /dev/colores. Los datos son inventados.</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2.5">
                        <PeriodPicker value={period} onChange={setPeriod} months={MONTHS} />
                        <Tooltip text="Descarga lo que se ve con los filtros puestos.">
                            <Button variant="secondary" iconOnly aria-label="Exportar" onClick={() => toast.info('Exportación de ejemplo.')}>
                                <Download size={16} />
                            </Button>
                        </Tooltip>
                        <NuevaOrden />
                    </div>
                </header>

                <div className="flex flex-wrap items-center gap-2.5">
                    <Segmented
                        value={vista}
                        onChange={setVista}
                        options={[
                            { value: 'rec', label: 'Recibidos' },
                            { value: 'emi', label: 'Emitidos' },
                            { value: 'all', label: 'Todos' },
                        ]}
                    />
                    <SearchBox value={q} onChange={setQ} placeholder="Buscar RUC o razón social" />
                    <FilterPill value={estado} onChange={setEstado} options={ESTADOS} />
                    <div className="w-56">
                        <MultiChoice
                            values={clientes}
                            onChange={setClientes}
                            options={PROVEEDORES.map(([n], i) => ({ value: n, label: n, detail: `RUC 2051234${String(i).padStart(4, '0')}` }))}
                            noneLabel="Todos los proveedores"
                            countLabel={(n) => `${n} proveedores`}
                        />
                    </div>
                </div>

                <div className="-mb-4">
                    <Notice tone="warning">El robot no corrió hoy: los datos son de ayer a las 07:00.</Notice>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <Kpi label="Compras del mes" value="S/ 722,261.20" tag={{ text: 'Al día', tone: 'ok' }} href="#">
                        <KpiNote>98 comprobantes</KpiNote>
                    </Kpi>
                    <Kpi label="Pagado a tiempo" value="0.98" unit="de la meta" tag={{ text: '-2 días', tone: 'warn' }} href="#">
                        <KpiNote>2 días tarde frente a lo previsto</KpiNote>
                    </Kpi>
                    <Kpi label="Sin OC" value="27" unit="facturas" risk tag={{ text: 'Riesgo', tone: 'danger' }} href="#">
                        <KpiNote>S/ 48,210.00 por sustentar</KpiNote>
                    </Kpi>
                    <Kpi label="Por cobrar" value={null} />
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                    <Card title="Con orden de compra">
                        <Ring pct={86} color="success">
                            612 de 712
                            <br />
                            comprobantes
                        </Ring>
                    </Card>
                    <Card title="Pagado del mes">
                        <Ring pct={54} color="primary">
                            S/ 522 mil
                            <br />
                            de S/ 966 mil
                        </Ring>
                    </Card>
                    <Card title="Últimos comprobantes">
                        <p className="flex items-center justify-between py-1.5">
                            <Hueco className="h-3.5 w-32" />
                            <Hueco className="h-3.5 w-16" />
                        </p>
                        <p className="flex items-center justify-between py-1.5">
                            <Hueco className="h-3.5 w-24" />
                            <Hueco className="h-3.5 w-12" />
                        </p>
                    </Card>
                </div>

                <Tabs tabs={tabs} panels={panels} hash={false} />
            </main>
        </div>
    );
}
