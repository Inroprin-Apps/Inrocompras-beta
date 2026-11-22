import 'server-only';
// Raíz de composición de las INTEGRACIONES en el servidor (rutas /api/cola y /api/inropay). Conecta los adaptadores
// con las variables de entorno (docs/07). Sin SUPABASE_SERVICE_ROLE_KEY no hay cola: se dice qué falta.
import { timingSafeEqual } from 'node:crypto';
import { supabaseServicio } from '@/shared/supabase/servicio.ts';
import { procesarCola } from './application/procesar-cola.ts';
import type { Integraciones } from './application/ports/IntegracionesPort.ts';
import { recibirInroPay } from './application/webhook-inropay.ts';
import { ChatAdapter } from './infrastructure/ChatAdapter.ts';
import { CorreoAdapter } from './infrastructure/CorreoAdapter.ts';
import { GoogleDriveAdapter } from './infrastructure/GoogleDriveAdapter.ts';
import { firmaValida } from './infrastructure/hmac.ts';
import { InroPayAdapter } from './infrastructure/InroPayAdapter.ts';
import { LectorAdapter } from './infrastructure/LectorAdapter.ts';
import { ReactPdfAdapter } from './infrastructure/ReactPdfAdapter.tsx';
import { SupabaseIntegracionesAdapter } from './infrastructure/SupabaseIntegracionesAdapter.ts';

/** Lo que falta para que la cola corra (nombres de variables), o null. */
export function faltaParaCola(): string[] | null {
    const f = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'CRON_SECRET'].filter((n) => !process.env[n]?.trim());
    return f.length ? f : null;
}

function integraciones(): Integraciones | null {
    const db = supabaseServicio();
    if (!db) return null;
    const repo = new SupabaseIntegracionesAdapter(db);
    return {
        cola: repo,
        repo,
        drive: new GoogleDriveAdapter(),
        correo: new CorreoAdapter(),
        lector: new LectorAdapter(),
        pdf: new ReactPdfAdapter(),
        inropay: new InroPayAdapter(),
        chat: new ChatAdapter(),
        appUrl: (process.env.APP_URL ?? '').replace(/\/+$/, ''),
    };
}

/** El cron y quien tenga el secreto: Authorization: Bearer ${CRON_SECRET} (comparación en tiempo constante). */
export function autorizadoCron(cabecera: string | null): boolean {
    const secreto = process.env.CRON_SECRET?.trim();
    if (!secreto || !cabecera?.startsWith('Bearer ')) return false;
    const a = Buffer.from(cabecera.slice(7));
    const b = Buffer.from(secreto);
    return a.length === b.length && timingSafeEqual(a, b);
}

export async function correrCola(opciones: { maximo?: number; presupuestoMs?: number } = {}) {
    const d = integraciones();
    if (!d) return null;
    return procesarCola(d, opciones);
}

export async function webhookInroPay(cuerpo: string, firma: string | null) {
    const d = integraciones();
    const secreto = process.env.INROPAY_WEBHOOK_SECRET?.trim();
    if (!d) return null;
    return recibirInroPay(d.repo, { cuerpo, firmaValida: firmaValida(secreto, cuerpo, firma), configurado: Boolean(secreto) });
}
