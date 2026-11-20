'use client';
// Los requerimientos, una vez por pestaña; cada ficha (ítems, anulaciones y solicitud) por id.
import { requerimientos } from '@/modules/requerimientos/composition.ts';
import { keyed, resource } from '../_lib/resource.ts';

export const requerimientosStore = resource(() => requerimientos().listar(), ['requerimientos', 'requerimiento_items']);
export const requerimientoStore = keyed((id) => requerimientos().leer(id), ['requerimientos', 'requerimiento_items', 'anulaciones', 'solicitudes']);
/** anulación → su requerimiento (la bandeja enlaza /requerimientos?anulacion=<id>). */
export const anulacionReqStore = keyed((id) => requerimientos().requerimientoDeAnulacion(id), []);
