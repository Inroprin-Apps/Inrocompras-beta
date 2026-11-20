'use client';
// Las cuotas (lista) y la ficha de cada una, una vez por pestaña. Subir una factura puede solicitar una cuota
// (por eso 'documentos' también recarga) y pagar la última cambia el estatus de la orden.
import { pagos } from '@/modules/pagos/composition.ts';
import { keyed, resource } from '../_lib/resource.ts';

export const pagosStore = resource(() => pagos().listar(), ['pagos', 'ordenes', 'documentos']);
export const pagoStore = keyed((id) => pagos().detalle(id), ['pagos', 'ordenes', 'documentos', 'acciones']);
