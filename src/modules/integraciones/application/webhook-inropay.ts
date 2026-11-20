// Caso de uso: InroPay avisa un cambio de estado de un pago (POST /api/inropay, firmado con HMAC-SHA256).
// La firma la verifica quien llama (infraestructura); aquí se valida el cuerpo y se pasa a inropay_actualizar()
// (solo service_role la ejecuta: 0007).
import { err, ok, type Result } from 'neverthrow';
import { leerEvento, type EventoInroPay } from '../domain/inropay.ts';
import type { RepositorioPort } from './ports/IntegracionesPort.ts';

export type RespuestaWebhook = { estado: 200 | 400 | 401 | 503; cuerpo: Record<string, unknown> };

export async function recibirInroPay(
    repo: Pick<RepositorioPort, 'inropayActualizar'>,
    p: { cuerpo: string; firmaValida: boolean; configurado: boolean },
): Promise<Result<EventoInroPay, RespuestaWebhook>> {
    if (!p.configurado) return err({ estado: 503, cuerpo: { error: 'InroPay no configurado: falta INROPAY_WEBHOOK_SECRET.' } });
    if (!p.firmaValida) return err({ estado: 401, cuerpo: { error: 'Firma no válida.' } });
    const e = leerEvento(p.cuerpo);
    if ('motivo' in e) return err({ estado: 400, cuerpo: { error: e.motivo } });
    const r = await repo.inropayActualizar(e.evento);
    if (r.isErr()) return err({ estado: 400, cuerpo: { error: r.error.mensaje } });
    return ok(e.evento);
}
