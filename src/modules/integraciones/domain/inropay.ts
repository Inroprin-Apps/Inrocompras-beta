// InroPay, la app de pagos de Finanzas (docs/07 §4). PURO: el aviso que llega por el webhook y la solicitud que sale.

export const ESTADOS_INROPAY = ['Programado', 'Pagado', 'Observado Finanzas'] as const;
export type EstadoInroPay = (typeof ESTADOS_INROPAY)[number];

export interface EventoInroPay {
    pago_id: string;
    estado: EstadoInroPay;
    fecha: string | null;
    n_operacion: string | null;
    ref: string | null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Valida el cuerpo del webhook. Devuelve el evento o el motivo (para responder 400). */
export function leerEvento(cuerpo: string): { evento: EventoInroPay } | { motivo: string } {
    let x: unknown;
    try {
        x = JSON.parse(cuerpo);
    } catch {
        return { motivo: 'El cuerpo no es JSON.' };
    }
    if (!x || typeof x !== 'object') return { motivo: 'El cuerpo no es un objeto.' };
    const o = x as Record<string, unknown>;
    if (typeof o.pago_id !== 'string' || !UUID.test(o.pago_id)) return { motivo: 'pago_id no es un uuid.' };
    if (!ESTADOS_INROPAY.includes(o.estado as EstadoInroPay)) return { motivo: `estado debe ser ${ESTADOS_INROPAY.join(', ')}.` };
    if (o.fecha != null && (typeof o.fecha !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(o.fecha))) return { motivo: 'fecha debe ser AAAA-MM-DD.' };
    const texto = (v: unknown) => (v == null || v === '' ? null : String(v).slice(0, 200));
    return {
        evento: {
            pago_id: o.pago_id,
            estado: o.estado as EstadoInroPay,
            fecha: o.fecha ? String(o.fecha).slice(0, 10) : null,
            n_operacion: texto(o.n_operacion),
            ref: texto(o.ref),
        },
    };
}

export interface PagoInroPay {
    id: string;
    nCuota: number;
    monto: number;
    retencion: number;
    neto: number | null;
    fechaLimite: string | null;
    facturaId: string | null;
    orden: { numero: string | null; moneda: string; proveedor: { razon_social: string; ruc: string | null; cuentas: unknown[] } | null };
}

/** El cuerpo de POST {INROPAY_URL}/solicitudes (contrato de docs/07 §4). */
export const solicitudInroPay = (g: PagoInroPay) => ({
    origen: 'INROCOMPRAS',
    pago_id: g.id,
    orden: g.orden,
    cuota: g.nCuota,
    monto: g.monto,
    retencion: g.retencion,
    neto: g.neto,
    fecha_limite: g.fechaLimite,
    factura_id: g.facturaId,
});
