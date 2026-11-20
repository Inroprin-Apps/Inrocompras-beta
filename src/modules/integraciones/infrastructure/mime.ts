// El mensaje MIME (RFC 2822) que pide la API de Gmail: HTML + adjuntos en base64, asunto y nombres en UTF-8.
// Sin secretos: se prueba en tests/unit.
import type { Correo } from '../domain/correo.ts';

const enc = (s: string) => '=?UTF-8?B?' + Buffer.from(s).toString('base64') + '?=';
/** Corta el base64 en líneas de 76 (lo que piden los servidores de correo). */
const lineas = (b64: string) => b64.replace(/.{1,76}/g, (x) => x + '\r\n').trimEnd();
/** Sin saltos de línea en un encabezado (evita que un dato inyecte otro encabezado). */
const limpio = (s: string) => s.replace(/[\r\n]+/g, ' ').trim();

export function mensajeMime(c: Correo, remitente: string, limite = 'inrocompras_' + Date.now().toString(36)): string {
    const partes = [
        `From: ${limpio(remitente)}`,
        `To: ${c.para.map(limpio).join(', ')}`,
        ...(c.cc?.length ? [`Cc: ${c.cc.map(limpio).join(', ')}`] : []),
        ...(c.responderA ? [`Reply-To: ${limpio(c.responderA)}`] : []),
        `Subject: ${enc(limpio(c.asunto))}`,
        'MIME-Version: 1.0',
        `Content-Type: multipart/mixed; boundary="${limite}"`,
        '',
        `--${limite}`,
        'Content-Type: text/html; charset="UTF-8"',
        'Content-Transfer-Encoding: base64',
        '',
        lineas(Buffer.from(c.html).toString('base64')),
    ];
    for (const a of c.adjuntos ?? []) {
        partes.push(
            `--${limite}`,
            `Content-Type: ${a.mime}; name="${enc(a.nombre)}"`,
            'Content-Transfer-Encoding: base64',
            `Content-Disposition: attachment; filename="${enc(a.nombre)}"`,
            '',
            lineas(Buffer.from(a.datos).toString('base64')),
        );
    }
    partes.push(`--${limite}--`);
    return partes.join('\r\n');
}
