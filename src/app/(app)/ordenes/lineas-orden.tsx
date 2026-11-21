'use client';

// Las líneas de la orden. Si la base deja editar (public.oc_edicion), cada línea se corrige (cantidad, precio,
// descripción del proveedor) con un UPDATE directo y luego ac_oc_recalcular; «＋ Demasía» llama a ac_oc_demasia
// (lo que excede el saldo, con motivo: lo decide la GOP). Las demasías se ven marcadas con su estado. Quitar una
// línea o una demasía no pregunta: se oculta y el aviso ofrece «Deshacer».
import { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { ordenes } from '@/modules/ordenes/composition.ts';
import { cantidad as fmtCantidad, leerNumero, monto, nombreOrden, type Edicion, type Linea, type OrdenDetalle } from '@/modules/ordenes/application/views.ts';
import { Button } from '@/shared/ui/button.tsx';
import { Chip } from '@/shared/ui/card.tsx';
import { Dialog, useCerrarConCambios } from '@/shared/ui/dialog.tsx';
import { Field, Input, Textarea } from '@/shared/ui/field.tsx';
import { toast } from '@/shared/ui/toaster.tsx';
import type { useBorrarConDeshacer } from '../_lib/deshacer.ts';
import { refrescar } from '../_lib/resource.ts';

const TOCA = ['ordenes', 'oc_lineas', 'acciones'];
/** «Línea 3» (o «Línea», si aún no tiene número), para los avisos. */
const etiquetaLinea = (l: Linea) => (l.nLinea != null ? `Línea ${l.nLinea}` : 'Línea');

export function LineasOrden({
    o,
    edicion,
    deshacer,
}: {
    o: OrdenDetalle;
    edicion: Edicion | null;
    /** El de la ficha, para que su título «Líneas (N)» no cuente lo que se está quitando. */
    deshacer: ReturnType<typeof useBorrarConDeshacer>;
}) {
    const [editar, setEditar] = useState<Linea | null>(null);
    const [demasia, setDemasia] = useState<Linea | null>(null);
    const editable = edicion?.editar === null;
    // Quitar una línea o una demasía no pregunta: se oculta y el aviso ofrece «Deshacer» (guía, «Estado»).
    const { ocultos, borrar } = deshacer;
    const lineas = o.lineas.filter((l) => !ocultos.has(l.id));
    const base = lineas.filter((l) => !l.esDemasia).length;
    const quitar = (l: Linea) =>
        borrar(l.id, {
            aviso: l.esDemasia
                ? `Demasía de «${l.descripcion}» quitada de ${nombreOrden(o)}.`
                : `${etiquetaLinea(l)} quitada de ${nombreOrden(o)}. El saldo vuelve al plan.`,
            ejecutar: () => ordenes().quitarLinea(o.id, l.id),
            tocadas: [...TOCA, 'plan'],
        });

    return (
        <>
            <ul className="flex flex-col divide-y divide-divider">
                {lineas.map((l) => (
                    <li key={l.id} className={`flex flex-col gap-1.5 py-2.5 ${l.esDemasia ? 'border-l-2 border-l-warning pl-3' : ''}`}>
                        <div className="flex items-start gap-2">
                            <div className="min-w-0 flex-1">
                                <div className="text-ui font-medium">
                                    {l.nLinea != null && <span className="text-ink-3">{l.nLinea}. </span>}
                                    {l.descripcion}
                                </div>
                                {l.descripcionProv && <div className="text-small text-ink-2">Proveedor: {l.descripcionProv}</div>}
                                <div className="text-caption text-ink-3">
                                    {[
                                        l.codigoCliente && `Cód. ${l.codigoCliente}`,
                                        l.sku && `SKU ${l.sku}`,
                                        l.requerimiento,
                                        [l.marca, l.modelo].filter(Boolean).join(' '),
                                    ]
                                        .filter(Boolean)
                                        .join(' · ')}
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-ui font-medium tabular-nums">{monto(l.subtotal, o.moneda)}</div>
                                <div className="text-small text-ink-2 tabular-nums">
                                    {fmtCantidad(l.cantidad)} {l.unidad} × {monto(l.precioUnit, o.moneda)}
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                            {l.esDemasia && (
                                <Chip
                                    tone={l.demasiaEstado === 'Aprobada' ? 'ok' : l.demasiaEstado === 'Rechazada' ? 'danger' : 'warn'}
                                    title={l.demasiaMotivo}
                                >
                                    Demasía {(l.demasiaEstado ?? '').toLowerCase()}
                                </Chip>
                            )}
                            {l.esDemasia && l.demasiaMotivo && <span className="text-small text-ink-2">Motivo: {l.demasiaMotivo}</span>}
                            {!l.esDemasia && l.validacionTecnica && l.validacionTecnica !== 'Validado' && l.validacionTecnica !== 'No aplica' && (
                                <Chip tone="warn">Validación técnica: {l.validacionTecnica.toLowerCase()}</Chip>
                            )}
                            <span className="flex-1" />
                            {editable && !l.esDemasia && (
                                <Button variant="ghost" onClick={() => setEditar(l)} aria-label={`Editar la línea ${l.nLinea ?? ''}`}>
                                    <Pencil size={14} aria-hidden /> Editar línea
                                </Button>
                            )}
                            {edicion?.demasia[l.id] === null && (
                                <Button variant="ghost" onClick={() => setDemasia(l)}>
                                    <Plus size={14} aria-hidden /> Agregar demasía
                                </Button>
                            )}
                            {editable && (l.esDemasia || base > 1) && (
                                <Button
                                    variant="ghost"
                                    iconOnly
                                    aria-label={l.esDemasia ? `Quitar la demasía de ${l.descripcion}` : `Quitar la línea ${l.nLinea ?? l.descripcion}`}
                                    onClick={() => quitar(l)}
                                >
                                    <Trash2 size={14} />
                                </Button>
                            )}
                        </div>
                    </li>
                ))}
            </ul>
            {editar && <FormLinea o={o} l={editar} onCerrar={() => setEditar(null)} />}
            {demasia && <FormDemasia o={o} l={demasia} onCerrar={() => setDemasia(null)} />}
        </>
    );
}

/** El pie de los diálogos: «Cancelar» y, a su derecha, el principal, que envía el formulario (Enter). */
function Pie({ onCerrar, ocupado, texto, textoOcupado = 'Guardando…' }: { onCerrar: () => void; ocupado: boolean; texto: string; textoOcupado?: string }) {
    return (
        <>
            <Button variant="secondary" onClick={onCerrar} disabled={ocupado}>
                Cancelar
            </Button>
            <Button type="submit" disabled={ocupado}>
                {ocupado ? textoOcupado : texto}
            </Button>
        </>
    );
}

function MensajeError({ e }: { e: string | null }) {
    return e ? (
        <p role="alert" className="text-small font-medium text-danger-strong">
            {e}
        </p>
    ) : null;
}

function FormLinea({ o, l, onCerrar }: { o: OrdenDetalle; l: Linea; onCerrar: () => void }) {
    const [cant, setCant] = useState(String(l.cantidad));
    const [precio, setPrecio] = useState(String(l.precioUnit));
    const [desc, setDesc] = useState(l.descripcionProv);
    const [error, setError] = useState<string | null>(null);
    const [errCampo, setErrCampo] = useState<{ cant?: string; precio?: string }>({});
    const [ocupado, setOcupado] = useState(false);
    const sucio = cant !== String(l.cantidad) || precio !== String(l.precioUnit) || desc !== l.descripcionProv;
    const { cerrar, aviso } = useCerrarConCambios(sucio, onCerrar);
    async function guardar() {
        const c = leerNumero(cant);
        const p = leerNumero(precio);
        const errores = {
            cant: c === null || c <= 0 ? 'La cantidad tiene que ser mayor que cero. Usa punto para los decimales: 12.5' : undefined,
            precio: p === null || p < 0 ? 'Escribe el precio unitario, 0 o más. Usa punto para los decimales: 1250.50' : undefined,
        };
        setErrCampo(errores);
        setError(null);
        if (errores.cant || errores.precio) return;
        setOcupado(true);
        const r = await ordenes().guardarLinea(o.id, l.id, { cantidad: c!, precioUnit: p!, descripcionProv: desc });
        setOcupado(false);
        if (r.isErr()) return setError(r.error.message);
        toast.success(`${etiquetaLinea(l)} de ${nombreOrden(o)} guardada. Montos recalculados.`);
        refrescar(TOCA);
        onCerrar();
    }
    return (
        <Dialog
            abierto
            onCerrar={cerrar}
            onEnviar={() => void guardar()}
            aviso={aviso}
            amplio
            titulo="Editar línea"
            descripcion={l.descripcion}
            pie={<Pie onCerrar={cerrar} ocupado={ocupado} texto="Guardar línea" />}
        >
            <div className="grid grid-cols-2 gap-4">
                <Field label={`Cantidad (${l.unidad})`} error={errCampo.cant} hint="Hasta el saldo; lo demás va como demasía.">
                    {(p) => <Input {...p} inputMode="decimal" value={cant} onChange={(e) => setCant(e.target.value)} />}
                </Field>
                <Field label={`Precio unitario (${o.moneda})`} error={errCampo.precio} hint="Sin IGV.">
                    {(p) => <Input {...p} inputMode="decimal" value={precio} onChange={(e) => setPrecio(e.target.value)} />}
                </Field>
            </div>
            <Field label="Descripción del proveedor" optional hint="Cómo lo llama el proveedor en su cotización.">
                {(p) => <Textarea {...p} rows={2} value={desc} onChange={(e) => setDesc(e.target.value)} />}
            </Field>
            <MensajeError e={error} />
        </Dialog>
    );
}

function FormDemasia({ o, l, onCerrar }: { o: OrdenDetalle; l: Linea; onCerrar: () => void }) {
    const [cant, setCant] = useState('');
    const [motivo, setMotivo] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [errCampo, setErrCampo] = useState<{ cant?: string; motivo?: string }>({});
    const [ocupado, setOcupado] = useState(false);
    const { cerrar, aviso } = useCerrarConCambios(Boolean(cant || motivo), onCerrar);
    async function guardar() {
        const c = leerNumero(cant);
        const errores = {
            cant: c === null || c <= 0 ? 'La cantidad adicional tiene que ser mayor que cero. Usa punto para los decimales: 12.5' : undefined,
            motivo: motivo.trim() ? undefined : 'Escribe el motivo: la GOP lo lee para decidir.',
        };
        setErrCampo(errores);
        setError(null);
        if (errores.cant || errores.motivo) return;
        setOcupado(true);
        const r = await ordenes().demasia(l.id, c!, motivo.trim());
        setOcupado(false);
        if (r.isErr()) return setError(r.error.message);
        toast.success(`Demasía agregada a ${nombreOrden(o)}. La decide la GOP al aprobar.`);
        refrescar(TOCA);
        onCerrar();
    }
    return (
        <Dialog
            abierto
            onCerrar={cerrar}
            onEnviar={() => void guardar()}
            aviso={aviso}
            titulo="Agregar demasía"
            descripcion={`${l.descripcion}: lo que pidas por encima del saldo, al mismo precio (${monto(l.precioUnit, o.moneda)}).`}
            pie={<Pie onCerrar={cerrar} ocupado={ocupado} texto="Agregar demasía" textoOcupado="Agregando…" />}
        >
            <Field label={`Cantidad adicional (${l.unidad})`} error={errCampo.cant}>
                {(p) => <Input {...p} inputMode="decimal" value={cant} onChange={(e) => setCant(e.target.value)} />}
            </Field>
            <Field label="Motivo" error={errCampo.motivo} hint="Por ejemplo: el proveedor vende por caja de 12.">
                {(p) => <Textarea {...p} rows={3} value={motivo} onChange={(e) => setMotivo(e.target.value)} />}
            </Field>
            <MensajeError e={error} />
        </Dialog>
    );
}
