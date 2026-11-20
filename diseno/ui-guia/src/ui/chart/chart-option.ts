import type { ComposeOption } from 'echarts/core';
import type { BarSeriesOption, LineSeriesOption } from 'echarts/charts';
import type {
    DataZoomComponentOption,
    GridComponentOption,
    LegendComponentOption,
    MarkAreaComponentOption,
    MarkLineComponentOption,
    TooltipComponentOption,
} from 'echarts/components';

/**
 * La opción que puede tomar un gráfico nuestro: exactamente las piezas que registra `echart-core.tsx`. Pedir un tipo de
 * serie que no está registrado es un error de tipos y no una caja en blanco. Los colores pueden ser tokens CSS
 * (`var(--color-chart-1)`): se resuelven antes de dibujar.
 */
/** Una serie de un `ChartOption`, para código que arma la lista pieza por pieza. */
export type ChartSeries = BarSeriesOption | LineSeriesOption;

export type ChartOption = ComposeOption<
    | BarSeriesOption
    | LineSeriesOption
    | DataZoomComponentOption
    | GridComponentOption
    | LegendComponentOption
    | MarkAreaComponentOption
    | MarkLineComponentOption
    | TooltipComponentOption
>;
