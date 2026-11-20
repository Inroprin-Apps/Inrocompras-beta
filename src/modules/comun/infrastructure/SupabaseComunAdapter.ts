import type { SupabaseClient } from '@supabase/supabase-js';
import { ok, type Result } from 'neverthrow';
import { resultado, type ErrorFuente } from '@/shared/errores.ts';
import type { BandejaPort, CatalogosPort, HistorialPort, PersonasPort } from '../application/ports/ComunPort.ts';
import type { Cambio, Catalogos, Notificacion, Pendiente, Persona } from '../domain/tipos.ts';

type Fila = Record<string, unknown>;
const s = (v: unknown) => (v == null ? '' : String(v));

export class SupabaseComunAdapter implements PersonasPort, CatalogosPort, BandejaPort, HistorialPort {
    constructor(private readonly db: SupabaseClient) {}

    async listar(): Promise<Result<Persona[], ErrorFuente>> {
        const r = resultado<Fila[]>(await this.db.from('usuarios').select('id,nombre,email,area,activo').order('nombre'));
        return r.map((fs) => fs.map((f) => ({ id: s(f.id), nombre: s(f.nombre), email: s(f.email), area: s(f.area), activo: f.activo === true })));
    }

    async leer(): Promise<Result<Catalogos, ErrorFuente>> {
        const [e, m, c, k] = await Promise.all([
            this.db.from('empresas').select('id,razon_social').eq('activo', true).order('id'),
            this.db.from('monedas').select('id,nombre,tasa_a_soles').order('id'),
            this.db.from('conceptos').select('id,ambito').eq('activo', true).order('id'),
            this.db.from('config').select('clave,valor'),
        ]);
        return resultado<Fila[]>(e).andThen((emp) =>
            resultado<Fila[]>(m).andThen((mon) =>
                resultado<Fila[]>(c).andThen((con) =>
                    resultado<Fila[]>(k).andThen((cfg) =>
                        ok({
                            empresas: emp.map((x) => ({ id: s(x.id), razonSocial: s(x.razon_social) })),
                            monedas: mon.map((x) => ({ id: s(x.id), nombre: s(x.nombre), tasaASoles: Number(x.tasa_a_soles) })),
                            conceptos: con.map((x) => ({ id: s(x.id), ambito: s(x.ambito) as 'OC' | 'Item' | 'Gasto' })),
                            config: Object.fromEntries(cfg.map((x) => [s(x.clave), x.valor])),
                        }),
                    ),
                ),
            ),
        );
    }

    async teToca(): Promise<Result<Pendiente[], ErrorFuente>> {
        const r = resultado<Fila[]>(await this.db.rpc('te_toca'));
        return r.map((fs) => (fs ?? []).map((f) => ({ tabla: s(f.tabla), id: s(f.id), titulo: s(f.titulo), paso: s(f.paso), desde: f.desde ? s(f.desde) : null })));
    }

    async notificaciones(): Promise<Result<Notificacion[], ErrorFuente>> {
        const r = resultado<Fila[]>(await this.db.from('notificaciones').select('id,titulo,cuerpo,ref_tabla,ref_id,leida,creado').order('creado', { ascending: false }).limit(30));
        return r.map((fs) =>
            fs.map((f) => ({
                id: Number(f.id),
                titulo: s(f.titulo),
                cuerpo: f.cuerpo == null ? null : s(f.cuerpo),
                tabla: f.ref_tabla == null ? null : s(f.ref_tabla),
                refId: f.ref_id == null ? null : s(f.ref_id),
                leida: f.leida === true,
                creado: s(f.creado),
            })),
        );
    }

    async marcarLeidas(ids: number[]): Promise<Result<null, ErrorFuente>> {
        if (!ids.length) return ok(null);
        return resultado(await this.db.from('notificaciones').update({ leida: true }).in('id', ids)).map(() => null);
    }

    async de(tabla: string, id: string): Promise<Result<Cambio[], ErrorFuente>> {
        const r = resultado<Fila[]>(
            await this.db.from('historial').select('id,accion,de,a,motivo,usuario_id,ts').eq('tabla', tabla).eq('registro_id', id).order('ts', { ascending: false }).limit(50),
        );
        return r.map((fs) =>
            fs.map((f) => ({
                id: Number(f.id),
                accion: s(f.accion),
                de: f.de == null ? null : s(f.de),
                a: f.a == null ? null : s(f.a),
                motivo: f.motivo == null ? null : s(f.motivo),
                usuarioId: f.usuario_id == null ? null : s(f.usuario_id),
                ts: s(f.ts),
            })),
        );
    }
}
