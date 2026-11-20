'use client';

// Patrones: las pantallas que se repiten (listado, tablero con KPI, formulario completo y vacío/carga/error), armadas con las piezas
// aprobadas. Cuatro paneles que cambian al bajar (ver paneles.tsx).
import { useState } from 'react';
import { BarRow, Notice, SearchBox, T } from '../../../ui/bits.tsx';
import { Button } from '../../../ui/button.tsx';
import { Card, Chip, Kpi, KpiNote, Segmented } from '../../../ui/card.tsx';
import { Field, Input } from '../../../ui/field.tsx';
import { FilterPill } from '../../../ui/filter-pill.tsx';
import { Hueco } from '../../../ui/hueco.tsx';
import { Pager, usePaged } from '../../../ui/pager.tsx';
import { dmy, money } from '../../../ui/format.ts';
import { DOCS, ESTADO_LABEL, ESTADO_TONE } from '../../../guia/data.ts';
import { EscenaConPaneles } from '../paneles.tsx';

const GRUPOS = [
    { titulo: 'Listado', texto: 'Filtros arriba, la tabla debajo y el paginador al pie. Los filtros valen para toda la pantalla y el conteo dice cuántas filas hay.', pista: 'Filtra, busca y cambia de página' },
    { titulo: 'Tablero con KPI', texto: 'Una fila de KPI y, debajo, lo que los explica: barras y tablas. Lo más importante va arriba a la izquierda.', pista: 'Cambia entre Compras y Ventas' },
    { titulo: 'Formulario completo', texto: 'Cada campo con su etiqueta; el error dice qué falta y cómo arreglarlo, y un resumen arriba si hay varios. Guardar, a la izquierda.', pista: 'Escribe el RUC completo y la razón social' },
    { titulo: 'Vacío, carga y error', texto: 'Nunca una pantalla en blanco: el vacío dice qué falta, la carga guarda el sitio con huecos y el error explica y deja reintentar.', pista: 'Pulsa los botones de cada estado' },
] as const;

const ESTADOS = [
    { value: 'todos', label: 'Todos los estados' },
    { value: 'pendiente', label: 'Pendientes' },
    { value: 'pagado', label: 'Pagados' },
    { value: 'sin-oc', label: 'Sin orden de compra' },
];

function Listado() {
    const [estado, setEstado] = useState('todos');
    const [q, setQ] = useState('');
    const lista = DOCS.slice(0, 24).filter((d) => (estado === 'todos' || d.estado === estado) && (!q || `${d.nombre} ${d.ruc} ${d.serie}`.toLowerCase().includes(q.toLowerCase())));
    const paged = usePaged(lista, `${estado}${q}`, 3);
    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2.5">
                <FilterPill value={estado} onChange={setEstado} options={ESTADOS} />
                <SearchBox value={q} onChange={setQ} placeholder="Buscar RUC o razón social" />
            </div>
            <div className="overflow-x-auto">
                <table className={`${T.table} min-w-[28rem]`}>
                    <thead>
                        <tr className={T.headRow}>
                            <th className={T.th}>Comprobante</th>
                            <th className={T.th}>Proveedor</th>
                            <th className={`${T.th} w-px`}>Estado</th>
                            <th className={`${T.th} w-px`}>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paged.rows.map((d) => (
                            <tr key={d.id} className={T.row}>
                                <td className={T.td}>
                                    <span className="font-semibold">{d.serie}</span>
                                    <div className={T.sub}>{dmy(d.fecha)}</div>
                                </td>
                                <td className={T.td}>{d.nombre}</td>
                                <td className={`${T.td} w-px whitespace-nowrap`}>
                                    <Chip tone={ESTADO_TONE[d.estado]}>{ESTADO_LABEL[d.estado]}</Chip>
                                </td>
                                <td className={`${T.tdNum} w-px`}>{money(d.total, d.moneda)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <Pager paged={paged} className="mt-0" />
        </div>
    );
}

function Tablero() {
    const [modo, setModo] = useState<'compras' | 'ventas'>('compras');
    return (
        <div className="flex flex-col gap-4">
            <Segmented
                value={modo}
                onChange={setModo}
                options={[
                    { value: 'compras', label: 'Compras' },
                    { value: 'ventas', label: 'Ventas' },
                ]}
            />
            <div className="grid gap-3 sm:grid-cols-3">
                <Kpi label={modo === 'compras' ? 'Compras del mes' : 'Ventas del mes'} value="S/ 722,261.20" tag={{ text: 'Al día', tone: 'ok' }}>
                    <KpiNote>98 comprobantes</KpiNote>
                </Kpi>
                <Kpi label="Por pagar" value="S/ 318,400.00">
                    <KpiNote>12 facturas vencidas</KpiNote>
                </Kpi>
                <Kpi label="Sin OC" value="27" unit="facturas" risk tag={{ text: 'Riesgo', tone: 'danger' }}>
                    <KpiNote>S/ 48,210.00</KpiNote>
                </Kpi>
            </div>
            <Card title="Por proveedor" note="noviembre 2026">
                <BarRow label="Papeles del Pacífico" figures="S/ 412 mil" pct={100} color="primary" />
                <BarRow label="Tintas Lima Norte" figures="S/ 288 mil" pct={70} color="teal" />
                <BarRow label="Transportes Rímac" figures="S/ 96 mil" pct={23} color="teal" />
            </Card>
        </div>
    );
}

function Formulario() {
    const [ruc, setRuc] = useState('2051234567');
    const [razon, setRazon] = useState('');
    const errRuc = ruc.length !== 11 ? `El RUC tiene 11 dígitos; este tiene ${ruc.length}.` : undefined;
    const errRazon = razon.trim().length < 3 ? 'Escribe la razón social completa.' : undefined;
    const faltan = [errRuc, errRazon].filter(Boolean).length;
    return (
        <div className="flex max-w-md flex-col gap-4">
            {faltan > 0 && <Notice tone="danger" cerrable={false}>Revisa {faltan} {faltan === 1 ? 'campo marcado' : 'campos marcados'}.</Notice>}
            <Field label="RUC" hint="11 dígitos." error={errRuc}>
                {(p) => <Input {...p} inputMode="numeric" maxLength={11} value={ruc} onChange={(e) => setRuc(e.target.value.replace(/\D/g, ''))} />}
            </Field>
            <Field label="Razón social" error={errRazon}>
                {(p) => <Input {...p} value={razon} onChange={(e) => setRazon(e.target.value)} />}
            </Field>
            <div className="flex gap-2.5">
                <Button disabled={faltan > 0}>Guardar</Button>
                <Button variant="ghost">Cancelar</Button>
            </div>
        </div>
    );
}

function Estados() {
    return (
        <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2.5 rounded-card border border-line p-4">
                <b className="w-14 text-ui font-semibold">Vacío</b>
                <p className="min-w-0 flex-1 text-ui text-ink-2">No hay comprobantes en noviembre 2026.</p>
                <Button variant="secondary">Cambiar el período</Button>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2.5 rounded-card border border-line p-4">
                <b className="w-14 text-ui font-semibold">Carga</b>
                <div className="flex min-w-0 flex-1 flex-col gap-2.5">
                    <Hueco className="h-6 w-32" />
                    <Hueco className="h-3.5 w-full" />
                    <Hueco className="h-3.5 w-2/3" />
                </div>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2.5 rounded-card border border-line p-4">
                <b className="w-14 text-ui font-semibold">Error</b>
                <p className="min-w-0 flex-1 text-ui text-ink-2">No se pudo cargar: SUNAT no respondió. Tus datos están a salvo.</p>
                <Button>Reintentar</Button>
            </div>
        </div>
    );
}

export function Patrones() {
    return (
        <EscenaConPaneles
            id="patrones"
            rotulo="06 · Patrones"
            titulo="Las pantallas que se repiten"
            texto="Las mismas piezas, siempre en el mismo orden: quien aprende una pantalla ya sabe las demás."
            grupos={GRUPOS}
            paneles={[Listado, Tablero, Formulario, Estados]}
            recorrido="+=360%"
        />
    );
}
