'use client';

// La ficha de un ítem para Técnica (?ver=<item_id>, como enlaza la bandeja): qué es, de qué requerimiento, su
// validación actual, el formulario para registrarla (si eres de Técnica) y su historial.
import { useState } from 'react';
import Link from 'next/link';
import { TECNICA_VACIA, faltaEnTecnica, tonoValidacion, type FormTecnica, type ItemTecnica } from '@/modules/requerimientos/application/views.ts';
import { Notice } from '@/shared/ui/bits.tsx';
import { Button, LINK_CLASS } from '@/shared/ui/button.tsx';
import { Chip } from '@/shared/ui/card.tsx';
import { Datos, Ficha, FichaSeccion } from '@/shared/ui/ficha.tsx';
import { dayTime, dmy } from '@/shared/ui/format.ts';
import { Hueco } from '@/shared/ui/hueco.tsx';
import { toast } from '@/shared/ui/toaster.tsx';
import { Historial } from '../_acciones/historial.tsx';
import { personasStore } from '../_lib/stores.ts';
import { CamposTecnica, validarItems } from './form-tecnica.tsx';
import { itemTecnicaStore } from './store.ts';

const fmtNum = new Intl.NumberFormat('es-PE', { maximumFractionDigits: 3 });

export function FichaItemTecnica({ id, valida, onCerrar }: { id: string; valida: boolean; onCerrar: () => void }) {
    const { data, error } = itemTecnicaStore.use(id);
    if (error)
        return (
            <Ficha titulo="Ítem" onCerrar={onCerrar}>
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
                    <Hueco className="h-16 w-full" />
                    <Hueco className="h-32 w-full" />
                </div>
            </Ficha>
        );
    return <Cargada key={data.id} i={data} valida={valida} onCerrar={onCerrar} />;
}

function Cargada({ i, valida, onCerrar }: { i: ItemTecnica; valida: boolean; onCerrar: () => void }) {
    const gente = personasStore.use().data ?? [];
    const nombre = (x: string | null) => (x ? (gente.find((g) => g.id === x)?.nombre ?? '') : '');
    const [f, setF] = useState<FormTecnica>({ ...TECNICA_VACIA, marca: i.marca, modelo: i.modelo });
    const [error, setError] = useState<string | null>(null);
    const [haciendo, setHaciendo] = useState(false);
    const abierto = !i.anulado && (i.req.estado === 'En Proceso' || i.req.estado === 'Emitido');

    async function registrar() {
        const falta = faltaEnTecnica(f);
        if (falta) return setError(falta);
        setHaciendo(true);
        const [fallo] = await validarItems([i], f);
        setHaciendo(false);
        if (fallo) return setError(fallo.mensaje);
        setError(null);
        toast.success(`Ítem ${f.resultado.toLowerCase()}.`);
    }

    return (
        <Ficha
            titulo={i.descripcion}
            subtitulo={`${i.req.numero || 'Requerimiento en proceso'} · ítem ${i.nItem ?? '—'}`}
            estado={<Chip tone={i.anulado ? 'danger' : tonoValidacion(i.validacionTecnica)}>{i.anulado ? 'Anulado' : i.validacionTecnica}</Chip>}
            onCerrar={onCerrar}
        >
            {valida && abierto && (
                <div className="flex flex-col gap-4 border-b border-divider px-5 py-4">
                    <div className="flex flex-col gap-4 rounded-card border border-primary-line bg-primary-soft px-4 py-3.5">
                        <p className="text-small font-semibold text-primary-strong">Lo que te toca</p>
                        <CamposTecnica f={f} onChange={setF} />
                        {error && (
                            <p role="alert" className="text-small font-medium text-danger-strong">
                                {error}
                            </p>
                        )}
                        <div>
                            <Button onClick={() => void registrar()} disabled={haciendo}>
                                {haciendo ? 'Registrando…' : `Registrar ${f.resultado.toLowerCase()}`}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
            <FichaSeccion titulo="Ítem">
                <Datos
                    filas={[
                        ['Cantidad', `${fmtNum.format(i.cantidad)} ${i.unidad}`],
                        ['Tipo', i.tipo],
                        ['Código cliente', i.codigoCliente],
                        ['SKU del SIDIGE', i.codigoSidige],
                        ['Canal', i.canal ?? ''],
                        ['Fecha meta', i.fechaMeta ? dmy(i.fechaMeta) : ''],
                        [
                            'Requerimiento',
                            <Link key="rq" href={`/requerimientos?ver=${i.req.id}`} className={LINK_CLASS}>
                                {i.req.numero || 'En proceso'}
                            </Link>,
                        ],
                        ['Motivo', i.req.motivo],
                    ]}
                />
            </FichaSeccion>
            <FichaSeccion titulo="Validación técnica">
                <Datos
                    filas={[
                        ['Resultado', i.validacionTecnica],
                        ['Marca', i.marca],
                        ['Modelo', i.modelo],
                        ['Comentario', i.tecMotivo],
                        ['Registró', i.tecPor ? `${nombre(i.tecPor)} · ${dayTime(i.tecFecha)}` : ''],
                    ]}
                />
            </FichaSeccion>
            <FichaSeccion titulo="Historial">
                <Historial tabla="requerimiento_items" id={i.id} />
            </FichaSeccion>
        </Ficha>
    );
}
