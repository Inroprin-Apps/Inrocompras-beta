'use client';
// Las órdenes (lista), la ficha de cada una, lo que la base deja editar y los proveedores, una vez por pestaña.
import { ordenes } from '@/modules/ordenes/composition.ts';
import { keyed, resource } from '../_lib/resource.ts';

export const ordenesStore = resource(() => ordenes().listar(), ['ordenes', 'oc_lineas']);
export const ordenStore = keyed((id) => ordenes().detalle(id), ['ordenes', 'oc_lineas', 'pagos', 'acciones']);
export const edicionStore = keyed((id) => ordenes().edicion(id), ['ordenes', 'oc_lineas', 'acciones']);
export const proveedoresStore = resource(() => ordenes().proveedores(), ['proveedores']);
