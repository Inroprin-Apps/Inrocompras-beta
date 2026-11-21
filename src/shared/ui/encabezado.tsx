'use client';

// El encabezado de una pantalla, como el patrón «Listado» de la guía: el título (h1, text-title) y, a su derecha, de
// cuándo son los datos, para que la persona sepa si lo que ve está al día. `accion` es el botón principal de la
// pantalla (p. ej. «Nueva solicitud»), si lo hay.
import type { ReactNode } from 'react';

const hora = new Intl.DateTimeFormat('es-PE', { timeZone: 'America/Lima', hour: '2-digit', minute: '2-digit', hour12: false });
const dia = new Intl.DateTimeFormat('es-PE', { timeZone: 'America/Lima', day: '2-digit', month: '2-digit', year: 'numeric' });

/** «Actualizado hoy a las 10:42» o «Actualizado el 20/11/2026 a las 18:05» (hora de Lima). */
export function textoActualizado(ms: number, ahora = Date.now()): string {
    const d = new Date(ms);
    const cuando = dia.format(d) === dia.format(new Date(ahora)) ? 'hoy' : `el ${dia.format(d)}`;
    return `Actualizado ${cuando} a las ${hora.format(d)}`;
}

export function Encabezado({ titulo, actualizado, accion }: { titulo: string; actualizado?: number | null; accion?: ReactNode }) {
    return (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <h1 className="text-title font-semibold">{titulo}</h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                {actualizado ? <span className="text-small text-ink-3">{textoActualizado(actualizado)}</span> : null}
                {accion}
            </div>
        </div>
    );
}
