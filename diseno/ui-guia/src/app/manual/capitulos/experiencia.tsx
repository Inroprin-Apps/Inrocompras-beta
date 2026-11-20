'use client';

// Experiencia: cómo se escribe, cómo se muestran los montos, fechas y números, y cómo se usa con el teclado. Tres paneles que cambian
// al bajar (ver paneles.tsx).
import { Check, X } from 'lucide-react';
import { Button } from '../../../ui/button.tsx';
import { Chip } from '../../../ui/card.tsx';
import { FilterPill } from '../../../ui/filter-pill.tsx';
import { dmy, money, thousands } from '../../../ui/format.ts';
import { Input } from '../../../ui/field.tsx';
import { EscenaConPaneles } from '../paneles.tsx';

const GRUPOS = [
    { titulo: 'Cómo se escribe', texto: 'En español de Perú, de tú y sin exclamaciones. Un error dice qué está mal y cómo se arregla; un botón dice lo que hace.', pista: 'Compara cada frase con su «no»' },
    { titulo: 'Montos, fechas y números', texto: 'Siempre el mismo formato, con los mismos separadores y la moneda delante, para que se comparen de un vistazo.', pista: 'Lee cómo queda cada dato' },
    { titulo: 'Accesibilidad y teclado', texto: 'Todo se alcanza con Tab, el foco se ve, y el color nunca va solo: siempre lo acompaña un texto o un icono.', pista: 'Pulsa la tecla Tab y recorre las piezas' },
] as const;

const FRASES = [
    { si: 'Guarda la orden', no: '¡GUARDAR!' },
    { si: 'El RUC tiene 11 dígitos; este tiene 10.', no: 'Error de validación en el campo' },
    { si: 'No hay comprobantes en noviembre 2026.', no: 'Sin resultados' },
    { si: 'Revisa los datos antes de seguir.', no: 'Usted debe revisar los datos' },
] as const;

function Redaccion() {
    return (
        <div className="flex flex-col gap-3">
            {FRASES.map((f) => (
                <div key={f.si} className="grid gap-3 sm:grid-cols-2">
                    <div className="flex items-start gap-2.5 rounded-control border border-line p-3 text-ui">
                        <Check size={16} className="mt-0.5 flex-none text-success" aria-label="Sí" />
                        <span>{f.si}</span>
                    </div>
                    <div className="flex items-start gap-2.5 rounded-control border border-line p-3 text-ui text-ink-2">
                        <X size={16} className="mt-0.5 flex-none text-danger" aria-label="No" />
                        <span>{f.no}</span>
                    </div>
                </div>
            ))}
        </div>
    );
}

const FORMATOS: [string, string][] = [
    ['952851.25 · soles', money(952851.25, 'PEN')],
    ['180 · dólares', money(180, 'USD')],
    ['2026-11-14 · fecha', dmy('2026-11-14')],
    ['98765 · cantidad', thousands(98765)],
    ['612 de 712 · porcentaje', '86 %'],
];

function Formatos() {
    return (
        <ul className="flex flex-col divide-y divide-divider rounded-card border border-line">
            {FORMATOS.map(([llega, sale]) => (
                <li key={llega} className="flex items-center justify-between gap-4 px-5 py-3.5">
                    <code className="text-small text-ink-2">{llega}</code>
                    <b className="text-heading font-semibold tabular-nums">{sale}</b>
                </li>
            ))}
            <li className="px-5 py-3.5 text-small text-ink-2">Miles con coma, decimales con punto, la moneda delante y la fecha como día/mes/año.</li>
        </ul>
    );
}

function Teclado() {
    return (
        <div className="flex flex-col gap-5">
            <p className="text-ui text-ink-2">Pulsa Tab y recorre estas piezas: cada una muestra su foco, un contorno azul de 2 px.</p>
            <div className="flex flex-wrap items-center gap-2.5">
                <Button>Guardar</Button>
                <Button variant="secondary">Exportar</Button>
                <FilterPill value="todos" onChange={() => {}} options={[{ value: 'todos', label: 'Todos los estados' }, { value: 'sin-oc', label: 'Sin OC' }]} />
                <div className="w-52">
                    <Input aria-label="Buscar proveedor" placeholder="Buscar proveedor" />
                </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
                {['Tab', 'Mayús + Tab', 'Enter', 'Esc'].map((t) => (
                    <kbd key={t} className="rounded-inner border border-line bg-surface-2 px-2 py-1 text-small font-medium">
                        {t}
                    </kbd>
                ))}
                <span className="text-small text-ink-2">siguiente · anterior · activar · cerrar</span>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
                <Chip tone="danger">Sin OC</Chip>
                <span className="text-small text-ink-2">El estado va en palabras, no solo en rojo.</span>
            </div>
        </div>
    );
}

export function Experiencia() {
    return (
        <EscenaConPaneles
            id="experiencia"
            rotulo="07 · Experiencia"
            titulo="Cómo se siente usarla"
            texto="Lo que no se ve en un componente suelto: las palabras, los números y el teclado."
            grupos={GRUPOS}
            paneles={[Redaccion, Formatos, Teclado]}
            recorrido="+=300%"
        />
    );
}
