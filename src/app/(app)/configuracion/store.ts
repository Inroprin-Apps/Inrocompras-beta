'use client';
// La configuración (parámetros, monedas, TC de costeo, conceptos) y la cola, una vez por pestaña.
import { cola, configuracion } from '@/modules/configuracion/composition.ts';
import { resource } from '../_lib/resource.ts';

export const configuracionStore = resource(() => configuracion().leer(), ['config', 'monedas', 'tc_costeo', 'conceptos', 'conceptos_gasto_imp']);
export const colaResumenStore = resource(() => cola().resumen(), ['cola']);
export const colaStore = resource(() => cola().listar(null), ['cola']);
