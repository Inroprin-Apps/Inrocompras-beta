'use client';
// El plan de compras de cada alcance (un proyecto, «sin proyecto» o todo), pedido al abrirlo. Clave: 'todos' | 'sin' | id.
import { plan } from '@/modules/plan/composition.ts';
import { keyed } from '../_lib/resource.ts';

export const planStore = keyed(
    (k) => plan().listar(k === 'todos' || k === 'sin' ? k : { proyectoId: k }),
    ['plan', 'ordenes', 'oc_lineas', 'requerimientos', 'requerimiento_items', 'acciones'],
);
