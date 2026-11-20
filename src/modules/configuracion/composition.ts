'use client';
// Raíz de composición de CONFIGURACIÓN en el navegador (con la sesión de la persona: RLS y las funciones solo-admin deciden).
import { supabaseNavegador } from '@/shared/supabase/client.ts';
import { SupabaseConfiguracionAdapter } from './infrastructure/SupabaseConfiguracionAdapter.ts';

let a: SupabaseConfiguracionAdapter | null = null;
export const configuracion = () => (a ??= new SupabaseConfiguracionAdapter(supabaseNavegador()));
export const cola = configuracion;
