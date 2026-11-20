'use client';
// Los desaduanajes (lista), la ficha de cada uno, las OC que pueden tener desaduanaje y los catálogos del costeo,
// una vez por pestaña. La ficha se recarga también con 'documentos': un documento subido cuenta en el checklist.
import { desaduanajes } from '@/modules/desaduanaje/composition.ts';
import { keyed, resource } from '../_lib/resource.ts';

export const desaduanajesStore = resource(() => desaduanajes().listar(), ['desaduanajes']);
export const desaduanajeStore = keyed((id) => desaduanajes().detalle(id), ['desaduanajes', 'des_productos', 'des_gastos', 'documentos', 'acciones']);
export const ocsElegiblesStore = resource(() => desaduanajes().ocsElegibles(), ['ordenes', 'desaduanajes']);
export const conceptosGastoStore = resource(() => desaduanajes().conceptos(), ['conceptos_gasto_imp']);
export const tcCosteoStore = resource(() => desaduanajes().tcCosteo(), ['tc_costeo']);
