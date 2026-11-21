import type { SupabaseClient } from '@supabase/supabase-js';
import { err, ok, type Result } from 'neverthrow';
import { resultado, resultadoUno, type ErrorFuente } from '@/shared/errores.ts';
import type { RequerimientosPort } from '../application/ports/RequerimientosPort.ts';
import type {
    Anulacion,
    CabeceraReq,
    Canal,
    CausaAnulacion,
    EdicionItem,
    EstadoAnulacion,
    EstadoReq,
    ItemRequerimiento,
    Requerimiento,
    RequerimientoDetalle,
    TipoCompra,
    Validacion,
} from '../domain/requerimiento.ts';
import type { FilaSeguimiento } from '../domain/seguimiento.ts';
import type { ItemTecnica } from '../domain/validacion.ts';
import { nn, s, sn, type Fila } from '@/shared/supabase/filas.ts';

const COLS_REQ =
    'id,numero,rq_sidige,empresa_id,area_emisora,tipo_compra,proyecto_id,motivo,destino,direccion,receptor,concepto_general,solicitud_id,estado,emisor_id,fecha_emision,motivo_observacion,creado';
// Sin presupuesto: quien no ve precios no debe recibirlo (la pantalla lo pide aparte solo para quien ve precios).
const COLS_ITEM =
    'id,requerimiento_id,n_item,tipo,codigo_cliente,codigo_sidige,descripcion,unidad,cantidad,concepto,canal,plazo_entrega_dias,fecha_meta,incluido_en,anulado,validacion_tecnica,marca,modelo,tec_por,tec_fecha,tec_motivo';

function req(f: Fila): Requerimiento {
    const conteo = f.requerimiento_items as { count: number }[] | null | undefined;
    return {
        id: s(f.id),
        numero: s(f.numero),
        rqSidige: s(f.rq_sidige),
        empresaId: s(f.empresa_id),
        areaEmisora: s(f.area_emisora),
        tipoCompra: sn(f.tipo_compra) as TipoCompra | null,
        proyectoId: sn(f.proyecto_id),
        motivo: s(f.motivo),
        destino: s(f.destino),
        direccion: s(f.direccion),
        receptor: s(f.receptor),
        conceptoGeneral: s(f.concepto_general),
        solicitudId: sn(f.solicitud_id),
        estado: s(f.estado) as EstadoReq,
        emisorId: sn(f.emisor_id),
        fechaEmision: sn(f.fecha_emision),
        motivoObservacion: s(f.motivo_observacion),
        creado: s(f.creado),
        nItems: Array.isArray(conteo) ? Number(conteo[0]?.count ?? 0) : 0,
    };
}

function item(f: Fila): ItemRequerimiento {
    return {
        id: s(f.id),
        requerimientoId: s(f.requerimiento_id),
        nItem: nn(f.n_item),
        tipo: s(f.tipo),
        codigoCliente: s(f.codigo_cliente),
        codigoSidige: s(f.codigo_sidige),
        descripcion: s(f.descripcion),
        unidad: s(f.unidad),
        cantidad: Number(f.cantidad),
        concepto: s(f.concepto),
        canal: sn(f.canal) as Canal | null,
        plazoEntregaDias: nn(f.plazo_entrega_dias),
        fechaMeta: sn(f.fecha_meta),
        presupuestoUnit: nn(f.presupuesto_unit),
        monedaPpto: sn(f.moneda_ppto),
        incluidoEn: sn(f.incluido_en),
        anulado: f.anulado === true,
        validacionTecnica: s(f.validacion_tecnica) as Validacion,
        marca: s(f.marca),
        modelo: s(f.modelo),
        tecPor: sn(f.tec_por),
        tecFecha: sn(f.tec_fecha),
        tecMotivo: s(f.tec_motivo),
    };
}

function anulacion(f: Fila): Anulacion {
    return {
        id: s(f.id),
        requerimientoId: s(f.requerimiento_id),
        itemId: sn(f.item_id),
        causa: s(f.causa) as CausaAnulacion,
        motivo: s(f.motivo),
        solicitadoPor: s(f.solicitado_por),
        estado: s(f.estado) as EstadoAnulacion,
        aprobadoPor: sn(f.aprobado_por),
        fechaAprobacion: sn(f.fecha_aprobacion),
        motivoRechazo: s(f.motivo_rechazo),
        creado: s(f.creado),
    };
}

function itemTecnica(f: Fila): ItemTecnica {
    const r = (f.requerimientos ?? {}) as Fila;
    return { ...item(f), req: { id: s(r.id), numero: s(r.numero), motivo: s(r.motivo), estado: s(r.estado), proyectoId: sn(r.proyecto_id) } };
}

export class SupabaseRequerimientosAdapter implements RequerimientosPort {
    constructor(private readonly db: SupabaseClient) {}

    async listar(): Promise<Result<Requerimiento[], ErrorFuente>> {
        const r = await this.db.from('requerimientos').select(`${COLS_REQ}, requerimiento_items(count)`).order('creado', { ascending: false });
        return resultado<Fila[]>(r).map((fs) => fs.map(req));
    }

    async leer(id: string): Promise<Result<RequerimientoDetalle, ErrorFuente>> {
        const r = resultadoUno<Fila>(await this.db.from('requerimientos').select(COLS_REQ).eq('id', id).maybeSingle(), 'No encontré ese requerimiento.');
        if (r.isErr()) return err(r.error);
        const rq = req(r.value);
        const verPrecios = await this.db.rpc('mi_perfil');
        const conPrecios = (verPrecios.data as Fila | null)?.ve_precios === true;
        const [it, an, so] = await Promise.all([
            this.db
                .from('requerimiento_items')
                .select(conPrecios ? `${COLS_ITEM},presupuesto_unit,moneda_ppto` : COLS_ITEM)
                .eq('requerimiento_id', id)
                .order('n_item', { ascending: true, nullsFirst: false }),
            this.db.from('anulaciones').select('*').eq('requerimiento_id', id).order('creado', { ascending: false }),
            rq.solicitudId
                ? this.db.from('solicitudes').select('id,numero,solicitante_id').eq('id', rq.solicitudId).maybeSingle()
                : Promise.resolve({ data: null as Fila | null, error: null }),
        ]);
        return resultado<Fila[]>(it as { data: Fila[] | null; error: { message?: string; code?: string } | null }).andThen((items) =>
            resultado<Fila[]>(an).andThen((anul) =>
                resultado<Fila | null>(so).andThen((sol) =>
                    ok({
                        requerimiento: { ...rq, nItems: items.length },
                        items: items.map(item),
                        anulaciones: anul.map(anulacion),
                        solicitud: sol ? { id: s(sol.id), numero: s(sol.numero), solicitanteId: s(sol.solicitante_id) } : null,
                    }),
                ),
            ),
        );
    }

    async requerimientoDeAnulacion(anulacionId: string): Promise<Result<string, ErrorFuente>> {
        const r = await this.db.from('anulaciones').select('requerimiento_id').eq('id', anulacionId).maybeSingle();
        return resultadoUno<Fila>(r, 'No encontré esa anulación.').map((f) => s(f.requerimiento_id));
    }

    async editarCabecera(id: string, c: CabeceraReq): Promise<Result<null, ErrorFuente>> {
        const fila = {
            empresa_id: c.empresaId,
            tipo_compra: c.tipoCompra,
            destino: c.destino.trim() || null,
            direccion: c.direccion.trim() || null,
            receptor: c.receptor.trim() || null,
            concepto_general: c.conceptoGeneral.trim() || null,
        };
        // Sin .select(): si RLS no deja, no hay error pero tampoco filas; se comprueba con count.
        const r = await this.db.from('requerimientos').update(fila, { count: 'exact' }).eq('id', id);
        if (!r.error && r.count === 0)
            return err({ kind: 'permiso', message: 'No se guardó: solo el área emisora edita el requerimiento mientras está en proceso.' });
        return resultado(r).map(() => null);
    }

    async editarItem(id: string, e: EdicionItem): Promise<Result<null, ErrorFuente>> {
        const fila = {
            concepto: e.concepto.trim() || null,
            canal: e.canal,
            fecha_meta: e.fechaMeta || null,
            plazo_entrega_dias: e.plazoEntregaDias.trim() ? Number(e.plazoEntregaDias) : null,
        };
        const r = await this.db.from('requerimiento_items').update(fila, { count: 'exact' }).eq('id', id);
        if (!r.error && r.count === 0)
            return err({ kind: 'permiso', message: 'No se guardó: solo el área emisora edita los ítems mientras el requerimiento está en proceso.' });
        return resultado(r).map(() => null);
    }

    async itemsTecnica(): Promise<Result<ItemTecnica[], ErrorFuente>> {
        const r = await this.db
            .from('requerimiento_items')
            .select(`${COLS_ITEM}, requerimientos!inner(id,numero,motivo,estado,proyecto_id)`)
            .eq('anulado', false)
            .in('requerimientos.estado', ['En Proceso', 'Emitido'])
            .order('n_item', { ascending: true, nullsFirst: false });
        return resultado<Fila[]>(r).map((fs) => fs.map(itemTecnica));
    }

    async itemTecnica(id: string): Promise<Result<ItemTecnica, ErrorFuente>> {
        const r = await this.db
            .from('requerimiento_items')
            .select(`${COLS_ITEM}, requerimientos(id,numero,motivo,estado,proyecto_id)`)
            .eq('id', id)
            .maybeSingle();
        return resultadoUno<Fila>(r, 'No encontré ese ítem.').map(itemTecnica);
    }

    async seguimiento(proyectoId: string | null): Promise<Result<FilaSeguimiento[], ErrorFuente>> {
        const r = await this.db.rpc('seguimiento_items', { p_proyecto: proyectoId });
        return resultado<Fila[]>(r).map((fs) =>
            (fs ?? []).map((f) => ({
                itemId: s(f.item_id),
                proyecto: s(f.proyecto),
                requerimiento: s(f.requerimiento),
                rqSidige: s(f.rq_sidige),
                codigoCliente: s(f.codigo_cliente),
                codigoSidige: s(f.codigo_sidige),
                descripcion: s(f.descripcion),
                cantidad: Number(f.cantidad),
                saldo: Number(f.saldo),
                validacionTecnica: s(f.validacion_tecnica),
                marca: s(f.marca),
                modelo: s(f.modelo),
                ordenes: s(f.ordenes),
                estadoOrden: s(f.estado_orden),
                fechaMeta: sn(f.fecha_meta),
                pagado: f.pagado === true,
            })),
        );
    }
}
