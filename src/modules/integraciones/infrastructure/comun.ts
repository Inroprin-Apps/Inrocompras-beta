import 'server-only';
// Ayudas de la infraestructura: envolver una llamada externa en Result<T, Fallo>.
import { err, ok, type Result } from 'neverthrow';
import { final, mensajeDe, reintentar, type Fallo } from '../domain/trabajo.ts';

/** Errores de credenciales o permisos no se arreglan reintentando; la red y los 5xx/429, sí. */
export function clasificar(e: unknown, que: string): Fallo {
    const m = `${que}: ${mensajeDe(e)}`;
    const code =
        (e as { code?: unknown; status?: unknown; response?: { status?: unknown } })?.code ??
        (e as { status?: unknown })?.status ??
        (e as { response?: { status?: unknown } })?.response?.status;
    const st = Number(code);
    if (st === 401 || st === 403 || /invalid_grant|unauthorized|forbidden|permission|credentials|invalid api key|API key not valid|EAUTH/i.test(m))
        return final(m);
    if (st === 404) return final(m);
    return reintentar(m);
}

export async function intentar<T>(que: string, f: () => Promise<T>): Promise<Result<T, Fallo>> {
    try {
        return ok(await f());
    } catch (e) {
        return err(clasificar(e, que));
    }
}

/** Las variables de entorno que faltan, por nombre. */
export const faltan = (...nombres: string[]) => nombres.filter((n) => !process.env[n]?.trim());

/** El JSON de la cuenta de servicio de Google, o null si no está o no se lee. */
export function credencialesGoogle(): { client_email: string; private_key: string } | null {
    try {
        const c = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON ?? '') as { client_email?: string; private_key?: string };
        return c.client_email && c.private_key ? { client_email: c.client_email, private_key: c.private_key } : null;
    } catch {
        return null;
    }
}
