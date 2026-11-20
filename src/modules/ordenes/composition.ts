'use client';
// Raíz de composición del contexto ÓRDENES en el navegador.
import { supabaseNavegador } from '@/shared/supabase/client.ts';
import { SupabaseOrdenesAdapter } from './infrastructure/SupabaseOrdenesAdapter.ts';

let a: SupabaseOrdenesAdapter | null = null;
export const ordenes = () => (a ??= new SupabaseOrdenesAdapter(supabaseNavegador()));
