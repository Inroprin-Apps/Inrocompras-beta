'use client';

// Programar varias cuotas en una misma fecha (Finanzas). Cada una pasa por la misma función que el botón de la ficha
// (ac_pago_programar), una tras otra: la base decide cada una y, si alguna no se puede, aquí se dice cuál y por qué.
import { useState } from 'react';
import { monto } from '@/modules/ordenes/application/views.ts';
import { hoyLima, nombrePago, resumenBloque, type Pago, type ResultadoBloque } from '@/modules/pagos/application/views.ts';
import { Button } from '@/shared/ui/button.tsx';
import { Dialog } from '@/shared/ui/dialog.tsx';
import { Field, Input } from '@/shared/ui/field.tsx';
import { toast } from '@/shared/ui/toaster.tsx';
import { ejecutarAccion } from '../_acciones/panel-acciones.tsx';
import { refrescar } from '../_lib/resource.ts';

export function ProgramarBloque({ cuotas, onCerrar }: { cuotas: Pago[]; onCerrar: (hechas: string[]) => void }) {
    const [fecha, setFecha] = useState(hoyLima());
    const [haciendo, setHaciendo] = useState<number | null>(null);
    const [resultados, setResultados] = useState<ResultadoBloque[] | null>(null);
    const [error, setError] = useState<string | null>(null);

    async function programar() {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return setError('Elige la fecha en que se pagarán.');
        setError(null);
        const rs: ResultadoBloque[] = [];
        for (const [i, c] of cuotas.entries()) {
            setHaciendo(i + 1);
            const r = await ejecutarAccion('ac_pago_programar', { p_id: c.id, p_fecha: fecha });
            rs.push({ id: c.id, nombre: nombrePago(c), error: r.isErr() ? r.error.message : null });
        }
        setHaciendo(null);
        refrescar(['pagos', 'ordenes', 'acciones', 'te_toca', 'notificaciones']);
        const { hechas, fallidas } = resumenBloque(rs);
        if (!fallidas.length) {
            toast.success(`${hechas === 1 ? 'Programaste 1 cuota' : `Programaste ${hechas} cuotas`}.`);
            return onCerrar(rs.map((r) => r.id));
        }
        setResultados(rs);
    }

    const total = cuotas.reduce((s, c) => s + c.montoSoles, 0);
    if (resultados) {
        const { hechas, fallidas } = resumenBloque(resultados);
        return (
            <Dialog
                abierto
                onCerrar={() => onCerrar(resultados.filter((r) => !r.error).map((r) => r.id))}
                titulo="Programación en bloque"
                descripcion={`${hechas} de ${resultados.length} quedaron programadas. Revisa las que no se pudieron.`}
                pie={<Button onClick={() => onCerrar(resultados.filter((r) => !r.error).map((r) => r.id))}>Entendido</Button>}
            >
                <ul className="flex flex-col divide-y divide-divider">
                    {fallidas.map((r) => (
                        <li key={r.id} className="py-2">
                            <div className="text-ui font-medium">{r.nombre}</div>
                            <p className="text-small text-danger-strong">{r.error}</p>
                        </li>
                    ))}
                </ul>
            </Dialog>
        );
    }

    return (
        <Dialog
            abierto
            onCerrar={() => haciendo === null && onCerrar([])}
            titulo={`Programar ${cuotas.length === 1 ? '1 cuota' : `${cuotas.length} cuotas`}`}
            descripcion={`Suman ${monto(total)} en soles. Todas quedan programadas para la misma fecha.`}
            pie={
                <>
                    <Button variant="secondary" onClick={() => onCerrar([])} disabled={haciendo !== null}>
                        Cancelar
                    </Button>
                    <Button onClick={() => void programar()} disabled={haciendo !== null}>
                        {haciendo !== null ? `Programando ${haciendo} de ${cuotas.length}…` : 'Programar'}
                    </Button>
                </>
            }
        >
            <Field label="Fecha de pago" error={error}>
                {(p) => <Input {...p} type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />}
            </Field>
            <ul className="flex flex-col divide-y divide-divider text-small">
                {cuotas.map((c) => (
                    <li key={c.id} className="flex gap-3 py-1.5">
                        <span className="min-w-0 flex-1 truncate">
                            {nombrePago(c)} · {c.proveedor}
                        </span>
                        <span className="tabular-nums">{monto(c.monto, c.moneda)}</span>
                    </li>
                ))}
            </ul>
        </Dialog>
    );
}
