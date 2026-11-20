'use client';

// UN DÍA Y UNA HORA, GUARDADOS COMO UN SOLO INSTANTE. Viene de GRAMA (shared/ui/date-time-input), sin el
// «borde del día» que era de las aperturas y cierres de cursos: aquí media fecha no es una fecha, y no se envía
// nada hasta que están las dos mitades.
//
// LO QUE SE VE ES SU PROPIO ESTADO (los borradores del día y de la hora) y solo el instante terminado viaja. Lo que
// este componente envía se recuerda como `seen`, así cuando el padre lo devuelve —`null` incluido, a medio
// hacer— no se toma por un cambio de afuera que reinicia las cajas.
//
// `commit='blur'` es para los sitios que GUARDAN al cambiar: la hora sale al salir o al elegir, no con cada tecla.
// Con un botón Guardar detrás es `'change'`: el clic en Guardar leería el valor de antes del blur. El día es una
// sola elección y sale al instante en los dos.
import { useState } from 'react';
import { dayFromDate } from './clock-text.ts';
import { DateField } from './date-field.tsx';
import { TimeField } from './time-field.tsx';

const pad = (n: number) => String(n).padStart(2, '0');

/** Instante ISO → `aaaa-mm-dd` local, o `''`. */
function dayOf(iso: string | null): string {
    if (iso === null) return '';
    const date = new Date(iso);
    return Number.isNaN(date.getTime()) ? '' : dayFromDate(date);
}

/** Instante ISO → `HH:MM` local, o `''`. */
function clockOf(iso: string | null): string {
    if (iso === null) return '';
    const date = new Date(iso);
    return Number.isNaN(date.getTime()) ? '' : `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Día + hora → instante ISO. Media fecha no es una fecha: `null`. */
function instantOf(day: string, clock: string): string | null {
    if (day === '' || clock === '') return null;
    const date = new Date(`${day}T${clock}:00`);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function DateTimeInput({
    value,
    onChange,
    commit = 'change',
    label,
    disabled = false,
    className = '',
}: {
    /** El instante guardado (ISO), o `null` = ninguno. */
    value: string | null;
    onChange: (iso: string | null) => void;
    commit?: 'change' | 'blur';
    /** Para el lector de pantalla: «Fecha de entrega». La hora añade «(hora)». */
    label: string;
    disabled?: boolean;
    className?: string;
}) {
    const [day, setDay] = useState(dayOf(value));
    const [time, setTime] = useState(clockOf(value));
    // Un valor que cambia desde afuera (otro guardado, un refresco) reinicia las cajas: ajustar estado durante el render, sin efecto.
    const [seen, setSeen] = useState(value);
    if (value !== seen) {
        setSeen(value);
        setDay(dayOf(value));
        setTime(clockOf(value));
    }

    const emit = (nextDay: string, nextTime: string) => {
        const next = instantOf(nextDay, nextTime);
        setSeen(next);
        if (next !== value) onChange(next);
    };

    return (
        <span className={`flex flex-wrap items-center gap-2 ${className}`}>
            <DateField
                value={day}
                disabled={disabled}
                label={label}
                onChange={(next) => {
                    setDay(next);
                    emit(next, time);
                }}
            />
            <TimeField
                value={time}
                live={commit === 'change'}
                disabled={disabled}
                label={`${label} (hora)`}
                onChange={(clock) => {
                    setTime(clock);
                    emit(day, clock);
                }}
            />
        </span>
    );
}
