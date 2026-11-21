'use client';

// El checklist de documentos ([_Checklist] del AppSheet): un documento cuenta si se marca o si se sube su archivo.
// Se marca en Borrador (0050); con todo cumplido aparece «Documentos completos» en «Lo que te toca».
import { useState } from 'react';
import { CircleCheck, CircleDashed } from 'lucide-react';
import { desaduanajes } from '@/modules/desaduanaje/composition.ts';
import { checklist, faltantes, type Checklist, type DesaduanajeDetalle, type ItemChecklist } from '@/modules/desaduanaje/application/views.ts';
import { Chip } from '@/shared/ui/card.tsx';
import { Checkbox } from '@/shared/ui/field.tsx';
import { toast } from '@/shared/ui/toaster.tsx';
import { refrescar } from '../_lib/resource.ts';

export function ChecklistDes({ d, edita }: { d: DesaduanajeDetalle; edita: boolean }) {
    const [guardando, setGuardando] = useState<string | null>(null);
    // Lo marcado se ve al instante; si la base no lo acepta, vuelve a lo que dice la base.
    const [local, setLocal] = useState<Partial<Checklist>>({});
    const vista = { ...d, chk: { ...d.chk, ...local } };
    const items = checklist(vista, d.tiposSubidos);
    const falta = faltantes(vista, d.tiposSubidos);
    const marcable = edita && d.estado === 'Borrador';

    async function marcar(i: ItemChecklist, valor: boolean) {
        setGuardando(i.campo);
        setLocal((x) => ({ ...x, [i.campo]: valor }));
        const r = await desaduanajes().marcar(d.id, i.campo, valor);
        setGuardando(null);
        if (r.isErr()) {
            setLocal(({ [i.campo]: _, ...resto }) => resto);
            return toast.error(r.error.message);
        }
        refrescar(['desaduanajes', 'acciones', 'te_toca']);
    }

    return (
        <div className="flex flex-col gap-2.5">
            <p className={`text-small font-medium ${falta.length ? 'text-warning-strong' : 'text-success-strong'}`}>
                {falta.length ? `Falta: ${falta.join(', ')}.` : 'Documentos completos.'}
            </p>
            <ul className="flex flex-col divide-y divide-divider">
                {items.map((i) => (
                    <li key={i.campo} className="flex items-center gap-3 py-2">
                        <div className="min-w-0 flex-1">
                            {marcable ? (
                                <Checkbox
                                    label={i.etiqueta}
                                    hint={i.subido ? 'Ya está subido en Documentos.' : undefined}
                                    checked={i.marcado}
                                    disabled={guardando !== null}
                                    onChange={(e) => void marcar(i, e.target.checked)}
                                />
                            ) : (
                                <span className="flex items-center gap-2 text-ui">
                                    {i.cumple ? (
                                        <CircleCheck size={16} className="text-success-strong" aria-hidden />
                                    ) : (
                                        <CircleDashed size={16} className="text-ink-3" aria-hidden />
                                    )}
                                    {i.etiqueta}
                                </span>
                            )}
                        </div>
                        {i.subido ? <Chip tone="ok">Subido</Chip> : i.marcado ? <Chip tone="info">Marcado</Chip> : <Chip tone="muted">Pendiente</Chip>}
                    </li>
                ))}
            </ul>
            {marcable && (
                <p className="text-small text-ink-3">
                    Marca lo que ya tienes o súbelo en Documentos con su tipo.{' '}
                    {d.requierePermiso ? '' : 'Si la mercadería requiere permiso (MTC, DIGESA), indícalo en Datos del embarque.'}
                </p>
            )}
        </div>
    );
}
