'use client';

// La ficha de un requerimiento: fases, «Lo que te toca» (emitir, observar, anotar el RQ del SIDIGE: de
// acciones_disponibles), la cabecera (la completa el área emisora en «En Proceso»), los ítems con concepto, canal,
// fecha meta, plazo, SKU y validación técnica, las anulaciones (cada pendiente con su propio «Lo que te toca»)
// y el historial. Los montos (presupuesto) solo para quien ve precios.
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Ban, Barcode, Pencil } from 'lucide-react';
import {
    FASES_REQ,
    anulacionPendiente,
    esEditable,
    faseActual,
    itemsAnidados,
    resumenTecnica,
    tonoAnulacion,
    tonoEstado,
    tonoValidacion,
    type Anulacion,
    type ItemRequerimiento,
    type RequerimientoDetalle,
} from '@/modules/requerimientos/application/views.ts';
import { Notice } from '@/shared/ui/bits.tsx';
import { Button, LINK_CLASS } from '@/shared/ui/button.tsx';
import { Chip } from '@/shared/ui/card.tsx';
import { Datos, Fases, Ficha, FichaSeccion } from '@/shared/ui/ficha.tsx';
import { dayTime, dmy, money } from '@/shared/ui/format.ts';
import { Hueco } from '@/shared/ui/hueco.tsx';
import { Historial } from '../_acciones/historial.tsx';
import { PanelAcciones } from '../_acciones/panel-acciones.tsx';
import { usePerfil } from '../_components/perfil.tsx';
import { catalogosStore, personasStore } from '../_lib/stores.ts';
import { proyectosStore } from '../proyectos/store.ts';
import { FormAnulacion } from './form-anulacion.tsx';
import { FormCabecera, FormItemReq, FormSku } from './form-requerimiento.tsx';
import { requerimientoStore } from './store.ts';

const fmtNum = new Intl.NumberFormat('es-PE', { maximumFractionDigits: 3 });
const TOCADAS = ['requerimientos', 'requerimiento_items', 'anulaciones', 'solicitudes'];

export function FichaRequerimiento({ id, anulacionMarcada, onCerrar }: { id: string; anulacionMarcada: string; onCerrar: () => void }) {
    const { data, error } = requerimientoStore.use(id);
    if (error)
        return (
            <Ficha titulo="Requerimiento" onCerrar={onCerrar}>
                <div className="px-5 py-4">
                    <Notice tone="danger" cerrable={false}>
                        {error}
                    </Notice>
                </div>
            </Ficha>
        );
    if (!data)
        return (
            <Ficha titulo={<Hueco className="h-6 w-48" />} onCerrar={onCerrar}>
                <div className="flex flex-col gap-3 px-5 py-4">
                    <Hueco className="h-5 w-full" />
                    <Hueco className="h-16 w-full" />
                    <Hueco className="h-32 w-full" />
                </div>
            </Ficha>
        );
    return <FichaCargada key={data.requerimiento.id} d={data} anulacionMarcada={anulacionMarcada} onCerrar={onCerrar} />;
}

type Dialogo =
    { tipo: 'cabecera' } | { tipo: 'item'; item: ItemRequerimiento } | { tipo: 'sku'; item: ItemRequerimiento } | { tipo: 'anular'; itemId: string | null };

function FichaCargada({ d, anulacionMarcada, onCerrar }: { d: RequerimientoDetalle; anulacionMarcada: string; onCerrar: () => void }) {
    const { requerimiento: r, items, anulaciones, solicitud } = d;
    const perfil = usePerfil();
    const gente = personasStore.use().data ?? [];
    const empresas = catalogosStore.use().data?.empresas ?? [];
    const proyecto = (proyectosStore.use().data ?? []).find((p) => p.id === r.proyectoId) ?? null;
    const [dialogo, setDialogo] = useState<Dialogo | null>(null);
    const nombre = (x: string | null) => (x ? (gente.find((g) => g.id === x)?.nombre ?? '') : '');
    const editable = esEditable(r, perfil.area);
    // Comodidad para mostrar los botones; la base decide (ac_item_sku, ac_anulacion_solicitar).
    const asignaSku = perfil.es_admin || ['Planeamiento', 'Compras', 'Importaciones'].includes(perfil.area);
    const pideAnulacion = r.estado !== 'Anulado' && (perfil.es_compras || perfil.area === r.areaEmisora || solicitud?.solicitanteId === perfil.id);
    const tec = resumenTecnica(items);

    return (
        <Ficha
            titulo={r.numero || 'Requerimiento en proceso'}
            subtitulo={[proyecto?.nombre ?? r.motivo, solicitud?.numero].filter(Boolean).join(' · ')}
            estado={<Chip tone={tonoEstado(r.estado)}>{r.estado}</Chip>}
            onCerrar={onCerrar}
        >
            <div className="flex flex-col gap-4 border-b border-divider px-5 py-4">
                <Fases pasos={FASES_REQ} actual={faseActual(r.estado)} />
                {r.estado === 'Observado' && r.motivoObservacion && (
                    <Notice tone="warning" cerrable={false}>
                        Observado: «{r.motivoObservacion}». La solicitud volvió a su solicitante para que la corrija.
                    </Notice>
                )}
                {r.estado === 'En Proceso' && !editable && (
                    <Notice tone="info" cerrable={false}>
                        Lo completa y lo emite el área {r.areaEmisora}. Tu área es {perfil.area}: si te toca a ti, pide al administrador que te asigne{' '}
                        {r.areaEmisora} en Equipo.
                    </Notice>
                )}
                <PanelAcciones
                    tabla="requerimientos"
                    id={r.id}
                    nombre={r.numero}
                    tocadas={TOCADAS}
                    vacio={editable ? 'Completa la cabecera y los conceptos; «Emitir» aparece cuando esté listo.' : 'Por ahora no te toca nada aquí.'}
                />
            </div>
            <FichaSeccion
                titulo="Datos"
                accion={
                    editable && (
                        <Button variant="ghost" onClick={() => setDialogo({ tipo: 'cabecera' })}>
                            <Pencil size={15} /> Completar requerimiento
                        </Button>
                    )
                }
            >
                <Datos
                    filas={[
                        ['Empresa', empresas.find((e) => e.id === r.empresaId)?.razonSocial ?? r.empresaId],
                        ['Tipo de compra', r.tipoCompra ?? ''],
                        ['Destino', r.destino],
                        ['Dirección', r.direccion],
                        ['Receptor', r.receptor],
                        ['Concepto general', r.conceptoGeneral],
                        ['Proyecto', proyecto ? [proyecto.codigo, proyecto.nombre].filter(Boolean).join(' · ') : ''],
                        ['Motivo', r.motivo],
                        ['Área emisora', r.areaEmisora],
                        ['RQ del SIDIGE', r.rqSidige],
                        [
                            'Solicitud',
                            solicitud ? (
                                <Link href={`/solicitudes?ver=${solicitud.id}&pestana=todas`} className={LINK_CLASS}>
                                    {solicitud.numero || 'Ver solicitud'}
                                </Link>
                            ) : (
                                ''
                            ),
                        ],
                        ['Solicitante', solicitud ? nombre(solicitud.solicitanteId) : ''],
                        ...(r.fechaEmision ? ([['Emitido', `${dayTime(r.fechaEmision)} · ${nombre(r.emisorId)}`]] as [string, string][]) : []),
                    ]}
                />
            </FichaSeccion>
            <FichaSeccion
                titulo={`Ítems (${items.filter((i) => !i.anulado).length})`}
                accion={
                    pideAnulacion && (
                        <Button variant="ghost" className="text-danger-strong" onClick={() => setDialogo({ tipo: 'anular', itemId: null })}>
                            <Ban size={15} /> Pedir anulación
                        </Button>
                    )
                }
            >
                {items.length > 0 && (
                    <p className="mb-2 text-small text-ink-2">
                        Validación técnica: {tec.Validado} validados · {tec.Pendiente} pendientes{tec.Observado ? ` · ${tec.Observado} observados` : ''}
                        {tec['No aplica'] ? ` · ${tec['No aplica']} no aplica` : ''}.
                    </p>
                )}
                <ul className="flex flex-col divide-y divide-divider">
                    {itemsAnidados(items).map(({ item: i, nivel }) => (
                        <FilaItem
                            key={i.id}
                            i={i}
                            nivel={nivel}
                            verMontos={perfil.ve_precios}
                            conceptoGeneral={r.conceptoGeneral}
                            pendiente={!!anulacionPendiente(anulaciones, i.id)}
                            onEditar={editable && !i.anulado ? () => setDialogo({ tipo: 'item', item: i }) : undefined}
                            onSku={asignaSku && !i.anulado ? () => setDialogo({ tipo: 'sku', item: i }) : undefined}
                            onAnular={pideAnulacion && !i.anulado ? () => setDialogo({ tipo: 'anular', itemId: i.id }) : undefined}
                        />
                    ))}
                </ul>
                {!items.length && <p className="text-small text-ink-3">Este requerimiento no tiene ítems.</p>}
            </FichaSeccion>
            {anulaciones.length > 0 && (
                <FichaSeccion titulo="Anulaciones">
                    <ul className="flex flex-col gap-3">
                        {anulaciones.map((a) => (
                            <FilaAnulacion key={a.id} a={a} items={items} numero={r.numero} marcada={a.id === anulacionMarcada} nombre={nombre} />
                        ))}
                    </ul>
                </FichaSeccion>
            )}
            <FichaSeccion titulo="Historial">
                <Historial tabla="requerimientos" id={r.id} />
            </FichaSeccion>
            {dialogo?.tipo === 'cabecera' && <FormCabecera req={r} onCerrar={() => setDialogo(null)} />}
            {dialogo?.tipo === 'item' && <FormItemReq item={dialogo.item} numero={r.numero} onCerrar={() => setDialogo(null)} />}
            {dialogo?.tipo === 'sku' && <FormSku item={dialogo.item} onCerrar={() => setDialogo(null)} />}
            {dialogo?.tipo === 'anular' && (
                <FormAnulacion requerimientoId={r.id} numero={r.numero} items={items} itemId={dialogo.itemId} onCerrar={() => setDialogo(null)} />
            )}
        </Ficha>
    );
}

function FilaItem({
    i,
    nivel,
    verMontos,
    conceptoGeneral,
    pendiente,
    onEditar,
    onSku,
    onAnular,
}: {
    i: ItemRequerimiento;
    nivel: 0 | 1;
    verMontos: boolean;
    conceptoGeneral: string;
    pendiente: boolean;
    onEditar?: () => void;
    onSku?: () => void;
    onAnular?: () => void;
}) {
    const detalle = [
        `${fmtNum.format(i.cantidad)} ${i.unidad}`,
        i.tipo,
        i.codigoCliente,
        i.canal,
        i.concepto ? `concepto ${i.concepto}` : conceptoGeneral ? '' : 'sin concepto',
        i.fechaMeta ? `meta ${dmy(i.fechaMeta)}` : '',
        i.plazoEntregaDias != null ? `${i.plazoEntregaDias} días de entrega` : '',
        verMontos && i.presupuestoUnit != null ? `ppto ${money(i.presupuestoUnit, i.monedaPpto ?? 'PEN')} c/u` : '',
    ].filter(Boolean);
    return (
        <li className={`flex items-start gap-2 py-2.5 ${nivel ? 'pl-6' : ''} ${i.anulado ? 'text-ink-3' : ''}`}>
            <span className="w-7 flex-none pt-px text-small text-ink-3 tabular-nums">{nivel ? '↳' : (i.nItem ?? '—')}</span>
            <div className="min-w-0 flex-1">
                <div className={`text-ui font-medium break-words ${i.anulado ? 'line-through' : ''}`}>{i.descripcion}</div>
                <div className="text-small text-ink-2">{detalle.join(' · ')}</div>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    {i.anulado ? (
                        <Chip tone="muted">Anulado</Chip>
                    ) : (
                        <Chip tone={tonoValidacion(i.validacionTecnica)} title="Validación técnica">
                            {i.validacionTecnica === 'Pendiente' ? 'Validación técnica pendiente' : i.validacionTecnica}
                        </Chip>
                    )}
                    {pendiente && <Chip tone="warn">Anulación pedida</Chip>}
                    {i.codigoSidige && <span className="text-small text-ink-2">SKU {i.codigoSidige}</span>}
                    {(i.marca || i.modelo) && <span className="text-small text-ink-2">{[i.marca, i.modelo].filter(Boolean).join(' · ')}</span>}
                </div>
                {i.validacionTecnica === 'Observado' && i.tecMotivo && <div className="mt-0.5 text-small text-warning-strong">«{i.tecMotivo}»</div>}
            </div>
            <div className="flex flex-none">
                {onEditar && (
                    <Button variant="ghost" iconOnly aria-label={`Editar ${i.descripcion}`} onClick={onEditar}>
                        <Pencil size={15} />
                    </Button>
                )}
                {onSku && (
                    <Button variant="ghost" iconOnly aria-label={`Asignar SKU a ${i.descripcion}`} onClick={onSku}>
                        <Barcode size={15} />
                    </Button>
                )}
                {onAnular && !pendiente && (
                    <Button variant="ghost" iconOnly aria-label={`Pedir anulación de ${i.descripcion}`} onClick={onAnular}>
                        <Ban size={15} />
                    </Button>
                )}
            </div>
        </li>
    );
}

function FilaAnulacion({
    a,
    items,
    numero,
    marcada,
    nombre,
}: {
    a: Anulacion;
    items: ItemRequerimiento[];
    numero: string;
    marcada: boolean;
    nombre: (id: string | null) => string;
}) {
    const ref = useRef<HTMLLIElement>(null);
    useEffect(() => {
        if (marcada) ref.current?.scrollIntoView({ block: 'center' });
    }, [marcada]);
    const item = a.itemId ? items.find((i) => i.id === a.itemId) : null;
    return (
        <li ref={ref} className={`rounded-card border px-4 py-3 ${marcada ? 'border-primary' : 'border-line'}`}>
            <div className="flex flex-wrap items-center gap-2">
                <span className="flex-1 text-ui font-medium">{item ? `Ítem ${item.nItem ?? '—'} · ${item.descripcion}` : 'Todo el requerimiento'}</span>
                <Chip tone={tonoAnulacion(a.estado)}>{a.estado}</Chip>
            </div>
            <div className="mt-1 text-small text-ink-2">
                {a.causa} · «{a.motivo}»
            </div>
            <div className="text-caption text-ink-3">
                Pedida por {nombre(a.solicitadoPor) || 'otra persona'} · {dayTime(a.creado)}
                {a.aprobadoPor && ` · decidió ${nombre(a.aprobadoPor)} ${a.fechaAprobacion ? dayTime(a.fechaAprobacion) : ''}`}
            </div>
            {a.motivoRechazo && <div className="mt-1 text-small text-ink-2">Respuesta: «{a.motivoRechazo}»</div>}
            {a.estado === 'En Compras' && (
                <div className="mt-1 text-small text-warning-strong">Aprobada, pero el ítem tiene órdenes vivas: Compras debe anularlas primero.</div>
            )}
            {a.estado === 'Pendiente' && (
                <div className="mt-3">
                    <PanelAcciones
                        tabla="anulaciones"
                        id={a.id}
                        nombre={numero}
                        tocadas={TOCADAS}
                        vacio="La decide el jefe de quien la pidió (error de emisión) o quien liberó la solicitud."
                    />
                </div>
            )}
        </li>
    );
}
