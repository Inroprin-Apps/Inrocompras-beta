'use client';

// Los ítems de una solicitud (editables en Borrador/Observada) y el resultado de la última carga Excel.
import { Pencil, Trash2 } from 'lucide-react';
import { etiquetaFila, itemsAnidados, resumenCarga, type FilaCarga, type ItemSolicitud } from '@/modules/solicitudes/application/views.ts';
import { Notice } from '@/shared/ui/bits.tsx';
import { Button, LINK_CLASS } from '@/shared/ui/button.tsx';
import { FichaSeccion } from '@/shared/ui/ficha.tsx';
import { dmy, money } from '@/shared/ui/format.ts';
import { ejecutarAccion } from '../_acciones/panel-acciones.tsx';
import { useBorrarConDeshacer } from '../_lib/deshacer.ts';

const fmtNum = new Intl.NumberFormat('es-PE', { maximumFractionDigits: 3 });

export function ListaItems({
    items,
    editable,
    verMontos,
    onEditar,
    onQuitar,
}: {
    items: ItemSolicitud[];
    editable: boolean;
    verMontos: boolean;
    onEditar: (i: ItemSolicitud) => void;
    onQuitar: (i: ItemSolicitud) => void;
}) {
    if (!items.length)
        return (
            <p className="text-small text-ink-3">
                {editable ? 'Aún no hay ítems. Agrégalos uno a uno con «Agregar ítem» o varios a la vez con «Cargar Excel».' : 'Esta solicitud no tiene ítems.'}
            </p>
        );
    return (
        <ul className="flex flex-col divide-y divide-divider">
            {itemsAnidados(items).map(({ item: i, nivel }) => (
                <li key={i.id} className={`flex items-start gap-2 py-2.5 ${nivel ? 'pl-6' : ''}`}>
                    <span className="w-7 flex-none pt-px text-small text-ink-3 tabular-nums">{nivel ? '↳' : (i.nItem ?? '—')}</span>
                    <div className="min-w-0 flex-1">
                        <div className="text-ui font-medium break-words">{i.descripcion}</div>
                        <div className="text-small text-ink-2">
                            {[
                                `${fmtNum.format(i.cantidad)} ${i.unidad}`,
                                i.tipo,
                                i.codigoCliente,
                                i.canal,
                                i.plazoAdquisicion ? `para el ${dmy(i.plazoAdquisicion)}` : '',
                                verMontos && i.presupuestoUnit != null ? `ppto ${money(i.presupuestoUnit, i.monedaPpto ?? 'PEN')} c/u` : '',
                            ]
                                .filter(Boolean)
                                .join(' · ')}
                        </div>
                        {i.detalle && <div className="text-small text-ink-3 break-words">{i.detalle}</div>}
                        {i.referenciaLink && (
                            <a href={i.referenciaLink} target="_blank" rel="noreferrer" className={`${LINK_CLASS} text-small`}>
                                Referencia
                            </a>
                        )}
                    </div>
                    {editable && (
                        <div className="flex flex-none">
                            <Button variant="ghost" iconOnly aria-label={`Editar ${i.descripcion}`} onClick={() => onEditar(i)}>
                                <Pencil size={15} />
                            </Button>
                            <Button variant="ghost" iconOnly aria-label={`Quitar ${i.descripcion}`} onClick={() => onQuitar(i)}>
                                <Trash2 size={15} />
                            </Button>
                        </div>
                    )}
                </li>
            ))}
        </ul>
    );
}

export function SeccionCarga({ filas, editable }: { filas: FilaCarga[]; editable: boolean }) {
    const { ocultos, borrar } = useBorrarConDeshacer();
    // Lo descartado con «Deshacer» pendiente ya cuenta como descartado.
    const vistas = filas.map((f) => (ocultos.has(f.id) ? { ...f, estadoFila: 'Descartado' as const } : f));
    const r = resumenCarga(vistas);
    const conError = vistas.filter((f) => f.estadoFila === 'Error');

    const descartar = (f: FilaCarga) =>
        borrar(f.id, {
            aviso: `${etiquetaFila(f.datos, f.nFila)}: descartada.`,
            ejecutar: () => ejecutarAccion('ac_carga_descartar_fila', { p_fila: f.id }),
            tocadas: ['carga_items'],
        });

    return (
        <FichaSeccion titulo="Última carga desde Excel">
            <p className="mb-2 text-small text-ink-2">
                {r.procesadas} filas cargadas como ítems{r.conError ? ` · ${r.conError} con error` : ''}
                {r.descartadas ? ` · ${r.descartadas} descartadas` : ''}.
            </p>
            {conError.length > 0 && (
                <>
                    <Notice tone="warning" cerrable={false}>
                        Mientras haya filas con error no se puede emitir. Corrige el Excel y vuelve a subirlo (solo con esas filas), o descártalas.
                    </Notice>
                    <ul className="flex flex-col divide-y divide-divider rounded-card border border-line">
                        {conError.map((f) => (
                            <li key={f.id} className="flex items-start gap-3 px-3 py-2.5">
                                <div className="min-w-0 flex-1">
                                    <div className="text-ui font-medium break-words">{etiquetaFila(f.datos, f.nFila)}</div>
                                    <ul className="mt-0.5 text-small text-danger-strong">
                                        {f.errores.map((e) => (
                                            <li key={e}>{e}</li>
                                        ))}
                                    </ul>
                                </div>
                                {editable && (
                                    <Button variant="secondary" onClick={() => descartar(f)}>
                                        Descartar fila
                                    </Button>
                                )}
                            </li>
                        ))}
                    </ul>
                </>
            )}
        </FichaSeccion>
    );
}
