'use client';

// La ficha de una solicitud: fases, «Lo que te toca» (emitir, liberar, rechazar, reenviar, cancelar, rehacer: de
// acciones_disponibles), los datos, los ítems (se editan en Borrador u Observada), la última carga desde Excel con
// sus filas en error, el requerimiento generado y el historial. «Rehacer» abre la solicitud nueva.
import { useState } from 'react';
import Link from 'next/link';
import { FileSpreadsheet, Pencil, Plus, Trash2 } from 'lucide-react';
import { solicitudes } from '@/modules/solicitudes/composition.ts';
import {
    FASES_SOLICITUD,
    aNuevoItem,
    esEditable,
    etiquetaFila,
    faseActual,
    itemsAnidados,
    resumenCarga,
    tonoEstado,
    type FilaCarga,
    type ItemSolicitud,
    type NuevoItem,
    type SolicitudDetalle,
} from '@/modules/solicitudes/application/views.ts';
import { Notice } from '@/shared/ui/bits.tsx';
import { Button, LINK_CLASS } from '@/shared/ui/button.tsx';
import { Chip } from '@/shared/ui/card.tsx';
import { Dialog } from '@/shared/ui/dialog.tsx';
import { Datos, Fases, Ficha, FichaSeccion } from '@/shared/ui/ficha.tsx';
import { dayTime, dmy } from '@/shared/ui/format.ts';
import { Hueco } from '@/shared/ui/hueco.tsx';
import { toast } from '@/shared/ui/toaster.tsx';
import { Historial } from '../_acciones/historial.tsx';
import { PanelAcciones, ejecutarAccion } from '../_acciones/panel-acciones.tsx';
import { usePerfil } from '../_components/perfil.tsx';
import { refrescar } from '../_lib/resource.ts';
import { personasStore } from '../_lib/stores.ts';
import { proyectosStore } from '../proyectos/store.ts';
import { CargaExcel } from './carga-excel.tsx';
import { FormItem } from './form-item.tsx';
import { FormSolicitud } from './form-solicitud.tsx';
import { solicitudStore } from './store.ts';

const fmtNum = new Intl.NumberFormat('es-PE', { maximumFractionDigits: 3 });
const fmtMonto = new Intl.NumberFormat('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 4 });

export function FichaSolicitud({ id, onCerrar, onAbrir }: { id: string; onCerrar: () => void; onAbrir: (id: string) => void }) {
    const { data, error } = solicitudStore.use(id);
    if (error)
        return (
            <Ficha titulo="Solicitud" onCerrar={onCerrar}>
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
    return <FichaCargada key={data.solicitud.id} d={data} onCerrar={onCerrar} onAbrir={onAbrir} />;
}

function FichaCargada({ d, onCerrar, onAbrir }: { d: SolicitudDetalle; onCerrar: () => void; onAbrir: (id: string) => void }) {
    const { solicitud: s, items, carga } = d;
    const perfil = usePerfil();
    const gente = personasStore.use().data ?? [];
    const proyectos = proyectosStore.use().data ?? [];
    const [editando, setEditando] = useState(false);
    const [item, setItem] = useState<NuevoItem | 'nuevo' | null>(null);
    const [cargando, setCargando] = useState(false);
    const [borrando, setBorrando] = useState(false);
    const nombre = (x: string | null) => (x ? (gente.find((g) => g.id === x)?.nombre ?? '') : '');
    const proyecto = proyectos.find((p) => p.id === s.proyectoId) ?? null;
    const etapa = proyecto?.etapas.find((e) => e.id === s.etapaId) ?? null;
    const editable = esEditable(s, perfil.id);

    async function quitarItem(i: ItemSolicitud) {
        const r = await solicitudes().borrarItem(i.id);
        if (r.isErr()) return toast.error(r.error.message);
        toast.success(`Ítem «${i.descripcion}» quitado.`);
        refrescar(['solicitud_items', 'acciones']);
    }

    async function borrarBorrador() {
        const r = await solicitudes().borrar(s.id);
        if (r.isErr()) return toast.error(r.error.message);
        toast.success('Borrador eliminado.');
        refrescar(['solicitudes']);
        onCerrar();
    }

    return (
        <Ficha
            titulo={s.numero || 'Borrador de solicitud'}
            subtitulo={s.tipo === 'Proyecto' ? [proyecto?.nombre, etapa?.nombre].filter(Boolean).join(' · ') || 'Proyecto' : `Administrativa · libera ${nombre(s.jefeId) || 'su jefe'}`}
            estado={<Chip tone={tonoEstado(s.estado)}>{s.estado}</Chip>}
            onCerrar={onCerrar}
        >
            <div className="flex flex-col gap-4 border-b border-divider px-5 py-4">
                <Fases pasos={FASES_SOLICITUD} actual={faseActual(s.estado)} />
                {s.estado === 'Observada' && s.motivoObservacion && (
                    <Notice tone="warning" cerrable={false}>
                        Observada: «{s.motivoObservacion}». Corrige los ítems y pulsa «Corregir y reenviar».
                    </Notice>
                )}
                {s.estado === 'Rechazada' && s.motivoRechazo && (
                    <Notice tone="danger" cerrable={false}>
                        Rechazada: «{s.motivoRechazo}».
                    </Notice>
                )}
                {s.estado === 'Cancelada' && s.motivoCancelacion && (
                    <Notice tone="info" cerrable={false}>
                        Cancelada: «{s.motivoCancelacion}».
                    </Notice>
                )}
                {s.nuevaSolicitudId && (
                    <p className="text-small text-ink-2">
                        Se rehízo en otra solicitud.{' '}
                        <button type="button" className={LINK_CLASS} onClick={() => onAbrir(s.nuevaSolicitudId!)}>
                            Abrir la nueva
                        </button>
                    </p>
                )}
                <PanelAcciones
                    tabla="solicitudes"
                    id={s.id}
                    tocadas={['solicitudes', 'solicitud_items', 'requerimientos', 'requerimiento_items']}
                    onHecho={(a, r) => {
                        if (a.accion === 'rehacer' && typeof r.id === 'string') onAbrir(r.id);
                    }}
                    vacio={editable ? 'Agrega los ítems y el sustento; el botón para emitir aparece cuando esté lista.' : 'Por ahora no te toca nada aquí.'}
                />
            </div>
            <FichaSeccion
                titulo="Datos"
                accion={
                    editable && (
                        <Button variant="ghost" onClick={() => setEditando(true)}>
                            <Pencil size={15} /> Editar
                        </Button>
                    )
                }
            >
                <Datos
                    filas={[
                        ['Tipo', s.tipo],
                        ...(s.tipo === 'Proyecto'
                            ? ([
                                  ['Proyecto', proyecto ? [proyecto.codigo, proyecto.nombre].filter(Boolean).join(' · ') : ''],
                                  ['Etapa', etapa ? `${etapa.nombre}${etapa.aprobadores.length ? ` (libera ${etapa.aprobadores.map(nombre).filter(Boolean).join(', ')})` : ' (sin aprobadores)'}` : ''],
                              ] as [string, string][])
                            : ([['Jefe que la libera', nombre(s.jefeId)]] as [string, string][])),
                        ['Solicitante', nombre(s.solicitanteId)],
                        ['Creada', dmy(s.creado)],
                        ['Sustento', s.sustento],
                        ...(s.liberadoPor ? ([['Liberada por', `${nombre(s.liberadoPor)} · ${dayTime(s.fechaLiberacion)}`]] as [string, string][]) : []),
                    ]}
                />
                {s.estado === 'Borrador' && s.solicitanteId === perfil.id && (
                    <div className="mt-3">
                        <Button variant="ghost" className="text-danger-strong" onClick={() => setBorrando(true)}>
                            <Trash2 size={15} /> Eliminar borrador
                        </Button>
                    </div>
                )}
            </FichaSeccion>
            <FichaSeccion
                titulo={`Ítems (${items.length})`}
                accion={
                    editable && (
                        <div className="flex gap-1.5">
                            <Button variant="ghost" onClick={() => setCargando(true)}>
                                <FileSpreadsheet size={15} /> Excel
                            </Button>
                            <Button variant="dashed" onClick={() => setItem('nuevo')}>
                                <Plus size={15} /> Ítem
                            </Button>
                        </div>
                    )
                }
            >
                <ListaItems items={items} editable={editable} verMontos={perfil.ve_precios} onEditar={(i) => setItem(aNuevoItem(i))} onQuitar={(i) => void quitarItem(i)} />
            </FichaSeccion>
            {carga.length > 0 && <SeccionCarga filas={carga} editable={editable} />}
            {s.requerimientoId && (
                <FichaSeccion titulo="Requerimiento">
                    <Link href={`/requerimientos?ver=${s.requerimientoId}`} className={`${LINK_CLASS} text-ui`}>
                        {d.requerimientoNumero ?? 'Requerimiento en proceso'}
                    </Link>
                    {d.requerimientoEstado && <span className="ml-2 text-small text-ink-2">{d.requerimientoEstado}</span>}
                </FichaSeccion>
            )}
            <FichaSeccion titulo="Historial">
                <Historial tabla="solicitudes" id={s.id} />
            </FichaSeccion>
            {editando && <FormSolicitud solicitud={s} onCerrar={() => setEditando(false)} onCreado={() => setEditando(false)} />}
            {item && <FormItem solicitudId={s.id} item={item === 'nuevo' ? undefined : item} items={items} onCerrar={() => setItem(null)} />}
            {cargando && <CargaExcel solicitudId={s.id} items={items} onCerrar={() => setCargando(false)} />}
            {borrando && (
                <Dialog
                    abierto
                    onCerrar={() => setBorrando(false)}
                    titulo="Eliminar borrador"
                    descripcion="Se borran la solicitud y sus ítems. No se puede deshacer."
                    pie={
                        <>
                            <Button variant="secondary" onClick={() => setBorrando(false)}>
                                Volver
                            </Button>
                            <Button variant="danger" onClick={() => void borrarBorrador()}>
                                Eliminar borrador
                            </Button>
                        </>
                    }
                />
            )}
        </Ficha>
    );
}

function ListaItems({
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
        return <p className="text-small text-ink-3">{editable ? 'Sin ítems. Agrégalos uno a uno con «Ítem» o varios a la vez con «Excel».' : 'Sin ítems.'}</p>;
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
                                verMontos && i.presupuestoUnit != null ? `ppto ${i.monedaPpto ?? ''} ${fmtMonto.format(i.presupuestoUnit)} c/u` : '',
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

function SeccionCarga({ filas, editable }: { filas: FilaCarga[]; editable: boolean }) {
    const r = resumenCarga(filas);
    const [haciendo, setHaciendo] = useState<string | null>(null);
    const conError = filas.filter((f) => f.estadoFila === 'Error');

    async function descartar(f: FilaCarga) {
        setHaciendo(f.id);
        const x = await ejecutarAccion('ac_carga_descartar_fila', { p_fila: f.id });
        setHaciendo(null);
        if (x.isErr()) return toast.error(x.error.message);
        toast.success('Fila descartada.');
        refrescar(['carga_items', 'acciones']);
    }

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
                                    <Button variant="secondary" disabled={!!haciendo} onClick={() => void descartar(f)}>
                                        {haciendo === f.id ? 'Un momento…' : 'Descartar fila'}
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
