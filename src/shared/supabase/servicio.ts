import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Cliente con SUPABASE_SERVICE_ROLE_KEY: salta RLS. SOLO en el servidor (la cola, el webhook de InroPay) y nunca
// con datos que pida una persona sin validar antes quién es. La llave no lleva NEXT_PUBLIC_ y no llega al navegador.
let cliente: SupabaseClient | null = null;

/** null si falta la llave (la ruta responde 503 con lo que falta, en vez de romper). */
export function supabaseServicio(): SupabaseClient | null {
    if (cliente) return cliente;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const llave = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !llave) return null;
    cliente = createClient(url, llave, { auth: { persistSession: false, autoRefreshToken: false } });
    return cliente;
}
