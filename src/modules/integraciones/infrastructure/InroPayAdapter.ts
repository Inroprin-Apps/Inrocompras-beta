import 'server-only';
// InroPay (pagos de Finanzas): INROCOMPRAS envía la solicitud (POST {INROPAY_URL}/solicitudes) y lee el estado por
// el webhook. Sin INROPAY_URL no se envía nada (el trabajo queda «Descartado» con ese motivo).
import { err, ok } from 'neverthrow';
import type { InroPayPort, R } from '../application/ports/IntegracionesPort.ts';
import { final, reintentar } from '../domain/trabajo.ts';
import { intentar } from './comun.ts';

export class InroPayAdapter implements InroPayPort {
    private readonly url = process.env.INROPAY_URL?.trim().replace(/\/+$/, '') ?? '';
    readonly configurado = Boolean(this.url);

    async solicitar(cuerpo: Record<string, unknown>): R<{ id: string }> {
        const r = await intentar('InroPay', () =>
            fetch(`${this.url}/solicitudes`, {
                method: 'POST',
                headers: { 'content-type': 'application/json', authorization: `Bearer ${process.env.INROPAY_TOKEN ?? ''}` },
                body: JSON.stringify(cuerpo),
                signal: AbortSignal.timeout(15_000),
            }),
        );
        if (r.isErr()) return err(r.error);
        const res = r.value;
        if (!res.ok) {
            const m = `InroPay respondió ${res.status}: ${(await res.text().catch(() => '')).slice(0, 200)}`;
            return err(res.status >= 500 || res.status === 429 ? reintentar(m) : final(m));
        }
        const j = (await res.json().catch(() => ({}))) as { id?: unknown };
        return j.id ? ok({ id: String(j.id) }) : err(final('InroPay no devolvió el id de la solicitud.'));
    }
}
