import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { supabaseEnv } from './env.ts';

// Cliente del servidor con la sesión de la persona (cookies). Sigue pasando por RLS: no es el de servicio.
export async function supabaseServidor() {
    const { url, key } = supabaseEnv();
    const almacen = await cookies();
    return createServerClient(url, key, {
        cookies: {
            getAll: () => almacen.getAll(),
            setAll: (lista) => {
                try {
                    for (const { name, value, options } of lista) almacen.set(name, value, options);
                } catch {
                    // Desde un Server Component no se escriben cookies; el proxy ya renovó la sesión.
                }
            },
        },
    });
}
