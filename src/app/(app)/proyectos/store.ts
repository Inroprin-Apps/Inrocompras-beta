'use client';
// Los proyectos, una vez por pestaña (los usan Proyectos, Solicitudes y el Plan de compras).
import { proyectos } from '@/modules/proyectos/composition.ts';
import { resource } from '../_lib/resource.ts';

export const proyectosStore = resource(() => proyectos().listar(), ['proyectos', 'proyecto_etapas']);
