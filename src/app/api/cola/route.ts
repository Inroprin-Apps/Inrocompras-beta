// La cola de trabajos (docs/07): la llama el cron de Vercel (GET, ver vercel.json) y quien tenga el secreto (POST).
// Siempre con Authorization: Bearer ${CRON_SECRET}. Toma trabajos con service_role y responde el resumen.
import { autorizadoCron, correrCola, faltaParaCola } from '@/modules/integraciones/composition.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

async function procesar(req: Request): Promise<Response> {
    const falta = faltaParaCola();
    if (falta?.includes('CRON_SECRET')) return Response.json({ error: 'Falta CRON_SECRET en el servidor.' }, { status: 503 });
    if (!autorizadoCron(req.headers.get('authorization'))) return Response.json({ error: 'No autorizado.' }, { status: 401 });
    if (falta) return Response.json({ error: `Falta configurar: ${falta.join(', ')}.` }, { status: 503 });
    const r = await correrCola();
    if (!r) return Response.json({ error: 'Falta SUPABASE_SERVICE_ROLE_KEY.' }, { status: 503 });
    if (r.isErr()) return Response.json({ error: r.error.mensaje }, { status: 502 });
    return Response.json(r.value);
}

export const GET = procesar;
export const POST = procesar;
