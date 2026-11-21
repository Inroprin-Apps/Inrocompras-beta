'use client';

// La ficha de una cuota: fases, «Lo que te toca» (acciones_disponibles('pagos', id): solicitar, programar, marcar
// pagado, observar, subsanar, dividir), montos con retención, factura vinculada, los documentos de la orden (subir la
// factura que calza solicita la cuota sola; el voucher también va aquí) e historial.
import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import { TIPOS_ORDEN } from '@/modules/documentos/application/views.ts';
import { monto } from '@/modules/ordenes/application/views.ts';
import { FASES_PAGO, fasePago, formatoCuota, hoyLima, nombrePago, notaPago, tonoPago, vencida, type Pago } from '@/modules/pagos/application/views.ts';
import { LINK_CLASS } from '@/shared/ui/button.tsx';
import { Chip } from '@/shared/ui/card.tsx';
import { Datos, Fases, Ficha, FichaSeccion } from '@/shared/ui/ficha.tsx';
import { dayTime, dmy } from '@/shared/ui/format.ts';
import { Hueco } from '@/shared/ui/hueco.tsx';
import { Historial } from '../_acciones/historial.tsx';
import { PanelAcciones } from '../_acciones/panel-acciones.tsx';
import { usePerfil } from '../_components/perfil.tsx';
import { Documentos } from '../_documentos/documentos.tsx';
import { pagoStore } from './store.ts';

const TOCADAS = ['pagos', 'ordenes', 'documentos'] as const;

export function FichaPago({ id, onCerrar }: { id: string; onCerrar: () => void }) {
    const { data: p, error } = pagoStore.use(id);
    if (!p)
        return (
            <Ficha titulo={error ? 'No se pudo abrir la cuota' : 'Cargando la cuota…'} onCerrar={onCerrar}>
                <div className="flex flex-col gap-3 px-5 py-4">
                    {error ? <p className="text-ui text-danger-strong">{error}</p> : [1, 2, 3].map((i) => <Hueco key={i} className="h-16 w-full" />)}
                </div>
            </Ficha>
        );
    return <FichaCargada p={p} onCerrar={onCerrar} />;
}

function FichaCargada({ p, onCerrar }: { p: Pago; onCerrar: () => void }) {
    const perfil = usePerfil();
    const hoy = hoyLima();
    const nota = notaPago(p);
    const subeDocs = perfil.es_compras || perfil.area === 'Finanzas' || perfil.roles.includes('FINANZAS') || perfil.area === 'Contabilidad';
    const venc = vencida(p, hoy);

    return (
        <Ficha
            titulo={nombrePago(p)}
            subtitulo={`${p.proveedor || 'Sin proveedor'} · ${p.tipo}`}
            estado={
                <div className="flex flex-wrap gap-1.5">
                    <Chip tone={tonoPago(p.estado)}>{p.estado}</Chip>
                    {venc && <Chip tone="danger">Vencida</Chip>}
                    {p.aplicaRetencion && <Chip tone="muted">Retención 3 %</Chip>}
                </div>
            }
            onCerrar={onCerrar}
        >
            <div className="flex flex-col gap-3 border-b border-divider px-5 py-4">
                <Fases pasos={FASES_PAGO} actual={fasePago(p.estado)} />
                {nota && <p className={`text-small ${p.estado === 'Observado Finanzas' ? 'text-warning-strong' : 'text-ink-2'}`}>{nota}</p>}
                <PanelAcciones tabla="pagos" id={p.id} tocadas={TOCADAS} />
            </div>

            <FichaSeccion titulo="Montos">
                <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <Total k="Cuota" v={monto(p.monto, p.moneda)} fuerte />
                    <Total k="Retención 3 %" v={p.aplicaRetencion ? `−${monto(p.retencion, p.moneda)}` : 'No aplica'} />
                    <Total k="Neto a pagar" v={monto(p.neto ?? p.monto - p.retencion, p.moneda)} />
                    <Total k="En soles" v={monto(p.montoSoles)} />
                </dl>
                {!p.aplicaRetencion && p.estado === 'Plan' && (
                    <p className="mt-2 text-small text-ink-3">La retención se calcula al solicitar la cuota, con la factura.</p>
                )}
            </FichaSeccion>

            <FichaSeccion titulo="Datos de la cuota">
                <Datos
                    filas={[
                        [
                            'Orden',
                            <Link key="o" href={`/ordenes?ver=${p.ordenId}`} className={LINK_CLASS}>
                                {p.ordenNumero} <ExternalLink size={12} className="inline" aria-hidden />
                            </Link>,
                        ],
                        ['Estatus de la orden', p.ordenEstatus],
                        [
                            'Cuota',
                            `${formatoCuota(p.nCuota)} · ${p.tipo}${p.porcentaje != null && p.porcentaje < 1 ? ` (${Math.round(p.porcentaje * 100)} %)` : ''}`,
                        ],
                        ['Hito', p.hito],
                        [
                            'Fecha límite',
                            p.fechaLimite ? (
                                <span className={venc ? 'font-medium text-danger-strong' : ''}>
                                    {dmy(p.fechaLimite)}
                                    {venc ? ' (vencida)' : ''}
                                </span>
                            ) : (
                                ''
                            ),
                        ],
                        ['Programada para', p.fechaProgramada ? dmy(p.fechaProgramada) : ''],
                        ['Pagada', p.fechaPago ? dayTime(p.fechaPago) : ''],
                        ['N° de operación', p.nOperacion],
                        ['Referencia InroPay', p.inropayRef],
                        ['Sustento sin factura', p.sustento || undefined],
                        ['Observación de Finanzas', p.motivoObs ? `${p.motivoObs}${p.detalleObs ? ` · ${p.detalleObs}` : ''}` : undefined],
                        ['Comentario', p.comentario || undefined],
                    ]}
                />
            </FichaSeccion>

            <FichaSeccion titulo="Factura vinculada">
                {p.factura ? (
                    <Datos
                        filas={[
                            ['Número', p.factura.numero],
                            ['Fecha', p.factura.fecha ? dmy(p.factura.fecha) : ''],
                            ['Monto', p.factura.monto != null ? monto(p.factura.monto, p.factura.moneda ?? p.moneda) : ''],
                        ]}
                    />
                ) : (
                    <p className="text-small text-ink-3">
                        {p.estado === 'Plan'
                            ? 'Aún no hay factura. Súbela abajo, con su monto: si calza con la cuota, se solicita sola.'
                            : 'Sin factura vinculada.'}
                    </p>
                )}
            </FichaSeccion>

            <FichaSeccion titulo="Documentos de la orden">
                <p className="mb-2 text-small text-ink-2">Aquí van la factura, la guía, el acta de conformidad y el voucher de pago.</p>
                <Documentos
                    dueno={{ ordenId: p.ordenId }}
                    tipos={TIPOS_ORDEN}
                    puedeSubir={subeDocs}
                    tocadas={['pagos', 'ordenes', 'acciones']}
                    moneda={p.moneda}
                />
            </FichaSeccion>

            <FichaSeccion titulo="Historial">
                <Historial tabla="pagos" id={p.id} />
            </FichaSeccion>
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
