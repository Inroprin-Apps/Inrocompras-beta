'use client';
// Raíz de composición del contexto SOLICITUDES en el navegador.
import { supabaseNavegador } from '@/shared/supabase/client.ts';
import { descargarPlantilla, leerHoja } from './infrastructure/ExcelCarga.ts';
import { SupabaseSolicitudesAdapter } from './infrastructure/SupabaseSolicitudesAdapter.ts';

let a: SupabaseSolicitudesAdapter | null = null;
export const solicitudes = () => (a ??= new SupabaseSolicitudesAdapter(supabaseNavegador()));
/** El archivo Excel de la carga masiva. */
export const excel = { leerHoja, descargarPlantilla };
