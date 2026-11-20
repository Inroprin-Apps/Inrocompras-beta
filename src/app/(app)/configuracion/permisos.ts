// Qué pestaña ve cada quien. Comodidad para la UI: lo decide RLS (0002) y las funciones solo-admin de la cola (0021).
import type { Perfil } from '@/shared/tipos.ts';

type P = Pick<Perfil, 'es_admin' | 'roles' | 'area'>;
export const editaParametros = (p: P) => p.es_admin;
export const editaTasas = (p: P) => p.es_admin || p.roles.includes('FINANZAS');
export const agregaTc = (p: P) => p.es_admin || p.roles.includes('JEFE_COMPRAS_I') || p.area === 'Importaciones';
export const editaGastos = (p: P) => p.es_admin || p.roles.includes('JEFE_COMPRAS_I');
export const veCola = (p: P) => p.es_admin;
