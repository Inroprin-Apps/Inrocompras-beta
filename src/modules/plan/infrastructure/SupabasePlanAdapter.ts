import type { SupabaseClient } from '@supabase/supabase-js';
import type { Result } from 'neverthrow';
import { resultado, type ErrorFuente } from '@/shared/errores.ts';
import type { AlcancePlan, PlanPort } from '../application/ports/PlanPort.ts';
import type { Canal, LineaPlan, OcDeLinea } from '../domain/plan.ts';
import { s, type Fila } from '@/shared/supabase/filas.ts';

const sOrNull = (v: unknown) => (v == null || v === '' ? null : String(v));
const nOrNull = (v: unknown) => (v == null || v === '' ? null : Number(v));

function linea(f: Fila): LineaPlan {
    return {
        itemId: s(f.item_id),
        requerimientoId: s(f.requerimiento_id),
        requerimiento: sOrNull(f.requerimiento),
        rqSidige: s(f.rq_sidige),
        reqEstado: s(f.req_estado),
        proyectoId: sOrNull(f.proyecto_id),
        nItem: nOrNull(f.n_item),
        tipo: s(f.tipo),
        codigoCliente: s(f.codigo_cliente),
        sku: s(f.codigo_sidige),
        descripcion: s(f.descripcion),
        unidad: s(f.unidad),
        cantidad: Number(f.cantidad ?? 0),
        saldo: Number(f.saldo ?? 0),
        canal: (sOrNull(f.canal) as Canal | null) ?? null,
        plazoDias: nOrNull(f.plazo_entrega_dias),
        fechaMeta: sOrNull(f.fecha_meta),
        incluidoEn: sOrNull(f.incluido_en),
        anulado: Boolean(f.anulado),
        validacion: s(f.validacion_tecnica),
        marca: s(f.marca),
        modelo: s(f.modelo),
        presupuestoUnit: nOrNull(f.presupuesto_unit),
        monedaPpto: sOrNull(f.moneda_ppto),
        ordenes: ((f.ordenes as Fila[] | null) ?? []).map((o): OcDeLinea => ({ id: s(o.id), numero: sOrNull(o.numero), estatus: s(o.estatus) })),
        pagado: Boolean(f.pagado),
    };
}

export class SupabasePlanAdapter implements PlanPort {
    constructor(private readonly db: SupabaseClient) {}

    async listar(alcance: AlcancePlan): Promise<Result<LineaPlan[], ErrorFuente>> {
        const args = typeof alcance === 'object' ? { p_proyecto: alcance.proyectoId } : { p_sin_proyecto: alcance === 'sin' };
        const r = await this.db.rpc('plan_compras', args);
        return resultado<Fila[]>(r).map((fs) => fs.map(linea));
    }
}
