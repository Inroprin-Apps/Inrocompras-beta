'use client';

import { useMemo } from 'react';
import ReactEChartsCore from 'echarts-for-react/lib/core';
import * as echarts from 'echarts/core';
import { BarChart, LineChart } from 'echarts/charts';
import { DataZoomComponent, GridComponent, LegendComponent, MarkAreaComponent, MarkLineComponent, TooltipComponent } from 'echarts/components';
import { SVGRenderer } from 'echarts/renderers';
import { resolveCssColor, resolveTokensDeep } from './resolve-css-color.ts';
import type { ChartOption } from './chart-option.ts';

/**
 * SOLO SE REGISTRA LO QUE DIBUJAMOS: barras, líneas, la cuadrícula, el tooltip, la leyenda, la línea marcada y el zoom.
 * Todo ECharts pesa ~1 MB; esto es una fracción, y un tipo nuevo de gráfico es una línea aquí.
 *
 * EL RENDERIZADOR SVG Y NO EL DE CANVAS, y no es gusto: un PDF o una exportación toma los gráficos del DOM como `<svg>`,
 * así que uno de canvas dejaría el documento sin él.
 */
echarts.use([BarChart, LineChart, DataZoomComponent, GridComponent, LegendComponent, MarkAreaComponent, MarkLineComponent, TooltipComponent, SVGRenderer]);

export interface EChartProps {
    option: ChartOption;
    /** Alto CSS (en `rem`): ECharts necesita una caja con tamaño antes de dibujar. */
    height: string;
    /** Lo que dice el gráfico, para un lector de pantalla: un gráfico SVG es una imagen para él. */
    label: string;
}

export default function EChartCore({ option, height, label }: EChartProps) {
    // Los tokens pasan a colores planos aquí, de lo que la página calcula ahora (ver `resolve-css-color`). La fuente del
    // cuerpo también entra: ECharts dibujaría su propia sans-serif si no.
    const resolved = useMemo(() => {
        const withTokens = resolveTokensDeep(option, resolveCssColor);
        return { ...withTokens, textStyle: { fontFamily: getComputedStyle(document.body).fontFamily, ...(withTokens.textStyle as object | undefined) } };
    }, [option]);

    return (
        <div role="img" aria-label={label}>
            <ReactEChartsCore echarts={echarts} option={resolved} notMerge opts={{ renderer: 'svg' }} style={{ height, width: '100%' }} />
        </div>
    );
}
