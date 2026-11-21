'use client';

// La ficha de un proveedor: fases (alta → evaluación de Finanzas → retención verificada), «Lo que te toca»
// (acciones_disponibles: Finanzas evalúa, Contabilidad verifica, Compras pide la evaluación), los datos, las
// cuentas bancarias, la evaluación y la verificación con quién y cuándo, y el historial.
import { useState } from 'react';
import { Pencil } from 'lucide-react';
import {
    etiquetaEvaluacion,
    faseProveedor,
    fasesProveedor,
    identificacion,
    retencion,
    tonoEvaluacion,
    type Proveedor,
} from '@/modules/proveedores/application/views.ts';
import { Notice } from '@/shared/ui/bits.tsx';
import { Button } from '@/shared/ui/button.tsx';
import { Chip } from '@/shared/ui/card.tsx';
import { Datos, Fases, Ficha, FichaSeccion } from '@/shared/ui/ficha.tsx';
import { dayTime } from '@/shared/ui/format.ts';
import { Historial } from '../_acciones/historial.tsx';
import { PanelAcciones } from '../_acciones/panel-acciones.tsx';
import { usePerfil } from '../_components/perfil.tsx';
import { personasStore } from '../_lib/stores.ts';
import { FormProveedor } from './form-proveedor.tsx';
import { puedeEditarProveedores } from './permisos.ts';

const TOCADAS = ['proveedores'] as const;
const siNo = (b: boolean) => (b ? 'Sí' : 'No');

export function FichaProveedor({ proveedor: p, onCerrar }: { proveedor: Proveedor; onCerrar: () => void }) {
    const perfil = usePerfil();
    const gente = personasStore.use().data;
    const [editando, setEditando] = useState(false);
    const nombre = (u: string | null) => (u ? (gente?.find((g) => g.id === u)?.nombre ?? 'Otra persona') : '');
    const r = retencion(p);

    return (
        <Ficha
            titulo={p.razonSocial}
            subtitulo={`${p.origen} · ${identificacion(p) || 'Sin identificación'}`}
            estado={
                <div className="flex flex-wrap gap-1.5">
                    <Chip tone={tonoEvaluacion(p.evaluacion)}>{etiquetaEvaluacion(p.evaluacion)}</Chip>
                    <Chip tone={r.tono}>Retención: {r.texto.toLowerCase()}</Chip>
                </div>
            }
            onCerrar={onCerrar}
        >
            <div className="flex flex-col gap-3 border-b border-divider px-5 py-4">
                <Fases pasos={fasesProveedor(p)} actual={faseProveedor(p)} />
                {p.evaluacion === 'Observado' && (
                    <Notice tone="warning" cerrable={false}>
                        Finanzas lo observó{p.evaluacionNota ? `: «${p.evaluacionNota}»` : '.'} Corrige los datos y pide otra evaluación.
                    </Notice>
                )}
                <PanelAcciones tabla="proveedores" id={p.id} tocadas={TOCADAS} />
            </div>

            <FichaSeccion
                titulo="Datos"
                accion={
                    puedeEditarProveedores(perfil) && (
                        <Button variant="ghost" onClick={() => setEditando(true)}>
                            <Pencil size={15} /> Editar
                        </Button>
                    )
                }
            >
                <Datos
                    filas={[
                        [p.origen === 'Nacional' ? 'RUC' : 'Identificación fiscal', p.ruc],
                        ['País', p.origen === 'Nacional' ? p.pais || 'Perú' : p.pais],
                        ['Contacto', p.contacto],
                        [
                            'Correo',
                            p.correo ? (
                                <a className="text-primary hover:underline" href={`mailto:${p.correo}`}>
                                    {p.correo}
                                </a>
                            ) : (
                                ''
                            ),
                        ],
                        ['Teléfono', p.telefono],
                        ['Dado de alta', `${dayTime(p.creado)}${p.creadoPor ? ` · ${nombre(p.creadoPor)}` : ''}`],
                    ]}
                />
            </FichaSeccion>

            <FichaSeccion titulo="Cuentas bancarias">
                {p.cuentas.length === 0 ? (
                    <p className="text-small text-ink-3">Sin cuentas registradas. Finanzas las necesita para pagar: agrégalas con «Editar».</p>
                ) : (
                    <ul className="flex flex-col divide-y divide-divider">
                        {p.cuentas.map((c, i) => (
                            <li key={i} className="py-2 text-ui">
                                <div className="font-medium">
                                    {c.banco} · {c.moneda}
                                </div>
                                <div className="text-small break-all text-ink-2">
                                    {[c.numero && `N° ${c.numero}`, c.cci && `CCI ${c.cci}`, c.swift && `SWIFT ${c.swift}`, c.iban && `IBAN ${c.iban}`]
                                        .filter(Boolean)
                                        .join(' · ')}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </FichaSeccion>

            <FichaSeccion titulo="Evaluación y retención">
                <Datos
                    filas={[
                        ['Evaluación financiera', etiquetaEvaluacion(p.evaluacion)],
                        ['Evaluó', p.evaluacionPor ? `${nombre(p.evaluacionPor)} · ${dayTime(p.evaluacionFecha)}` : ''],
                        ['Nota de Finanzas', p.evaluacionNota],
                        ...(p.origen === 'Nacional'
                            ? ([
                                  [
                                      'Verificado por Contabilidad',
                                      p.verificadoContab ? `${nombre(p.verificadoPor)} · ${dayTime(p.fechaVerificacion)}` : 'Aún no',
                                  ],
                                  ['Agente de retención', p.verificadoContab ? siNo(p.esAgenteRetencion) : ''],
                                  ['Buen contribuyente', p.verificadoContab ? siNo(p.esBuenContribuyente) : ''],
                              ] as [string, string][])
                            : []),
                    ]}
                />
            </FichaSeccion>

            <FichaSeccion titulo="Historial">
                <Historial tabla="proveedores" id={p.id} />
            </FichaSeccion>
            {editando && <FormProveedor proveedor={p} onCerrar={() => setEditando(false)} onGuardado={() => setEditando(false)} />}
        </Ficha>
    );
}
