'use client';

import { useState } from 'react';
import { Code, Page, PageHeader, Rules, Section } from '../../../../guia/doc.tsx';
import { Example } from '../../../../guia/example.tsx';
import { FilterRow, SearchBox } from '../../../../ui/bits.tsx';
import { Segmented } from '../../../../ui/card.tsx';
import { SortSelect } from '../../../../ui/pager.tsx';
import { SelectMenu } from '../../../../ui/select-menu.tsx';
import { PeriodPicker } from '../../../../ui/period-picker.tsx';
import { periodLabel, parsePeriod } from '../../../../ui/period.ts';

const STATES = [
    { value: 'todos', label: 'Todos los estados' },
    { value: 'pendiente', label: 'Pendientes' },
    { value: 'pagado', label: 'Pagados' },
];
const MONTHS = ['202606', '202607', '202608', '202609', '202610', '202611'];

export default function Filtros() {
    const [q, setQ] = useState('');
    const [state, setState] = useState('todos');
    const [period, setPeriod] = useState('m202611');
    const [seg, setSeg] = useState<'rec' | 'emi' | 'all'>('rec');
    const [sort, setSort] = useState<'fecha' | 'monto' | 'nombre'>('fecha');

    return (
        <Page href="/componentes/filtros">
            <PageHeader
                eyebrow="Componentes"
                title="Filtros"
                lead={
                    <>
                        Buscador, desplegable, período y selector segmentado comparten <Code>CONTROL</Code> (<Code>ui/bits.tsx</Code>): mismo radio, borde, foco
                        azul y deshabilitado gris. Van juntos en una <Code>FilterRow</Code> encima de lo que filtran.
                    </>
                }
            />

            <Section title="La barra de filtros" blurb="Pruébalos: el resultado de abajo cambia con cada uno.">
                <Example
                    code={`<FilterRow>
    <SearchBox value={q} onChange={setQ} placeholder="Buscar RUC o razón social" />
    <SelectMenu value={state} onChange={setState} label="Estado" className="w-52" options={[
        { value: 'todos', label: 'Todos los estados' },
        { value: 'pendiente', label: 'Pendientes' },
        { value: 'pagado', label: 'Pagados' },
    ]} />
    <PeriodPicker value={period} onChange={setPeriod} months={months} />
</FilterRow>`}
                >
                    <FilterRow>
                        <SearchBox value={q} onChange={setQ} placeholder="Buscar RUC o razón social" />
                        <SelectMenu value={state} onChange={setState} label="Estado" className="w-52" options={STATES} />
                        <PeriodPicker value={period} onChange={setPeriod} months={MONTHS} />
                    </FilterRow>
                    <p className="rounded-control bg-surface-2 px-3 py-2 text-small text-ink-2">
                        Buscar: <b>{q || '—'}</b> · Estado: <b>{state}</b> · Período: <b>{period ? periodLabel(parsePeriod(period)) : 'todo'}</b>
                    </p>
                </Example>
            </Section>

            <Section
                title="Período"
                blurb="Primero el tipo (día, mes, bimestre, trimestre, semestre, año o rango) y luego cuál. Solo ofrece los períodos que tienen datos. El valor es un código corto que cabe en la URL: m202611, t2026-4, a2026, r2026-10-01_2026-10-15."
            >
                <Example code={`<PeriodPicker value={period} onChange={setPeriod} months={['202610', '202611']} />\n<PeriodPicker value="" onChange={() => {}} months={[]} disabled />`}>
                    <div className="flex flex-col gap-3">
                        <PeriodPicker value={period} onChange={setPeriod} months={MONTHS} />
                        <PeriodPicker value="" onChange={() => {}} months={MONTHS} disabled />
                    </div>
                </Example>
            </Section>

            <Section title="Segmentado" blurb="Para 2 a 4 vistas de lo mismo que se cambian a menudo. Más de cuatro, o nombres largos: un desplegable.">
                <Example
                    code={`<Segmented value={seg} onChange={setSeg} options={[
    { value: 'rec', label: 'Recibidos' },
    { value: 'emi', label: 'Emitidos' },
    { value: 'all', label: 'Todos' },
]} />`}
                >
                    <Segmented
                        value={seg}
                        onChange={setSeg}
                        options={[
                            { value: 'rec', label: 'Recibidos' },
                            { value: 'emi', label: 'Emitidos' },
                            { value: 'all', label: 'Todos' },
                        ]}
                    />
                </Example>
            </Section>

            <Section title="Ordenar">
                <Example
                    code={`<SortSelect value={sort} onChange={setSort} options={[
    { value: 'fecha', label: 'Fecha (reciente primero)' },
    { value: 'monto', label: 'Monto (mayor primero)' },
    { value: 'nombre', label: 'Razón social (A–Z)' },
]} />`}
                >
                    <SortSelect
                        value={sort}
                        onChange={setSort}
                        options={[
                            { value: 'fecha', label: 'Fecha (reciente primero)' },
                            { value: 'monto', label: 'Monto (mayor primero)' },
                            { value: 'nombre', label: 'Razón social (A–Z)' },
                        ]}
                    />
                </Example>
            </Section>

            <Section title="Reglas">
                <Rules
                    items={[
                        ['El buscador filtra mientras se escribe (150 ms después de la última tecla).', 'Sin botón «Buscar». Ignora tildes y mayúsculas: «cámara» encuentra «CAMARA».'],
                        ['Los filtros viven en la URL.', 'Así un enlace copiado abre la misma vista, y «atrás» deshace el último filtro.'],
                        ['Cambiar un filtro vuelve a la página 1.', 'Si no, el usuario queda en la página 4 de un resultado que tiene 2.'],
                        ['El orden de la barra: buscar, luego los selects, luego el período, y a la derecha el orden y exportar.', 'Igual en todas las pantallas.'],
                    ]}
                />
            </Section>
        </Page>
    );
}
