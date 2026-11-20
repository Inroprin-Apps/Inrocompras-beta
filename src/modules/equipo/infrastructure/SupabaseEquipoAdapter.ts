import type { SupabaseClient } from '@supabase/supabase-js';
import type { Result } from 'neverthrow';
import { resultado, type ErrorFuente } from '@/shared/errores.ts';
import type { EquipoPort } from '../application/ports/EquipoPort.ts';
import type { CambioEquipo, DatosEquipo, Miembro } from '../domain/equipo.ts';

type Fila = Record<string, unknown>;
const s = (v: unknown) => (v == null ? '' : String(v));
const sn = (v: unknown) => (v == null ? null : String(v));

export class SupabaseEquipoAdapter implements EquipoPort {
    constructor(private readonly db: SupabaseClient) {}

    async listar(): Promise<Result<Miembro[], ErrorFuente>> {
        const [u, r] = await Promise.all([
            this.db.from('usuarios').select('id,email,nombre,area,jefe_id,ambito,activo,creado').order('nombre'),
            this.db.from('usuario_roles').select('usuario_id,rol').eq('activo', true),
        ]);
        return resultado<Fila[]>(u).andThen((us) =>
            resultado<Fila[]>(r).map((rs) => {
                const roles = new Map<string, string[]>();
                for (const x of rs) roles.set(s(x.usuario_id), [...(roles.get(s(x.usuario_id)) ?? []), s(x.rol)]);
                return us.map((p) => ({
                    id: s(p.id),
                    email: s(p.email),
                    nombre: s(p.nombre),
                    area: s(p.area),
                    jefeId: sn(p.jefe_id),
                    ambito: (s(p.ambito) || 'todas') as Miembro['ambito'],
                    activo: p.activo === true,
                    creado: s(p.creado),
                    roles: (roles.get(s(p.id)) ?? []).sort(),
                }));
            }),
        );
    }

    async guardar(id: string, d: DatosEquipo): Promise<Result<null, ErrorFuente>> {
        const r = await this.db.rpc('ac_equipo_guardar', { p_usuario: id, p_area: d.area, p_jefe: d.jefeId || null, p_ambito: d.ambito, p_activo: d.activo, p_roles: d.roles });
        return resultado(r).map(() => null);
    }

    async historial(id: string): Promise<Result<CambioEquipo[], ErrorFuente>> {
        const r = await this.db.from('historial').select('id,accion,de,a,usuario_id,ts').eq('tabla', 'usuarios').eq('registro_id', id).order('ts', { ascending: false }).limit(20);
        return resultado<Fila[]>(r).map((fs) => fs.map((f) => ({ id: Number(f.id), accion: s(f.accion), de: sn(f.de), a: sn(f.a), usuarioId: sn(f.usuario_id), ts: s(f.ts) })));
    }
}
