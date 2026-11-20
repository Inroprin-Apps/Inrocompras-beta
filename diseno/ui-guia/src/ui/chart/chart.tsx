'use client';

import dynamic from 'next/dynamic';
import type { EChartProps } from './echart-core.tsx';

export type { ChartOption, ChartSeries } from './chart-option.ts';

const EChart = dynamic<EChartProps>(() => import('./echart-core.tsx'), {
    ssr: false,
    loading: () => <div className="h-full w-full animate-pulse rounded-control bg-surface-3" aria-hidden="true" />,
});

/**
 * UN GRÁFICO, DIBUJADO POR ECHARTS. Viene de GRAMA (shared/ui/chart).
 *
 * ECharts se carga bajo demanda y solo en el navegador: es pesado, dibuja midiendo una caja real, y una pantalla que no
 * tiene un gráfico abierto no debe pagarlo. Mientras tanto una caja del MISMO alto guarda el sitio, así nada de abajo salta.
 */
export function Chart(props: EChartProps) {
    return (
        <div className="w-full" style={{ height: props.height }}>
            <EChart {...props} />
        </div>
    );
}
