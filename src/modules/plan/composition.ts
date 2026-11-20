'use client';
// Raíz de composición del contexto PLAN DE COMPRAS en el navegador.
import { supabaseNavegador } from '@/shared/supabase/client.ts';
import { SupabasePlanAdapter } from './infrastructure/SupabasePlanAdapter.ts';

let a: SupabasePlanAdapter | null = null;
export const plan = () => (a ??= new SupabasePlanAdapter(supabaseNavegador()));
