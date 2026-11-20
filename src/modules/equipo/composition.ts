'use client';
// Raíz de composición de EQUIPO en el navegador.
import { supabaseNavegador } from '@/shared/supabase/client.ts';
import { SupabaseEquipoAdapter } from './infrastructure/SupabaseEquipoAdapter.ts';

let a: SupabaseEquipoAdapter | null = null;
export const equipo = () => (a ??= new SupabaseEquipoAdapter(supabaseNavegador()));
