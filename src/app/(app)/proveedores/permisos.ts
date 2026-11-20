// Quién da de alta y edita los datos de un proveedor. Es comodidad para la UI (no pintar un botón que va a
// fallar): lo decide RLS, políticas «alta» y «editar» de proveedores en 0002_seguridad.sql.
import type { Perfil } from '@/shared/tipos.ts';

export const puedeEditarProveedores = (p: Pick<Perfil, 'es_compras' | 'es_admin' | 'area'>) => p.es_compras || p.es_admin || p.area === 'Finanzas';
