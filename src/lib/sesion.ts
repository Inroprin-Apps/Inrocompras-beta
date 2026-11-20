import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { supabaseServidor } from './supabase/server.ts';
import type { Perfil } from './tipos.ts';

// El perfil de quien mira (área, roles, si ve precios), una vez por petición.
export const miPerfil = cache(async (): Promise<Perfil | null> => {
    const supabase = await supabaseServidor();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect('/login');
    const { data, error } = await supabase.rpc('mi_perfil');
    if (error) throw new Error(error.message);
    return (data as Perfil | null) ?? null;
});
