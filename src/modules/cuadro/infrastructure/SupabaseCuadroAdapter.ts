import type { SupabaseClient } from '@supabase/supabase-js';
import { ok, type Result } from 'neverthrow';
import { resultado, type ErrorFuente } from '@/shared/errores.ts';
import type { CuadroPort } from '../application/ports/CuadroPort.ts';
import { COLUMNAS_CUADRO, type FilaCuadro, type OrdenPorAprobar, type TituloCuadro, type Valor } from '../domain/cuadro.ts';
import { n, s, type Fila, uno } from '@/shared/supabase/filas.ts';

const sOrNull = (v: unknown) => (v == null || v === '' ? null : String(v));

function fila(f: Fila): FilaCuadro {
    const valores = {} as Record<TituloCuadro, Valor>;
    for (const c of COLUMNAS_CUADRO) {
        const v = f[c.titulo];
        valores[c.titulo] =
            v == null
                ? null
                : typeof v === 'boolean' || typeof v === 'number'
                  ? v
                  : c.tipo === 'moneda' || c.tipo === 'pct' || c.tipo === 'entero'
                    ? Number(v)
                    : String(v);
    }
    return { id: s(f.id), empresaId: s(f.empresa_id), valores };
}

function porAprobar(f: Fila): OrdenPorAprobar {
    const prov = uno(f.proveedores);
    const proy = uno(f.proyectos);
    const lineas = (f.oc_lineas as Fila[] | null) ?? [];
    return {
        id: s(f.id),
        numero: s(f.numero),
        proveedor: prov ? s(prov.razon_social) : '',
        proyecto: proy ? [s(proy.codigo), s(proy.nombre)].filter(Boolean).join(' · ') : '',
        compradorId: s(f.comprador_id),
        moneda: s(f.moneda) || 'PEN',
        monto: n(f.monto),
        montoSoles: n(f.monto_soles),
        tipoAprobacion: sOrNull(f.tipo_aprobacion),
        estadoAprobacion: sOrNull(f.estado_aprobacion),
        aprobacionPpto: sOrNull(f.aprobacion_ppto),
        ppto: { valor: sOrNull(f.aprobacion_ppto), por: sOrNull(f.cg_por), fecha: sOrNull(f.cg_fecha) },
        gop: { valor: sOrNull(f.aprobacion_gop), por: sOrNull(f.gop_por), fecha: sOrNull(f.gop_fecha) },
        gaf: { valor: sOrNull(f.aprobacion_gaf), por: sOrNull(f.gaf_por), fecha: sOrNull(f.gaf_fecha) },
        demasias: lineas
            .filter((l) => l.es_demasia && l.demasia_estado === 'Pendiente')
            .map((l) => ({ id: s(l.id), descripcion: s(l.descripcion), cantidad: n(l.cantidad), subtotal: n(l.subtotal), motivo: s(l.demasia_motivo) })),
        fechaEmision: sOrNull(f.fecha_emision),
        lineas: lineas.filter((l) => !l.es_demasia).length,
    };
}

export class SupabaseCuadroAdapter implements CuadroPort {
    constructor(private readonly db: SupabaseClient) {}

    async listar(): Promise<Result<FilaCuadro[], ErrorFuente>> {
        const r = await this.db.from('v_cuadro_aprobaciones_app').select('*');
        return resultado<Fila[]>(r).map((fs) => fs.map(fila));
    }

    async porAprobar(ids: string[]): Promise<Result<OrdenPorAprobar[], ErrorFuente>> {
        if (!ids.length) return ok([]);
        const r = await this.db
            .from('ordenes')
            .select(
                'id,numero,comprador_id,moneda,monto,monto_soles,tipo_aprobacion,estado_aprobacion,aprobacion_ppto,cg_por,cg_fecha,aprobacion_gop,gop_por,gop_fecha,aprobacion_gaf,gaf_por,gaf_fecha,fecha_emision,proveedores(razon_social),proyectos(codigo,nombre),oc_lineas(id,descripcion,cantidad,subtotal,es_demasia,demasia_estado,demasia_motivo)',
            )
            .in('id', ids);
        return resultado<Fila[]>(r).map((fs) => fs.map(porAprobar));
    }
}
