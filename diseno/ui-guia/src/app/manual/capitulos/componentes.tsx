'use client';

// Componentes: cinco paneles que cambian al bajar (ver paneles.tsx), y en cada uno las piezas REALES y aprobadas, con las que se
// puede jugar (pulsar, escribir, abrir el desplegable).
import { useState } from 'react';
import { Download, HelpCircle, Plus, Trash2 } from 'lucide-react';
import { BarRow, Notice, Ring } from '../../../ui/bits.tsx';
import { BUTTON_VARIANTS, Button } from '../../../ui/button.tsx';
import { Chip, Kpi, KpiNote, Segmented } from '../../../ui/card.tsx';
import { Chart, type ChartOption } from '../../../ui/chart/chart.tsx';
import { DateField } from '../../../ui/date-field.tsx';
import { Checkbox, Field, Input } from '../../../ui/field.tsx';
import { FilterPill } from '../../../ui/filter-pill.tsx';
import { Hueco } from '../../../ui/hueco.tsx';
import { MultiChoice } from '../../../ui/multi-choice.tsx';
import { PeriodPicker } from '../../../ui/period-picker.tsx';
import { SelectMenu } from '../../../ui/select-menu.tsx';
import { Tabs } from '../../../ui/tabs.tsx';
import { toast } from '../../../ui/toaster.tsx';
import { Tooltip } from '../../../ui/tooltip.tsx';
import { EscenaConPaneles } from '../paneles.tsx';

const GRUPOS = [
    { titulo: 'Acciones', texto: 'Cinco variantes de botón con sus cinco estados, el enlace y el tooltip que explica un icono.', pista: 'Pulsa un botón o pasa el cursor sobre los iconos' },
    { titulo: 'Formularios', texto: 'Cada campo dice qué es, qué falta y cómo se arregla; el error va debajo, nunca solo en rojo.', pista: 'Escribe en el RUC o abre la lista y la fecha' },
    { titulo: 'Navegación', texto: 'Segmentado para pocas vistas, pestañas para secciones y píldoras para filtrar.', pista: 'Cambia de vista, de período o de pestaña' },
    { titulo: 'Datos', texto: 'KPI para lo que se mira todos los días, barras para comparar y gráficos para la evolución.', pista: 'Pulsa una barra para elegirla' },
    { titulo: 'Estado', texto: 'Chips para el estado de algo, avisos que se quedan y toasts que se van.', pista: 'Pulsa un botón para ver el aviso que sale' },
] as const;

const ESTADOS = [
    { value: 'todos', label: 'Todos los estados' },
    { value: 'pendiente', label: 'Pendientes' },
    { value: 'pagado', label: 'Pagados' },
    { value: 'sin-oc', label: 'Sin orden de compra' },
];
const CLIENTES = ['Cliente Norte SAC', 'Corporación Sur SA', 'Comercial Este EIRL', 'Industrias Oeste SAC', 'Papeles del Pacífico EIRL'];

const BARRAS: ChartOption = {
    color: ['var(--color-chart-1)', 'var(--color-chart-2)'],
    grid: { left: 4, right: 8, top: 34, bottom: 4, containLabel: true },
    tooltip: { trigger: 'axis' },
    legend: { top: 0, left: 0, icon: 'roundRect', itemWidth: 12, itemHeight: 8, textStyle: { color: 'var(--color-ink-2)', fontSize: 12 } },
    xAxis: { type: 'category', data: ['ago', 'set', 'oct', 'nov'], axisLine: { lineStyle: { color: 'var(--color-control)' } }, axisTick: { show: false }, axisLabel: { color: 'var(--color-ink-2)' } },
    yAxis: { type: 'value', axisLabel: { color: 'var(--color-ink-2)' }, splitLine: { lineStyle: { color: 'var(--color-divider)' } } },
    series: [
        { name: 'Ventas', type: 'bar', data: [640, 598, 671, 722], itemStyle: { borderRadius: [3, 3, 0, 0] } },
        { name: 'Compras', type: 'bar', data: [520, 480, 560, 610], itemStyle: { borderRadius: [3, 3, 0, 0] } },
    ],
};

function Acciones() {
    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-wrap items-center gap-2.5">
                {BUTTON_VARIANTS.map((v) => (
                    <Button key={v} variant={v}>
                        {v}
                    </Button>
                ))}
                <Button disabled>deshabilitado</Button>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
                <Button>
                    <Plus size={16} /> Nueva orden
                </Button>
                <Button variant="dashed">
                    <Plus size={16} /> Añadir proveedor
                </Button>
                <Tooltip text="Descarga lo que se ve con los filtros puestos.">
                    <Button variant="secondary" iconOnly aria-label="Exportar">
                        <Download size={16} />
                    </Button>
                </Tooltip>
                <Button variant="ghost" iconOnly aria-label="Eliminar fila">
                    <Trash2 size={16} />
                </Button>
                <Tooltip text="Es el RUC sin guiones: 11 dígitos." align="left">
                    <HelpCircle size={18} className="text-ink-2" aria-label="Ayuda" tabIndex={0} />
                </Tooltip>
            </div>
            <p className="text-ui">
                Ver{' '}
                <a href="#" className="text-primary hover:underline" onClick={(e) => e.preventDefault()}>
                    F001-00012345 ↗
                </a>
            </p>
        </div>
    );
}

function Formularios() {
    const [ruc, setRuc] = useState('2051234567');
    const [ok, setOk] = useState(true);
    const [estado, setEstado] = useState('');
    const [dia, setDia] = useState('');
    const [clientes, setClientes] = useState<string[]>([]);
    return (
        <div className="grid gap-5 sm:grid-cols-2">
            <Field label="RUC" hint="11 dígitos." error={ruc.length !== 11 ? `El RUC tiene 11 dígitos; este tiene ${ruc.length}.` : undefined}>
                {(p) => <Input {...p} inputMode="numeric" maxLength={11} value={ruc} onChange={(e) => setRuc(e.target.value.replace(/\D/g, ''))} />}
            </Field>
            <Field label="Estado SUNAT">{(p) => <Input {...p} defaultValue="ACTIVO · HABIDO" disabled />}</Field>
            <SelectMenu value={estado} onChange={setEstado} options={ESTADOS} label="Estado" placeholder="Elige un estado…" />
            <DateField value={dia} onChange={setDia} label="Fecha de emisión" />
            <MultiChoice values={clientes} onChange={setClientes} options={CLIENTES.map((c, i) => ({ value: c, label: c, detail: `RUC 2051234${String(i).padStart(4, '0')}` }))} noneLabel="Todos los clientes" countLabel={(n) => `${n} clientes`} />
            <Checkbox label="Afecta a detracción" hint="12 % sobre servicios." checked={ok} onChange={(e) => setOk(e.target.checked)} />
        </div>
    );
}

function Navegacion() {
    const [vista, setVista] = useState<'rec' | 'emi' | 'all'>('rec');
    const [estado, setEstado] = useState('todos');
    const [periodo, setPeriodo] = useState('m202611');
    return (
        <div className="flex flex-col gap-6">
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
                <PeriodPicker value={periodo} onChange={setPeriodo} months={['202609', '202610', '202611']} />
                <FilterPill value={estado} onChange={setEstado} options={ESTADOS} />
            </div>
            <Tabs
                hash={false}
                tabs={[
                    { key: 'a', label: 'Pendientes', count: 12 },
                    { key: 'b', label: 'Pagados', count: 48 },
                    { key: 'c', label: 'Anulados', count: 3 },
                ]}
                panels={{
                    a: <p className="text-ui text-ink-2">Contenido de «Pendientes».</p>,
                    b: <p className="text-ui text-ink-2">Contenido de «Pagados».</p>,
                    c: <p className="text-ui text-ink-2">Contenido de «Anulados».</p>,
                }}
            />
        </div>
    );
}

function Datos() {
    const [elegida, setElegida] = useState(0);
    return (
        <div className="grid gap-4 sm:grid-cols-2">
            <Kpi label="Compras del mes" value="S/ 722,261.20" tag={{ text: 'Al día', tone: 'ok' }} href="#">
                <KpiNote>98 comprobantes</KpiNote>
            </Kpi>
            <Kpi label="Sin OC" value="27" unit="facturas" risk tag={{ text: 'Riesgo', tone: 'danger' }} href="#">
                <KpiNote>S/ 48,210.00 por sustentar</KpiNote>
            </Kpi>
            <div>
                {[
                    ['Cliente Norte SAC', 'S/ 412 mil', 100],
                    ['Corporación Sur SA', 'S/ 288 mil', 70],
                    ['Comercial Este EIRL', 'S/ 154 mil', 38],
                ].map(([nombre, cifra, pct], i) => (
                    <BarRow key={nombre as string} label={nombre as string} figures={cifra as string} pct={pct as number} color={i === 1 ? 'teal' : 'primary'} chosen={elegida === i} onClick={() => setElegida(i)} />
                ))}
            </div>
            <div className="flex items-center">
                <Ring pct={86} color="success">
                    <b className="text-ui text-ink">Con OC</b>
                    <br />
                    612 de 712
                </Ring>
            </div>
            <div className="sm:col-span-2">
                <Chart height="12rem" label="Ventas y compras de agosto a noviembre" option={BARRAS} />
            </div>
        </div>
    );
}

function Estado() {
    return (
        <div className="flex flex-col gap-5">
            <div className="flex flex-wrap items-center gap-2.5">
                <Chip tone="ok">Pagado</Chip>
                <Chip tone="warn">Por revisar</Chip>
                <Chip tone="danger">Sin OC</Chip>
                <Chip tone="info">Nuevo</Chip>
                <Chip tone="muted">Anulado</Chip>
            </div>
            <div>
                <Notice tone="warning">El robot no corrió hoy: los datos son de ayer a las 07:00.</Notice>
                <Notice tone="success">Los datos están al día.</Notice>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
                <Button onClick={() => toast.success('Orden OC-2026-0142 guardada.')}>Éxito</Button>
                <Button variant="danger" onClick={() => toast.error('No se pudo guardar: SUNAT no respondió.')}>
                    Error
                </Button>
                <Button variant="secondary" onClick={() => toast.info('Los datos se actualizaron a las 07:00.')}>
                    Información
                </Button>
            </div>
            <div className="flex items-center gap-4">
                <Hueco className="h-3.5 w-48" />
                <Hueco className="h-3.5 w-20" />
                <span className="text-small text-ink-2">Los datos aún viajan: el hueco ocupa su sitio.</span>
            </div>
        </div>
    );
}

const PANELES = [Acciones, Formularios, Navegacion, Datos, Estado];

export function Componentes() {
    return (
        <EscenaConPaneles
            id="componentes"
            rotulo="04 · Componentes"
            titulo="Las piezas, tal como son"
            texto="No son capturas: son las piezas de la guía. Pulsa, escribe, abre."
            grupos={GRUPOS}
            paneles={PANELES}
        />
    );
}
