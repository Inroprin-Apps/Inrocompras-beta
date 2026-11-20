'use client';

// Los almacenes que comparten varias pantallas (una lectura por pestaña). Los de cada pantalla viven
// junto a ella; aquí solo lo transversal: personas, catálogos, la bandeja «Te toca» y las notificaciones.
import { personas, catalogos, bandeja } from '@/modules/comun/composition.ts';
import { resource } from './resource.ts';

/** Todas las personas (id → nombre, área): para mostrar quién hizo qué. */
export const personasStore = resource(() => personas().listar(), ['usuarios']);
/** Empresas, monedas, conceptos, configuración. */
export const catalogosStore = resource(() => catalogos().leer(), ['config', 'monedas', 'conceptos', 'empresas']);
/** «Te toca»: se recarga tras cualquier acción (cualquier cambio puede mover la bandeja). */
export const teTocaStore = resource(() => bandeja().teToca(), ['te_toca']);
/** La campana: las 30 últimas notificaciones propias. */
export const notificacionesStore = resource(() => bandeja().notificaciones(), ['notificaciones']);
