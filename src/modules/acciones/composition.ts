'use client';
// Raíz de composición del contexto ACCIONES en el navegador: el adaptador de Supabase con la sesión de la persona.
import { supabaseNavegador } from '@/shared/supabase/client.ts';
import { SupabaseAccionesAdapter } from './infrastructure/SupabaseAccionesAdapter.ts';

let puerto: SupabaseAccionesAdapter | null = null;
export const acciones = () => (puerto ??= new SupabaseAccionesAdapter(supabaseNavegador()));
