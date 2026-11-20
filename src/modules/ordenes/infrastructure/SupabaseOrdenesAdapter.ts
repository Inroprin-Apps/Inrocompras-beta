import type { SupabaseClient } from '@supabase/supabase-js';
import { err, ok, type Result } from 'neverthrow';
import { errorFuente, resultado, resultadoUno, type ErrorFuente } from '@/shared/errores.ts';
import type { OrdenesPort } from '../application/ports/OrdenesPort.ts';
import type { Cabecera, Cuota, Edicion, FormaPago, Linea, NuevaOrden, Orden, OrdenDetalle, Procedencia, Proveedor } from '../domain/orden.ts';

type Fila = Record<string, unknown>;
const s = (v: unknown) => (v == null ? '' : String(v));
const n = (v: unknown) => (v == null || v === '' ? 0 : Number(v));
const nOrNull = (v: unknown) => (v == null || v === '' ? null : Number(v));
const sOrNull = (v: unknown) => (v == null || v === '' ? null : String(v));
const uno = <T extends Fila>(v: unknown): T | null => (Array.isArray(v) ? ((v[0] as T) ?? null) : ((v as T) ?? null));

const LISTA =
    'id,numero,estatus,estado_aprobacion,tipo_aprobacion,procedencia,clase,proyecto_id,proveedor_id,comprador_id,fecha,moneda,forma_pago,monto,monto_soles,fecha_emision,creado,proveedores(razon_social),proyectos(codigo,nombre)';

function orden(f: Fila): Orden {
    const prov = uno(f.proveedores);
    const proy = uno(f.proyectos);
    return {
        id: s(f.id),
        numero: sOrNull(f.numero),
        estatus: s(f.estatus),
        estadoAprobacion: sOrNull(f.estado_aprobacion),
        tipoAprobacion: sOrNull(f.tipo_aprobacion),
        procedencia: s(f.procedencia) as Procedencia,
        clase: s(f.clase),
        proyectoId: sOrNull(f.proyecto_id),
        proyecto: proy ? [s(proy.codigo), s(proy.nombre)].filter(Boolean).join(' · ') : '',
        proveedorId: sOrNull(f.proveedor_id),
        proveedor: prov ? s(prov.razon_social) : '',
        compradorId: s(f.comprador_id),
        fecha: s(f.fecha),
        moneda: s(f.moneda),
        formaPago: s(f.forma_pago) as FormaPago,
        monto: n(f.monto),
        montoSoles: n(f.monto_soles),
        fechaEmision: sOrNull(f.fecha_emision),
        creado: s(f.creado),
    };
}

function linea(f: Fila): Linea {
    const it = uno(f.requerimiento_items);
    const rq = it ? uno(it.requerimientos) : null;
    return {
        id: s(f.id),
        itemId: sOrNull(f.item_id),
        nLinea: nOrNull(f.n_linea),
        descripcion: s(f.descripcion),
        descripcionProv: s(f.descripcion_prov),
        unidad: s(f.unidad),
        cantidad: n(f.cantidad),
        precioUnit: n(f.precio_unit),
        subtotal: n(f.subtotal),
        esDemasia: Boolean(f.es_demasia),
        demasiaEstado: (sOrNull(f.demasia_estado) as Linea['demasiaEstado']) ?? null,
        demasiaMotivo: s(f.demasia_motivo),
        codigoCliente: it ? s(it.codigo_cliente) : '',
        sku: it ? s(it.codigo_sidige) : '',
        validacionTecnica: it ? s(it.validacion_tecnica) : '',
        marca: it ? s(it.marca) : '',
        modelo: it ? s(it.modelo) : '',
        requerimiento: rq ? s(rq.numero) : '',
    };
}

function cuota(f: Fila): Cuota {
    return {
        id: s(f.id),
        nCuota: n(f.n_cuota),
        tipo: s(f.tipo_pago),
        hito: s(f.hito),
        porcentaje: nOrNull(f.porcentaje),
        monto: n(f.monto_pago),
        estado: s(f.estado_pago),
        fechaLimite: sOrNull(f.fecha_limite_pago),
        aplicaRetencion: Boolean(f.aplica_retencion),
        retencion: n(f.monto_retencion),
        neto: nOrNull(f.neto_referencial),
    };
}

function cabecera(f: Fila): Cabecera {
    return {
        proveedorId: sOrNull(f.proveedor_id),
        moneda: s(f.moneda),
        tipoImpuesto: s(f.tipo_impuesto),
        formaPago: s(f.forma_pago) as FormaPago,
        pctAdelanto: nOrNull(f.pct_adelanto),
        hitoSaldo: s(f.hito_saldo),
        diasCredito: nOrNull(f.dias_credito),
        condicion: s(f.condicion),
        concepto: s(f.concepto),
        lugarEntrega: s(f.lugar_entrega),
        plazoEntregaDias: nOrNull(f.plazo_entrega_dias),
        terminos: s(f.terminos),
        incoterm: s(f.incoterm),
        referenciaProv: s(f.referencia_prov),
        correoEnvio: s(f.correo_envio),
    };
}

const vacioANull = (t: string | undefined) => (t === undefined ? undefined : t.trim() || null);
function aFila(c: Partial<Cabecera>): Fila {
    const f: Fila = {
        proveedor_id: c.proveedorId,
        moneda: c.moneda,
        tipo_impuesto: c.tipoImpuesto,
        forma_pago: c.formaPago,
        pct_adelanto: c.pctAdelanto,
        hito_saldo: vacioANull(c.hitoSaldo),
        dias_credito: c.diasCredito,
        condicion: c.condicion,
        concepto: vacioANull(c.concepto),
        lugar_entrega: vacioANull(c.lugarEntrega),
        plazo_entrega_dias: c.plazoEntregaDias,
        terminos: vacioANull(c.terminos),
        incoterm: vacioANull(c.incoterm),
        referencia_prov: vacioANull(c.referenciaProv),
        correo_envio: vacioANull(c.correoEnvio),
    };
    for (const k of Object.keys(f)) if (f[k] === undefined) delete f[k];
    return f;
}

export class SupabaseOrdenesAdapter implements OrdenesPort {
    constructor(private readonly db: SupabaseClient) {}

    async listar(): Promise<Result<Orden[], ErrorFuente>> {
        const r = await this.db.from('ordenes').select(LISTA).order('creado', { ascending: false });
        return resultado<Fila[]>(r).map((fs) => fs.map(orden));
    }

    async detalle(id: string): Promise<Result<OrdenDetalle, ErrorFuente>> {
        const r = await this.db
            .from('ordenes')
            .select(
                `*,proveedores(razon_social),proyectos(codigo,nombre),oc_lineas(*,requerimiento_items(codigo_cliente,codigo_sidige,validacion_tecnica,marca,modelo,requerimientos(numero))),pagos(*)`,
            )
            .eq('id', id)
            .maybeSingle();
        return resultadoUno<Fila>(r, 'No encontramos la orden o no tienes acceso a ella.').map((f) => ({
            ...orden(f),
            cabecera: cabecera(f),
            subtotal: n(f.subtotal),
            igv: n(f.igv),
            tipoImpuesto: s(f.tipo_impuesto),
            ppto: { valor: sOrNull(f.aprobacion_ppto), por: sOrNull(f.cg_por), fecha: sOrNull(f.cg_fecha) },
            gop: { valor: sOrNull(f.aprobacion_gop), por: sOrNull(f.gop_por), fecha: sOrNull(f.gop_fecha) },
            gaf: { valor: sOrNull(f.aprobacion_gaf), por: sOrNull(f.gaf_por), fecha: sOrNull(f.gaf_fecha) },
            motivoAprob: s(f.motivo_aprob),
            fechaAprobacion: sOrNull(f.fecha_aprobacion),
            revision: n(f.revision),
            envioSolicitado: sOrNull(f.envio_solicitado),
            estadoPrevio: sOrNull(s(f.estatus) === 'En modificación' ? f.estado_previo_mod : f.estado_previo_anul),
            lineas: ((f.oc_lineas as Fila[] | null) ?? [])
                .map(linea)
                .sort((a, b) => (a.nLinea ?? 0) - (b.nLinea ?? 0) || Number(a.esDemasia) - Number(b.esDemasia)),
            cuotas: ((f.pagos as Fila[] | null) ?? []).map(cuota).sort((a, b) => a.nCuota - b.nCuota),
        }));
    }

    async edicion(id: string): Promise<Result<Edicion, ErrorFuente>> {
        const r = await this.db.rpc('oc_edicion', { p_id: id });
        return resultado<Fila | null>(r).map((f) => ({
            editar: f ? sOrNull(f.editar) : 'Tu usuario no está activo.',
            demasia: ((f?.demasia as Record<string, string | null>) ?? {}),
        }));
    }

    async proveedores(): Promise<Result<Proveedor[], ErrorFuente>> {
        const r = await this.db.from('proveedores').select('id,ruc,razon_social,origen,pais,correo,evaluacion_fin').order('razon_social');
        return resultado<Fila[]>(r).map((fs) =>
            fs.map((f) => ({
                id: s(f.id),
                ruc: s(f.ruc),
                razonSocial: s(f.razon_social),
                origen: s(f.origen) as Proveedor['origen'],
                pais: s(f.pais),
                correo: s(f.correo),
                evaluacionFin: s(f.evaluacion_fin),
            })),
        );
    }

    async crear(o: NuevaOrden): Promise<Result<string, ErrorFuente>> {
        const r = await this.db.rpc('ac_oc_crear', {
            p_proveedor: o.proveedorId,
            p_procedencia: o.procedencia,
            p_moneda: o.moneda,
            p_lineas: o.lineas.map((l) => ({ item_id: l.itemId, cantidad: l.cantidad, precio_unit: l.precioUnit, descripcion_prov: l.descripcionProv.trim() || null })),
            p_proyecto: o.proyectoId,
            p_forma_pago: o.formaPago,
        });
        return resultado<Fila>(r).map((f) => s(f.id));
    }

    private async recalcular(id: string): Promise<Result<null, ErrorFuente>> {
        return resultado(await this.db.rpc('ac_oc_recalcular', { p_id: id })).map(() => null);
    }

    /** Un UPDATE que RLS filtra no da error: sin filas devueltas, no se pudo. */
    private sinFilas(r: { data: unknown; error: { message?: string; code?: string } | null }): Result<null, ErrorFuente> {
        if (r.error) return err(errorFuente(r.error));
        if (!Array.isArray(r.data) || r.data.length === 0) return err({ kind: 'permiso', message: 'La orden ya no se puede editar. Actualiza la página para ver su estado.' });
        return ok(null);
    }

    async guardarCabecera(id: string, c: Partial<Cabecera>): Promise<Result<null, ErrorFuente>> {
        const r = this.sinFilas(await this.db.from('ordenes').update(aFila(c)).eq('id', id).select('id'));
        if (r.isErr()) return r;
        return this.recalcular(id);
    }

    async guardarLinea(ordenId: string, lineaId: string, l: { cantidad: number; precioUnit: number; descripcionProv: string }): Promise<Result<null, ErrorFuente>> {
        const r = this.sinFilas(
            await this.db
                .from('oc_lineas')
                .update({ cantidad: l.cantidad, precio_unit: l.precioUnit, descripcion_prov: l.descripcionProv.trim() || null })
                .eq('id', lineaId)
                .select('id'),
        );
        if (r.isErr()) return r;
        return this.recalcular(ordenId);
    }

    async quitarLinea(ordenId: string, lineaId: string): Promise<Result<null, ErrorFuente>> {
        const r = this.sinFilas(await this.db.from('oc_lineas').delete().eq('id', lineaId).select('id'));
        if (r.isErr()) return r;
        return this.recalcular(ordenId);
    }

    async demasia(lineaId: string, cantidad: number, motivo: string): Promise<Result<null, ErrorFuente>> {
        return resultado(await this.db.rpc('ac_oc_demasia', { p_linea: lineaId, p_cantidad: cantidad, p_motivo: motivo })).map(() => null);
    }
}
