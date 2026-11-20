'use client';

// Los productos del desaduanaje (Des_Productos): lo que trajo la OC y su costeo (EXW en soles, % de reparto, gastos,
// ad valorem, costo total y unitario: los escribe «Calcular costeo»). Se editan directo el ad valorem en USD, la
// cantidad recibida y la incidencia (0050: lo demás no).
import { useState } from 'react';
import { Pencil } from 'lucide-react';
import { desaduanajes } from '@/modules/desaduanaje/composition.ts';
import { leerNumero, monto, numero, porcentaje, type DesaduanajeDetalle, type ProductoDes } from '@/modules/desaduanaje/application/views.ts';
import { Button } from '@/shared/ui/button.tsx';
import { Chip } from '@/shared/ui/card.tsx';
import { Dialog } from '@/shared/ui/dialog.tsx';
import { Field, Input, Textarea } from '@/shared/ui/field.tsx';
import { toast } from '@/shared/ui/toaster.tsx';
import { refrescar } from '../_lib/resource.ts';

const soles = (n: number | null) => (n == null ? '—' : monto(n));

export function Productos({ d, edita }: { d: DesaduanajeDetalle; edita: boolean }) {
    const [editando, setEditando] = useState<ProductoDes | null>(null);
    if (d.productos.length === 0) return <p className="text-small text-ink-3">Este desaduanaje no tiene productos: la orden no tenía saldo por desaduanar.</p>;
    return (
        <>
            <ul className="flex flex-col divide-y divide-divider">
                {d.productos.map((p) => (
                    <li key={p.id} className="py-2.5">
                        <div className="flex items-start gap-2">
                            <div className="min-w-0 flex-1">
                                <div className="text-ui font-medium">
                                    {p.descripcion}
                                    {p.esMuestra && (
                                        <span className="ml-2">
                                            <Chip tone="muted">Muestra</Chip>
                                        </span>
                                    )}
                                </div>
                                <div className="text-small text-ink-2">
                                    {numero(p.cantidad)} × {monto(p.precioExw, p.moneda || 'USD')} EXW
                                    {p.cantRecibida != null && ` · recibidas ${numero(p.cantRecibida)}`}
                                    {p.cantRecibida != null && p.cantRecibida !== p.cantidad && <span className="text-warning-strong"> (difiere)</span>}
                                </div>
                            </div>
                            {edita && (
                                <Button variant="ghost" iconOnly aria-label={`Editar ${p.descripcion}`} onClick={() => setEditando(p)}>
                                    <Pencil size={15} />
                                </Button>
                            )}
                        </div>
                        <dl className="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-1 text-small sm:grid-cols-3">
                            <Par k="EXW" v={soles(p.exwS)} />
                            <Par k="% reparto" v={porcentaje(p.pctReparto)} />
                            <Par k="Gastos" v={soles(p.gastosS)} />
                            <Par k={`Ad valorem (US$ ${numero(p.adValoremUsd, 2)})`} v={soles(p.adValoremS)} />
                            <Par k="Costo total" v={soles(p.costoTotalS)} fuerte />
                            <Par k="Costo unitario" v={p.costoUnitS == null ? '—' : monto(p.costoUnitS)} fuerte />
                        </dl>
                        {p.incidencia && <p className="mt-1 text-small text-warning-strong">Incidencia: {p.incidencia}</p>}
                    </li>
                ))}
            </ul>
            {d.productos.some((p) => p.exwS == null) && <p className="mt-1 text-small text-ink-3">Los montos en soles aparecen al calcular el costeo.</p>}
            {editando && <FormProducto p={editando} onCerrar={() => setEditando(null)} />}
        </>
    );
}

function Par({ k, v, fuerte = false }: { k: string; v: string; fuerte?: boolean }) {
    return (
        <div className="min-w-0">
            <dt className="truncate text-caption text-ink-3">{k}</dt>
            <dd className={`tabular-nums ${fuerte ? 'font-semibold' : ''}`}>{v}</dd>
        </div>
    );
}

function FormProducto({ p, onCerrar }: { p: ProductoDes; onCerrar: () => void }) {
    const [adv, setAdv] = useState(p.adValoremUsd ? String(p.adValoremUsd) : '');
    const [recibida, setRecibida] = useState(p.cantRecibida != null ? String(p.cantRecibida) : '');
    const [incidencia, setIncidencia] = useState(p.incidencia);
    const [error, setError] = useState<string | null>(null);
    const [guardando, setGuardando] = useState(false);

    async function guardar() {
        const a = adv.trim() ? leerNumero(adv) : 0;
        const r = recibida.trim() ? leerNumero(recibida) : null;
        if (a == null || a < 0) return setError('El ad valorem es un monto en dólares, cero o más.');
        if (recibida.trim() && (r == null || r < 0)) return setError('La cantidad recibida es un número, cero o más.');
        setGuardando(true);
        const res = await desaduanajes().guardarProducto(p.id, { adValoremUsd: a, cantRecibida: r, incidencia });
        setGuardando(false);
        if (res.isErr()) return setError(res.error.message);
        toast.success('Producto guardado. Vuelve a calcular el costeo para ver el efecto.');
        refrescar(['des_productos', 'desaduanajes']);
        onCerrar();
    }

    return (
        <Dialog
            abierto
            onCerrar={onCerrar}
            titulo={p.descripcion}
            descripcion={`${numero(p.cantidad)} × ${monto(p.precioExw, p.moneda || 'USD')} EXW`}
            pie={
                <>
                    <Button variant="secondary" onClick={onCerrar} disabled={guardando}>
                        Volver
                    </Button>
                    <Button onClick={() => void guardar()} disabled={guardando}>
                        {guardando ? 'Guardando…' : 'Guardar'}
                    </Button>
                </>
            }
        >
            <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Ad valorem (US$)" hint="El de la DAM para este producto.">
                    {(f) => <Input {...f} inputMode="decimal" value={adv} onChange={(e) => setAdv(e.target.value)} />}
                </Field>
                <Field label="Cantidad recibida" optional>
                    {(f) => <Input {...f} inputMode="decimal" value={recibida} onChange={(e) => setRecibida(e.target.value)} />}
                </Field>
            </div>
            <Field label="Incidencia" optional hint="Faltantes, daños o diferencias con la factura.">
                {(f) => <Textarea {...f} rows={3} value={incidencia} onChange={(e) => setIncidencia(e.target.value)} />}
            </Field>
            {error && (
                <p role="alert" className="text-small font-medium text-danger-strong">
                    {error}
                </p>
            )}
        </Dialog>
    );
}
