'use client';

// Los ejemplos vivos de las piezas que vienen de GRAMA en la segunda tanda (fechas, selección múltiple, gráfico…).
import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { Notice } from '../../../ui/bits.tsx';
import { Button, buttonClass } from '../../../ui/button.tsx';
import { Chart, type ChartOption } from '../../../ui/chart/chart.tsx';
import { DateField } from '../../../ui/date-field.tsx';
import { DateTimeInput } from '../../../ui/date-time-input.tsx';
import { EnterForm } from '../../../ui/enter-form.tsx';
import { ErrorBoundary } from '../../../ui/error-boundary.tsx';
import { Field, Input } from '../../../ui/field.tsx';
import { FloatingPanel } from '../../../ui/floating-panel.tsx';
import { HoverMarquee } from '../../../ui/hover-marquee.tsx';
import { MultiChoice } from '../../../ui/multi-choice.tsx';
import { TimeField } from '../../../ui/time-field.tsx';
import { toast } from '../../../ui/toaster.tsx';
import { useDismissOnOutside } from '../../../ui/use-dismiss-on-outside.ts';

function PanelFlotante() {
    const [open, setOpen] = useState(false);
    const anchor = useRef<HTMLButtonElement>(null);
    const panel = useRef<HTMLDivElement>(null);
    const roots = useMemo(() => [anchor, panel], []);
    const close = useCallback(() => setOpen(false), []);
    useDismissOnOutside(open, roots, close);
    return (
        <div>
            <button ref={anchor} type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className={buttonClass('secondary')}>
                {open ? 'Cerrar el panel' : 'Abrir un panel'}
            </button>
            <FloatingPanel open={open} anchorRef={anchor} panelRef={panel} label="Panel de ejemplo" className="w-64 p-4">
                <p className="text-ui font-medium">Estoy en un portal</p>
                <p className="mt-1 text-small text-ink-2">No me recorta ninguna tarjeta. Pulsa fuera o Escape para cerrarme.</p>
            </FloatingPanel>
        </div>
    );
}

function Fecha() {
    const [day, setDay] = useState('');
    return (
        <div className="flex flex-wrap items-center gap-3">
            <DateField value={day} onChange={setDay} label="Fecha de emisión" />
            <DateField value="2026-11-10" onChange={() => {}} label="Fecha fija" disabled />
            <span className="text-small text-ink-2">Valor: «{day || '—'}»</span>
        </div>
    );
}

function Hora() {
    const [clock, setClock] = useState('');
    return (
        <div className="flex flex-wrap items-center gap-3">
            <TimeField value={clock} onChange={setClock} live label="Hora de entrega" />
            <span className="text-small text-ink-2">Prueba «1530», «3pm» o las flechas ↑ ↓. Valor: «{clock || '—'}»</span>
        </div>
    );
}

function FechaHora() {
    const [iso, setIso] = useState<string | null>(null);
    return (
        <div className="flex flex-col gap-2">
            <DateTimeInput value={iso} onChange={setIso} label="Entrega" />
            <span className="text-small text-ink-2">Instante guardado: {iso ?? 'ninguno (faltan el día o la hora)'}</span>
        </div>
    );
}

const CLIENTES = ['Cliente Norte SAC', 'Corporación Sur SA', 'Comercial Este EIRL', 'Industrias Oeste SAC', 'Papeles del Pacífico EIRL', 'Tintas Lima Norte SAC', 'Transportes Rímac SRL', 'Cartones Huallaga SA', 'Logística Callao SAC', 'Imprenta Barranco SRL'];

function SeleccionMultiple() {
    const [values, setValues] = useState<string[]>([]);
    return (
        <div className="max-w-sm">
            <MultiChoice
                values={values}
                onChange={setValues}
                options={CLIENTES.map((c, i) => ({ value: c, label: c, detail: `RUC 2051234${String(i).padStart(4, '0')}` }))}
                noneLabel="Todos los clientes"
                countLabel={(n) => `${n} clientes`}
            />
        </div>
    );
}

function Bomba({ boom }: { boom: boolean }) {
    if (boom) throw new Error('El dato llegó con un formato raro.');
    return <p className="text-ui text-ink-2">Todo bien aquí dentro.</p>;
}

function FronteraDeError() {
    const [boom, setBoom] = useState(false);
    const [key, setKey] = useState(0);
    return (
        <div className="flex flex-col gap-3">
            <ErrorBoundary
                label="ejemplo"
                resetKey={String(key)}
                fallback={(e) => <Notice tone="danger">Esta zona no se pudo mostrar: {e.message} El resto de la pantalla sigue funcionando.</Notice>}
            >
                <Bomba boom={boom} />
            </ErrorBoundary>
            <div className="flex gap-2.5">
                <Button variant="secondary" onClick={() => setBoom(true)}>
                    Romper esta zona
                </Button>
                <Button
                    variant="ghost"
                    onClick={() => {
                        setBoom(false);
                        setKey((k) => k + 1);
                    }}
                >
                    Reintentar
                </Button>
            </div>
        </div>
    );
}

function FormularioConEnter() {
    const [name, setName] = useState('');
    return (
        <EnterForm
            onSubmit={() => toast.success(`«${name || 'Sin nombre'}» guardado con Enter.`)}
            onCancel={() => {
                setName('');
                toast.info('Cancelado con Escape.');
            }}
            className="flex max-w-md flex-col gap-3"
        >
            <Field label="Nombre del proveedor" hint="Escribe y pulsa Enter para guardar, o Escape para cancelar.">
                {(p) => <Input {...p} value={name} onChange={(e) => setName(e.target.value)} />}
            </Field>
            <div className="flex gap-2.5">
                <Button type="submit" disabled={name.trim().length < 3}>
                    Guardar
                </Button>
            </div>
        </EnterForm>
    );
}

function TextoQueSeDesliza() {
    return (
        <div className="flex flex-col gap-2">
            <p className="text-small text-ink-2">Pasa el cursor sobre una fila: la que no cabe se desliza hasta el final; la que cabe no se mueve.</p>
            <ul className="w-72 divide-y divide-divider rounded-control border border-line text-ui">
                {['Papeles del Pacífico Exportaciones e Importaciones EIRL', 'Tintas Lima Norte SAC', 'Distribuidora Mayorista de Insumos Gráficos Chavín del Sur SAC'].map((t) => (
                    <li key={t} className="marquee-host px-3 py-2 hover:bg-surface-2">
                        <HoverMarquee text={t} />
                    </li>
                ))}
            </ul>
        </div>
    );
}

const GRAFICO: ChartOption = {
    color: ['var(--color-chart-1)', 'var(--color-chart-2)', 'var(--color-chart-3)'],
    grid: { left: 4, right: 8, top: 40, bottom: 4, containLabel: true },
    tooltip: { trigger: 'axis' },
    legend: { top: 0, left: 0, textStyle: { color: 'var(--color-ink-2)' } },
    xAxis: {
        type: 'category',
        data: ['jul', 'ago', 'set', 'oct', 'nov'],
        axisLine: { lineStyle: { color: 'var(--color-control)' } },
        axisTick: { show: false },
        axisLabel: { color: 'var(--color-ink-2)' },
    },
    yAxis: { type: 'value', axisLabel: { color: 'var(--color-ink-2)' }, splitLine: { lineStyle: { color: 'var(--color-divider)' } } },
    series: [
        { name: 'Ventas', type: 'bar', data: [820, 932, 901, 934, 1290], itemStyle: { borderRadius: [3, 3, 0, 0] } },
        { name: 'Compras', type: 'bar', data: [620, 732, 701, 834, 990], itemStyle: { borderRadius: [3, 3, 0, 0] } },
        { name: 'Meta', type: 'line', data: [700, 800, 850, 900, 1000], symbol: 'circle', symbolSize: 6 },
    ],
};

function Grafico() {
    return <Chart option={GRAFICO} height="17rem" label="Ventas, compras y meta de julio a noviembre (miles de soles)" />;
}

export const EXAMPLES_GRAMA: Record<string, () => ReactNode> = {
    'floating-panel': PanelFlotante,
    'date-field': Fecha,
    'time-field': Hora,
    'date-time-input': FechaHora,
    'multi-choice': SeleccionMultiple,
    'error-boundary': FronteraDeError,
    'enter-form': FormularioConEnter,
    'hover-marquee': TextoQueSeDesliza,
    chart: Grafico,
};
