'use client';

// Los ejemplos de uso de cada grupo de /dev/colores, por el id de su @grupo en globals.css: la pieza de verdad pintada con el token y,
// debajo, la clase exacta que se escribe. Los estados que no se pueden fotografiar (encima,
// pulsado) se pintan fijos.
import type { ReactNode } from 'react';
import { Check, X } from 'lucide-react';
import { Notice } from '../../../ui/bits.tsx';
import { CARD } from '../../../ui/card.tsx';
import { Chart, type ChartOption } from '../../../ui/chart/chart.tsx';

/** Un ejemplo: la muestra arriba y sus clases abajo. */
function Use({ label, cls, children, wide = false }: { label: string; cls: string; children: ReactNode; wide?: boolean }) {
    return (
        <figure className={`flex flex-col overflow-hidden ${CARD} ${wide ? 'sm:col-span-2' : ''}`}>
            <div className="flex min-h-20 flex-1 items-center justify-center bg-surface p-3">{children}</div>
            <figcaption className="flex flex-col gap-0.5 border-t border-divider px-3 py-2">
                <span className="text-small font-medium">{label}</span>
                <code className="text-caption break-words text-ink-2 select-all">{cls}</code>
            </figcaption>
        </figure>
    );
}

const EJE = { color: 'var(--color-ink-2)' };
const LINEA_EJE = { lineStyle: { color: 'var(--color-control)' } };
const REJILLA = { lineStyle: { color: 'var(--color-divider)' } };
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'set', 'oct', 'nov'];

const base = (extra: ChartOption): ChartOption => ({
    grid: { left: 4, right: 12, top: 36, bottom: 4, containLabel: true },
    tooltip: { trigger: 'axis' },
    legend: { top: 0, left: 0, icon: 'roundRect', itemWidth: 12, itemHeight: 8, itemGap: 12, textStyle: { ...EJE, fontSize: 12 } },
    ...extra,
});

const ejeMeses = { type: 'category', data: MESES, boundaryGap: false, axisLine: LINEA_EJE, axisTick: { show: false }, axisLabel: EJE } as const;
const ejeValor = { type: 'value', axisLabel: EJE, splitLine: REJILLA } as const;

export const lineas = base({
    color: ['var(--color-chart-1)', 'var(--color-chart-2)'],
    xAxis: ejeMeses,
    yAxis: ejeValor,
    series: [
        { name: 'Ventas', type: 'line', data: [620, 700, 680, 790, 860, 820, 910, 940, 900, 980, 1290], symbol: 'circle', symbolSize: 6 },
        { name: 'Compras', type: 'line', data: [480, 520, 560, 600, 640, 610, 700, 720, 690, 810, 990], symbol: 'circle', symbolSize: 6 },
    ],
});

export const apiladas = base({
    color: ['var(--color-chart-1)', 'var(--color-chart-2)', 'var(--color-chart-3)', 'var(--color-chart-4)', 'var(--color-chart-5)'],
    grid: { left: 4, right: 12, top: 56, bottom: 4, containLabel: true },
    xAxis: { ...ejeMeses, boundaryGap: true, data: MESES.slice(6) },
    yAxis: ejeValor,
    series: [
        { name: 'Impresos', type: 'bar', stack: 't', data: [320, 302, 301, 334, 390] },
        { name: 'Empaques', type: 'bar', stack: 't', data: [220, 182, 191, 234, 290] },
        { name: 'Etiquetas', type: 'bar', stack: 't', data: [150, 232, 201, 154, 190] },
        { name: 'Editorial', type: 'bar', stack: 't', data: [98, 77, 101, 99, 120] },
        { name: 'Otros', type: 'bar', stack: 't', data: [40, 52, 36, 48, 60], itemStyle: { borderRadius: [3, 3, 0, 0] } },
    ],
});

export const area = base({
    color: ['var(--color-chart-1)', 'var(--color-chart-2)', 'var(--color-chart-3)'],
    xAxis: ejeMeses,
    yAxis: ejeValor,
    series: [
        { name: 'Facturas', type: 'line', stack: 'c', areaStyle: { opacity: 0.35 }, showSymbol: false, data: [120, 132, 101, 134, 90, 130, 140, 150, 138, 160, 180] },
        { name: 'Boletas', type: 'line', stack: 'c', areaStyle: { opacity: 0.35 }, showSymbol: false, data: [60, 72, 71, 74, 70, 80, 85, 88, 82, 90, 96] },
        { name: 'Notas', type: 'line', stack: 'c', areaStyle: { opacity: 0.35 }, showSymbol: false, data: [20, 22, 21, 24, 20, 23, 26, 25, 24, 28, 30] },
    ],
});

export const ranking = base({
    color: ['var(--color-chart-ink)'],
    grid: { left: 4, right: 36, top: 4, bottom: 4, containLabel: true },
    legend: { show: false },
    tooltip: { trigger: 'axis', axisPointer: { type: 'none' } },
    xAxis: { type: 'value', axisLabel: EJE, splitLine: REJILLA },
    yAxis: { type: 'category', inverse: true, data: ['Cliente Norte SAC', 'Corporación Sur SA', 'Distribuidora Andina', 'Comercial Pacífico', 'Grupo Rímac'], axisLine: LINEA_EJE, axisTick: { show: false }, axisLabel: EJE },
    series: [{ name: 'Monto', type: 'bar', data: [412, 288, 241, 190, 122], barWidth: 14, itemStyle: { borderRadius: [0, 3, 3, 0] }, label: { show: true, position: 'right', color: 'var(--color-ink-2)' } }],
});

export const conMeta = base({
    color: ['var(--color-chart-ink)'],
    legend: { show: false },
    xAxis: { ...ejeMeses, boundaryGap: true, data: ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb'] },
    yAxis: ejeValor,
    series: [
        {
            name: 'Comprobantes',
            type: 'bar',
            data: [32, 41, 38, 46, 35, 18],
            barWidth: 22,
            itemStyle: { borderRadius: [3, 3, 0, 0] },
            markLine: { silent: true, symbol: 'none', lineStyle: { type: 'dashed', color: 'var(--color-ink-2)' }, label: { color: 'var(--color-ink-2)', formatter: 'Meta {c}' }, data: [{ yAxis: 40 }] },
        },
    ],
});

export const tendencia = base({
    color: ['var(--color-chart-ink)'],
    legend: { show: false },
    xAxis: { ...ejeMeses, data: ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9', 'S10', 'S11'] },
    yAxis: ejeValor,
    series: [{ name: 'Visitas', type: 'line', smooth: true, showSymbol: false, areaStyle: { opacity: 0.15 }, data: [210, 230, 224, 260, 280, 270, 310, 330, 320, 360, 410] }],
});

const Grid = ({ children }: { children: ReactNode }) => <div className="grid gap-2 sm:grid-cols-2">{children}</div>;

export const USAGE: Record<string, ReactNode> = {
    tarjeta: (
        <Grid>
            <Use label="Tarjeta" cls="bg-surface border-line" wide>
                <div className="w-full rounded-card border border-line bg-surface px-3 py-2 text-small">Tarjeta</div>
            </Use>
        </Grid>
    ),

    fila: (
        <Grid>
            <Use label="Fila bajo el cursor y fila elegida" cls="hover:bg-surface-2 · elegida: ring-1 ring-inset ring-primary" wide>
                <div className="w-full divide-y divide-divider rounded-card border border-line bg-surface text-small">
                    <div className="px-3 py-1.5">Fila normal</div>
                    <div className="bg-surface-2 px-3 py-1.5">Fila con el cursor encima</div>
                    <div className="px-3 py-1.5 ring-1 ring-inset ring-primary">Fila elegida</div>
                    <div className="px-3 py-1.5">Fila normal</div>
                </div>
            </Use>
        </Grid>
    ),

    divisor: (
        <Grid>
            <Use label="Divisor dentro de una tarjeta" cls="border-b border-divider · divide-divider" wide>
                <div className="w-full rounded-card border border-line bg-surface px-3 text-small">
                    <div className="flex justify-between border-b border-divider py-1.5">
                        <span>Subtotal</span>
                        <span className="tabular-nums">S/ 1,000.00</span>
                    </div>
                    <div className="flex justify-between border-b border-divider py-1.5">
                        <span>IGV (18 %)</span>
                        <span className="tabular-nums">S/ 180.00</span>
                    </div>
                    <div className="flex justify-between py-1.5 font-medium">
                        <span>Total</span>
                        <span className="tabular-nums">S/ 1,180.00</span>
                    </div>
                </div>
            </Use>
        </Grid>
    ),

    'estados-solidos': (
        <Grid>
            <Use wide label="Barras de estado" cls="bg-success · bg-warning · bg-danger">
                <div className="flex w-full flex-col gap-1.5">
                    {[
                        ['bg-success', 'w-4/5'],
                        ['bg-warning', 'w-2/5'],
                        ['bg-danger', 'w-1/5'],
                    ].map(([c, w]) => (
                        <div key={c} className="h-2 overflow-hidden rounded-md bg-surface-3">
                            <span className={`block h-full rounded-md ${c} ${w}`} />
                        </div>
                    ))}
                </div>
            </Use>
            <Use label="Icono de un toast" cls="text-success · text-danger (solo el icono)">
                <div className="flex w-full flex-col gap-1.5">
                    <span className="flex items-center gap-2 rounded-card border border-line bg-surface px-2.5 py-1.5 text-small shadow-card">
                        <Check size={14} className="text-success" /> Orden guardada.
                    </span>
                    <span className="flex items-center gap-2 rounded-card border border-line bg-surface px-2.5 py-1.5 text-small shadow-card">
                        <X size={14} className="text-danger" /> No se pudo guardar.
                    </span>
                </div>
            </Use>
        </Grid>
    ),

    enlace: (
        <Grid>
            <Use label="Enlace" cls="text-primary hover:underline">
                <span className="text-small">
                    Ver <a href="#">F001-00012345 ↗</a>
                </span>
            </Use>
        </Grid>
    ),

    'error-campo': (
        <Grid>
            <Use wide label="Error de un campo" cls="border-danger · text-danger-strong">
                <div className="flex w-full flex-col gap-1">
                    <span className="rounded-control border border-danger bg-surface px-2.5 py-1.5 text-small">2051234567</span>
                    <span className="text-caption font-medium text-danger-strong">El RUC tiene 11 dígitos; este tiene 10.</span>
                </div>
            </Use>
        </Grid>
    ),

    superficies: (
        <Grid>
            <Use label="Pista de barra, pulsado" cls="bg-surface-3">
                <div className="w-full">
                    <div className="h-2 overflow-hidden rounded-md bg-surface-3">
                        <span className="block h-full w-3/5 rounded-md bg-primary" />
                    </div>
                </div>
            </Use>
            <Use label="Borde de control" cls="border-control · focus:border-primary">
                <div className="flex w-full flex-col gap-1.5">
                    <span className="rounded-control border border-control bg-surface px-2.5 py-1.5 text-small text-ink-3">Normal</span>
                    <span className="rounded-control border border-primary bg-surface px-2.5 py-1.5 text-small">Con foco</span>
                </div>
            </Use>
        </Grid>
    ),

    texto: (
        <Grid>
            <Use label="Los tres pesos juntos" cls="text-ink · text-ink-2 · text-ink-3" wide>
                <div className="w-full rounded-card border border-line bg-surface px-3 py-2.5">
                    <p className="text-caption font-medium tracking-[.06em] text-ink-3 uppercase">Ventas del mes</p>
                    <p className="text-display font-semibold">S/ 952,851.25</p>
                    <p className="text-small text-ink-2">132 comprobantes · 4 por revisar</p>
                </div>
            </Use>
            <Use label="Cabecera de tabla y sub-línea" cls="text-ink-3 (th, sub-línea)">
                <div className="w-full text-small">
                    <p className="border-b border-divider pb-1 text-caption font-medium tracking-[.05em] text-ink-3 uppercase">Proveedor</p>
                    <p className="pt-1.5">Tintas Lima Norte SAC</p>
                    <p className="text-caption text-ink-3">20512345678</p>
                </div>
            </Use>
            <Use label="Ayuda bajo un campo" cls="text-small text-ink-3">
                <div className="flex w-full flex-col gap-1">
                    <span className="text-small font-medium">RUC</span>
                    <span className="rounded-control border border-control bg-surface px-2.5 py-1.5 text-small">20512345678</span>
                    <span className="text-caption text-ink-3">11 dígitos.</span>
                </div>
            </Use>
        </Grid>
    ),

    relleno: (
        <Grid>
            <Use label="Texto sobre relleno" cls="text-on-fill (nunca text-white)">
                <span className="rounded-control bg-primary px-3 py-1.5 text-small font-medium text-on-fill">Revisar ahora</span>
            </Use>
        </Grid>
    ),

    boton: (
        <Grid>
            <Use label="Botón: normal, encima, pulsado" cls="bg-primary hover:bg-primary-hover active:bg-primary-active" wide>
                <div className="flex flex-wrap gap-2">
                    <span className="rounded-control bg-primary px-3 py-1.5 text-small font-medium text-on-fill">Guardar</span>
                    <span className="rounded-control bg-primary-hover px-3 py-1.5 text-small font-medium text-on-fill">Guardar</span>
                    <span className="rounded-control bg-primary-active px-3 py-1.5 text-small font-medium text-on-fill">Guardar</span>
                </div>
            </Use>
            <Use label="Foco de teclado" cls="focus-visible:outline-primary">
                <span className="rounded-control border border-control bg-surface px-3 py-1.5 text-small font-medium outline-2 outline-offset-2 outline-primary">
                    Exportar
                </span>
            </Use>
        </Grid>
    ),

    primario: (
        <Grid>
            <Use label="Chip informativo" cls="bg-primary-soft text-primary-strong">
                <span className="rounded-full bg-primary-soft px-2.5 py-1 text-small font-medium text-primary-strong">Nuevo</span>
            </Use>
            <Use label="Filtro elegido" cls="border-primary bg-primary-soft text-primary-strong">
                <div className="flex gap-2">
                    <span className="rounded-full border border-control bg-surface px-3 py-1.5 text-small text-ink">Todos</span>
                    <span className="rounded-full border border-primary bg-primary-soft px-3 py-1.5 text-small font-medium text-primary-strong">Pendientes</span>
                </div>
            </Use>
            <Use label="Zona de arrastre con un archivo encima" cls="border-primary bg-primary-soft" wide>
                <div className="grid w-full place-items-center rounded-card border border-dashed border-primary bg-primary-soft px-3 py-4 text-small text-ink">Suelta el archivo aquí</div>
            </Use>
            <Use label="Botón punteado: normal, encima y pulsado" cls="text-primary · hover:bg-primary-soft · active:bg-primary-line" wide>
                <div className="flex flex-wrap gap-2">
                    <span className="rounded-control border border-dashed border-control px-3 py-1.5 text-small font-medium text-primary">+ Añadir proveedor</span>
                    <span className="rounded-control border border-dashed border-control bg-primary-soft px-3 py-1.5 text-small font-medium text-primary">+ Añadir proveedor</span>
                    <span className="rounded-control border border-dashed border-control bg-primary-line px-3 py-1.5 text-small font-medium text-primary">+ Añadir proveedor</span>
                </div>
            </Use>
        </Grid>
    ),

    estados: (
        <Grid>
            <Use label="Chips de estado" cls="bg-{rol}-soft text-{rol}-strong" wide>
                <div className="flex flex-wrap gap-1.5">
                    <span className="rounded-full bg-success-soft px-2.5 py-1 text-small font-medium text-success-strong">Pagado</span>
                    <span className="rounded-full bg-warning-soft px-2.5 py-1 text-small font-medium text-warning-strong">Pendiente</span>
                    <span className="rounded-full bg-danger-soft px-2.5 py-1 text-small font-medium text-danger-strong">Sin OC</span>
                </div>
            </Use>
            <Use label="Icono del aviso de advertencia" cls="text-warning-strong (el amarillo sobre blanco no se ve)">
                <div className="-mb-4">
                    <Notice tone="warning">El robot no corrió hoy.</Notice>
                </div>
            </Use>
            <Use label="Riesgo en un KPI" cls="text-danger-strong (etiqueta) · bg-danger-soft text-danger-strong (pastilla)">
                <div className="flex w-full items-start justify-between gap-2">
                    <span className="text-small font-medium text-danger-strong">Sin OC</span>
                    <span className="rounded-full bg-danger-soft px-2.5 py-1 text-small font-medium text-danger-strong">Riesgo</span>
                </div>
            </Use>
        </Grid>
    ),

    datos: (
        <Grid>
            <Use label="Ventas en azul, compras en turquesa" cls="bg-primary · bg-teal" wide>
                <div className="flex w-full flex-col gap-2 text-small">
                    {[
                        ['Ventas', 'bg-primary', 'w-full', 'S/ 953 mil'],
                        ['Compras', 'bg-teal', 'w-3/4', 'S/ 722 mil'],
                    ].map(([l, c, w, v]) => (
                        <div key={l}>
                            <div className="mb-1 flex justify-between">
                                <span className="font-medium">{l}</span>
                                <span className="text-ink-2">{v}</span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-md bg-surface-3">
                                <span className={`block h-full rounded-md ${c} ${w}`} />
                            </div>
                        </div>
                    ))}
                </div>
            </Use>
            <Use label="Mapa de calor" cls="color-mix(in oklch, teal N%, surface)">
                <div className="grid grid-cols-6 gap-1">
                    {[0, 8, 20, 35, 55, 80, 12, 40, 100, 65, 25, 5].map((p, i) => (
                        <span
                            key={i}
                            className="flex size-8 items-center justify-center rounded text-caption font-medium"
                            style={{
                                background: p ? `color-mix(in oklch, var(--color-teal) ${p}%, var(--color-surface))` : 'var(--color-surface-3)',
                                color: p > 55 ? 'var(--color-on-fill)' : p ? 'var(--color-ink-2)' : 'var(--color-disabled-ink)',
                            }}
                        >
                            {p}
                        </span>
                    ))}
                </div>
            </Use>
            <Use label="Texto y fondo turquesa" cls="bg-teal-soft text-teal-strong">
                <span className="rounded-full bg-teal-soft px-2.5 py-1 text-small font-medium text-teal-strong">Compras</span>
            </Use>
        </Grid>
    ),

    graficos: (
        <div className="grid gap-2 lg:grid-cols-2">
            <Use label="Líneas: dos series que se comparan" cls="color: chart-1, chart-2" wide>
                <Chart height="15rem" label="Ventas y compras por mes (miles de soles)" option={lineas} />
            </Use>
            <Use label="Barras apiladas: partes de un total" cls="color: chart-1 … chart-5 (el neutro es «Otros»)">
                <Chart height="15rem" label="Ventas por línea de producto" option={apiladas} />
            </Use>
            <Use label="Área apilada: evolución de la mezcla" cls="areaStyle + stack · chart-1, chart-2, chart-3">
                <Chart height="15rem" label="Comprobantes por tipo a lo largo del año" option={area} />
            </Use>
            <Use label="Ranking: barras horizontales, una sola serie" cls="color: chart-ink">
                <Chart height="15rem" label="Principales clientes por monto" option={ranking} />
            </Use>
            <Use label="Barras con meta: una sola serie y su línea" cls="chart-ink + markLine en ink-2">
                <Chart height="15rem" label="Comprobantes por día y meta de 40" option={conMeta} />
            </Use>
            <Use label="Tendencia: línea suave con área" cls="chart-ink · areaStyle con opacidad baja" wide>
                <Chart height="13rem" label="Visitas al portal por semana" option={tendencia} />
            </Use>
        </div>
    ),

    deshabilitado: (
        <Grid>
            <Use label="Botón deshabilitado" cls="disabled:bg-disabled disabled:text-disabled-ink">
                <span className="rounded-control bg-disabled px-3 py-1.5 text-small font-medium text-disabled-ink">Guardando…</span>
            </Use>
            <Use label="Campo deshabilitado" cls="disabled:bg-disabled disabled:text-disabled-ink">
                <span className="w-full rounded-control border border-control bg-disabled px-2.5 py-1.5 text-small text-disabled-ink">ACTIVO · HABIDO</span>
            </Use>
        </Grid>
    ),
};
