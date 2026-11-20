import type { SupabaseClient } from '@supabase/supabase-js';
import { err, ok, type Result } from 'neverthrow';
import { resultado, type ErrorFuente } from '@/shared/errores.ts';
import type { AccionesPort } from '../application/ports/AccionesPort.ts';
import type { Accion, Campo } from '../domain/accion.ts';

type Fila = { accion: string; etiqueta: string; tipo: string; funcion: string; pide: unknown };

export class SupabaseAccionesAdapter implements AccionesPort {
    constructor(private readonly db: SupabaseClient) {}

    async disponibles(tabla: string, id: string): Promise<Result<Accion[], ErrorFuente>> {
        const r = resultado<Fila[]>(await this.db.rpc('acciones_disponibles', { p_tabla: tabla, p_id: id }));
        return r.andThen((filas) =>
            ok(
                (filas ?? []).map((f) => ({
                    accion: f.accion,
                    etiqueta: f.etiqueta,
                    tipo: (['p', 's', 'd'].includes(f.tipo) ? f.tipo : 's') as Accion['tipo'],
                    funcion: f.funcion,
                    pide: (Array.isArray(f.pide) ? f.pide : []) as Campo[],
                })),
            ),
        );
    }

    async ejecutar(funcion: string, params: Record<string, unknown>): Promise<Result<Record<string, unknown>, ErrorFuente>> {
        // Solo funciones de acción: la base las protege igual, esto evita llamar otra cosa por error.
        if (!/^ac_[a-z_]+$/.test(funcion)) return err({ kind: 'regla', message: 'Acción no válida.' });
        return resultado<Record<string, unknown>>(await this.db.rpc(funcion, params)).map((d) => d ?? {});
    }
}
