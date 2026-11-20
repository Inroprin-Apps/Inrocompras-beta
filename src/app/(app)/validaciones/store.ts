'use client';
// Los ítems vivos con su validación técnica, una vez por pestaña; la ficha de un ítem (?ver=) por id.
import { requerimientos } from '@/modules/requerimientos/composition.ts';
import { keyed, resource } from '../_lib/resource.ts';

export const tecnicaStore = resource(() => requerimientos().itemsTecnica(), ['requerimiento_items', 'requerimientos']);
export const itemTecnicaStore = keyed((id) => requerimientos().itemTecnica(id), ['requerimiento_items', 'requerimientos']);
