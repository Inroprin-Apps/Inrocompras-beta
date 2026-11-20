'use client';
// Las solicitudes, una vez por pestaña; cada ficha (ítems, carga y requerimiento) por id.
import { solicitudes } from '@/modules/solicitudes/composition.ts';
import { keyed, resource } from '../_lib/resource.ts';

export const solicitudesStore = resource(() => solicitudes().listar(), ['solicitudes', 'solicitud_items']);
export const solicitudStore = keyed((id) => solicitudes().leer(id), ['solicitudes', 'solicitud_items', 'carga_items', 'requerimientos']);
/** El jefe que me asignó el administrador (lo propone el formulario de una administrativa). */
export const miJefeStore = resource(() => solicitudes().miJefe(), ['usuarios']);
