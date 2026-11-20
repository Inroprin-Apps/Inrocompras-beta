// Correos que salen de INROCOMPRAS (docs/07 §3). PURO: las plantillas. De tú, cortas, sin exclamaciones;
// la OC de importación va en inglés.

export type ModoCorreo = 'registro' | 'gmail' | 'smtp';
export const modoCorreo = (v: string | undefined): ModoCorreo => (v === 'gmail' || v === 'smtp' ? v : 'registro');

export interface Adjunto {
    nombre: string;
    mime: string;
    datos: Uint8Array;
}
export interface Correo {
    para: string[];
    cc?: string[];
    responderA?: string;
    asunto: string;
    html: string;
    adjuntos?: Adjunto[];
}

/** Para poner datos de la base dentro del HTML sin que rompan el correo. */
export const escaparHtml = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const CORREO = /^[^@\s,;<>]+@[^@\s,;<>]+\.[^@\s,;<>]+$/;
export const correoValido = (c: string) => CORREO.test(c.trim());

export function notificacion(p: { nombre: string; titulo: string; cuerpo?: string | null; enlace: string }) {
    const e = escaparHtml;
    return {
        asunto: p.titulo,
        html:
            `<p>Hola, ${e(p.nombre)}.</p><p><b>${e(p.titulo)}</b></p>${p.cuerpo ? `<p>${e(p.cuerpo)}</p>` : ''}` +
            `<p><a href="${e(p.enlace)}">Abrir en INROCOMPRAS</a></p>` +
            `<p style="color:#666;font-size:12px">Te llega porque tienes un paso pendiente en INROCOMPRAS.</p>`,
    };
}

export function ocProveedor(p: { proveedor: string; numero: string; empresa: string; comprador: string; idioma: 'es' | 'en' }) {
    const e = escaparHtml;
    return p.idioma === 'en'
        ? {
              asunto: `Purchase Order ${p.numero} – ${p.empresa}`,
              html:
                  `<p>Dear ${e(p.proveedor)},</p><p>Please find attached Purchase Order <b>${e(p.numero)}</b>. ` +
                  `Kindly confirm receipt and the delivery date.</p><p>Best regards,<br>${e(p.comprador)}<br>${e(p.empresa)}</p>`,
          }
        : {
              asunto: `Orden de compra ${p.numero} – ${p.empresa}`,
              html:
                  `<p>Estimados ${e(p.proveedor)}:</p><p>Les enviamos la orden de compra <b>${e(p.numero)}</b>. ` +
                  `Por favor, confirmen la recepción y la fecha de entrega.</p><p>Saludos,<br>${e(p.comprador)}<br>${e(p.empresa)}</p>`,
          };
}

/** El primer nombre (para el saludo). */
export const primerNombre = (n: string) => n.trim().split(/\s+/)[0] || n;
