'use client';
// El cuadro (una lectura por pestaña) y las órdenes por firmar (por el conjunto de ids que te_toca() pone en tu bandeja).
import { cuadro } from '@/modules/cuadro/composition.ts';
import { keyed, resource } from '../_lib/resource.ts';

export const cuadroStore = resource(() => cuadro().listar(), ['ordenes', 'oc_lineas', 'pagos', 'documentos']);
/** Clave: los ids separados por coma (ordenados), o '' si no hay nada que firmar. */
export const porAprobarStore = keyed((ids) => cuadro().porAprobar(ids ? ids.split(',') : []), ['ordenes', 'oc_lineas', 'acciones']);
