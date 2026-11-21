'use client';

// Un ejemplo vivo por pieza de src/guia/componentes.ts, por id: pasa el mouse, pulsa, llega con Tab.
import { useState, type ReactNode } from 'react';
import { Download, FileText, FolderOpen, HelpCircle, House, Percent, Plus, Settings, ShoppingCart, Trash2, TrendingUp, Users } from 'lucide-react';
import { BarRow, Empty, Notice, Ring, SearchBox, SortTh, T } from '../../../ui/bits.tsx';
import { Button, BUTTON_VARIANTS } from '../../../ui/button.tsx';
import { Card, Chip, Kpi, KpiNote, Segmented } from '../../../ui/card.tsx';
import { DropZone } from '../../../ui/drop-zone.tsx';
import { Checkbox, Field, Input } from '../../../ui/field.tsx';
import { FilterPill } from '../../../ui/filter-pill.tsx';
import { Hueco } from '../../../ui/hueco.tsx';
import { CUBO_COLORES, CuboRombos, Rombos } from '../../../ui/marca.tsx';
import { Sidebar, type SidebarGroup } from '../../../ui/sidebar.tsx';
import { Pager, usePaged } from '../../../ui/pager.tsx';
import { PeriodPicker } from '../../../ui/period-picker.tsx';
import { SelectMenu } from '../../../ui/select-menu.tsx';
import { Tabs } from '../../../ui/tabs.tsx';
import { toast } from '../../../ui/toaster.tsx';
import { Tooltip } from '../../../ui/tooltip.tsx';
import { dmy, money } from '../../../ui/format.ts';
import { DOCS, ESTADO_LABEL, ESTADO_TONE } from '../../../guia/data.ts';
import { EXAMPLES_GRAMA } from './examples-grama.tsx';

const MONTHS = ['202609', '202610', '202611'];
const STATES = [
    { value: 'todos', label: 'Todos los estados' },
    { value: 'pendiente', label: 'Pendientes' },
    { value: 'pagado', label: 'Pagados' },
    { value: 'sin-oc', label: 'Sin orden de compra' },
];

function Row({ children }: { children: ReactNode }) {
    return <div className="flex flex-wrap items-center gap-2.5">{children}</div>;
}

function Boton() {
    return (
        <div className="flex flex-col gap-3">
            <Row>
                {BUTTON_VARIANTS.map((v) => (
                    <Button key={v} variant={v}>
                        {v}
                    </Button>
                ))}
                <Button disabled>deshabilitado</Button>
            </Row>
            <Row>
                <Button>
                    <Plus size={16} /> Nueva orden
                </Button>
                <Button variant="secondary">
                    <Download size={16} /> Exportar Excel
                </Button>
                <Button variant="dashed">
                    <Plus size={16} /> Añadir proveedor
                </Button>
                <Button variant="ghost" iconOnly aria-label="Eliminar fila" title="Eliminar fila">
                    <Trash2 size={16} />
                </Button>
                <Button variant="secondary" size="lg">
                    lg
                </Button>
            </Row>
        </div>
    );
}

function Campo() {
    const [ruc, setRuc] = useState('2051234567');
    const [ok, setOk] = useState(true);
    return (
        <div className="grid max-w-md gap-4">
            <Field label="RUC" hint="11 dígitos." error={ruc.length !== 11 ? `El RUC tiene 11 dígitos; este tiene ${ruc.length}.` : undefined}>
                {(p) => <Input {...p} inputMode="numeric" maxLength={11} value={ruc} onChange={(e) => setRuc(e.target.value.replace(/\D/g, ''))} />}
            </Field>
            <Field label="Referencia" optional>
                {(p) => <Input {...p} placeholder="Ej. OC-2026-0142" />}
            </Field>
            <Field label="Campo deshabilitado">{(p) => <Input {...p} defaultValue="ACTIVO · HABIDO" disabled />}</Field>
            <Checkbox label="Afecta a detracción" hint="12 % sobre servicios." checked={ok} onChange={(e) => setOk(e.target.checked)} />
        </div>
    );
}

function Buscador() {
    const [q, setQ] = useState('');
    return (
        <div className="flex flex-col gap-2">
            <Row>
                <SearchBox value={q} onChange={setQ} placeholder="Buscar RUC o razón social" />
            </Row>
            <p className="text-small text-ink-2">Busca: «{q || '—'}»</p>
        </div>
    );
}

function Desplegable() {
    const [v, setV] = useState('');
    return (
        <div className="grid max-w-sm gap-3">
            <SelectMenu value={v} onChange={setV} options={STATES} label="Estado" placeholder="Elige un estado…" />
            <SelectMenu value="pagado" onChange={() => {}} options={STATES} label="Estado fijo" disabled />
        </div>
    );
}

function Pildora() {
    const [v, setV] = useState('todos');
    const [o, setO] = useState('fecha');
    return (
        <Row>
            <FilterPill value={v} onChange={setV} options={STATES} />
            <FilterPill
                label="Ordenar"
                value={o}
                onChange={setO}
                options={[
                    { value: 'fecha', label: 'Fecha (reciente primero)' },
                    { value: 'monto', label: 'Monto (mayor primero)' },
                ]}
            />
        </Row>
    );
}

function Periodo() {
    const [p, setP] = useState('m202611');
    return (
        <Row>
            <PeriodPicker value={p} onChange={setP} months={MONTHS} />
            <PeriodPicker value="" onChange={() => {}} months={MONTHS} disabled />
        </Row>
    );
}

function Segmentado() {
    const [s, setS] = useState<'rec' | 'emi' | 'all'>('rec');
    return (
        <Segmented
            value={s}
            onChange={setS}
            options={[
                { value: 'rec', label: 'Recibidos' },
                { value: 'emi', label: 'Emitidos' },
                { value: 'all', label: 'Todos' },
            ]}
        />
    );
}

function Pestanas() {
    const tabs = [
        { key: 'pendientes', label: 'Pendientes', count: 12 },
        { key: 'pagados', label: 'Pagados', count: 48 },
        { key: 'anulados', label: 'Anulados', count: 3 },
    ];
    const panels = Object.fromEntries(tabs.map((t) => [t.key, <p key={t.key} className="text-ui text-ink-2">Contenido de «{t.label}».</p>]));
    return (
        <div className="flex flex-col gap-8">
            <Tabs tabs={tabs} panels={panels} hash={false} />
            <Tabs tabs={tabs} panels={panels} variant="chips" hash={false} />
        </div>
    );
}

function TooltipEj() {
    return (
        <div className="flex items-center gap-6 pt-8">
            <Tooltip text="Descarga lo que se ve con los filtros puestos.">
                <Button variant="secondary" iconOnly aria-label="Exportar">
                    <Download size={16} />
                </Button>
            </Tooltip>
            <Tooltip text="Es el RUC sin guiones: 11 dígitos." align="left">
                <HelpCircle size={18} className="text-ink-2" aria-label="Ayuda" tabIndex={0} />
            </Tooltip>
        </div>
    );
}

function Zona() {
    const [names, setNames] = useState<string[]>([]);
    return (
        <div className="grid max-w-lg gap-3">
            <DropZone onFiles={(f) => setNames(f.map((x) => x.name))} accept=".pdf,.xml" hint="PDF o XML, hasta 10 MB" />
            <DropZone onFiles={() => {}} compact label="Adjuntar comprobante" />
            <DropZone onFiles={() => {}} disabled />
            <p className="text-small text-ink-2">{names.length ? `Elegiste: ${names.join(', ')}` : 'Aún no eliges ningún archivo.'}</p>
        </div>
    );
}

function Tarjeta() {
    return (
        <div className="grid gap-3 sm:grid-cols-2">
            <Card title="Ventas por cliente" note="noviembre 2026">
                <p className="text-ui text-ink-2">El cuerpo de la tarjeta.</p>
            </Card>
            <Card>
                <p className="text-ui text-ink-2">Sin título.</p>
            </Card>
        </div>
    );
}

function KpiEj() {
    return (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi label="Ventas del mes" value="S/ 952,851.25" tag={{ text: 'Al día', tone: 'ok' }} href="#">
                <KpiNote>132 comprobantes</KpiNote>
            </Kpi>
            <Kpi label="Cobranza" value="0.98" unit="de la meta" tag={{ text: '-2 días', tone: 'warn' }} href="#">
                <KpiNote>2 días tarde frente a lo previsto</KpiNote>
            </Kpi>
            <Kpi label="Sin OC" value="27" unit="facturas" risk tag={{ text: 'Riesgo', tone: 'danger' }} href="#">
                <KpiNote>S/ 48,210.00 por sustentar</KpiNote>
            </Kpi>
            <Kpi label="Compras del mes" value={null} />
        </div>
    );
}

function ChipEj() {
    return (
        <Row>
            <Chip tone="ok">Pagado</Chip>
            <Chip tone="warn">Por revisar</Chip>
            <Chip tone="danger">Sin OC</Chip>
            <Chip tone="info">Nuevo</Chip>
            <Chip tone="muted">Anulado</Chip>
        </Row>
    );
}

function AvisoEj() {
    return (
        <div>
            <Notice tone="danger">
                <b>3 facturas</b> de proveedores en la lista SSCO. Revísalas antes de pagar.
            </Notice>
            <Notice tone="warning">El robot no corrió hoy: los datos son de ayer a las 07:00.</Notice>
            <Notice tone="info">Los datos se actualizan cada día a las 07:00.</Notice>
            <Notice tone="success">Los datos están al día: la última lectura fue hoy a las 07:00.</Notice>
            <Empty>No hay comprobantes en noviembre 2026.</Empty>
        </div>
    );
}

function ToastEj() {
    return (
        <Row>
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
        </Row>
    );
}

function TablaEj() {
    type Col = 'serie' | 'nombre' | 'estado' | 'total';
    const [sort, setSort] = useState<{ col: Col; dir: 'asc' | 'desc' }>({ col: 'serie', dir: 'asc' });
    const list = [...DOCS.slice(0, 24)].sort((a, b) => {
        const r = a[sort.col] < b[sort.col] ? -1 : a[sort.col] > b[sort.col] ? 1 : 0;
        return sort.dir === 'asc' ? r : -r;
    });
    const paged = usePaged(list, `${sort.col}${sort.dir}`, 6);
    const th = (col: Col, label: string, num = false, fit = false) => (
        <SortTh label={label} num={num} fit={fit} active={sort.col === col} dir={sort.dir} onSort={() => setSort((s) => (s.col === col ? { col, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { col, dir: 'asc' }))} />
    );
    return (
        <div className="flex flex-col gap-3">
            <div className="overflow-x-auto">
                <table className={`${T.table} min-w-[34rem]`}>
                    <thead>
                        <tr className={T.headRow}>
                            {th('serie', 'Comprobante')}
                            {th('nombre', 'Proveedor')}
                            {th('estado', 'Estado', false, true)}
                            {th('total', 'Total', true, true)}
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
        </div>
    );
}

function BarraEj() {
    const [c, setC] = useState(0);
    const rows = [
        ['Cliente Norte SAC', 100, 'S/ 412 mil'],
        ['Corporación Sur SA', 70, 'S/ 288 mil'],
        ['Comercial Este EIRL', 38, 'S/ 154 mil'],
    ] as const;
    return (
        <div className="max-w-md">
            {rows.map(([l, p, f], i) => (
                <BarRow key={l} label={l} figures={f} pct={p} chosen={c === i} onClick={() => setC(i)} color={i === 1 ? 'teal' : 'primary'} />
            ))}
        </div>
    );
}

function AnilloEj() {
    return (
        <div className="grid gap-4 sm:grid-cols-3">
            <Ring pct={86} color="success">
                <b className="text-ui text-ink">Con OC</b>
                <br />
                612 de 712
            </Ring>
            <Ring pct={54} color="primary">
                <b className="text-ui text-ink">Cobrado</b>
                <br />
                del mes
            </Ring>
            <Ring pct={12} color="danger">
                <b className="text-ui text-ink">Observadas</b>
                <br />
                86 por revisar
            </Ring>
        </div>
    );
}

function HuecoEj() {
    return (
        <div className="grid gap-3 sm:grid-cols-2">
            <Kpi label="Ventas del mes" value={null} />
            <Card title="Últimos comprobantes">
                <p className="flex items-center justify-between py-1.5">
                    <Hueco className="h-3.5 w-40" />
                    <Hueco className="h-3.5 w-20" />
                </p>
                <p className="flex items-center justify-between py-1.5">
                    <Hueco className="h-3.5 w-32" />
                    <Hueco className="h-3.5 w-16" />
                </p>
            </Card>
        </div>
    );
}

function RombosEj() {
    return (
        <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-4">
                <Row>
                    <Rombos size={14} />
                    <Rombos size={18} />
                    <Rombos size={28} />
                </Row>
                <p className="text-small text-ink-2">Tres tamaños: 14, 18 y 28 px de alto.</p>
            </div>
            <div className="flex gap-3">
                <span aria-hidden className="w-px self-stretch bg-primary" />
                <div className="flex flex-col gap-1.5">
                    <Rombos size={16} />
                    <h3 className="text-title font-semibold text-secondary">Compras de noviembre</h3>
                    <p className="text-ui text-ink-2">El sello va sobre el título, con una línea fina a la izquierda.</p>
                </div>
            </div>
        </div>
    );
}

function CuboEj() {
    return (
        <div className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-[auto_1fr]">
                <div className="grid grid-cols-[auto_repeat(7,auto)] items-center gap-x-4 gap-y-3 rounded-card border border-line p-4 text-small text-ink-2">
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
            <div className="relative flex min-h-48 flex-col justify-end overflow-hidden rounded-card border border-line p-4">
                {/* Recortado por el borde, como en la hoja membretada: la mitad queda fuera. En gris, para que no compita con el texto. */}
                <CuboRombos size={240} color="gris" className="absolute -top-20 -right-16" />
                <p className="relative max-w-56 text-heading font-semibold">No hay comprobantes en noviembre.</p>
                <p className="relative mt-1 max-w-56 text-ui text-ink-2">Cuando llegue el primero, aparecerá aquí.</p>
            </div>
        </div>
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

function MenuLateralEj() {
    const [activo, setActivo] = useState('comprobantes');
    // Los enlaces del ejemplo no navegan: eligen la sección activa.
    const grupos = MENU.map((g) => ({ ...g, items: g.items.map((i) => ({ ...i, href: '#' + i.key })) }));
    return (
        <div
            className="flex h-[34rem] overflow-hidden rounded-card border border-line"
            onClickCapture={(e) => {
                const a = (e.target as HTMLElement).closest('a');
                if (a) {
                    e.preventDefault();
                    setActivo(a.getAttribute('href')!.slice(1));
                }
            }}
        >
            <Sidebar
                fijo={false}
                clave="ui-guia.ejemplo.menu"
                activo={activo}
                marca={{ nombre: 'Inroconta', detalle: 'Contabilidad y legajo' }}
                grupos={grupos}
            />
            <div className="min-w-0 flex-1 bg-surface p-5 text-ui text-ink-2">Contenido de la pantalla. Pasa el cursor sobre el menú para ver «Contraer» abajo.</div>
        </div>
    );
}

export const EXAMPLES: Record<string, () => ReactNode> = {
    boton: Boton,
    campo: Campo,
    buscador: Buscador,
    'select-menu': Desplegable,
    'filter-pill': Pildora,
    periodo: Periodo,
    segmentado: Segmentado,
    tabs: Pestanas,
    tooltip: TooltipEj,
    'drop-zone': Zona,
    tarjeta: Tarjeta,
    kpi: KpiEj,
    chip: ChipEj,
    aviso: AvisoEj,
    toast: ToastEj,
    tabla: TablaEj,
    barra: BarraEj,
    anillo: AnilloEj,
    hueco: HuecoEj,
    sidebar: MenuLateralEj,
    rombos: RombosEj,
    cubo: CuboEj,
    ...EXAMPLES_GRAMA,
};
