'use client';
// Raíz de composición del contexto PROYECTOS en el navegador.
import { supabaseNavegador } from '@/shared/supabase/client.ts';
import { SupabaseProyectosAdapter } from './infrastructure/SupabaseProyectosAdapter.ts';

let a: SupabaseProyectosAdapter | null = null;
export const proyectos = () => (a ??= new SupabaseProyectosAdapter(supabaseNavegador()));
