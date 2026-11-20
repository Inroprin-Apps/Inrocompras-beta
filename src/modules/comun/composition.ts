'use client';
// Raíz de composición de lo transversal en el navegador.
import { supabaseNavegador } from '@/shared/supabase/client.ts';
import { SupabaseComunAdapter } from './infrastructure/SupabaseComunAdapter.ts';

let a: SupabaseComunAdapter | null = null;
const adaptador = () => (a ??= new SupabaseComunAdapter(supabaseNavegador()));
export const personas = adaptador;
export const catalogos = adaptador;
export const bandeja = adaptador;
export const historial = adaptador;
