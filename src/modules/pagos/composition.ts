'use client';
// Raíz de composición del contexto PAGOS en el navegador.
import { supabaseNavegador } from '@/shared/supabase/client.ts';
import { SupabasePagosAdapter } from './infrastructure/SupabasePagosAdapter.ts';

let a: SupabasePagosAdapter | null = null;
export const pagos = () => (a ??= new SupabasePagosAdapter(supabaseNavegador()));
