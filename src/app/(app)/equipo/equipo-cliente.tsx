'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { supabaseNavegador } from '@/shared/supabase/client.ts';
import { AMBITOS, AREAS, ROLES, motivo, rolLabel } from '@/shared/tipos.ts';
import { Button } from '@/shared/ui/button.tsx';
import { Chip } from '@/shared/ui/card.tsx';
import { FilterRow, SearchBox, T } from '@/shared/ui/bits.tsx';
import { Checkbox, Field } from '@/shared/ui/field.tsx';
import { SelectMenu } from '@/shared/ui/select-menu.tsx';
import { dayTime, plain } from '@/shared/ui/format.ts';
import { toast } from '@/shared/ui/toaster.tsx';

export interface Persona {
    id: string;
    email: string;
    nombre: string;
    area: string;
    jefe_id: string | null;
    ambito: string;
    activo: boolean;
    creado: string;
    roles: string[];
}

interface Cambio {
    id: number;
    accion: string;
    de: string | null;
    a: string | null;
    usuario_id: string | null;
    ts: string;
}

const ACCION: Record<string, string> = {
    equipo_area: 'Área',
    equipo_jefe: 'Jefe',
    equipo_ambito: 'Ámbito',
    equipo_activo: 'Activo',
    equipo_roles: 'Roles',
    alta_admin_inicial: 'Alta como administrador',
};

export function EquipoCliente({ personas, yo }: { personas: Persona[]; yo: string }) {
    const [q, setQ] = useState('');
    const [filtro, setFiltro] = useState<'todas' | 'sin-area' | 'inactivas'>('todas');
    const [elegida, setElegida] = useState<string | null>(null);
    const nombre = useMemo(() => new Map(personas.map((p) => [p.id, p.nombre])), [personas]);

    const lista = personas.filter((p) => {
        if (filtro === 'sin-area' && p.area !== 'Sin área') return false;
        if (filtro === 'inactivas' && p.activo) return false;
        const t = plain(`${p.nombre} ${p.email} ${p.area} ${p.roles.map(rolLabel).join(' ')}`);
        return plain(q).split(/\s+/).every((w) => t.includes(w));
    });
    const sinArea = personas.filter((p) => p.area === 'Sin área' && p.activo).length;
    const persona = personas.find((p) => p.id === elegida) ?? null;

    return (
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
            <div className="min-w-0 flex-1">
                <FilterRow>
                    <SearchBox value={q} onChange={setQ} placeholder="Busca por nombre, correo, área o rol" />
                    <div className="flex gap-1.5" role="group" aria-label="Filtrar">
                        {(
                            [
                                ['todas', `Todas (${personas.length})`],
                                ['sin-area', `Sin área (${sinArea})`],
                                ['inactivas', 'Desactivadas'],
                            ] as const
                        ).map(([k, l]) => (
                            <Button key={k} variant={filtro === k ? 'primary' : 'secondary'} onClick={() => setFiltro(k)} aria-pressed={filtro === k}>
                                {l}
                            </Button>
                        ))}
                    </div>
                </FilterRow>
                {lista.length === 0 ? (
                    <p className="rounded-card border border-line bg-surface px-4 py-8 text-center text-ui text-ink-2">
                        {personas.length === 0 ? 'Aún no entra nadie. Cada persona aparece aquí la primera vez que inicia sesión.' : 'Nadie coincide con la búsqueda.'}
                    </p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className={T.table}>
                            <thead>
                                <tr className={T.headRow}>
                                    <th className={T.th}>Persona</th>
                                    <th className={T.th}>Área</th>
                                    <th className={T.th}>Roles</th>
                                    <th className={T.th}>Jefe</th>
                                </tr>
                            </thead>
                            <tbody>
                                {lista.map((p) => (
                                    <tr
                                        key={p.id}
                                        className={`${T.row} cursor-pointer ${elegida === p.id ? 'bg-primary-soft' : ''}`}
                                        onClick={() => setElegida(p.id)}
                                        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), setElegida(p.id))}
                                        tabIndex={0}
                                        aria-selected={elegida === p.id}
                                    >
                                        <td className={T.td}>
                                            <div className="font-medium">
                                                {p.nombre}
                                                {p.id === yo && <span className="ml-1.5 font-normal text-ink-3">(tú)</span>}
                                            </div>
                                            <div className={T.sub}>{p.email}</div>
                                        </td>
                                        <td className={T.td}>
                                            {p.area === 'Sin área' ? <Chip tone="warn">Sin área</Chip> : p.area}
                                            {!p.activo && (
                                                <div className="mt-1">
                                                    <Chip tone="muted">Desactivada</Chip>
                                                </div>
                                            )}
                                        </td>
                                        <td className={T.td}>
                                            <div className="flex flex-wrap gap-1">
                                                {p.roles.length ? p.roles.map((r) => <Chip key={r} tone={r === 'ADMIN' ? 'info' : 'muted'}>{rolLabel(r)}</Chip>) : <span className="text-ink-3">—</span>}
                                            </div>
                                        </td>
                                        <td className={T.td}>{p.jefe_id ? nombre.get(p.jefe_id) : <span className="text-ink-3">—</span>}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
            {persona && <Editor key={persona.id} persona={persona} personas={personas} nombre={nombre} onCerrar={() => setElegida(null)} />}
        </div>
    );
}

function Editor({ persona, personas, nombre, onCerrar }: { persona: Persona; personas: Persona[]; nombre: Map<string, string>; onCerrar: () => void }) {
    const router = useRouter();
    const [area, setArea] = useState(persona.area);
    const [jefe, setJefe] = useState(persona.jefe_id ?? '');
    const [ambito, setAmbito] = useState(persona.ambito);
    const [activo, setActivo] = useState(persona.activo);
    const [roles, setRoles] = useState<string[]>(persona.roles);
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [historial, setHistorial] = useState<Cambio[] | null>(null);
    const [errorHist, setErrorHist] = useState(false);

    useEffect(() => {
        let vivo = true;
        supabaseNavegador()
            .from('historial')
            .select('id, accion, de, a, usuario_id, ts')
            .eq('tabla', 'usuarios')
            .eq('registro_id', persona.id)
            .order('ts', { ascending: false })
            .limit(20)
            .then(({ data, error: e }) => {
                if (!vivo) return;
                if (e) setErrorHist(true);
                else setHistorial(data as Cambio[]);
            });
        return () => {
            vivo = false;
        };
    }, [persona.id]);

    const cambiado =
        area !== persona.area || (jefe || null) !== persona.jefe_id || ambito !== persona.ambito || activo !== persona.activo || [...roles].sort().join() !== persona.roles.join();

    async function guardar() {
        setGuardando(true);
        setError(null);
        const { error: e } = await supabaseNavegador().rpc('ac_equipo_guardar', {
            p_usuario: persona.id,
            p_area: area,
            p_jefe: jefe || null,
            p_ambito: ambito,
            p_activo: activo,
            p_roles: roles,
        });
        setGuardando(false);
        if (e) {
            setError(motivo(e));
            return;
        }
        toast.success(`Guardado: ${persona.nombre}`);
        router.refresh();
    }

    const valorHist = (c: Cambio, v: string | null) => (c.accion === 'equipo_jefe' ? (v ? nombre.get(v) ?? '—' : '—') : c.accion === 'equipo_activo' ? (v === 'true' ? 'Sí' : 'No') : v || '—');

    return (
        <aside aria-label={`Editar a ${persona.nombre}`} className="w-full flex-none rounded-card border border-line bg-surface lg:sticky lg:top-4 lg:w-[380px]">
            <div className="flex items-start gap-2 border-b border-divider px-5 py-4">
                <div className="min-w-0 flex-1">
                    <h2 className="truncate text-heading font-semibold">{persona.nombre}</h2>
                    <p className="truncate text-small text-ink-2">{persona.email}</p>
                </div>
                <Button variant="ghost" iconOnly aria-label="Cerrar" onClick={onCerrar}>
                    <X size={18} />
                </Button>
            </div>
            <div className="flex flex-col gap-4 px-5 py-4">
                <Field label="Área">{(p) => <SelectMenu {...p} value={area} onChange={setArea} options={AREAS.map((a) => ({ value: a, label: a }))} />}</Field>
                <Field label="Jefe" optional hint="Libera las solicitudes administrativas y decide anulaciones por error de emisión.">
                    {(p) => (
                        <SelectMenu
                            {...p}
                            value={jefe}
                            onChange={setJefe}
                            placeholder="Sin jefe"
                            options={[{ value: '', label: 'Sin jefe' }, ...personas.filter((x) => x.id !== persona.id && x.activo).map((x) => ({ value: x.id, label: x.nombre }))]}
                        />
                    )}
                </Field>
                <Field label="Ámbito" hint="Qué compras ve en su bandeja y su menú.">
                    {(p) => <SelectMenu {...p} value={ambito} onChange={setAmbito} options={AMBITOS.map((a) => ({ value: a.value, label: a.label }))} />}
                </Field>
                <fieldset className="flex flex-col gap-2.5">
                    <legend className="mb-1.5 text-ui font-medium">Roles</legend>
                    {ROLES.map((r) => (
                        <Checkbox
                            key={r.value}
                            label={r.label}
                            hint={r.detail}
                            checked={roles.includes(r.value)}
                            onChange={(e) => setRoles((xs) => (e.target.checked ? [...xs, r.value] : xs.filter((x) => x !== r.value)))}
                        />
                    ))}
                </fieldset>
                <Checkbox label="Activo" hint="Desactivada, la persona no hace acciones ni ve precios." checked={activo} onChange={(e) => setActivo(e.target.checked)} />
                {error && (
                    <p role="alert" className="text-small font-medium text-danger-strong">
                        {error}
                    </p>
                )}
                <Button onClick={guardar} disabled={!cambiado || guardando}>
                    {guardando ? 'Guardando…' : 'Guardar cambios'}
                </Button>
            </div>
            <div className="border-t border-divider px-5 py-4">
                <h3 className="mb-2 text-ui font-semibold">Historial</h3>
                {errorHist ? (
                    <p className="text-small text-danger-strong">No se pudo cargar el historial.</p>
                ) : historial === null ? (
                    <p className="text-small text-ink-3">Cargando…</p>
                ) : historial.length === 0 ? (
                    <p className="text-small text-ink-3">Sin cambios todavía.</p>
                ) : (
                    <ul className="flex flex-col gap-2">
                        {historial.map((c) => (
                            <li key={c.id} className="text-small">
                                <span className="font-medium">{ACCION[c.accion] ?? c.accion}</span>: {valorHist(c, c.de)} → {valorHist(c, c.a)}
                                <div className="text-caption text-ink-3">
                                    {dayTime(c.ts)} · {c.usuario_id ? nombre.get(c.usuario_id) ?? 'Otra persona' : 'Sistema'}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </aside>
    );
}
