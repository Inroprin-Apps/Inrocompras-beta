'use client';

// «Generar OC» (el carrito): con las líneas marcadas del plan (mismo canal y proyecto), pide proveedor, moneda, forma
// de pago y, por línea, cantidad (por defecto el saldo), precio y cómo lo llama el proveedor. Llama a ac_oc_crear
// (la base valida saldo, proveedor extranjero en importación y requerimiento emitido) y abre la ficha del borrador.
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ordenes } from '@/modules/ordenes/composition.ts';
import { FORMAS_PAGO, MONEDAS, leerNumero, monto, pideAdelanto, pideCredito, type FormaPago } from '@/modules/ordenes/application/views.ts';
import { faltaEnLineaCarrito, lineasCarrito, type FilaPlan, type LineaCarrito } from '@/modules/plan/application/views.ts';
import { Notice } from '@/shared/ui/bits.tsx';
import { Button } from '@/shared/ui/button.tsx';
import { Dialog } from '@/shared/ui/dialog.tsx';
import { Field, Input } from '@/shared/ui/field.tsx';
import { SelectMenu } from '@/shared/ui/select-menu.tsx';
import { toast } from '@/shared/ui/toaster.tsx';
import { refrescar } from '../_lib/resource.ts';
import { proveedoresStore } from '../ordenes/store.ts';

const op = (xs: readonly string[]) => xs.map((x) => ({ value: x, label: x }));

export function FormGenerarOc({ lineas: marcadas, onCerrar, onCreada }: { lineas: FilaPlan[]; onCerrar: () => void; onCreada: () => void }) {
    const router = useRouter();
    const imp = marcadas[0]?.canal === 'Importación';
    const proveedores = (proveedoresStore.use().data ?? []).filter((p) => p.origen === (imp ? 'Extranjero' : 'Nacional'));
    const [proveedorId, setProveedorId] = useState('');
    const [moneda, setMoneda] = useState(imp ? 'USD' : 'PEN');
    const [formaPago, setFormaPago] = useState<FormaPago>('Contado');
    const [pct, setPct] = useState('');
    const [dias, setDias] = useState('');
    const [lineas, setLineas] = useState<LineaCarrito[]>(() => lineasCarrito(marcadas, imp ? 'USD' : 'PEN'));
    const [error, setError] = useState<string | null>(null);
    const [creando, setCreando] = useState(false);
    const prov = proveedores.find((p) => p.id === proveedorId);

    const setLinea = (i: number, p: Partial<LineaCarrito>) => setLineas((ls) => ls.map((l, j) => (j === i ? { ...l, ...p } : l)));
    function cambiarMoneda(m: string) {
        setMoneda(m);
        // El precio sugerido (presupuesto) solo vale en su moneda: se vuelve a proponer.
        const sug = lineasCarrito(marcadas, m);
        setLineas((ls) => ls.map((l, i) => ({ ...l, precio: l.precio && l.precio !== lineasCarrito(marcadas, moneda)[i].precio ? l.precio : sug[i].precio })));
    }
    const subtotal = lineas.reduce((s, l) => s + (leerNumero(l.cantidad) ?? 0) * (leerNumero(l.precio) ?? 0), 0);

    async function crear() {
        if (!proveedorId) return setError(imp ? 'Elige el proveedor extranjero.' : 'Elige el proveedor.');
        const pctN = leerNumero(pct);
        const diasN = leerNumero(dias);
        if (pideAdelanto(formaPago) && !(pctN && pctN > 0 && pctN < 100)) return setError('Escribe el % de adelanto (entre 1 y 99).');
        if (pideCredito(formaPago) && !(diasN && diasN > 0)) return setError('Escribe los días de crédito.');
        for (const l of lineas) {
            const f = faltaEnLineaCarrito(l, leerNumero);
            if (f) return setError(f);
        }
        setCreando(true);
        const r = await ordenes().crear({
            proveedorId,
            procedencia: imp ? 'Importación' : 'Nacional',
            moneda,
            formaPago,
            proyectoId: marcadas[0]?.proyectoId ?? null,
            lineas: lineas.map((l) => ({
                itemId: l.itemId,
                cantidad: leerNumero(l.cantidad)!,
                precioUnit: leerNumero(l.precio)!,
                descripcionProv: l.descripcionProv,
            })),
        });
        if (r.isErr()) {
            setCreando(false);
            return setError(r.error.message);
        }
        const id = r.value;
        if (pideAdelanto(formaPago) || pideCredito(formaPago)) {
            const c = await ordenes().guardarCabecera(
                id,
                pideAdelanto(formaPago) ? { pctAdelanto: Math.round(pctN! * 100) / 10000 } : { diasCredito: Math.round(diasN!) },
            );
            if (c.isErr())
                toast.error(`El borrador se creó, pero falta el ${pideAdelanto(formaPago) ? '% de adelanto' : 'plazo de crédito'}: ${c.error.message}`);
        }
        setCreando(false);
        toast.success('Borrador creado. Sube la cotización y emítelo.');
        refrescar(['ordenes', 'oc_lineas', 'plan']);
        onCreada();
        onCerrar();
        router.push(`/ordenes?ver=${id}`);
    }

    return (
        <Dialog
            abierto
            onCerrar={onCerrar}
            titulo="Generar OC"
            descripcion={`${marcadas.length === 1 ? '1 línea' : `${marcadas.length} líneas`} de ${imp ? 'importación' : 'compra nacional'}. Se crea en borrador: luego subes la cotización y la emites.`}
            pie={
                <>
                    <Button variant="secondary" onClick={onCerrar} disabled={creando}>
                        Volver
                    </Button>
                    <Button onClick={() => void crear()} disabled={creando}>
                        {creando ? 'Creando…' : 'Crear borrador'}
                    </Button>
                </>
            }
        >
            <Field
                label={imp ? 'Proveedor extranjero' : 'Proveedor'}
                hint={proveedores.length ? undefined : `No hay proveedores ${imp ? 'extranjeros' : 'nacionales'}: dalo de alta en Proveedores.`}
            >
                {(p) => (
                    <SelectMenu
                        {...p}
                        value={proveedorId}
                        onChange={setProveedorId}
                        placeholder="Elige el proveedor"
                        options={proveedores.map((x) => ({ value: x.id, label: `${x.razonSocial}${x.ruc ? ` · ${x.ruc}` : x.pais ? ` · ${x.pais}` : ''}` }))}
                    />
                )}
            </Field>
            {prov && prov.evaluacionFin !== 'Aprobado' && (
                <Notice tone="warning" cerrable={false}>
                    Finanzas aún no aprueba a este proveedor. Puedes armar y emitir la orden, pero no enviarla hasta que lo apruebe.
                </Notice>
            )}
            <div className="grid grid-cols-2 gap-4">
                <Field label="Moneda">{(p) => <SelectMenu {...p} value={moneda} onChange={cambiarMoneda} options={op(MONEDAS)} />}</Field>
                <Field label="Forma de pago">
                    {(p) => <SelectMenu {...p} value={formaPago} onChange={(f) => setFormaPago(f as FormaPago)} options={op(FORMAS_PAGO)} />}
                </Field>
                {pideAdelanto(formaPago) && (
                    <Field label="% de adelanto">{(p) => <Input {...p} inputMode="decimal" value={pct} onChange={(e) => setPct(e.target.value)} />}</Field>
                )}
                {pideCredito(formaPago) && (
                    <Field label="Días de crédito">{(p) => <Input {...p} inputMode="numeric" value={dias} onChange={(e) => setDias(e.target.value)} />}</Field>
                )}
            </div>
            <div className="flex flex-col gap-3">
                <span className="text-ui font-medium">Líneas</span>
                {lineas.map((l, i) => (
                    <fieldset key={l.itemId} className="flex flex-col gap-2 rounded-card border border-line p-3">
                        <legend className="sr-only">{l.descripcion}</legend>
                        <div className="text-ui font-medium">{l.descripcion}</div>
                        <div className="grid grid-cols-2 gap-3">
                            <Field label={`Cantidad (${l.unidad})`} hint={`Saldo: ${l.saldo}`}>
                                {(p) => <Input {...p} inputMode="decimal" value={l.cantidad} onChange={(e) => setLinea(i, { cantidad: e.target.value })} />}
                            </Field>
                            <Field label={`Precio unitario (${moneda})`} hint="Sin IGV.">
                                {(p) => <Input {...p} inputMode="decimal" value={l.precio} onChange={(e) => setLinea(i, { precio: e.target.value })} />}
                            </Field>
                        </div>
                        <Field label="Cómo lo llama el proveedor" optional>
                            {(p) => <Input {...p} value={l.descripcionProv} onChange={(e) => setLinea(i, { descripcionProv: e.target.value })} />}
                        </Field>
                    </fieldset>
                ))}
                <p className="text-small text-ink-2">
                    Subtotal: <span className="font-medium text-ink tabular-nums">{monto(Math.round(subtotal * 100) / 100, moneda)}</span>
                    {imp ? ' (importación: sin IGV)' : ' + IGV'}
                </p>
            </div>
            {error && (
                <p role="alert" className="text-small font-medium text-danger-strong">
                    {error}
                </p>
            )}
        </Dialog>
    );
}
