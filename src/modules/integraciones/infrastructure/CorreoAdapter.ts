import 'server-only';
// Correo desde el Google Workspace de la empresa (docs/07 §3). CORREO_MODO:
//   gmail    → Gmail API con la cuenta de servicio y delegación de dominio SOLO para gmail.send (la configura TI);
//   smtp     → relay SMTP de Workspace con nodemailer;
//   registro → mientras TI no configure nada: deja un log y no envía (el trabajo queda «Descartado» con ese motivo).
import { auth, gmail } from '@googleapis/gmail';
import nodemailer from 'nodemailer';
import { modoCorreo, type Correo, type ModoCorreo } from '../domain/correo.ts';
import type { CorreoPort, R } from '../application/ports/IntegracionesPort.ts';
import { credencialesGoogle, faltan, intentar } from './comun.ts';
import { mensajeMime } from './mime.ts';

export class CorreoAdapter implements CorreoPort {
    readonly modo: ModoCorreo = modoCorreo(process.env.CORREO_MODO);
    private readonly remitente = process.env.CORREO_REMITENTE?.trim() ?? '';

    falta(): string[] | null {
        if (this.modo === 'registro') return null;
        const f = faltan('CORREO_REMITENTE');
        if (this.modo === 'gmail' && !credencialesGoogle()) f.push('GOOGLE_SERVICE_ACCOUNT_JSON');
        if (this.modo === 'smtp') f.push(...faltan('SMTP_HOST'));
        return f.length ? f : null;
    }

    enviar(c: Correo): R<{ id: string }> {
        if (this.modo === 'gmail') {
            return intentar('Gmail', async () => {
                const cred = credencialesGoogle()!;
                const como = this.remitente.match(/<(.+)>/)?.[1] ?? this.remitente;
                const jwt = new auth.JWT({
                    email: cred.client_email,
                    key: cred.private_key,
                    scopes: ['https://www.googleapis.com/auth/gmail.send'],
                    subject: como,
                });
                const raw = Buffer.from(mensajeMime(c, this.remitente)).toString('base64url');
                const r = await gmail({ version: 'v1', auth: jwt }).users.messages.send({ userId: 'me', requestBody: { raw } });
                return { id: r.data.id ?? '' };
            });
        }
        if (this.modo === 'smtp') {
            return intentar('SMTP', async () => {
                const t = nodemailer.createTransport({
                    host: process.env.SMTP_HOST,
                    port: Number(process.env.SMTP_PORT ?? 587),
                    secure: Number(process.env.SMTP_PORT) === 465,
                    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
                });
                const r = await t.sendMail({
                    from: this.remitente,
                    to: c.para,
                    cc: c.cc,
                    replyTo: c.responderA,
                    subject: c.asunto,
                    html: c.html,
                    attachments: c.adjuntos?.map((a) => ({ filename: a.nombre, contentType: a.mime, content: Buffer.from(a.datos) })),
                });
                return { id: r.messageId };
            });
        }
        return intentar('Correo (registro)', async () => {
            console.info('[correo:registro]', c.para.join(','), '·', c.asunto, '·', (c.adjuntos ?? []).map((a) => a.nombre).join(', ') || 'sin adjuntos');
            return { id: 'registro-' + Date.now() };
        });
    }
}
