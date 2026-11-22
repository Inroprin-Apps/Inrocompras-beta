import 'server-only';
// Google Chat por webhooks entrantes (uno por espacio). Las URL, con su token, vienen de GOOGLE_CHAT_WEBHOOKS y no
// salen del servidor. Sin esa variable, los trabajos 'chat' quedan «Descartado» con el motivo.
import { err, ok } from 'neverthrow';
import type { ChatPort, R } from '../application/ports/IntegracionesPort.ts';
import { espaciosChat } from '../domain/chat.ts';
import { final, reintentar } from '../domain/trabajo.ts';
import { intentar } from './comun.ts';

export class ChatAdapter implements ChatPort {
    private readonly webhooks = espaciosChat(process.env.GOOGLE_CHAT_WEBHOOKS);

    espacios(): string[] {
        return Object.keys(this.webhooks);
    }

    async publicar(espacio: string, texto: string): R<null> {
        const url = this.webhooks[espacio];
        if (!url) return err(final(`El espacio «${espacio}» no tiene webhook.`));
        const r = await intentar('Google Chat', () =>
            fetch(url, {
                method: 'POST',
                headers: { 'content-type': 'application/json; charset=UTF-8' },
                body: JSON.stringify({ text: texto }),
                signal: AbortSignal.timeout(15_000),
            }),
        );
        if (r.isErr()) return err(r.error);
        if (r.value.ok) return ok(null);
        // 4xx: el webhook está mal o fue borrado (reintentar no sirve). 5xx o 429: después.
        const m = `Google Chat respondió ${r.value.status}.`;
        return err(r.value.status >= 500 || r.value.status === 429 ? reintentar(m) : final(m));
    }
}
