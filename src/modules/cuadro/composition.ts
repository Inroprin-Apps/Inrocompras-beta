'use client';
// Raíz de composición del contexto CUADRO DE APROBACIONES en el navegador.
import { supabaseNavegador } from '@/shared/supabase/client.ts';
import { ExportarCuadro } from './infrastructure/ExportarCuadro.ts';
import { SupabaseCuadroAdapter } from './infrastructure/SupabaseCuadroAdapter.ts';

let a: SupabaseCuadroAdapter | null = null;
export const cuadro = () => (a ??= new SupabaseCuadroAdapter(supabaseNavegador()));
let e: ExportarCuadro | null = null;
export const exportarCuadro = () => (e ??= new ExportarCuadro());
