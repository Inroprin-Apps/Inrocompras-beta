import type { Metadata } from 'next';
import { miPerfil } from '@/shared/auth/sesion.ts';
import { supabaseServidor } from '@/shared/supabase/server.ts';
import { Notice, SectionTitle } from '@/shared/ui/bits.tsx';
import { EquipoCliente, type Persona } from './equipo-cliente.tsx';

export const metadata: Metadata = { title: 'Equipo' };

export default async function Equipo() {
    const perfil = await miPerfil();
    if (!perfil?.es_admin) {
        return (
            <>
                <SectionTitle title="Equipo" />
                <Notice tone="info" cerrable={false}>
                    Solo el administrador asigna áreas y roles. Si necesitas un cambio, pídeselo.
                </Notice>
            </>
        );
    }
    const supabase = await supabaseServidor();
    const [u, r] = await Promise.all([
        supabase.from('usuarios').select('id, email, nombre, area, jefe_id, ambito, activo, creado').order('nombre'),
        supabase.from('usuario_roles').select('usuario_id, rol').eq('activo', true),
    ]);
    if (u.error) throw new Error(u.error.message);
    if (r.error) throw new Error(r.error.message);
    const roles = new Map<string, string[]>();
    for (const x of r.data) roles.set(x.usuario_id, [...(roles.get(x.usuario_id) ?? []), x.rol]);
    const personas: Persona[] = u.data.map((p) => ({ ...p, roles: (roles.get(p.id) ?? []).sort() }));
    return (
        <>
            <SectionTitle title="Equipo" />
            <EquipoCliente personas={personas} yo={perfil.id} />
        </>
    );
}
