// Correo desde el Google Workspace de INROPRIN (decisión 06/11: notificaciones por correo; las del SIDIGE no sirven).
// Opción A (recomendada): Gmail API con una cuenta de servicio con delegación de dominio SOLO para gmail.send,
//   enviando como una cuenta dedicada (p. ej. notificaciones@ del dominio). La configura TI en la consola de Admin.
// Opción B: relay SMTP de Google Workspace (smtp-relay.gmail.com) con nodemailer.
// Las dos se eligen con CORREO_MODO = 'gmail' | 'smtp'. Mientras TI no configure nada: CORREO_MODO = 'registro' (solo deja log).
//
// Dependencias: npm i googleapis nodemailer   (dev: @types/nodemailer)
// Variables: CORREO_MODO, CORREO_REMITENTE, GOOGLE_SERVICE_ACCOUNT_JSON (opción A), SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS (opción B)
import { google } from 'googleapis';
import nodemailer from 'nodemailer';

export type Adjunto = { nombre: string; mime: string; datos: Uint8Array };
export type Correo = { para: string[]; cc?: string[]; asunto: string; html: string; texto?: string; adjuntos?: Adjunto[]; responderA?: string };

function mime(c: Correo, remitente: string): string {
    const limite = 'inrocompras_' + Date.now().toString(36);
    const enc = (s: string) => '=?UTF-8?B?' + Buffer.from(s).toString('base64') + '?=';
    const partes = [
        `From: ${remitente}`,
        `To: ${c.para.join(', ')}`,
        ...(c.cc?.length ? [`Cc: ${c.cc.join(', ')}`] : []),
        ...(c.responderA ? [`Reply-To: ${c.responderA}`] : []),
        `Subject: ${enc(c.asunto)}`,
        'MIME-Version: 1.0',
        `Content-Type: multipart/mixed; boundary="${limite}"`,
        '',
        `--${limite}`,
        'Content-Type: text/html; charset="UTF-8"',
        'Content-Transfer-Encoding: base64',
        '',
        Buffer.from(c.html).toString('base64'),
    ];
    for (const a of c.adjuntos ?? []) {
        partes.push(
            `--${limite}`,
            `Content-Type: ${a.mime}; name="${enc(a.nombre)}"`,
            'Content-Transfer-Encoding: base64',
            `Content-Disposition: attachment; filename="${enc(a.nombre)}"`,
            '',
            Buffer.from(a.datos).toString('base64'),
        );
    }
    partes.push(`--${limite}--`);
    return partes.join('\r\n');
}

export async function enviarCorreo(c: Correo): Promise<{ id: string }> {
    const modo = process.env.CORREO_MODO ?? 'registro';
    const remitente = process.env.CORREO_REMITENTE ?? 'INROCOMPRAS <notificaciones@ejemplo.pe>';
    if (modo === 'gmail') {
        const cred = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON ?? '{}');
        const correoRemitente = remitente.match(/<(.+)>/)?.[1] ?? remitente;
        const auth = new google.auth.JWT({
            email: cred.client_email,
            key: cred.private_key,
            scopes: ['https://www.googleapis.com/auth/gmail.send'],
            subject: correoRemitente,
        }); // delegación de dominio
        const gmail = google.gmail({ version: 'v1', auth });
        const raw = Buffer.from(mime(c, remitente)).toString('base64url');
        const r = await gmail.users.messages.send({ userId: 'me', requestBody: { raw } });
        return { id: r.data.id ?? '' };
    }
    if (modo === 'smtp') {
        const t = nodemailer.createTransport({
            host: process.env.SMTP_HOST ?? 'smtp-relay.gmail.com',
            port: Number(process.env.SMTP_PORT ?? 587),
            secure: false,
            auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
        });
        const r = await t.sendMail({
            from: remitente,
            to: c.para,
            cc: c.cc,
            replyTo: c.responderA,
            subject: c.asunto,
            html: c.html,
            text: c.texto,
            attachments: c.adjuntos?.map((a) => ({ filename: a.nombre, contentType: a.mime, content: Buffer.from(a.datos) })),
        });
        return { id: r.messageId };
    }
    console.log(
        '[correo:registro]',
        c.para.join(','),
        c.asunto,
        (c.adjuntos ?? []).map((a) => a.nombre),
    );
    return { id: 'registro-' + Date.now() };
}

// Plantillas: textos de tú, cortos, sin exclamaciones (reglas de redacción de la guía UI).
export const plantillas = {
    notificacion: (p: { nombre: string; titulo: string; cuerpo?: string | null; enlace: string }) => ({
        asunto: p.titulo,
        html: `<p>Hola, ${p.nombre}.</p><p><b>${p.titulo}</b></p>${p.cuerpo ? `<p>${p.cuerpo}</p>` : ''}
           <p><a href="${p.enlace}">Abrir en INROCOMPRAS</a></p><p style="color:#666;font-size:12px">Te llega porque tienes un paso pendiente.</p>`,
    }),
    ocProveedor: (p: { proveedor: string; numero: string; empresa: string; comprador: string; idioma: 'es' | 'en' }) =>
        p.idioma === 'en'
            ? {
                  asunto: `Purchase Order ${p.numero} – ${p.empresa}`,
                  html: `<p>Dear ${p.proveedor},</p><p>Please find attached Purchase Order <b>${p.numero}</b>. Kindly confirm receipt and delivery date.</p><p>Best regards,<br>${p.comprador}<br>${p.empresa}</p>`,
              }
            : {
                  asunto: `Orden de compra ${p.numero} – ${p.empresa}`,
                  html: `<p>Estimados ${p.proveedor}:</p><p>Les enviamos la orden de compra <b>${p.numero}</b>. Por favor, confirmen la recepción y la fecha de entrega.</p><p>Saludos,<br>${p.comprador}<br>${p.empresa}</p>`,
              },
};
