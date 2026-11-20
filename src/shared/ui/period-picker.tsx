'use client';

// El filtro de período que comparten todas las pantallas: primero de qué tipo (día, mes, bimestre, trimestre,
// semestre, año o rango) y luego cuál. Las opciones son solo los períodos que tienen datos (`months`, AAAAMM); un
// día y un rango aceptan cualquier fecha. El valor es un código de period.ts.
//
// Hecho con el desplegable (`SelectMenu`) y la fecha (`DateField`) que vienen de GRAMA, no con los controles nativos
// del navegador: se ven y se comportan igual en todos.
import { useState } from 'react';
import { DateField } from './date-field.tsx';
import { parsePeriod, periodCode, periodLabel, rangeCode, type PeriodKind } from './period.ts';
import { SelectMenu } from './select-menu.tsx';

const KINDS: { value: PeriodKind | ''; label: string }[] = [
    { value: '', label: 'Todo el período' },
    { value: 'day', label: 'Un día' },
    { value: 'month', label: 'Mes' },
    { value: 'bimester', label: 'Bimestre' },
    { value: 'quarter', label: 'Trimestre' },
    { value: 'semester', label: 'Semestre' },
    { value: 'year', label: 'Año' },
    { value: 'range', label: 'Rango de fechas' },
];

/** Los períodos de `kind` que tienen datos, el más nuevo primero, como [código, etiqueta]. */
function optionsOf(kind: PeriodKind, months: string[]): [string, string][] {
    const codes = [...new Set(months.map((m) => periodCode(kind, m)))].filter(Boolean).sort((a, b) => (parsePeriod(a)!.from < parsePeriod(b)!.from ? 1 : -1));
    return codes.map((c) => [c, periodLabel(parsePeriod(c))]);
}

export function PeriodPicker({
    value,
    onChange,
    months,
    disabled = false,
    allLabel = 'Todo el período',
}: {
    value: string;
    onChange: (code: string) => void;
    /** Los meses con datos (AAAAMM), en cualquier orden. */
    months: string[];
    disabled?: boolean;
    allLabel?: string;
}) {
    const p = parsePeriod(value);
    // Un día o un rango elegido pero sin sus fechas todavía: el tipo se recuerda aquí hasta que lleguen.
    const [pending, setPending] = useState<PeriodKind | null>(null);
    const kind: PeriodKind | '' = p?.kind ?? pending ?? '';
    const [from, setFrom] = useState(p?.kind === 'range' ? p.from : '');
    const [to, setTo] = useState(p?.kind === 'range' ? p.to : '');
    const latest = [...months].sort().at(-1) ?? '';

    const pickKind = (k: PeriodKind | '') => {
        if (!k) {
            setPending(null);
            return onChange('');
        }
        if (k === 'day' || k === 'range') {
            setPending(k);
            return onChange('');
        }
        setPending(null);
        onChange(latest ? periodCode(k, latest) : '');
    };
    const pickRange = (f: string, t: string) => {
        setFrom(f);
        setTo(t);
        const code = rangeCode(f, t);
        if (code) onChange(code);
    };

    const periods = kind && kind !== 'day' && kind !== 'range' ? optionsOf(kind, months) : [];
    // El elegido aunque no tenga datos (un enlace desde otra pantalla).
    const periodOptions = [...(value && !periods.some(([c]) => c === value) ? [[value, periodLabel(p)] as [string, string]] : []), ...periods].map(([v, l]) => ({ value: v, label: l }));

    return (
        <div className="flex flex-wrap items-center gap-2">
            <SelectMenu
                label="Tipo de período"
                value={kind}
                disabled={disabled}
                onChange={(k) => pickKind(k as PeriodKind | '')}
                options={KINDS.map((k) => ({ value: k.value, label: k.value ? k.label : allLabel }))}
                className="w-44"
            />
            {kind === 'day' && <DateField label="Día" value={p?.kind === 'day' ? p.from : ''} disabled={disabled} onChange={(day) => onChange(day ? `d${day}` : '')} />}
            {kind === 'range' && (
                <>
                    <DateField label="Desde" value={from} max={to || undefined} disabled={disabled} onChange={(day) => pickRange(day, to)} />
                    <span className="text-small text-ink-2">a</span>
                    <DateField label="Hasta" value={to} min={from || undefined} disabled={disabled} onChange={(day) => pickRange(from, day)} />
                </>
            )}
            {periodOptions.length > 0 && kind && kind !== 'day' && kind !== 'range' && (
                <SelectMenu label="Período" value={value} disabled={disabled} onChange={onChange} options={periodOptions} className="w-60" />
            )}
        </div>
    );
}
