// InroPay → INROCOMPRAS (docs/07 §4): avisa un cambio de estado de un pago. Firmado con HMAC-SHA256 del cuerpo en
// x-inropay-firma (secreto INROPAY_WEBHOOK_SECRET). Llama a inropay_actualizar() con service_role.
import { webhookInroPay } from '@/modules/integraciones/composition.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request): Promise<Response> {
    const cuerpo = await req.text();
    if (cuerpo.length > 64_000) return Response.json({ error: 'Cuerpo demasiado grande.' }, { status: 413 });
    const r = await webhookInroPay(cuerpo, req.headers.get('x-inropay-firma'));
    if (!r) return Response.json({ error: 'Falta SUPABASE_SERVICE_ROLE_KEY en el servidor.' }, { status: 503 });
    if (r.isErr()) return Response.json(r.error.cuerpo, { status: r.error.estado });
    return Response.json({ ok: true, pago_id: r.value.pago_id, estado: r.value.estado });
}
