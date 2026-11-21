'use client';

// Conceptos (de orden, de ítem y de gasto) y conceptos de gasto de importación (si entran al costo y cómo se reparten).
// No se borran (las órdenes los referencian): se desactivan. Conceptos: administrador. Gastos: administrador o
// Jefatura de Importaciones (RLS de 0002).
import { useState } from 'react';
import { Pencil, Plus } from 'lucide-react';
import { configuracion } from '@/modules/configuracion/composition.ts';
import { AMBITOS_CONCEPTO, etiquetaAmbito, faltaEnConcepto, type AmbitoConcepto, type ConceptoGasto } from '@/modules/configuracion/application/views.ts';
import { T } from '@/shared/ui/bits.tsx';
import { Button } from '@/shared/ui/button.tsx';
import { Chip, Segmented } from '@/shared/ui/card.tsx';
import { Dialog, useCerrarConCambios } from '@/shared/ui/dialog.tsx';
import { Checkbox, Field, Input } from '@/shared/ui/field.tsx';
import { Lista, ListaVacia } from '@/shared/ui/lista-estado.tsx';
import { toast } from '@/shared/ui/toaster.tsx';
import { refrescar } from '../_lib/resource.ts';
import { configuracionStore } from './store.ts';

export function SeccionConceptos() {
    const estado = configuracionStore.use();
    const [ambito, setAmbito] = useState<AmbitoConcepto>('OC');
    const [nuevo, setNuevo] = useState(false);
    const [ocupado, setOcupado] = useState<string | null>(null);
    const lista = estado.data ? estado.data.conceptos.filter((c) => c.ambito === ambito) : null;

    async function activar(id: string, activo: boolean) {
        setOcupado(id);
        const r = await configuracion().activarConcepto(id, activo);
        setOcupado(null);
        if (r.isErr()) return toast.error(r.error.message);
        toast.success(`Concepto «${id}» ${activo ? 'activado' : 'desactivado'}.`);
        refrescar(['conceptos']);
    }

    return (
        <>
            <div className="mb-3 flex flex-wrap items-center gap-3">
                <Segmented<AmbitoConcepto>
                    value={ambito}
                    onChange={setAmbito}
                    options={AMBITOS_CONCEPTO.map((a) => ({ value: a, label: etiquetaAmbito(a) }))}
                />
                <Button variant="dashed" onClick={() => setNuevo(true)}>
                    <Plus size={15} aria-hidden /> Agregar concepto
                </Button>
            </div>
            <Lista
                estado={{ data: lista, error: estado.error }}
                onReintentar={() => void configuracionStore.retry()}
                vacia={<ListaVacia titulo="Aún no hay conceptos de este tipo">Agrégalos con «Agregar concepto».</ListaVacia>}
            >
                {(cs) => (
                    <ul className="flex flex-col divide-y divide-divider rounded-card border border-line bg-surface">
                        {cs.map((c) => (
                            <li key={c.id} className="flex items-center gap-3 px-4 py-2.5">
                                <span className={`min-w-0 flex-1 text-ui ${c.activo ? '' : 'text-ink-3'}`}>{c.id}</span>
                                {!c.activo && <Chip tone="muted">Inactivo</Chip>}
                                <Button
                                    variant="ghost"
                                    aria-label={`${c.activo ? 'Desactivar' : 'Activar'} ${c.id}`}
                                    disabled={ocupado === c.id}
                                    onClick={() => void activar(c.id, !c.activo)}
                                >
                                    {c.activo ? 'Desactivar' : 'Activar'}
                                </Button>
                            </li>
                        ))}
                    </ul>
                )}
            </Lista>
            {nuevo && <FormConcepto ambito={ambito} existentes={(estado.data?.conceptos ?? []).map((c) => c.id)} onCerrar={() => setNuevo(false)} />}
        </>
    );
}

function FormConcepto({ ambito: inicial, existentes, onCerrar }: { ambito: AmbitoConcepto; existentes: string[]; onCerrar: () => void }) {
    const [nombre, setNombre] = useState('');
    const [ambito, setAmbito] = useState<AmbitoConcepto>(inicial);
    const [error, setError] = useState<string | null>(null);
    const [guardando, setGuardando] = useState(false);
    const { cerrar, aviso } = useCerrarConCambios(nombre.trim() !== '' || ambito !== inicial, onCerrar);
    async function guardar() {
        const f = faltaEnConcepto(nombre, existentes);
        if (f) return setError(f);
        setGuardando(true);
        const r = await configuracion().agregarConcepto(nombre, ambito);
        setGuardando(false);
        if (r.isErr()) return setError(r.error.message);
        toast.success(`Concepto «${nombre.trim()}» agregado.`);
        refrescar(['conceptos']);
        onCerrar();
    }
    return (
        <Dialog
            abierto
            onCerrar={cerrar}
            onEnviar={() => void guardar()}
            aviso={aviso}
            titulo="Nuevo concepto"
            pie={
                <>
                    <Button variant="secondary" onClick={cerrar} disabled={guardando}>
                        Cancelar
                    </Button>
                    <Button type="submit" disabled={guardando}>
                        {guardando ? 'Agregando…' : 'Agregar concepto'}
                    </Button>
                </>
            }
        >
            <div role="group" aria-label="Para" className="flex flex-col gap-1.5">
                <span className="text-ui font-medium">Para</span>
                <Segmented<AmbitoConcepto>
                    value={ambito}
                    onChange={setAmbito}
                    options={AMBITOS_CONCEPTO.map((a) => ({ value: a, label: etiquetaAmbito(a) }))}
                />
            </div>
            <Field label="Nombre" error={error}>
                {(p) => <Input {...p} value={nombre} onChange={(e) => (setNombre(e.target.value), setError(null))} />}
            </Field>
        </Dialog>
    );
}

export function SeccionGastos() {
    const estado = configuracionStore.use();
    const [editando, setEditando] = useState<{ g: ConceptoGasto; nuevo: boolean } | null>(null);
    const gastos = estado.data?.gastos ?? null;
    return (
        <>
            <div className="mb-3">
                <Button
                    variant="dashed"
                    onClick={() =>
                        setEditando({
                            g: { concepto: '', entraCosto: true, reparto: 'Valor', orden: (gastos?.at(-1)?.orden ?? 0) + 1, activo: true },
                            nuevo: true,
                        })
                    }
                >
                    <Plus size={15} aria-hidden /> Agregar concepto de gasto
                </Button>
            </div>
            <Lista
                estado={{ data: gastos, error: estado.error }}
                onReintentar={() => void configuracionStore.retry()}
                vacia={<ListaVacia titulo="Aún no hay conceptos de gasto">Agrégalos con «Agregar concepto de gasto».</ListaVacia>}
            >
                {(gs) => (
                    <div className="overflow-x-auto">
                        <table className={T.table}>
                            <thead>
                                <tr className={T.headRow}>
                                    <th className={`${T.thNum} text-right`}>Orden</th>
                                    <th className={T.th}>Concepto</th>
                                    <th className={T.th}>Entra al costo</th>
                                    <th className={T.th}>Reparto</th>
                                    <th className={T.th}>
                                        <span className="sr-only">Editar</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {gs.map((g) => (
                                    <tr key={g.concepto} className={T.row}>
                                        <td className={`${T.tdNum} text-right`}>{g.orden}</td>
                                        <td className={T.td}>
                                            <span className={g.activo ? '' : 'text-ink-3'}>{g.concepto}</span>
                                            {!g.activo && (
                                                <span className="ml-2">
                                                    <Chip tone="muted">Inactivo</Chip>
                                                </span>
                                            )}
                                        </td>
                                        <td className={T.td}>{g.entraCosto ? 'Sí' : 'No'}</td>
                                        <td className={T.td}>{g.reparto === 'Producto' ? 'Por producto' : 'Por valor'}</td>
                                        <td className={`${T.td} w-12`}>
                                            <Button
                                                variant="ghost"
                                                iconOnly
                                                aria-label={`Editar ${g.concepto}`}
                                                onClick={() => setEditando({ g, nuevo: false })}
                                            >
                                                <Pencil size={15} aria-hidden />
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Lista>
            {editando && <FormGasto {...editando} existentes={(gastos ?? []).map((g) => g.concepto)} onCerrar={() => setEditando(null)} />}
        </>
    );
}

function FormGasto({ g: inicial, nuevo, existentes, onCerrar }: { g: ConceptoGasto; nuevo: boolean; existentes: string[]; onCerrar: () => void }) {
    const [g, setG] = useState(inicial);
    const [orden, setOrden] = useState(String(inicial.orden));
    // El error de un campo va junto a ese campo; el de la base, en el aviso del diálogo.
    const [error, setError] = useState<{ campo: 'concepto' | 'orden' | null; texto: string } | null>(null);
    const [guardando, setGuardando] = useState(false);
    const { cerrar, aviso } = useCerrarConCambios(JSON.stringify(g) !== JSON.stringify(inicial) || orden !== String(inicial.orden), onCerrar);
    async function guardar() {
        const f = nuevo ? faltaEnConcepto(g.concepto, existentes) : null;
        if (f) return setError({ campo: 'concepto', texto: f });
        const n = Number(orden);
        if (!orden.trim() || !Number.isInteger(n) || n < 0)
            return setError({ campo: 'orden', texto: 'El orden tiene que ser un número entero, 0 o más. Por ejemplo: 3' });
        setGuardando(true);
        const r = await configuracion().guardarGasto({ ...g, orden: n }, nuevo);
        setGuardando(false);
        if (r.isErr()) return setError({ campo: null, texto: r.error.message });
        toast.success(`Concepto de gasto «${g.concepto.trim()}» guardado.`);
        refrescar(['conceptos_gasto_imp', 'conceptos']);
        onCerrar();
    }
    return (
        <Dialog
            abierto
            onCerrar={cerrar}
            onEnviar={() => void guardar()}
            aviso={aviso}
            titulo={nuevo ? 'Nuevo concepto de gasto' : g.concepto}
            pie={
                <>
                    <Button variant="secondary" onClick={cerrar} disabled={guardando}>
                        Cancelar
                    </Button>
                    <Button type="submit" disabled={guardando}>
                        {guardando ? 'Guardando…' : 'Guardar concepto'}
                    </Button>
                </>
            }
        >
            {nuevo && (
                <Field label="Concepto" error={error?.campo === 'concepto' ? error.texto : null}>
                    {(p) => <Input {...p} value={g.concepto} onChange={(e) => (setG({ ...g, concepto: e.target.value }), setError(null))} />}
                </Field>
            )}
            <div role="group" aria-label="Reparto en el costeo" className="flex flex-col gap-1.5">
                <span className="text-ui font-medium">Reparto en el costeo</span>
                <Segmented<ConceptoGasto['reparto']>
                    value={g.reparto}
                    onChange={(reparto) => setG({ ...g, reparto })}
                    options={[
                        { value: 'Valor', label: 'Por valor' },
                        { value: 'Producto', label: 'Por producto' },
                    ]}
                />
            </div>
            <Field label="Orden" hint="Posición en la lista de gastos." error={error?.campo === 'orden' ? error.texto : null}>
                {(p) => <Input {...p} inputMode="numeric" value={orden} onChange={(e) => (setOrden(e.target.value), setError(null))} />}
            </Field>
            <Checkbox
                label="Entra al costo"
                hint="La percepción y el IGV de importación no entran."
                checked={g.entraCosto}
                onChange={(e) => setG({ ...g, entraCosto: e.target.checked })}
            />
            <Checkbox label="Activo" checked={g.activo} onChange={(e) => setG({ ...g, activo: e.target.checked })} />
            {error && !error.campo && (
                <p role="alert" className="text-small font-medium text-danger-strong">
                    {error.texto}
                </p>
            )}
        </Dialog>
    );
}
