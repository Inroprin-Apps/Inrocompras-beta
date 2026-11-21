'use client';

// La ficha de una orden: fases, «Lo que te toca» (acciones_disponibles), totales, cabecera (editable si la base
// lo permite: public.oc_edicion), líneas (con «＋ Demasía»), aprobaciones, cuotas, documentos e historial.
import { useState } from 'react';
import { Pencil } from 'lucide-react';
import { TIPOS_ORDEN } from '@/modules/documentos/application/views.ts';
import {
    FASES_ORDEN,
    faseOrden,
    lateral,
    monto,
    nombreOrden,
    tonoAprobacion,
    tonoEstatus,
    type Firma,
    type OrdenDetalle,
} from '@/modules/ordenes/application/views.ts';
import { Notice } from '@/shared/ui/bits.tsx';
import { Button } from '@/shared/ui/button.tsx';
import { Chip } from '@/shared/ui/card.tsx';
import { Datos, Fases, Ficha, FichaSeccion } from '@/shared/ui/ficha.tsx';
import { dayTime, dmy } from '@/shared/ui/format.ts';
import { Hueco } from '@/shared/ui/hueco.tsx';
import { Historial } from '../_acciones/historial.tsx';
import { PanelAcciones } from '../_acciones/panel-acciones.tsx';
import { usePerfil } from '../_components/perfil.tsx';
import { Documentos } from '../_documentos/documentos.tsx';
import { personasStore } from '../_lib/stores.ts';
import { FormCabecera } from './form-cabecera.tsx';
import { LineasOrden } from './lineas-orden.tsx';
import { edicionStore, ordenStore, proveedoresStore } from './store.ts';

const TOCADAS = ['ordenes', 'oc_lineas', 'pagos', 'documentos'] as const;

export function FichaOrden({ id, onCerrar }: { id: string; onCerrar: () => void }) {
    const { data: o, error } = ordenStore.use(id);
    if (!o)
        return (
            <Ficha titulo={error ? 'No se pudo abrir la orden' : 'Cargando la orden…'} onCerrar={onCerrar}>
                <div className="flex flex-col gap-3 px-5 py-4">
                    {error ? <p className="text-ui text-danger-strong">{error}</p> : [1, 2, 3].map((i) => <Hueco key={i} className="h-16 w-full" />)}
                </div>
            </Ficha>
        );
    return <FichaCargada o={o} onCerrar={onCerrar} />;
}

function FichaCargada({ o, onCerrar }: { o: OrdenDetalle; onCerrar: () => void }) {
    const perfil = usePerfil();
    const edicion = edicionStore.use(o.id).data;
    const proveedores = proveedoresStore.use().data;
    const gente = personasStore.use().data;
    const [editando, setEditando] = useState(false);
    const nombre = (u: string | null) => (u ? (gente?.find((g) => g.id === u)?.nombre ?? 'Otra persona') : '');
    const prov = proveedores?.find((p) => p.id === o.proveedorId);
    const editable = edicion?.editar === null;
    const nota = lateral(o);
    const subeDocs = perfil.es_compras || perfil.area === 'Finanzas' || perfil.area === 'Contabilidad';

    return (
        <Ficha
            titulo={nombreOrden(o)}
            subtitulo={[o.proveedor || 'Sin proveedor', o.proyecto].filter(Boolean).join(' · ')}
            estado={
                <div className="flex flex-wrap gap-1.5">
                    <Chip tone={tonoEstatus(o.estatus)}>{o.estatus}</Chip>
                    {o.estadoAprobacion && o.estadoAprobacion !== o.estatus && <Chip tone={tonoAprobacion(o.estadoAprobacion)}>{o.estadoAprobacion}</Chip>}
                    {o.revision > 0 && <Chip tone="muted">Revisión {o.revision}</Chip>}
                </div>
            }
            onCerrar={onCerrar}
        >
            <div className="flex flex-col gap-3 border-b border-divider px-5 py-4">
                <Fases pasos={FASES_ORDEN} actual={faseOrden(o)} />
                {nota && (
                    <p className="text-small text-warning-strong">
                        {nota}
                        {o.motivoAprob && o.estatus.startsWith('Observado') ? ` «${o.motivoAprob}»` : ''}
                    </p>
                )}
                <PanelAcciones tabla="ordenes" id={o.id} tocadas={TOCADAS} />
            </div>

            <FichaSeccion titulo="Totales">
                <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <Total k="Subtotal" v={monto(o.subtotal, o.moneda)} />
                    <Total k={o.tipoImpuesto === 'IGV 18%' ? 'IGV 18 %' : o.tipoImpuesto} v={monto(o.igv, o.moneda)} />
                    <Total k="Total" v={monto(o.monto, o.moneda)} fuerte />
                    <Total k="En soles" v={monto(o.montoSoles)} />
                </dl>
            </FichaSeccion>

            <FichaSeccion
                titulo="Datos de la orden"
                accion={
                    editable && (
                        <Button variant="ghost" onClick={() => setEditando(true)}>
                            <Pencil size={15} /> Editar
                        </Button>
                    )
                }
            >
                {prov && prov.evaluacionFin !== 'Aprobado' && (
                    <Notice tone="warning" cerrable={false}>
                        Finanzas aún no aprueba a {prov.razonSocial} (evaluación: {prov.evaluacionFin.toLowerCase()}). La orden no se podrá enviar al proveedor
                        hasta entonces.
                    </Notice>
                )}
                <Datos
                    filas={[
                        ['Proveedor', o.proveedor ? `${o.proveedor}${prov?.ruc ? ` · RUC ${prov.ruc}` : prov?.pais ? ` · ${prov.pais}` : ''}` : ''],
                        ['Procedencia', `${o.procedencia} · ${o.clase}`],
                        ['Comprador', nombre(o.compradorId)],
                        ['Moneda', o.moneda],
                        ['Forma de pago', formaPago(o)],
                        ['Impuesto', o.tipoImpuesto],
                        ['Condición', o.cabecera.condicion],
                        ['Concepto', o.cabecera.concepto],
                        ['Lugar de entrega', o.cabecera.lugarEntrega],
                        ['Plazo de entrega', o.cabecera.plazoEntregaDias != null ? `${o.cabecera.plazoEntregaDias} días` : ''],
                        ...(o.procedencia === 'Importación'
                            ? ([
                                  ['Incoterm', o.cabecera.incoterm],
                                  ['Referencia del proveedor', o.cabecera.referenciaProv],
                              ] as [string, string][])
                            : []),
                        ['Correo de envío', o.cabecera.correoEnvio],
                        ['Emitida', o.fechaEmision ? dayTime(o.fechaEmision) : ''],
                        ['Enviada al proveedor', o.envioSolicitado ? dayTime(o.envioSolicitado) : ''],
                    ]}
                />
                {o.cabecera.terminos && (
                    <div className="mt-2.5">
                        <div className="text-caption text-ink-3">Términos</div>
                        <p className="text-ui whitespace-pre-line">{o.cabecera.terminos}</p>
                    </div>
                )}
            </FichaSeccion>

            <FichaSeccion titulo={`Líneas (${o.lineas.length})`}>
                <LineasOrden o={o} edicion={edicion ?? null} />
            </FichaSeccion>

            <FichaSeccion titulo="Aprobaciones">
                <Aprobaciones o={o} nombre={nombre} />
            </FichaSeccion>

            <FichaSeccion titulo="Cuotas">
                {o.cuotas.length === 0 ? (
                    <p className="text-small text-ink-3">Las cuotas se generan cuando la orden queda aprobada.</p>
                ) : (
                    <ul className="flex flex-col divide-y divide-divider">
                        {o.cuotas.map((c) => (
                            <li key={c.id} className="flex items-start gap-3 py-2">
                                <div className="min-w-0 flex-1">
                                    <div className="text-ui font-medium">
                                        {c.nCuota}. {c.tipo}
                                        {c.porcentaje != null && c.porcentaje < 1 && (
                                            <span className="font-normal text-ink-2"> · {Math.round(c.porcentaje * 100)} %</span>
                                        )}
                                    </div>
                                    <div className="text-small text-ink-2">
                                        {c.hito}
                                        {c.fechaLimite && ` · vence ${dmy(c.fechaLimite)}`}
                                        {c.aplicaRetencion && ` · retención ${monto(c.retencion, o.moneda)}`}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-ui tabular-nums">{monto(c.monto, o.moneda)}</div>
                                    <Chip
                                        tone={
                                            c.estado === 'Pagado' ? 'ok' : c.estado === 'Anulado' ? 'muted' : c.estado.startsWith('Observado') ? 'warn' : 'info'
                                        }
                                    >
                                        {c.estado}
                                    </Chip>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </FichaSeccion>

            <FichaSeccion titulo="Documentos">
                {o.estatus === 'Borrador' && o.formaPago !== 'Tarjeta de crédito' && (
                    <p className="mb-2 text-small text-ink-2">Sube la cotización del proveedor: sin ella no se emite la orden.</p>
                )}
                <Documentos dueno={{ ordenId: o.id }} tipos={TIPOS_ORDEN} puedeSubir={subeDocs} tocadas={['ordenes', 'pagos', 'acciones']} moneda={o.moneda} />
            </FichaSeccion>

            <FichaSeccion titulo="Historial">
                <Historial tabla="ordenes" id={o.id} />
            </FichaSeccion>
            {editando && <FormCabecera o={o} onCerrar={() => setEditando(false)} />}
        </Ficha>
    );
}

function Total({ k, v, fuerte = false }: { k: string; v: string; fuerte?: boolean }) {
    return (
        <div className="min-w-0">
            <dt className="text-caption text-ink-3">{k}</dt>
            <dd className={`text-ui tabular-nums ${fuerte ? 'font-semibold' : ''}`}>{v}</dd>
        </div>
    );
}

function formaPago(o: OrdenDetalle) {
    const c = o.cabecera;
    if (c.formaPago === 'Adelanto')
        return `Adelanto ${c.pctAdelanto != null ? Math.round(c.pctAdelanto * 100) + ' %' : '(falta el %)'}${c.hitoSaldo ? ` · saldo ${c.hitoSaldo.toLowerCase()}` : ''}`;
    if (c.formaPago === 'Crédito' || c.formaPago === 'Letra') return `${c.formaPago} ${c.diasCredito != null ? c.diasCredito + ' días' : '(faltan los días)'}`;
    return c.formaPago;
}

function Aprobaciones({ o, nombre }: { o: OrdenDetalle; nombre: (u: string | null) => string }) {
    const fila = (quien: string, f: Firma, falta: string) => (
        <li className="flex items-start gap-3 py-2">
            <div className="min-w-0 flex-1">
                <div className="text-ui font-medium">{quien}</div>
                <div className="text-small text-ink-2">{f.por ? `${nombre(f.por)}${f.fecha ? ` · ${dayTime(f.fecha)}` : ''}` : falta}</div>
            </div>
            {f.valor ? (
                <Chip
                    tone={
                        f.valor === 'Aprobado' || f.valor === 'Presupuestado' || f.valor === 'Pre Aprobado'
                            ? 'ok'
                            : f.valor === 'Observado'
                              ? 'warn'
                              : f.valor === 'Rechazado' || f.valor === 'Anular OC'
                                ? 'danger'
                                : 'info'
                    }
                >
                    {f.valor}
                </Chip>
            ) : (
                <Chip tone="muted">Pendiente</Chip>
            )}
        </li>
    );
    const conjunta = o.tipoAprobacion === 'Aprobación Conjunta';
    return (
        <>
            <p className="mb-1 text-small text-ink-2">
                Ruta: <span className="font-medium text-ink">{o.tipoAprobacion ?? 'se define al tener monto'}</span>
                {o.tipoAprobacion === 'Aprobación Única' && ' (basta la GOP)'}
                {conjunta && ' (GOP y GAF)'}
                {o.fechaAprobacion && ` · aprobada el ${dmy(o.fechaAprobacion)}`}
            </p>
            <ul className="flex flex-col divide-y divide-divider">
                {fila('VB de Control de Gestión (presupuesto)', o.ppto, 'Sin VB todavía: ninguna gerencia aprueba sin él.')}
                {fila('GOP', o.gop, 'Sin firma')}
                {(conjunta || o.gaf.valor) && fila('GAF', o.gaf, 'Sin firma')}
            </ul>
            {o.motivoAprob && <p className="mt-2 text-small text-ink-2">Última observación: «{o.motivoAprob}»</p>}
        </>
    );
}
