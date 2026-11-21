'use client';
// El avance de los ítems sin montos (seguimiento_items), por proyecto ('' = todos).
import { requerimientos } from '@/modules/requerimientos/composition.ts';
import { keyed } from '../_lib/resource.ts';

export const seguimientoStore = keyed(
    (proyecto) => requerimientos().seguimiento(proyecto === 'todos' ? null : proyecto),
    ['requerimiento_items', 'requerimientos', 'ordenes', 'oc_lineas', 'pagos'],
);
