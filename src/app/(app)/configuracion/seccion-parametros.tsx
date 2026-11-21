'use client';

// Los parámetros de la tabla config, con su descripción y un campo del tipo correcto (sí/no, número, porcentaje,
// lista de correos, área, JSON). Escribe el administrador (RLS «admin» de config en 0002).
import { useMemo, useState } from 'react';
import { Pencil } from 'lucide-react';
import { configuracion } from '@/modules/configuracion/composition.ts';
import { aTexto, aValor, mostrar, parametros, type Parametro } from '@/modules/configuracion/application/views.ts';
import { AREAS } from '@/shared/tipos.ts';
import { Button } from '@/shared/ui/button.tsx';
import { Segmented } from '@/shared/ui/card.tsx';
import { Dialog } from '@/shared/ui/dialog.tsx';
import { Field, Input, Textarea } from '@/shared/ui/field.tsx';
import { Lista, ListaVacia } from '@/shared/ui/lista-estado.tsx';
import { SelectMenu } from '@/shared/ui/select-menu.tsx';
import { toast } from '@/shared/ui/toaster.tsx';
import { refrescar } from '../_lib/resource.ts';
import { configuracionStore } from './store.ts';

export function SeccionParametros() {
    const estado = configuracionStore.use();
    const lista = useMemo(() => (estado.data ? parametros(estado.data.config) : null), [estado.data]);
    const [editando, setEditando] = useState<Parametro | null>(null);
    return (
        <>
            <Lista
                estado={{ data: lista, error: estado.error }}
                onReintentar={() => void configuracionStore.retry()}
                vacia={<ListaVacia titulo="Sin parámetros" />}
            >
                {(ps) => (
                    <ul className="flex flex-col divide-y divide-divider rounded-card border border-line bg-surface">
                        {ps.map((p) => (
                            <li key={p.clave} className="flex items-start gap-3 px-4 py-3.5">
                                <div className="min-w-0 flex-1">
                                    <div className="text-ui font-medium">{p.etiqueta}</div>
                                    <div className="text-small text-ink-2">{p.descripcion}</div>
                                    <div className={`mt-1 text-ui break-words ${p.valor === null ? 'text-ink-3' : ''}`}>{mostrar(p)}</div>
                                </div>
                                <Button variant="ghost" iconOnly aria-label={`Editar ${p.etiqueta}`} onClick={() => setEditando(p)}>
                                    <Pencil size={15} />
                                </Button>
                            </li>
                        ))}
                    </ul>
                )}
            </Lista>
            {editando && <FormParametro p={editando} onCerrar={() => setEditando(null)} />}
        </>
    );
}

function FormParametro({ p, onCerrar }: { p: Parametro; onCerrar: () => void }) {
    const [texto, setTexto] = useState(() => aTexto(p) || (p.tipo === 'booleano' ? 'false' : ''));
    const [error, setError] = useState<string | null>(null);
    const [guardando, setGuardando] = useState(false);

    async function guardar() {
        const v = aValor(p, texto);
        if ('error' in v) return setError(v.error);
        setGuardando(true);
        const r = await configuracion().guardarParametro(p.clave, v.valor, p.nota || p.descripcion);
        setGuardando(false);
        if (r.isErr()) return setError(r.error.message);
        toast.success(`${p.etiqueta}: guardado.`);
        refrescar(['config']);
        onCerrar();
    }

    return (
        <Dialog
            abierto
            onCerrar={onCerrar}
            titulo={p.etiqueta}
            descripcion={p.descripcion}
            pie={
                <>
                    <Button variant="secondary" onClick={onCerrar}>
                        Volver
                    </Button>
                    <Button onClick={() => void guardar()} disabled={guardando}>
                        {guardando ? 'Guardando…' : 'Guardar'}
                    </Button>
                </>
            }
        >
            {p.tipo === 'booleano' ? (
                <Segmented
                    value={texto}
                    onChange={(v) => (setTexto(v), setError(null))}
                    options={[
                        { value: 'true', label: 'Sí' },
                        { value: 'false', label: 'No' },
                    ]}
                />
            ) : (
                <Field
                    label="Valor"
                    error={error}
                    hint={p.tipo === 'porcentaje' ? 'En porcentaje: 3 = 3 %.' : p.unidad ? `En ${p.unidad}.` : `Clave: ${p.clave}`}
                >
                    {(f) =>
                        p.tipo === 'area' ? (
                            <SelectMenu
                                {...f}
                                value={texto}
                                onChange={(v) => (setTexto(v), setError(null))}
                                options={AREAS.filter((a) => a !== 'Sin área').map((a) => ({ value: a, label: a }))}
                            />
                        ) : p.tipo === 'json' || p.tipo === 'correos' ? (
                            <Textarea
                                {...f}
                                rows={p.tipo === 'json' ? 6 : 4}
                                className="font-mono"
                                value={texto}
                                onChange={(e) => (setTexto(e.target.value), setError(null))}
                            />
                        ) : (
                            <Input
                                {...f}
                                value={texto}
                                inputMode={p.tipo === 'texto' ? 'text' : 'decimal'}
                                onChange={(e) => (setTexto(e.target.value), setError(null))}
                            />
                        )
                    }
                </Field>
            )}
            {p.tipo === 'booleano' && error && (
                <p role="alert" className="text-small font-medium text-danger-strong">
                    {error}
                </p>
            )}
        </Dialog>
    );
}
