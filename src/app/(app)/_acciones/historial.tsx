'use client';

// El historial de un registro: quién, cuándo, de qué a qué y por qué (la tabla historial de la base).
import { historial } from '@/modules/comun/composition.ts';
import { nombreAccion } from '@/modules/comun/application/views.ts';
import { dayTime } from '@/shared/ui/format.ts';
import { Hueco } from '@/shared/ui/hueco.tsx';
import { keyed } from '../_lib/resource.ts';
import { personasStore } from '../_lib/stores.ts';

const historialStore = keyed((k) => {
    const [tabla, id] = k.split(':');
    return historial().de(tabla, id);
}, ['acciones']);

export function Historial({ tabla, id }: { tabla: string; id: string }) {
    const { data, error } = historialStore.use(`${tabla}:${id}`);
    const gente = personasStore.use().data;
    const nombre = (u: string | null) => (u ? (gente?.find((p) => p.id === u)?.nombre ?? 'Otra persona') : 'Sistema');
    if (error) return <p className="text-small text-danger-strong">{error}</p>;
    if (!data) return <Hueco className="h-16 w-full" />;
    if (!data.length) return <p className="text-small text-ink-3">Sin movimientos todavía.</p>;
    return (
        <ol className="flex flex-col gap-2.5">
            {data.map((c) => (
                <li key={c.id} className="border-l-2 border-divider pl-3 text-small">
                    <div>
                        <span className="font-medium">{nombreAccion(c.accion)}</span>
                        {(c.de || c.a) && (
                            <span className="text-ink-2">
                                {' '}
                                {c.de ? `${c.de} → ` : ''}
                                {c.a}
                            </span>
                        )}
                    </div>
                    {c.motivo && <div className="text-ink-2">«{c.motivo}»</div>}
                    <div className="text-caption text-ink-3">
                        {dayTime(c.ts)} · {nombre(c.usuarioId)}
                    </div>
                </li>
            ))}
        </ol>
    );
}
