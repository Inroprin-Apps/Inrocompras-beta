'use client';
// El equipo (personas con sus roles) y el historial de cambios de cada una, una vez por pestaña.
import { equipo } from '@/modules/equipo/composition.ts';
import { keyed, resource } from '../_lib/resource.ts';

export const equipoStore = resource(() => equipo().listar(), ['usuarios', 'usuario_roles']);
export const historialEquipoStore = keyed((id) => equipo().historial(id), ['usuarios', 'usuario_roles']);
