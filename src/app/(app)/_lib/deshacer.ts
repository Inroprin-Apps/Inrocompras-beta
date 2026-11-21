'use client';

// Borrar con «Deshacer» en vez de preguntar «¿Estás seguro?» (guía, «Estado»: preguntar antes se responde sin leer;
// deshacer después arregla el error de verdad). Sirve para lo que se borra de verdad (una etapa, un gasto, una
// línea, un borrador), no para las acciones de estado (anular, rechazar): esas piden motivo en el panel de acciones.
//
// Cómo funciona: la fila se oculta al momento y el aviso ofrece «Deshacer» durante 5 s. Si nadie lo pulsa (o se cierra
// el aviso), recién entonces se borra en la base. Si se cierra la pestaña antes, no se borra nada: lo seguro.
//
//   const { ocultos, borrar } = useBorrarConDeshacer();
//   lista.filter((x) => !ocultos.has(x.id))
//   borrar(x.id, { aviso: `Etapa ${x.nombre} quitada.`, ejecutar: () => proyectos().quitarEtapa(x.id), tocadas: ['etapas'] });
import { useCallback, useState } from 'react';
import type { Result } from 'neverthrow';
import type { ErrorFuente } from '@/shared/errores.ts';
import { toast } from '@/shared/ui/toaster.tsx';
import { refrescar } from './resource.ts';

export const SEGUNDOS_DESHACER = 5;

export function useBorrarConDeshacer() {
    const [ocultos, setOcultos] = useState<ReadonlySet<string>>(() => new Set());
    const mostrar = useCallback(
        (id: string) =>
            setOcultos((s) => {
                const n = new Set(s);
                n.delete(id);
                return n;
            }),
        [],
    );
    const borrar = useCallback(
        (
            id: string,
            { aviso, ejecutar, tocadas = [] }: { aviso: string; ejecutar: () => Promise<Result<unknown, ErrorFuente>>; tocadas?: readonly string[] },
        ) => {
            setOcultos((s) => new Set(s).add(id));
            let resuelto = false;
            const confirmar = async () => {
                if (resuelto) return;
                resuelto = true;
                const r = await ejecutar();
                if (r.isErr()) {
                    mostrar(id);
                    toast.error(`No se pudo borrar: ${r.error.message}`);
                    return;
                }
                // Se queda oculto: la recarga ya no lo trae.
                refrescar([...tocadas, 'acciones', 'te_toca']);
            };
            toast(aviso, {
                duration: SEGUNDOS_DESHACER * 1000,
                action: {
                    label: 'Deshacer',
                    onClick: () => {
                        if (resuelto) return;
                        resuelto = true;
                        mostrar(id);
                    },
                },
                onAutoClose: () => void confirmar(),
                onDismiss: () => void confirmar(),
            });
        },
        [mostrar],
    );
    return { ocultos, borrar };
}
