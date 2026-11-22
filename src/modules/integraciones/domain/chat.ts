// Avisos a Google Chat (docs/12: los bots «Chat Liberada» y «Chat - Pago registrado» del AppSheet). PURO.
// La base decide qué cambios de estado van a Chat y en qué espacio (config.chat_avisos) y arma el texto; el servidor
// solo lo publica. Cada espacio es un webhook entrante de Google Chat; sus URL llevan un token y viven en
// GOOGLE_CHAT_WEBHOOKS (JSON: {"compras": "https://chat.googleapis.com/v1/spaces/…"}), nunca en el repo ni en la base.

const PREFIJO = 'https://chat.googleapis.com/';

/** Lee GOOGLE_CHAT_WEBHOOKS. Ignora lo que no sea una URL de Google Chat (no se publica en cualquier sitio). */
export function espaciosChat(json: string | undefined): Record<string, string> {
    if (!json?.trim()) return {};
    try {
        const v: unknown = JSON.parse(json);
        if (!v || typeof v !== 'object' || Array.isArray(v)) return {};
        return Object.fromEntries(
            Object.entries(v as Record<string, unknown>)
                .filter((e): e is [string, string] => typeof e[1] === 'string' && e[1].startsWith(PREFIJO))
                .map(([k, u]) => [k.trim().toLowerCase(), u.trim()]),
        );
    } catch {
        return {};
    }
}

/** El mensaje: el texto que armó la base y el enlace a la ficha (formato de Google Chat: <url|texto>). */
export function mensajeChat(texto: string, enlace: string): string {
    const t = texto.trim();
    return enlace ? `${t}\n<${enlace}|Abrir en INROCOMPRAS>` : t;
}
