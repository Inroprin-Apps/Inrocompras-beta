'use client';

// /cuadro/aprobar: solo las órdenes que esperan tu firma, en tarjetas grandes (pensada para el celular).
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { LINK_CLASS } from '@/shared/ui/button.tsx';
import { Encabezado } from '@/shared/ui/encabezado.tsx';
import { ListaVacia } from '@/shared/ui/lista-estado.tsx';
import { usePerfil } from '../../_components/perfil.tsx';
import { teTocaStore } from '../../_lib/stores.ts';
import { PorFirmar } from '../por-firmar.tsx';

export function AprobarView() {
    const perfil = usePerfil();
    const actualizado = teTocaStore.use().actualizado;
    const aprobador = perfil.roles.some((r) => r === 'CONTROL_GESTION' || r === 'GOP' || r === 'GAF');
    return (
        <div className="mx-auto w-full max-w-xl">
            <Encabezado titulo="Órdenes por firmar" actualizado={aprobador ? actualizado : null} />
            <Link href="/cuadro" className={`${LINK_CLASS} mb-4 inline-flex items-center gap-1 text-small`}>
                <ArrowLeft size={14} aria-hidden /> Cuadro de aprobaciones
            </Link>
            {aprobador ? (
                <PorFirmar titulo={false} />
            ) : (
                <ListaVacia titulo="Aquí firman Control de Gestión, la GOP y la GAF">
                    Tu perfil no valida ni aprueba órdenes. Puedes ver todas en Órdenes o en el Cuadro de aprobaciones.
                </ListaVacia>
            )}
        </div>
    );
}
