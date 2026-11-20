'use client';

// Lo que el área emisora completa mientras el requerimiento está En Proceso (update directo: RLS «editar» y las
// columnas que deja app.proteger): la cabecera y, por ítem, concepto, canal, fecha meta y plazo. Y el SKU del SIDIGE
// (ac_item_sku: Planeamiento, Compras o Importaciones, en cualquier estado).
import { useState } from 'react';
import { requerimientos } from '@/modules/requerimientos/composition.ts';
import {
    CANALES,
    TIPOS_COMPRA,
    aCabecera,
    aEdicionItem,
    faltaEnCabecera,
    faltaEnItem,
    type Canal,
    type CabeceraReq,
    type EdicionItem,
    type ItemRequerimiento,
    type Requerimiento,
    type TipoCompra,
} from '@/modules/requerimientos/application/views.ts';
import { Button } from '@/shared/ui/button.tsx';
import { Dialog } from '@/shared/ui/dialog.tsx';
import { Field, Input } from '@/shared/ui/field.tsx';
import { SelectMenu } from '@/shared/ui/select-menu.tsx';
import { toast } from '@/shared/ui/toaster.tsx';
import { ejecutarAccion } from '../_acciones/panel-acciones.tsx';
import { useBorrador } from '../_lib/borrador.ts';
import { refrescar } from '../_lib/resource.ts';
import { catalogosStore } from '../_lib/stores.ts';

function Pie({ onCerrar, onGuardar, guardando, texto }: { onCerrar: () => void; onGuardar: () => void; guardando: boolean; texto: string }) {
    return (
        <>
            <Button variant="secondary" onClick={onCerrar}>
                Volver
            </Button>
            <Button onClick={onGuardar} disabled={guardando}>
                {guardando ? 'Guardando…' : texto}
            </Button>
        </>
    );
}

const MensajeError = ({ error }: { error: string | null }) =>
    error ? (
        <p role="alert" className="text-small font-medium text-danger-strong">
            {error}
        </p>
    ) : null;

/** Los conceptos de la orden (catálogo), para el concepto general y el de cada ítem. */
function useConceptos() {
    const c = catalogosStore.use().data?.conceptos ?? [];
    return c.filter((x) => x.ambito === 'OC' || x.ambito === 'Item').map((x) => x.id);
}

export function FormCabecera({ req, onCerrar }: { req: Requerimiento; onCerrar: () => void }) {
    const empresas = catalogosStore.use().data?.empresas ?? [];
    const conceptos = useConceptos();
    const [f, setF, olvidar] = useBorrador<CabeceraReq>(`req:${req.id}`, aCabecera(req));
    const [error, setError] = useState<string | null>(null);
    const [guardando, setGuardando] = useState(false);
    const set = (p: Partial<CabeceraReq>) => setF({ ...f, ...p });

    async function guardar() {
        const falta = faltaEnCabecera(f);
        if (falta) return setError(falta);
        setGuardando(true);
        const r = await requerimientos().editarCabecera(req.id, f);
        setGuardando(false);
        if (r.isErr()) return setError(r.error.message);
        olvidar();
        toast.success('Requerimiento actualizado.');
        refrescar(['requerimientos', 'acciones']);
        onCerrar();
    }

    return (
        <Dialog abierto onCerrar={onCerrar} titulo="Completar el requerimiento" pie={<Pie onCerrar={onCerrar} onGuardar={() => void guardar()} guardando={guardando} texto="Guardar" />}>
            <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Empresa">
                    {(p) => <SelectMenu {...p} value={f.empresaId} onChange={(empresaId) => set({ empresaId })} options={empresas.map((e) => ({ value: e.id, label: e.razonSocial }))} />}
                </Field>
                <Field label="Tipo de compra">
                    {(p) => (
                        <SelectMenu
                            {...p}
                            value={f.tipoCompra ?? ''}
                            onChange={(t) => set({ tipoCompra: (t || null) as TipoCompra | null })}
                            placeholder="Elige el tipo"
                            options={TIPOS_COMPRA.map((t) => ({ value: t, label: t }))}
                        />
                    )}
                </Field>
            </div>
            <Field label="Destino" hint="Obra, almacén o sede a la que va la compra.">
                {(p) => <Input {...p} value={f.destino} onChange={(e) => set({ destino: e.target.value })} />}
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Dirección" optional>
                    {(p) => <Input {...p} value={f.direccion} onChange={(e) => set({ direccion: e.target.value })} />}
                </Field>
                <Field label="Receptor" optional hint="Quién recibe en el destino.">
                    {(p) => <Input {...p} value={f.receptor} onChange={(e) => set({ receptor: e.target.value })} />}
                </Field>
            </div>
            <Field label="Concepto general" optional hint="Vale para los ítems que no tengan su propio concepto.">
                {(p) => (
                    <SelectMenu
                        {...p}
                        value={f.conceptoGeneral}
                        onChange={(conceptoGeneral) => set({ conceptoGeneral })}
                        options={[{ value: '', label: 'Sin concepto general' }, ...conceptos.map((c) => ({ value: c, label: c }))]}
                    />
                )}
            </Field>
            <MensajeError error={error} />
        </Dialog>
    );
}

export function FormItemReq({ item, onCerrar }: { item: ItemRequerimiento; onCerrar: () => void }) {
    const conceptos = useConceptos();
    const [f, setF, olvidar] = useBorrador<EdicionItem>(`req-item:${item.id}`, aEdicionItem(item));
    const [error, setError] = useState<string | null>(null);
    const [guardando, setGuardando] = useState(false);
    const set = (p: Partial<EdicionItem>) => setF({ ...f, ...p });

    async function guardar() {
        const falta = faltaEnItem(f);
        if (falta) return setError(falta);
        setGuardando(true);
        const r = await requerimientos().editarItem(item.id, f);
        setGuardando(false);
        if (r.isErr()) return setError(r.error.message);
        olvidar();
        toast.success('Ítem actualizado.');
        refrescar(['requerimiento_items', 'acciones']);
        onCerrar();
    }

    return (
        <Dialog
            abierto
            onCerrar={onCerrar}
            titulo={`Ítem ${item.nItem ?? ''}`.trim()}
            descripcion={item.descripcion}
            pie={<Pie onCerrar={onCerrar} onGuardar={() => void guardar()} guardando={guardando} texto="Guardar" />}
        >
            <Field label="Concepto" optional hint="Si lo dejas vacío, vale el concepto general.">
                {(p) => (
                    <SelectMenu
                        {...p}
                        value={f.concepto}
                        onChange={(concepto) => set({ concepto })}
                        options={[{ value: '', label: 'El concepto general' }, ...conceptos.map((c) => ({ value: c, label: c }))]}
                    />
                )}
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Canal" optional>
                    {(p) => (
                        <SelectMenu
                            {...p}
                            value={f.canal ?? ''}
                            onChange={(c) => set({ canal: (c || null) as Canal | null })}
                            options={[{ value: '', label: 'Por definir' }, ...CANALES.map((c) => ({ value: c, label: c }))]}
                        />
                    )}
                </Field>
                <Field label="Fecha meta" optional hint="En almacén.">
                    {(p) => <Input {...p} type="date" value={f.fechaMeta ?? ''} onChange={(e) => set({ fechaMeta: e.target.value || null })} />}
                </Field>
                <Field label="Plazo de entrega (días)" optional>
                    {(p) => <Input {...p} inputMode="numeric" value={f.plazoEntregaDias} onChange={(e) => set({ plazoEntregaDias: e.target.value })} />}
                </Field>
            </div>
            <MensajeError error={error} />
        </Dialog>
    );
}

export function FormSku({ item, onCerrar }: { item: ItemRequerimiento; onCerrar: () => void }) {
    const [codigo, setCodigo] = useState(item.codigoSidige);
    const [error, setError] = useState<string | null>(null);
    const [guardando, setGuardando] = useState(false);
    async function guardar() {
        setGuardando(true);
        const r = await ejecutarAccion('ac_item_sku', { p_item: item.id, p_codigo: codigo.trim() });
        setGuardando(false);
        if (r.isErr()) return setError(r.error.message);
        toast.success(codigo.trim() ? 'SKU asignado.' : 'SKU quitado.');
        refrescar(['requerimiento_items', 'acciones']);
        onCerrar();
    }
    return (
        <Dialog
            abierto
            onCerrar={onCerrar}
            titulo="SKU del SIDIGE"
            descripcion={item.descripcion}
            pie={<Pie onCerrar={onCerrar} onGuardar={() => void guardar()} guardando={guardando} texto="Guardar SKU" />}
        >
            <Field label="Código" hint="El que da el generador de códigos (ME00…). Vacío lo quita.">
                {(p) => <Input {...p} value={codigo} onChange={(e) => setCodigo(e.target.value.toUpperCase())} />}
            </Field>
            <MensajeError error={error} />
        </Dialog>
    );
}
