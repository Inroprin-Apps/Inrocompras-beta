import type { SupabaseClient } from '@supabase/supabase-js';
import { err, ok, type Result } from 'neverthrow';
import { resultado, type ErrorFuente } from '@/shared/errores.ts';
import type { ColaPort, ConfiguracionPort, DatosConfiguracion } from '../application/ports/ConfiguracionPort.ts';
import type { AmbitoConcepto, ConceptoGasto, EstadoCola, ResumenCola, TrabajoCola } from '../domain/configuracion.ts';

type Fila = Record<string, unknown>;
const s = (v: unknown) => (v == null ? '' : String(v));
const sn = (v: unknown) => (v == null ? null : String(v));

/** RLS deja un UPDATE en 0 filas (sin error) cuando no le toca: se dice como permiso negado. */
const alMenosUna = (r: Result<Fila[], ErrorFuente>, quien: string): Result<null, ErrorFuente> =>
    r.andThen((fs) => (fs.length ? ok(null) : err<null, ErrorFuente>({ kind: 'permiso', message: `No tienes permiso para cambiar esto. Lo cambia ${quien}.` })));

export class SupabaseConfiguracionAdapter implements ConfiguracionPort, ColaPort {
    constructor(private readonly db: SupabaseClient) {}

    async leer(): Promise<Result<DatosConfiguracion, ErrorFuente>> {
        const [c, m, t, k, g] = await Promise.all([
            this.db.from('config').select('clave,valor,nota').order('clave'),
            this.db.from('monedas').select('id,nombre,tasa_a_soles,actualizado').order('id'),
            this.db.from('tc_costeo').select('id,moneda,tc,vigente_desde,registrado_por,comentario').order('vigente_desde', { ascending: false }).limit(200),
            this.db.from('conceptos').select('id,ambito,activo').order('id'),
            this.db.from('conceptos_gasto_imp').select('concepto,entra_costo,reparto,orden,activo').order('orden'),
        ]);
        return resultado<Fila[]>(c).andThen((cfg) =>
            resultado<Fila[]>(m).andThen((mon) =>
                resultado<Fila[]>(t).andThen((tc) =>
                    resultado<Fila[]>(k).andThen((con) =>
                        resultado<Fila[]>(g).map((gas) => ({
                            config: cfg.map((x) => ({ clave: s(x.clave), valor: x.valor, nota: s(x.nota) })),
                            monedas: mon.map((x) => ({ id: s(x.id), nombre: s(x.nombre), tasa: Number(x.tasa_a_soles), actualizado: s(x.actualizado) })),
                            tcCosteo: tc.map((x) => ({
                                id: s(x.id),
                                moneda: s(x.moneda),
                                tc: Number(x.tc),
                                vigenteDesde: s(x.vigente_desde),
                                registradoPor: sn(x.registrado_por),
                                comentario: s(x.comentario),
                            })),
                            conceptos: con.map((x) => ({ id: s(x.id), ambito: s(x.ambito) as AmbitoConcepto, activo: x.activo === true })),
                            gastos: gas.map((x) => ({
                                concepto: s(x.concepto),
                                entraCosto: x.entra_costo === true,
                                reparto: (s(x.reparto) || 'Valor') as ConceptoGasto['reparto'],
                                orden: Number(x.orden),
                                activo: x.activo === true,
                            })),
                        })),
                    ),
                ),
            ),
        );
    }

    async guardarParametro(clave: string, valor: unknown, nota: string): Promise<Result<null, ErrorFuente>> {
        const r = await this.db.from('config').upsert({ clave, valor, nota: nota.trim() || null }, { onConflict: 'clave' }).select('clave');
        return alMenosUna(resultado<Fila[]>(r), 'el administrador');
    }

    async guardarTasa(moneda: string, tasa: number): Promise<Result<null, ErrorFuente>> {
        const r = await this.db.from('monedas').update({ tasa_a_soles: tasa }).eq('id', moneda).select('id');
        return alMenosUna(resultado<Fila[]>(r), 'el administrador o Finanzas');
    }

    async agregarTc(t: { moneda: string; tc: number; vigenteDesde: string; comentario: string }): Promise<Result<null, ErrorFuente>> {
        const r = await this.db.from('tc_costeo').insert({ moneda: t.moneda, tc: t.tc, vigente_desde: t.vigenteDesde, comentario: t.comentario.trim() || null });
        return resultado(r).map(() => null);
    }

    async agregarConcepto(id: string, ambito: AmbitoConcepto): Promise<Result<null, ErrorFuente>> {
        return resultado(await this.db.from('conceptos').insert({ id: id.trim(), ambito })).map(() => null);
    }

    async activarConcepto(id: string, activo: boolean): Promise<Result<null, ErrorFuente>> {
        const r = await this.db.from('conceptos').update({ activo }).eq('id', id).select('id');
        return alMenosUna(resultado<Fila[]>(r), 'el administrador');
    }

    async guardarGasto(g: ConceptoGasto, nuevo: boolean): Promise<Result<null, ErrorFuente>> {
        const fila = { entra_costo: g.entraCosto, reparto: g.reparto, orden: g.orden, activo: g.activo };
        if (nuevo) return resultado(await this.db.from('conceptos_gasto_imp').insert({ concepto: g.concepto.trim(), ...fila })).map(() => null);
        const r = await this.db.from('conceptos_gasto_imp').update(fila).eq('concepto', g.concepto).select('concepto');
        return alMenosUna(resultado<Fila[]>(r), 'el administrador o la Jefatura de Importaciones');
    }

    // ── Cola (funciones solo-admin de 0021) ──
    async resumen(): Promise<Result<ResumenCola[], ErrorFuente>> {
        const r = resultado<Fila[]>(await this.db.rpc('cola_resumen'));
        return r.map((fs) => (fs ?? []).map((f) => ({ estado: s(f.estado) as EstadoCola, tipo: s(f.tipo), cantidad: Number(f.cantidad), masAntiguo: s(f.mas_antiguo) })));
    }

    async listar(estado: string | null): Promise<Result<TrabajoCola[], ErrorFuente>> {
        const r = resultado<Fila[]>(await this.db.rpc('cola_listar', { p_estado: estado, p_limite: 200 }));
        return r.map((fs) =>
            (fs ?? []).map((f) => ({
                id: Number(f.id),
                tipo: s(f.tipo),
                refTabla: sn(f.ref_tabla),
                refId: sn(f.ref_id),
                estado: s(f.estado) as EstadoCola,
                intentos: Number(f.intentos),
                error: sn(f.error),
                creado: s(f.creado),
                procesarDesde: s(f.procesar_desde),
                terminado: sn(f.terminado),
            })),
        );
    }

    async reintentar(id: number): Promise<Result<null, ErrorFuente>> {
        return resultado(await this.db.rpc('ac_cola_reintentar', { p_id: id })).map(() => null);
    }

    async descartar(id: number, motivo: string): Promise<Result<null, ErrorFuente>> {
        return resultado(await this.db.rpc('ac_cola_descartar', { p_id: id, p_motivo: motivo })).map(() => null);
    }
}
