'use client';

// El perfil de quien mira (área, roles, si ve precios), puesto una vez por el layout del servidor y
// leído por cualquier pantalla del navegador. Es comodidad para la UI: la seguridad la ponen RLS y las ac_*.
import { createContext, useContext, type ReactNode } from 'react';
import type { Perfil } from '@/shared/tipos.ts';

const Ctx = createContext<Perfil | null>(null);

export function PerfilProvider({ perfil, children }: { perfil: Perfil; children: ReactNode }) {
    return <Ctx.Provider value={perfil}>{children}</Ctx.Provider>;
}

export function usePerfil(): Perfil {
    const p = useContext(Ctx);
    if (!p) throw new Error('usePerfil fuera de PerfilProvider');
    return p;
}
