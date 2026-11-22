'use client';

// Empresas del grupo que compran (la pantalla «Empresas» del AppSheet): su código numera las OC y su razón social, RUC y
// dirección van en la cabecera del PDF que recibe el proveedor. No se borran (las órdenes las referencian): se
// desactivan. Solo el administrador (RLS de 0002). Una empresa sin RUC no puede emitir órdenes (0071).
import { useState } from 'react';
import { Pencil, Plus } from 'lucide-react';
import { configuracion } from '@/modules/configuracion/composition.ts';
import { avisoEmpresa, faltaEnEmpresa, type Empresa } from '@/modules/configuracion/application/views.ts';
import { rucValido } from '@/modules/proveedores/application/views.ts';
import { T } from '@/shared/ui/bits.tsx';
import { Button } from '@/shared/ui/button.tsx';
import { Chip } from '@/shared/ui/card.tsx';
import { Dialog, useCerrarConCambios } from '@/shared/ui/dialog.tsx';
import { Checkbox, Field, Input } from '@/shared/ui/field.tsx';
import { Lista, ListaVacia } from '@/shared/ui/lista-estado.tsx';
import { toast } from '@/shared/ui/toaster.tsx';
import { refrescar } from '../_lib/resource.ts';
import { configuracionStore } from './store.ts';

const VACIA: Empresa = { id: '', razonSocial: '', ruc: null, direccion: null, activo: true };

export function SeccionEmpresas() {
    const estado = configuracionStore.use();
    const [editando, setEditando] = useState<{ e: Empresa; nueva: boolean } | null>(null);
    const empresas = estado.data?.empresas ?? null;
    return (
        <>
            <div className="mb-3">
                <Button variant="dashed" onClick={() => setEditando({ e: VACIA, nueva: true })}>
                    <Plus size={15} aria-hidden /> Agregar empresa
                </Button>
            </div>
            <Lista
                estado={{ data: empresas, error: estado.error }}
                onReintentar={() => void configuracionStore.retry()}
                vacia={<ListaVacia titulo="Aún no hay empresas">Agrega la primera con «Agregar empresa».</ListaVacia>}
            >
                {(es) => (
                    <div className="overflow-x-auto rounded-card border border-line bg-surface">
                        <table className={T.table}>
                            <thead>
                                <tr className={T.headRow}>
                                    <th className={T.th}>Empresa</th>
                                    <th className={T.th}>RUC</th>
                                    <th className={T.th}>Dirección</th>
                                    <th className={T.th}>Estado</th>
                                    <th className={`${T.th} w-px`}>
                                        <span className="sr-only">Editar</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {es.map((e) => {
                                    const aviso = avisoEmpresa(e);
                                    return (
                                        <tr key={e.id} className={T.row}>
                                            <td className={T.td}>
                                                <div className={e.activo ? 'font-medium' : 'text-ink-3'}>{e.razonSocial}</div>
                                                <div className="text-small whitespace-nowrap text-ink-3">{e.id}</div>
                                            </td>
                                            <td className={`${T.td} whitespace-nowrap tabular-nums`}>{e.ruc ?? <span className="text-ink-3">—</span>}</td>
                                            <td className={T.td}>{e.direccion ?? <span className="text-ink-3">—</span>}</td>
                                            <td className={`${T.td} whitespace-nowrap`}>
                                                {!e.activo ? (
                                                    <Chip tone="muted">Inactiva</Chip>
                                                ) : aviso ? (
                                                    <Chip tone={e.ruc ? 'warn' : 'danger'} title={aviso}>
                                                        {e.ruc ? 'Falta dirección' : 'Falta RUC'}
                                                    </Chip>
                                                ) : (
                                                    <Chip tone="ok">Completa</Chip>
                                                )}
                                            </td>
                                            <td className={T.td}>
                                                <Button
                                                    variant="ghost"
                                                    iconOnly
                                                    aria-label={`Editar ${e.razonSocial}`}
                                                    onClick={() => setEditando({ e, nueva: false })}
                                                >
                                                    <Pencil size={15} />
                                                </Button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </Lista>
            {editando && (
                <FormEmpresa inicial={editando.e} nueva={editando.nueva} existentes={(empresas ?? []).map((e) => e.id)} onCerrar={() => setEditando(null)} />
            )}
        </>
    );
}

function FormEmpresa({ inicial, nueva, existentes, onCerrar }: { inicial: Empresa; nueva: boolean; existentes: string[]; onCerrar: () => void }) {
    const [e, setE] = useState<Empresa>(inicial);
    const [error, setError] = useState<string | null>(null);
    const [guardando, setGuardando] = useState(false);
    const sucio = JSON.stringify(e) !== JSON.stringify(inicial);
    const { cerrar, aviso } = useCerrarConCambios(sucio, onCerrar);
    const poner = (cambio: Partial<Empresa>) => {
        setE((x) => ({ ...x, ...cambio }));
        setError(null);
    };

    async function guardar() {
        const limpia: Empresa = { ...e, id: e.id.trim().toUpperCase(), ruc: e.ruc?.replace(/\D/g, '') || null, direccion: e.direccion?.trim() || null };
        const f = faltaEnEmpresa(limpia, existentes, nueva, rucValido);
        if (f) return setError(f);
        setGuardando(true);
        const r = await configuracion().guardarEmpresa(limpia, nueva);
        setGuardando(false);
        if (r.isErr()) return setError(r.error.message);
        toast.success(`Empresa ${limpia.razonSocial.trim()} ${nueva ? 'agregada' : 'guardada'}.`);
        refrescar(['empresas']);
        onCerrar();
    }

    return (
        <Dialog
            abierto
            amplio
            onCerrar={cerrar}
            onEnviar={() => void guardar()}
            aviso={aviso}
            titulo={nueva ? 'Nueva empresa' : `Editar ${inicial.razonSocial}`}
            descripcion="La razón social, el RUC y la dirección van en la cabecera de la orden que recibe el proveedor."
            pie={
                <>
                    <Button variant="secondary" onClick={cerrar} disabled={guardando}>
                        Cancelar
                    </Button>
                    <Button type="submit" disabled={guardando}>
                        {guardando ? 'Guardando…' : nueva ? 'Agregar empresa' : 'Guardar empresa'}
                    </Button>
                </>
            }
        >
            <div className="grid gap-4 sm:grid-cols-2">
                {nueva ? (
                    <Field label="Código" hint="Identifica a la empresa en la app y en sus órdenes. No se cambia después.">
                        {(p) => <Input {...p} value={e.id} onChange={(x) => poner({ id: x.target.value.toUpperCase() })} placeholder="INROPRIN" />}
                    </Field>
                ) : (
                    <Field label="Código" hint="No se cambia: ya numera órdenes.">
                        {(p) => <Input {...p} value={e.id} disabled />}
                    </Field>
                )}
                <Field label="RUC" optional hint="11 dígitos. Sin RUC, la empresa no puede emitir órdenes.">
                    {(p) => <Input {...p} inputMode="numeric" maxLength={11} value={e.ruc ?? ''} onChange={(x) => poner({ ruc: x.target.value })} />}
                </Field>
            </div>
            <Field label="Razón social" hint="Como figura en SUNAT.">
                {(p) => <Input {...p} value={e.razonSocial} onChange={(x) => poner({ razonSocial: x.target.value })} />}
            </Field>
            <Field label="Dirección fiscal" optional>
                {(p) => <Input {...p} value={e.direccion ?? ''} onChange={(x) => poner({ direccion: x.target.value })} />}
            </Field>
            <Checkbox
                label="Activa"
                hint="Una empresa inactiva no aparece al crear proyectos ni órdenes."
                checked={e.activo}
                onChange={(x) => poner({ activo: x.target.checked })}
            />
            {error && (
                <p role="alert" className="text-small font-medium text-danger-strong">
                    {error}
                </p>
            )}
        </Dialog>
    );
}
