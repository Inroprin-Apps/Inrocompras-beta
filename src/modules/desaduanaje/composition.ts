'use client';
// Raíz de composición del contexto DESADUANAJE en el navegador.
import { supabaseNavegador } from '@/shared/supabase/client.ts';
import { SupabaseDesaduanajesAdapter } from './infrastructure/SupabaseDesaduanajesAdapter.ts';

let a: SupabaseDesaduanajesAdapter | null = null;
export const desaduanajes = () => (a ??= new SupabaseDesaduanajesAdapter(supabaseNavegador()));
