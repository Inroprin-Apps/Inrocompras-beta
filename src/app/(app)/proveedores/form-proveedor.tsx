'use client';

// Alta y edición de un proveedor. En el alta, el RUC se valida en vivo (módulo 11, igual que public.ruc_valido):
// un nacional exige RUC válido; un extranjero pide el país. Al editar no se cambian el RUC ni el origen (los
// protege app.proteger). La evaluación de Finanzas y la verificación de Contabilidad NO se tocan aquí: son
// acciones de la ficha. El borrador se guarda en este navegador mientras se escribe.
import { useState } from 'react';
import { CircleCheck, Plus, Trash2 } from 'lucide-react';
import { proveedores } from '@/modules/proveedores/composition.ts';
import {
    CUENTA_VACIA,
    MONEDAS_CUENTA,
    NUEVO_PROVEEDOR,
    ORIGENES,
    datosDe,
    faltaEnAlta,
    faltaEnDatos,
    limpiarRuc,
    motivoRuc,
    yaRegistrado,
    type Cuenta,
    type NuevoProveedor,
    type Origen,
    type Proveedor,
} from '@/modules/proveedores/application/views.ts';
import { Button } from '@/shared/ui/button.tsx';
import { Segmented } from '@/shared/ui/card.tsx';
import { Dialog } from '@/shared/ui/dialog.tsx';
import { Checkbox, Field, Input } from '@/shared/ui/field.tsx';
import { SelectMenu } from '@/shared/ui/select-menu.tsx';
import { toast } from '@/shared/ui/toaster.tsx';
import { usePerfil } from '../_components/perfil.tsx';
import { useBorrador } from '../_lib/borrador.ts';
import { refrescar } from '../_lib/resource.ts';

export function FormProveedor({
    proveedor,
    existentes = [],
    onCerrar,
    onGuardado,
    onVer,
}: {
    proveedor?: Proveedor;
    existentes?: Proveedor[];
    onCerrar: () => void;
    onGuardado: (id: string) => void;
    onVer?: (id: string) => void;
}) {
    const perfil = usePerfil();
    const inicial: NuevoProveedor = proveedor ? { ...datosDe(proveedor), origen: proveedor.origen, ruc: proveedor.ruc } : NUEVO_PROVEEDOR;
    const [f, setF, olvidar] = useBorrador<NuevoProveedor>(proveedor ? `proveedor:${proveedor.id}` : 'proveedor:nuevo', inicial);
    const [error, setError] = useState<string | null>(null);
    const [tocoRuc, setTocoRuc] = useState(false);
    const [guardando, setGuardando] = useState(false);
    const set = (patch: Partial<NuevoProveedor>) => (setF({ ...f, ...patch }), setError(null));
    const setCuenta = (i: number, patch: Partial<Cuenta>) => set({ cuentas: f.cuentas.map((c, j) => (j === i ? { ...c, ...patch } : c)) });

    const alta = !proveedor;
    const nacional = f.origen === 'Nacional';
    const ruc = limpiarRuc(f.ruc);
    // En vivo: mientras escribe solo dice cuánto lleva; el error aparece al completar 11 dígitos o al salir del campo.
    const errRuc = alta && nacional && (tocoRuc || ruc.length >= 11) ? motivoRuc(f.ruc) : null;
    const rucOk = alta && nacional && ruc.length === 11 && !motivoRuc(f.ruc);
    const repetido = alta && rucOk ? yaRegistrado(existentes, f.ruc) : null;
    // Lo que Contabilidad verificó solo lo cambia el administrador (0020); en el alta lo verifica Contabilidad después.
    const editaRetencion = !alta && nacional && (!proveedor.verificadoContab || perfil.es_admin);

    async function guardar() {
        const falta = alta ? faltaEnAlta(f) : faltaEnDatos(f, f.origen);
        if (falta) return (setTocoRuc(true), setError(falta));
        if (repetido) return setError(`Ya existe: ${repetido.razonSocial}. Ábrelo en vez de darlo de alta otra vez.`);
        setGuardando(true);
        const r = proveedor ? (await proveedores().editar(proveedor.id, f)).map(() => proveedor.id) : await proveedores().crear(f);
        setGuardando(false);
        if (r.isErr()) return setError(r.error.message);
        olvidar();
        toast.success(proveedor ? 'Proveedor actualizado.' : 'Proveedor dado de alta. Pide a Finanzas que lo evalúe desde su ficha.');
        refrescar(['proveedores']);
        onGuardado(r.value);
    }

    return (
        <Dialog
            abierto
            onCerrar={onCerrar}
            titulo={proveedor ? 'Editar proveedor' : 'Nuevo proveedor'}
            pie={
                <>
                    <Button variant="secondary" onClick={onCerrar}>
                        Volver
                    </Button>
                    <Button onClick={() => void guardar()} disabled={guardando}>
                        {guardando ? 'Guardando…' : proveedor ? 'Guardar cambios' : 'Dar de alta'}
                    </Button>
                </>
            }
        >
            {alta && (
                <div className="flex flex-col gap-1.5">
                    <span className="text-ui font-medium">Origen</span>
                    <Segmented<Origen> value={f.origen} onChange={(origen) => set({ origen })} options={ORIGENES.map((o) => ({ value: o, label: o }))} />
                </div>
            )}
            {alta && nacional && (
                <Field
                    label="RUC"
                    error={errRuc}
                    hint={
                        rucOk ? (
                            <span className="inline-flex items-center gap-1 text-success-strong">
                                <CircleCheck size={14} aria-hidden /> RUC válido
                            </span>
                        ) : (
                            `11 dígitos. Llevas ${ruc.length}.`
                        )
                    }
                >
                    {(p) => (
                        <Input
                            {...p}
                            value={f.ruc}
                            inputMode="numeric"
                            autoComplete="off"
                            maxLength={20}
                            onChange={(e) => set({ ruc: e.target.value })}
                            onBlur={() => setTocoRuc(true)}
                        />
                    )}
                </Field>
            )}
            {repetido && (
                <p role="alert" className="text-small text-warning-strong">
                    Ese RUC ya está registrado: {repetido.razonSocial}.{' '}
                    {onVer && (
                        <button type="button" className="font-medium text-primary hover:underline" onClick={() => onVer(repetido.id)}>
                            Abrir su ficha
                        </button>
                    )}
                </p>
            )}
            <Field label="Razón social">{(p) => <Input {...p} value={f.razonSocial} onChange={(e) => set({ razonSocial: e.target.value })} />}</Field>
            {!nacional && (
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="País">{(p) => <Input {...p} value={f.pais} onChange={(e) => set({ pais: e.target.value })} />}</Field>
                    {alta && (
                        <Field label="Identificación fiscal" optional hint="Tax ID, VAT o equivalente.">
                            {(p) => <Input {...p} value={f.ruc} onChange={(e) => set({ ruc: e.target.value })} />}
                        </Field>
                    )}
                </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Contacto" optional>
                    {(p) => <Input {...p} value={f.contacto} onChange={(e) => set({ contacto: e.target.value })} />}
                </Field>
                <Field label="Teléfono" optional>
                    {(p) => <Input {...p} value={f.telefono} inputMode="tel" onChange={(e) => set({ telefono: e.target.value })} />}
                </Field>
            </div>
            <Field label="Correo" optional hint="A este correo se envía la orden de compra.">
                {(p) => <Input {...p} type="email" value={f.correo} onChange={(e) => set({ correo: e.target.value })} />}
            </Field>

            <fieldset className="flex flex-col gap-3">
                <legend className="mb-1.5 text-ui font-medium">
                    Cuentas bancarias <span className="font-normal text-ink-3">(opcional)</span>
                </legend>
                {f.cuentas.map((c, i) => (
                    <div key={i} className="flex flex-col gap-3 rounded-card border border-line p-3">
                        <div className="flex items-end gap-2">
                            <div className="min-w-0 flex-1">
                                <Field label={`Banco ${i + 1}`}>{(p) => <Input {...p} value={c.banco} onChange={(e) => setCuenta(i, { banco: e.target.value })} />}</Field>
                            </div>
                            <div className="w-28">
                                <Field label="Moneda">
                                    {(p) => <SelectMenu {...p} value={c.moneda} onChange={(moneda) => setCuenta(i, { moneda })} options={MONEDAS_CUENTA.map((m) => ({ value: m, label: m }))} />}
                                </Field>
                            </div>
                            <Button variant="ghost" iconOnly aria-label={`Quitar la cuenta ${i + 1}`} onClick={() => set({ cuentas: f.cuentas.filter((_, j) => j !== i) })}>
                                <Trash2 size={15} />
                            </Button>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                            <Field label="N° de cuenta">{(p) => <Input {...p} value={c.numero} onChange={(e) => setCuenta(i, { numero: e.target.value })} />}</Field>
                            {nacional ? (
                                <Field label="CCI" optional hint="20 dígitos.">
                                    {(p) => <Input {...p} value={c.cci} inputMode="numeric" onChange={(e) => setCuenta(i, { cci: e.target.value })} />}
                                </Field>
                            ) : (
                                <>
                                    <Field label="SWIFT" optional>
                                        {(p) => <Input {...p} value={c.swift} onChange={(e) => setCuenta(i, { swift: e.target.value })} />}
                                    </Field>
                                    <Field label="IBAN" optional>
                                        {(p) => <Input {...p} value={c.iban} onChange={(e) => setCuenta(i, { iban: e.target.value })} />}
                                    </Field>
                                </>
                            )}
                        </div>
                    </div>
                ))}
                <Button variant="dashed" onClick={() => set({ cuentas: [...f.cuentas, { ...CUENTA_VACIA, moneda: nacional ? 'PEN' : 'USD' }] })}>
                    <Plus size={15} /> Cuenta
                </Button>
            </fieldset>

            {editaRetencion && (
                <div className="flex flex-col gap-2.5">
                    <Checkbox label="Agente de retención" checked={f.esAgenteRetencion} onChange={(e) => set({ esAgenteRetencion: e.target.checked })} />
                    <Checkbox
                        label="Buen contribuyente"
                        hint="Contabilidad lo confirma al verificar la retención."
                        checked={f.esBuenContribuyente}
                        onChange={(e) => set({ esBuenContribuyente: e.target.checked })}
                    />
                </div>
            )}
            {error && (
                <p role="alert" className="text-small font-medium text-danger-strong">
                    {error}
                </p>
            )}
        </Dialog>
    );
}
