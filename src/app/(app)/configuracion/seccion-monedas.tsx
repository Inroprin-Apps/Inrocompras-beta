'use client';

// Monedas (tasa a soles: administrador o Finanzas) y tipo de cambio de costeo (lo registra el administrador o
// Importaciones; queda quién y desde cuándo vale). La base exige que la tasa y el TC sean mayores que cero (0022).
import { useMemo, useState } from 'react';
import { Pencil, Plus } from 'lucide-react';
import { configuracion } from '@/modules/configuracion/composition.ts';
import { leerTasa, tcVigentes, type Moneda } from '@/modules/configuracion/application/views.ts';
import { T } from '@/shared/ui/bits.tsx';
import { Button } from '@/shared/ui/button.tsx';
import { Card } from '@/shared/ui/card.tsx';
import { Dialog } from '@/shared/ui/dialog.tsx';
import { Field, Input } from '@/shared/ui/field.tsx';
import { dayTime, dmy } from '@/shared/ui/format.ts';
import { Lista, ListaVacia } from '@/shared/ui/lista-estado.tsx';
import { SelectMenu } from '@/shared/ui/select-menu.tsx';
import { toast } from '@/shared/ui/toaster.tsx';
import { refrescar } from '../_lib/resource.ts';
import { personasStore } from '../_lib/stores.ts';
import { configuracionStore } from './store.ts';

const tasaFmt = (n: number) => new Intl.NumberFormat('es-PE', { minimumFractionDigits: 3, maximumFractionDigits: 6 }).format(n);
/** Hoy en Lima, AAAA-MM-DD. */
const hoyLima = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(new Date());

export function SeccionMonedas({ tasas, tc }: { tasas: boolean; tc: boolean }) {
    const estado = configuracionStore.use();
    const gente = personasStore.use().data;
    const [moneda, setMoneda] = useState<Moneda | null>(null);
    const [nuevoTc, setNuevoTc] = useState(false);
    const vigentes = useMemo(() => tcVigentes(estado.data?.tcCosteo ?? [], hoyLima()), [estado.data]);
    const nombre = (u: string | null) => (u ? (gente?.find((g) => g.id === u)?.nombre ?? 'Otra persona') : '—');

    return (
        <div className="flex flex-col gap-5">
            <Card title="Tasas a soles" note="Las usa la orden para calcular su monto en soles (y con eso, su ruta de aprobación).">
                <Lista
                    estado={{ data: estado.data?.monedas ?? null, error: estado.error }}
                    onReintentar={() => void configuracionStore.retry()}
                    vacia={<ListaVacia titulo="Sin monedas" />}
                >
                    {(ms) => (
                        <div className="overflow-x-auto">
                            <table className={T.table}>
                                <thead>
                                    <tr className={T.headRow}>
                                        <th className={T.th}>Moneda</th>
                                        <th className={T.thNum}>Tasa a soles</th>
                                        <th className={T.th}>Actualizada</th>
                                        {tasas && (
                                            <th className={T.th}>
                                                <span className="sr-only">Editar</span>
                                            </th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody>
                                    {ms.map((m) => (
                                        <tr key={m.id} className={T.row}>
                                            <td className={T.td}>
                                                <div className="font-medium">{m.id}</div>
                                                <div className={T.sub}>{m.nombre}</div>
                                            </td>
                                            <td className={`${T.tdNum} text-right`}>{m.id === 'PEN' ? '1' : tasaFmt(m.tasa)}</td>
                                            <td className={T.td}>{dayTime(m.actualizado)}</td>
                                            {tasas && (
                                                <td className={`${T.td} w-12`}>
                                                    {m.id !== 'PEN' && (
                                                        <Button variant="ghost" iconOnly aria-label={`Editar la tasa de ${m.id}`} onClick={() => setMoneda(m)}>
                                                            <Pencil size={15} />
                                                        </Button>
                                                    )}
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Lista>
            </Card>

            <Card
                title="Tipo de cambio de costeo"
                note={
                    vigentes.size
                        ? `Vigente hoy: ${[...vigentes.values()].map((t) => `${t.moneda} ${tasaFmt(t.tc)}`).join(' · ')}`
                        : 'Lo usa el costeo de importaciones. Aún no hay ninguno vigente.'
                }
            >
                {tc && (
                    <div className="mb-3">
                        <Button variant="dashed" onClick={() => setNuevoTc(true)}>
                            <Plus size={15} /> Registrar TC
                        </Button>
                    </div>
                )}
                <Lista
                    estado={{ data: estado.data?.tcCosteo ?? null, error: estado.error }}
                    onReintentar={() => void configuracionStore.retry()}
                    vacia={
                        <ListaVacia titulo="Sin tipos de cambio de costeo">Regístralo con «Registrar TC»: queda quién lo puso y desde cuándo vale.</ListaVacia>
                    }
                >
                    {(ts) => (
                        <div className="overflow-x-auto">
                            <table className={T.table}>
                                <thead>
                                    <tr className={T.headRow}>
                                        <th className={T.th}>Vigente desde</th>
                                        <th className={T.th}>Moneda</th>
                                        <th className={T.thNum}>TC</th>
                                        <th className={T.th}>Registró</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {ts.map((t) => (
                                        <tr key={t.id} className={T.row}>
                                            <td className={T.td}>{dmy(t.vigenteDesde)}</td>
                                            <td className={T.td}>{t.moneda}</td>
                                            <td className={`${T.tdNum} text-right`}>{tasaFmt(t.tc)}</td>
                                            <td className={T.td}>
                                                {nombre(t.registradoPor)}
                                                {t.comentario && <div className={T.sub}>{t.comentario}</div>}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Lista>
            </Card>
            {moneda && <FormTasa moneda={moneda} onCerrar={() => setMoneda(null)} />}
            {nuevoTc && <FormTc monedas={(estado.data?.monedas ?? []).filter((m) => m.id !== 'PEN')} onCerrar={() => setNuevoTc(false)} />}
        </div>
    );
}

function FormTasa({ moneda, onCerrar }: { moneda: Moneda; onCerrar: () => void }) {
    const [texto, setTexto] = useState(String(moneda.tasa));
    const [error, setError] = useState<string | null>(null);
    const [guardando, setGuardando] = useState(false);
    async function guardar() {
        const tasa = leerTasa(texto);
        if (tasa === null) return setError('Escribe una tasa mayor que cero, por ejemplo 3.75.');
        setGuardando(true);
        const r = await configuracion().guardarTasa(moneda.id, tasa);
        setGuardando(false);
        if (r.isErr()) return setError(r.error.message);
        toast.success(`Tasa de ${moneda.id} actualizada.`);
        refrescar(['monedas']);
        onCerrar();
    }
    return (
        <Dialog
            abierto
            onCerrar={onCerrar}
            titulo={`Tasa de ${moneda.nombre}`}
            descripcion="Cuántos soles vale una unidad. Las órdenes nuevas la usan desde ahora."
            pie={
                <>
                    <Button variant="secondary" onClick={onCerrar}>
                        Volver
                    </Button>
                    <Button onClick={() => void guardar()} disabled={guardando}>
                        {guardando ? 'Guardando…' : 'Guardar tasa'}
                    </Button>
                </>
            }
        >
            <Field label={`1 ${moneda.id} en soles`} error={error}>
                {(p) => <Input {...p} inputMode="decimal" value={texto} onChange={(e) => (setTexto(e.target.value), setError(null))} />}
            </Field>
        </Dialog>
    );
}

function FormTc({ monedas, onCerrar }: { monedas: Moneda[]; onCerrar: () => void }) {
    const [moneda, setMoneda] = useState(monedas[0]?.id ?? 'USD');
    const [texto, setTexto] = useState('');
    const [desde, setDesde] = useState(hoyLima());
    const [comentario, setComentario] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [guardando, setGuardando] = useState(false);
    async function guardar() {
        const tc = leerTasa(texto);
        if (tc === null) return setError('Escribe un tipo de cambio mayor que cero, por ejemplo 3.77.');
        if (!/^\d{4}-\d{2}-\d{2}$/.test(desde)) return setError('Elige desde qué fecha vale.');
        setGuardando(true);
        const r = await configuracion().agregarTc({ moneda, tc, vigenteDesde: desde, comentario });
        setGuardando(false);
        if (r.isErr()) return setError(r.error.message);
        toast.success('Tipo de cambio de costeo registrado.');
        refrescar(['tc_costeo']);
        onCerrar();
    }
    return (
        <Dialog
            abierto
            onCerrar={onCerrar}
            titulo="Registrar TC de costeo"
            pie={
                <>
                    <Button variant="secondary" onClick={onCerrar}>
                        Volver
                    </Button>
                    <Button onClick={() => void guardar()} disabled={guardando}>
                        {guardando ? 'Guardando…' : 'Registrar'}
                    </Button>
                </>
            }
        >
            <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Moneda">
                    {(p) => (
                        <SelectMenu
                            {...p}
                            value={moneda}
                            onChange={setMoneda}
                            options={monedas.map((m) => ({ value: m.id, label: `${m.id} · ${m.nombre}` }))}
                        />
                    )}
                </Field>
                <Field label="TC (en soles)">
                    {(p) => <Input {...p} inputMode="decimal" value={texto} onChange={(e) => (setTexto(e.target.value), setError(null))} />}
                </Field>
            </div>
            <Field label="Vale desde">{(p) => <Input {...p} type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />}</Field>
            <Field label="Comentario" optional hint="Por ejemplo: cierre de mes, TC SBS del día.">
                {(p) => <Input {...p} value={comentario} onChange={(e) => setComentario(e.target.value)} />}
            </Field>
            {error && (
                <p role="alert" className="text-small font-medium text-danger-strong">
                    {error}
                </p>
            )}
        </Dialog>
    );
}
