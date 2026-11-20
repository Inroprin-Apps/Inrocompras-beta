'use client';
// Raíz de composición del contexto REQUERIMIENTOS (requerimientos, validación técnica y seguimiento) en el navegador.
import { supabaseNavegador } from '@/shared/supabase/client.ts';
import { SupabaseRequerimientosAdapter } from './infrastructure/SupabaseRequerimientosAdapter.ts';

let a: SupabaseRequerimientosAdapter | null = null;
export const requerimientos = () => (a ??= new SupabaseRequerimientosAdapter(supabaseNavegador()));
