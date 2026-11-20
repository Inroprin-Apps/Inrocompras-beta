// Una hora del día escrita como texto, y un día como `aaaa-mm-dd`. Viene de GRAMA (shared/lib/clock-text).
//
// El <input type="time"> nativo se cambió porque sus segmentos (hh · mm · a. m.) cambian con el idioma del
// navegador y pelean con el teclado: una caja de texto que entiende cómo escribe la gente una hora es más
// fácil. Entiende «15:30», «15.30», «15h30», «1530», «930», «15», «3pm», «3:30 p. m.». Todo sale como `HH:MM`
// en 24 horas. Lo demás es `null`: una hora que no se puede leer no se adivina.

const pad = (n: number): string => String(n).padStart(2, '0');

/** Cada media hora del día, para la lista bajo la caja de hora. */
export const CLOCK_SLOTS: readonly string[] = Array.from({ length: 48 }, (_, i) => `${pad(Math.floor(i / 2))}:${i % 2 === 0 ? '00' : '30'}`);

const SEPARATED = /^(\d{1,2})(?:[:.h](\d{2}))?(am|pm)?$/;
const DIGITS = /^(\d{3,4})(am|pm)?$/;

/** Texto → `HH:MM`, o `null` si no es una hora. */
export function parseClock(text: string): string | null {
    // «3:30 p. m.» → «3:30pm»: fuera los espacios y los puntos del meridiano (no el que separa horas de minutos).
    const compact = text
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '')
        .replace(/([ap])\.?m\.?$/, '$1m');
    if (compact === '') return null;

    let hours: number;
    let minutes: number;
    let meridiem: string | undefined;
    const separated = SEPARATED.exec(compact);
    const digits = separated ? null : DIGITS.exec(compact);
    if (separated) {
        hours = Number(separated[1]);
        minutes = separated[2] === undefined ? 0 : Number(separated[2]);
        meridiem = separated[3];
    } else if (digits) {
        // «930» es 9:30 y «1530» es 15:30: las dos últimas cifras son siempre los minutos.
        hours = Number(digits[1].slice(0, -2));
        minutes = Number(digits[1].slice(-2));
        meridiem = digits[2];
    } else {
        return null;
    }

    if (minutes > 59) return null;
    if (meridiem !== undefined) {
        if (hours < 1 || hours > 12) return null;
        hours = (hours % 12) + (meridiem === 'pm' ? 12 : 0);
    } else if (hours > 23) {
        return null;
    }
    return `${pad(hours)}:${pad(minutes)}`;
}

/**
 * ¿Es una hora TERMINADA?, para formularios que envían mientras se escribe. «15» se lee (15:00) pero
 * probablemente es el comienzo de «15:30», y «153» de «1530»: esperan al blur; «15:30», «1530» o «3pm» no.
 */
export function isFinishedClock(text: string): boolean {
    return parseClock(text) !== null && !/^\s*\d{1,3}\s*$/.test(text);
}

/** Mueve un `HH:MM` unos minutos, dando la vuelta a medianoche (las flechas del teclado). */
export function shiftClock(clock: string, minutes: number): string {
    const parsed = parseClock(clock);
    const [h, m] = (parsed ?? '00:00').split(':').map(Number);
    const total = (((h * 60 + m + minutes) % 1440) + 1440) % 1440;
    return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
}

const dayWords = new Intl.DateTimeFormat('es-PE', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

/** `aaaa-mm-dd` → «mar, 7 oct 2026», para el botón que abre el calendario. */
export function dayLabel(date: string): string {
    const [y, m, d] = date.split('-').map(Number);
    if (!y || !m || !d) return '';
    return dayWords.format(new Date(y, m - 1, d));
}

/** `aaaa-mm-dd` ↔ un `Date` local a medianoche, que es lo que habla el calendario. */
export function dateFromDay(date: string): Date | undefined {
    const [y, m, d] = date.split('-').map(Number);
    return y && m && d ? new Date(y, m - 1, d) : undefined;
}

export function dayFromDate(date: Date): string {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
