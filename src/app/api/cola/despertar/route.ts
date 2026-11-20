// Despierta la cola justo después de una acción (en el plan Hobby el cron es diario): cualquier persona ACTIVA con
// sesión puede pedirlo; procesa un lote corto con service_role. No devuelve el detalle (puede traer datos de otros).
import { correrCola, faltaParaCola } from '@/modules/integraciones/composition.ts';
import { supabaseServidor } from '@/shared/supabase/server.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function POST(): Promise<Response> {
    const db = await supabaseServidor();
    const { data: perfil } = await db.rpc('mi_perfil');
    if (!(perfil as { activo?: boolean } | null)?.activo) return Response.json({ error: 'Inicia sesión.' }, { status: 401 });
    if (faltaParaCola()?.includes('SUPABASE_SERVICE_ROLE_KEY')) return Response.json({ procesados: 0, nota: 'Cola sin configurar.' }, { status: 202 });
    const r = await correrCola({ maximo: 10, presupuestoMs: 20_000 });
    if (!r || r.isErr()) return Response.json({ procesados: 0 }, { status: 202 });
    return Response.json({ procesados: r.value.tomados });
}
