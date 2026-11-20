// La firma del webhook de InroPay: HMAC-SHA256 del cuerpo, en hexadecimal, en el encabezado x-inropay-firma.
// Comparación en tiempo constante. Sin secretos guardados aquí: se prueba en tests/unit.
import { createHmac, timingSafeEqual } from 'node:crypto';

export const firmar = (secreto: string, cuerpo: string) => createHmac('sha256', secreto).update(cuerpo, 'utf8').digest('hex');

export function firmaValida(secreto: string | undefined, cuerpo: string, firma: string | null): boolean {
    if (!secreto || !firma) return false;
    const esperada = Buffer.from(firmar(secreto, cuerpo), 'hex');
    const recibida = Buffer.from(firma.trim().replace(/^sha256=/i, ''), 'hex');
    return recibida.length === esperada.length && timingSafeEqual(recibida, esperada);
}
