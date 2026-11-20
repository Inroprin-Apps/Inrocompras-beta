'use client';
import { supabaseNavegador } from '@/shared/supabase/client.ts';
import { SupabaseDocumentosAdapter } from './infrastructure/SupabaseDocumentosAdapter.ts';

let a: SupabaseDocumentosAdapter | null = null;
export const documentos = () => (a ??= new SupabaseDocumentosAdapter(supabaseNavegador()));
