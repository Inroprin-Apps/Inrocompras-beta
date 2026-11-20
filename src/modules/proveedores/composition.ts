'use client';
// Raíz de composición del contexto PROVEEDORES en el navegador.
import { supabaseNavegador } from '@/shared/supabase/client.ts';
import { SupabaseProveedoresAdapter } from './infrastructure/SupabaseProveedoresAdapter.ts';

let a: SupabaseProveedoresAdapter | null = null;
export const proveedores = () => (a ??= new SupabaseProveedoresAdapter(supabaseNavegador()));
