import type { SupabaseClient } from '@supabase/supabase-js';
import type { Result } from 'neverthrow';
import { resultado, resultadoUno, type ErrorFuente } from '@/shared/errores.ts';
import type { PagosPort } from '../application/ports/PagosPort.ts';
import type { EstadoPago, FacturaPago, Pago } from '../domain/pago.ts';
import { n, s, type Fila, uno } from '@/shared/supabase/filas.ts';

const nOrNull = (v: unknown) => (v == null || v === '' ? null : Number(v));
const sOrNull = (v: unknown) => (v == null || v === '' ? null : String(v));

const SELECT =
    '*,ordenes!inner(numero,estatus,procedencia,proveedor_id,comprador_id,moneda,monto,monto_soles,proveedores(razon_social)),factura:documentos!pagos_factura_id_fkey(id,numero,fecha_doc,monto_doc,moneda)';

function factura(v: unknown): FacturaPago | null {
    const f = uno(v);
    if (!f) return null;
    return { id: s(f.id), numero: s(f.numero), fecha: sOrNull(f.fecha_doc), monto: nOrNull(f.monto_doc), moneda: sOrNull(f.moneda) };
}

function pago(f: Fila): Pago {
    const o = uno(f.ordenes) ?? {};
    const prov = uno(o.proveedores);
    const monto = n(f.monto_pago);
    const tasa = n(o.monto) > 0 ? n(o.monto_soles) / n(o.monto) : s(o.moneda) === 'PEN' ? 1 : 0;
    return {
        id: s(f.id),
        ordenId: s(f.orden_id),
        ordenNumero: s(o.numero),
        ordenEstatus: s(o.estatus),
        procedencia: s(o.procedencia),
        proveedorId: sOrNull(o.proveedor_id),
        proveedor: prov ? s(prov.razon_social) : '',
        compradorId: s(o.comprador_id),
        moneda: s(o.moneda) || 'PEN',
        nCuota: n(f.n_cuota),
        tipo: s(f.tipo_pago),
        hito: s(f.hito),
        porcentaje: nOrNull(f.porcentaje),
        monto,
        montoSoles: Math.round(monto * tasa * 100) / 100,
        aplicaRetencion: Boolean(f.aplica_retencion),
        retencion: n(f.monto_retencion),
        neto: nOrNull(f.neto_referencial),
        fechaLimite: sOrNull(f.fecha_limite_pago),
        fechaProgramada: sOrNull(f.fecha_programada),
        fechaPago: sOrNull(f.fecha_pago),
        estado: s(f.estado_pago) as EstadoPago,
        factura: factura(f.factura),
        sustento: s(f.sustento_falta_factura),
        nOperacion: s(f.n_operacion),
        voucherId: sOrNull(f.voucher_doc),
        motivoObs: s(f.motivo_obs_fin),
        detalleObs: s(f.detalle_obs_fin),
        inropayRef: s(f.inropay_ref),
        comentario: s(f.comentario),
        creado: s(f.creado),
    };
}

export class SupabasePagosAdapter implements PagosPort {
    constructor(private readonly db: SupabaseClient) {}

    async listar(): Promise<Result<Pago[], ErrorFuente>> {
        const r = await this.db.from('pagos').select(SELECT).neq('ordenes.estatus', 'Borrador').order('creado', { ascending: false });
        return resultado<Fila[]>(r).map((fs) => fs.map(pago));
    }

    async detalle(id: string): Promise<Result<Pago, ErrorFuente>> {
        const r = await this.db.from('pagos').select(SELECT).eq('id', id).maybeSingle();
        return resultadoUno<Fila>(r, 'No encontramos la cuota o no tienes acceso a ella.').map(pago);
    }
}
