// Lee los colores de globals.css con sus anotaciones (el formato está explicado al principio de ese
// archivo). Es la única lista de tokens: /dev/colores se arma con lo que devuelve esto.

export type GroupStatus = 'pendiente' | 'aprobado';

export interface ColorToken {
    /** «--color-ink-2» */
    name: string;
    /** El valor tal como está escrito: «#5c5c58», «var(--color-texto)», «color-mix(…)». */
    value: string;
    use: string;
    /** El token sobre el que este color lleva texto («sobre surface» → «--color-surface»). */
    on?: string;
    /** `borde sobre surface`: es un borde (pide 3:1, WCAG 1.4.11) y no un texto (4.5:1). */
    border?: boolean;
    /** Si el valor es otro token: «texto». */
    alias?: string;
    /** Si el valor se calcula con color-mix. */
    mix: boolean;
}

export interface ColorGroup {
    id: string;
    title: string;
    status: GroupStatus;
    note: string;
    tokens: ColorToken[];
}

const GROUP = /^\s*\/\*\s*@grupo\s+(.+?)\s*\*\/\s*$/;
const TOKEN = /^\s*(--color-[\w-]+)\s*:\s*([^;]+);\s*(?:\/\*\s*(.*?)\s*\*\/)?\s*$/;

export function parseColorTokens(css: string): ColorGroup[] {
    const groups: ColorGroup[] = [];
    let current: ColorGroup | null = null;
    for (const line of css.split(/\r?\n/)) {
        const g = GROUP.exec(line);
        if (g) {
            const [id, title, status, ...note] = g[1].split('|').map((s) => s.trim());
            current = { id, title: title || id, status: status === 'aprobado' ? 'aprobado' : 'pendiente', note: note.join(' | '), tokens: [] };
            groups.push(current);
            continue;
        }
        const t = TOKEN.exec(line);
        if (!t) continue;
        // Un color sin @grupo encima igual se muestra, en «Sin grupo», para que nada quede escondido.
        if (!current) {
            current = { id: 'sin-grupo', title: 'Sin grupo', status: 'pendiente', note: 'Tokens sin un @grupo encima en globals.css.', tokens: [] };
            groups.push(current);
        }
        const value = t[2].trim();
        const [use = '', on = ''] = (t[3] ?? '').split('|').map((s) => s.trim());
        const onMatch = /^(borde\s+)?sobre\s+(?:--color-)?([\w-]+)$/.exec(on);
        const onName = onMatch?.[2];
        current.tokens.push({
            name: t[1],
            value,
            use,
            on: onName ? `--color-${onName}` : undefined,
            border: Boolean(onMatch?.[1]),
            alias: /^var\(--color-([\w-]+)\)$/.exec(value)?.[1],
            mix: value.startsWith('color-mix'),
        });
    }
    return groups.filter((g) => g.tokens.length);
}
