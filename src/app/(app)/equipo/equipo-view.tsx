'use client';

// Equipo (administrador): quién entró, su área, jefe, ámbito, roles y si está activo. Filtros y la persona abierta en
// la URL (?filtro=&texto=&ver=). Guardar llama a ac_equipo_guardar (todo o nada, con historial; 0005): la base no deja
// la app sin administrador ni a nadie como su propio jefe, y su motivo se muestra tal cual.
import { useMemo, useState } from 'react';
import {
    FILTROS_EQUIPO,
    datosDe,
    etiquetaCambio,
    filtrarEquipo,
    hayCambios,
    sinArea,
    valorCambio,
    type DatosEquipo,
    type FiltroEquipo,
    type Miembro,
} from '@/modules/equipo/application/views.ts';
import { equipo } from '@/modules/equipo/composition.ts';
import { AMBITOS, AREAS, ROLES, rolLabel } from '@/shared/tipos.ts';
import { FilterRow, Notice, SearchBox, SectionTitle, T } from '@/shared/ui/bits.tsx';
import { Button } from '@/shared/ui/button.tsx';
import { Chip } from '@/shared/ui/card.tsx';
import { Checkbox, Field } from '@/shared/ui/field.tsx';
import { Ficha, FichaSeccion } from '@/shared/ui/ficha.tsx';
import { dayTime } from '@/shared/ui/format.ts';
import { Hueco } from '@/shared/ui/hueco.tsx';
import { Lista, ListaVacia } from '@/shared/ui/lista-estado.tsx';
import { Pager, usePaged } from '@/shared/ui/pager.tsx';
import { SelectMenu } from '@/shared/ui/select-menu.tsx';
import { toast } from '@/shared/ui/toaster.tsx';
import { usePerfil } from '../_components/perfil.tsx';
import { refrescar } from '../_lib/resource.ts';
import { urlState } from '../_lib/url-state.ts';
import { equipoStore, historialEquipoStore } from './store.ts';

const vista$ = urlState(
    { filtro: 'todas' as FiltroEquipo, texto: '', page: '1', ver: '' },
    { filtro: 'filtro', texto: 'texto', page: 'pag', ver: 'ver' },
    { filtro: FILTROS_EQUIPO },
);

export function EquipoView() {
    const perfil = usePerfil();
    if (!perfil.es_admin)
        return (
            <>
                <SectionTitle title="Equipo" />
                <Notice tone="info" cerrable={false}>
                    Solo el administrador asigna áreas y roles. Si necesitas un cambio, pídeselo.
                </Notice>
            </>
        );
    return <EquipoAdmin yo={perfil.id} />;
}

function EquipoAdmin({ yo }: { yo: string }) {
    const estado = equipoStore.use();
    const v = vista$.use();
    const personas = useMemo(() => estado.data ?? [], [estado.data]);
    const nombre = useMemo(() => new Map(personas.map((p) => [p.id, p.nombre])), [personas]);
    const lista = useMemo(() => (estado.data ? filtrarEquipo(estado.data, v.filtro, v.texto) : null), [estado.data, v.filtro, v.texto]);
    const pag = usePaged(lista ?? [], lista, 30, vista$.usePage());
    const abierta = personas.find((p) => p.id === v.ver) ?? null;
    const etiquetas: Record<FiltroEquipo, string> = {
        todas: `Todas (${personas.length})`,
        'sin-area': `Sin área (${sinArea(personas)})`,
        inactivas: 'Desactivadas',
    };

    return (
        <>
            <SectionTitle title="Equipo" />
            <FilterRow>
                <SearchBox value={v.texto} onChange={(texto) => vista$.set({ texto })} placeholder="Busca por nombre, correo, área o rol" />
                <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar">
                    {FILTROS_EQUIPO.map((k) => (
                        <Button
                            key={k}
                            variant={v.filtro === k ? 'primary' : 'secondary'}
                            onClick={() => vista$.set({ filtro: k })}
                            aria-pressed={v.filtro === k}
                        >
                            {etiquetas[k]}
                        </Button>
                    ))}
                </div>
            </FilterRow>
            <Lista
                estado={{ data: lista, error: estado.error }}
                onReintentar={() => void equipoStore.retry()}
                vacia={
                    <ListaVacia titulo={personas.length ? 'Nadie coincide' : 'Aún no entra nadie'}>
                        {personas.length ? 'Prueba con otra búsqueda o cambia el filtro.' : 'Cada persona aparece aquí la primera vez que inicia sesión.'}
                    </ListaVacia>
                }
            >
                {() => (
                    <>
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
                                    {pag.rows.map((p) => (
                                        <tr
                                            key={p.id}
                                            tabIndex={0}
                                            aria-selected={v.ver === p.id}
                                            className={`${T.row} cursor-pointer ${v.ver === p.id ? 'bg-primary-soft' : ''}`}
                                            onClick={() => vista$.set({ ver: p.id })}
                                            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), vista$.set({ ver: p.id }))}
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
                                                    {p.roles.length ? (
                                                        p.roles.map((r) => (
                                                            <Chip key={r} tone={r === 'ADMIN' ? 'info' : 'muted'}>
                                                                {rolLabel(r)}
                                                            </Chip>
                                                        ))
                                                    ) : (
                                                        <span className="text-ink-3">—</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className={T.td}>{p.jefeId ? nombre.get(p.jefeId) : <span className="text-ink-3">—</span>}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <Pager paged={pag} />
                    </>
                )}
            </Lista>
            {abierta && <FichaMiembro key={abierta.id} persona={abierta} personas={personas} nombre={nombre} onCerrar={() => vista$.set({ ver: '' })} />}
        </>
    );
}

function FichaMiembro({ persona, personas, nombre, onCerrar }: { persona: Miembro; personas: Miembro[]; nombre: Map<string, string>; onCerrar: () => void }) {
    const [d, setD] = useState<DatosEquipo>(() => datosDe(persona));
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const hist = historialEquipoStore.use(persona.id);
    const set = (patch: Partial<DatosEquipo>) => (setD({ ...d, ...patch }), setError(null));

    async function guardar() {
        setGuardando(true);
        const r = await equipo().guardar(persona.id, d);
        setGuardando(false);
        if (r.isErr()) return setError(r.error.message);
        toast.success(`Guardado: ${persona.nombre}`);
        refrescar(['usuarios', 'usuario_roles']);
    }

    return (
        <Ficha
            titulo={persona.nombre}
            subtitulo={persona.email}
            estado={
                <div className="flex flex-wrap gap-1.5">
                    {persona.area === 'Sin área' ? <Chip tone="warn">Sin área</Chip> : <Chip tone="muted">{persona.area}</Chip>}
                    {!persona.activo && <Chip tone="muted">Desactivada</Chip>}
                </div>
            }
            onCerrar={onCerrar}
        >
            <FichaSeccion titulo="Área, jefe y roles">
                <div className="flex flex-col gap-4">
                    <Field label="Área">
                        {(p) => <SelectMenu {...p} value={d.area} onChange={(area) => set({ area })} options={AREAS.map((a) => ({ value: a, label: a }))} />}
                    </Field>
                    <Field label="Jefe" optional hint="Libera las solicitudes administrativas y decide anulaciones por error de emisión.">
                        {(p) => (
                            <SelectMenu
                                {...p}
                                value={d.jefeId ?? ''}
                                onChange={(j) => set({ jefeId: j || null })}
                                placeholder="Sin jefe"
                                options={[
                                    { value: '', label: 'Sin jefe' },
                                    ...personas.filter((x) => x.id !== persona.id && x.activo).map((x) => ({ value: x.id, label: x.nombre })),
                                ]}
                            />
                        )}
                    </Field>
                    <Field label="Ámbito" hint="Qué compras ve en su bandeja y su menú.">
                        {(p) => (
                            <SelectMenu
                                {...p}
                                value={d.ambito}
                                onChange={(ambito) => set({ ambito })}
                                options={AMBITOS.map((a) => ({ value: a.value, label: a.label }))}
                            />
                        )}
                    </Field>
                    <fieldset className="flex flex-col gap-2.5">
                        <legend className="mb-1.5 text-ui font-medium">Roles</legend>
                        {ROLES.map((r) => (
                            <Checkbox
                                key={r.value}
                                label={r.label}
                                hint={r.detail}
                                checked={d.roles.includes(r.value)}
                                onChange={(e) => set({ roles: e.target.checked ? [...d.roles, r.value] : d.roles.filter((x) => x !== r.value) })}
                            />
                        ))}
                    </fieldset>
                    <Checkbox
                        label="Activo"
                        hint="Desactivada, la persona no hace acciones ni ve precios."
                        checked={d.activo}
                        onChange={(e) => set({ activo: e.target.checked })}
                    />
                    {error && (
                        <p role="alert" className="text-small font-medium text-danger-strong">
                            {error}
                        </p>
                    )}
                    <Button onClick={() => void guardar()} disabled={!hayCambios(persona, d) || guardando}>
                        {guardando ? 'Guardando…' : 'Guardar cambios'}
                    </Button>
                </div>
            </FichaSeccion>
            <FichaSeccion titulo="Historial">
                {hist.error ? (
                    <p className="text-small text-danger-strong">No se pudo cargar el historial. {hist.error}</p>
                ) : !hist.data ? (
                    <Hueco className="h-16 w-full" />
                ) : hist.data.length === 0 ? (
                    <p className="text-small text-ink-3">Sin cambios todavía.</p>
                ) : (
                    <ul className="flex flex-col gap-2">
                        {hist.data.map((c) => (
                            <li key={c.id} className="text-small">
                                <span className="font-medium">{etiquetaCambio(c.accion)}</span>: {valorCambio(c, c.de, (id) => nombre.get(id))} →{' '}
                                {valorCambio(c, c.a, (id) => nombre.get(id))}
                                <div className="text-caption text-ink-3">
                                    {dayTime(c.ts)} · {c.usuarioId ? (nombre.get(c.usuarioId) ?? 'Otra persona') : 'Sistema'}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </FichaSeccion>
        </Ficha>
    );
}
