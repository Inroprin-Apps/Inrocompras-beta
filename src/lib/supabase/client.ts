'use client';

import { createBrowserClient } from '@supabase/ssr';
import { supabaseEnv } from './env.ts';

// Cliente del navegador: corre con la sesión de la persona, así que RLS y las funciones deciden qué puede.
export function supabaseNavegador() {
    const { url, key } = supabaseEnv();
    return createBrowserClient(url, key);
}
