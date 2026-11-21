'use client';

// El estado de la cola de trabajos (Drive, PDF, correo, lectura, InroPay): cuántos hay por estado, y cada trabajo con
// su mensaje. Uno en Error se reintenta (vuelve a Pendiente desde cero) o se descarta con motivo. Funciones
// solo-admin de 0021 (cola_resumen, cola_listar, ac_cola_reintentar, ac_cola_descartar).
import { useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { cola } from '@/modules/configuracion/composition.ts';
import {
    ESTADOS_COLA,
    etiquetaTipo,
    puedeDescartar,
    puedeReintentar,
    tonoCola,
    totalesCola,
    type EstadoCola,
    type TrabajoCola,
} from '@/modules/configuracion/application/views.ts';
import { rutaDe } from '@/modules/comun/application/views.ts';
import { FilterRow, T } from '@/shared/ui/bits.tsx';
import { Button } from '@/shared/ui/button.tsx';
import { Chip, Kpi } from '@/shared/ui/card.tsx';
import { Dialog } from '@/shared/ui/dialog.tsx';
import { Field, Textarea } from '@/shared/ui/field.tsx';
import { dayTime } from '@/shared/ui/format.ts';
import { Lista, ListaVacia } from '@/shared/ui/lista-estado.tsx';
import { Pager, usePaged } from '@/shared/ui/pager.tsx';
import { SelectMenu } from '@/shared/ui/select-menu.tsx';
import { toast } from '@/shared/ui/toaster.tsx';
import { refrescar } from '../_lib/resource.ts';
import { colaResumenStore, colaStore } from './store.ts';

export function SeccionCola() {
    const resumen = colaResumenStore.use();
    const estado = colaStore.use();
    const [filtro, setFiltro] = useState<'' | EstadoCola>('');
    const [descartando, setDescartando] = useState<TrabajoCola | null>(null);
    const [ocupado, setOcupado] = useState<number | null>(null);
    const t = resumen.data ? totalesCola(resumen.data) : null;
    const lista = useMemo(() => (estado.data ? estado.data.filter((x) => !filtro || x.estado === filtro) : null), [estado.data, filtro]);
    const pag = usePaged(lista ?? [], filtro, 25);

    async function reintentar(x: TrabajoCola) {
        setOcupado(x.id);
        const r = await cola().reintentar(x.id);
        setOcupado(null);
        if (r.isErr()) return toast.error(r.error.message);
        toast.success(`Trabajo ${x.id} vuelve a la cola. Se procesa en la próxima corrida.`);
        refrescar(['cola']);
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <Kpi label="Pendientes" value={t ? t.Pendiente + t['En curso'] : null}>
                    <span className="text-small text-ink-2">{t?.['En curso'] ? `${t['En curso']} en curso` : 'Esperan la próxima corrida'}</span>
                </Kpi>
                <Kpi label="Con error" value={t ? t.Error : null} risk={Boolean(t?.Error)}>
                    <span className="text-small text-ink-2">Revisa el mensaje y reintenta</span>
                </Kpi>
                <Kpi label="Hechos (7 días)" value={t ? t.Hecho : null} />
                <Kpi label="Descartados" value={t ? t.Descartado : null}>
                    <span className="text-small text-ink-2">A propósito o sin configurar</span>
                </Kpi>
            </div>
            <FilterRow>
                <SelectMenu
                    label="Estado"
                    className="w-52"
                    value={filtro}
                    onChange={(e) => setFiltro(e as typeof filtro)}
                    options={[{ value: '', label: 'Todos los estados' }, ...ESTADOS_COLA.map((e) => ({ value: e, label: e }))]}
                />
                <Button variant="secondary" onClick={() => refrescar(['cola'])}>
                    <RefreshCw size={15} /> Actualizar
                </Button>
            </FilterRow>
            <Lista
                estado={{ data: lista, error: estado.error ?? resumen.error }}
                onReintentar={() => (void colaStore.retry(), void colaResumenStore.retry())}
                vacia={
                    <ListaVacia titulo={filtro ? `Ningún trabajo en «${filtro}»` : 'La cola está vacía'}>
                        Los trabajos aparecen aquí cuando una acción encola un correo, un PDF o un archivo para Drive.
                    </ListaVacia>
                }
            >
                {() => (
                    <>
                        <div className="overflow-x-auto">
                            <table className={T.table}>
                                <thead>
                                    <tr className={T.headRow}>
                                        <th className={T.th}>Trabajo</th>
                                        <th className={T.th}>Estado</th>
                                        <th className={T.th}>Mensaje</th>
                                        <th className={T.th}>
                                            <span className="sr-only">Acciones</span>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pag.rows.map((x) => (
                                        <tr key={x.id} className={T.row}>
                                            <td className={T.td}>
                                                <div className="font-medium">{etiquetaTipo(x.tipo)}</div>
                                                <div className={T.sub}>
                                                    N° {x.id} · {dayTime(x.creado)}
                                                    {x.refTabla && x.refId && rutaDe(x.refTabla, x.refId) !== '/' && (
                                                        <>
                                                            {' · '}
                                                            <a className="text-primary hover:underline" href={rutaDe(x.refTabla, x.refId)}>
                                                                Ver registro
                                                            </a>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                            <td className={T.td}>
                                                <Chip tone={tonoCola(x.estado)}>{x.estado}</Chip>
                                                <div className={T.sub}>
                                                    {x.intentos} {x.intentos === 1 ? 'intento' : 'intentos'}
                                                    {x.estado === 'Pendiente' && x.intentos > 0 ? ` · otra vez ${dayTime(x.procesarDesde)}` : ''}
                                                </div>
                                            </td>
                                            <td className={`${T.td} max-w-md text-small break-words text-ink-2`}>{x.error ?? '—'}</td>
                                            <td className={`${T.td} whitespace-nowrap`}>
                                                <div className="flex gap-1.5">
                                                    {puedeReintentar(x) && (
                                                        <Button variant="secondary" disabled={ocupado === x.id} onClick={() => void reintentar(x)}>
                                                            Reintentar
                                                        </Button>
                                                    )}
                                                    {puedeDescartar(x) && (
                                                        <Button variant="ghost" className="text-danger-strong" onClick={() => setDescartando(x)}>
                                                            Descartar
                                                        </Button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <Pager paged={pag} />
                    </>
                )}
            </Lista>
            {descartando && <FormDescartar t={descartando} onCerrar={() => setDescartando(null)} />}
        </div>
    );
}

function FormDescartar({ t, onCerrar }: { t: TrabajoCola; onCerrar: () => void }) {
    const [motivo, setMotivo] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [guardando, setGuardando] = useState(false);
    async function descartar() {
        if (!motivo.trim()) return setError('Escribe por qué lo descartas.');
        setGuardando(true);
        const r = await cola().descartar(t.id, motivo);
        setGuardando(false);
        if (r.isErr()) return setError(r.error.message);
        toast.success(`Trabajo ${t.id} descartado.`);
        refrescar(['cola']);
        onCerrar();
    }
    return (
        <Dialog
            abierto
            onCerrar={onCerrar}
            titulo={`Descartar: ${etiquetaTipo(t.tipo)}`}
            descripcion="El trabajo no se volverá a intentar. Queda en la lista con tu motivo."
            pie={
                <>
                    <Button variant="secondary" onClick={onCerrar}>
                        Cancelar
                    </Button>
                    <Button variant="danger" onClick={() => void descartar()} disabled={guardando}>
                        {guardando ? 'Un momento…' : 'Descartar'}
                    </Button>
                </>
            }
        >
            <Field label="Motivo" error={error}>
                {(p) => <Textarea {...p} rows={3} value={motivo} onChange={(e) => (setMotivo(e.target.value), setError(null))} />}
            </Field>
        </Dialog>
    );
}
