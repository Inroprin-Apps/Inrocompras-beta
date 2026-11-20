'use client';
// Los proveedores, una vez por pestaña. Se recargan tras una acción o un guardado (`refrescar(['proveedores'])`).
import { proveedores } from '@/modules/proveedores/composition.ts';
import { resource } from '../_lib/resource.ts';

export const proveedoresStore = resource(() => proveedores().listar(), ['proveedores']);
