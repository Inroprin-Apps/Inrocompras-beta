'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabaseEnv } from './env.ts';

// Cliente del navegador, UNO por pestaña: corre con la sesión de la persona, así que RLS y las funciones
// deciden qué puede. Los adaptadores de src/modules/*/infrastructure lo reciben como parámetro.
let cliente: SupabaseClient | null = null;
export function supabaseNavegador(): SupabaseClient {
    if (!cliente) {
        const { url, key } = supabaseEnv();
        cliente = createBrowserClient(url, key);
    }
    return cliente;
}
