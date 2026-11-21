'use client';

// El legajo de una orden o un desaduanaje: la lista (con su paso a Drive) y la subida. Lo usan las fichas de
// Órdenes, Pagos y Desaduanaje: <Documentos dueno={{ ordenId }} tipos={TIPOS_ORDEN} tocadas={['ordenes','pagos']} />.
// Al subir una factura con monto, la base pide sola la cuota que calza: por eso refresca pagos y órdenes.
// Si el lector propuso datos (lectura_estado = 'Leído'), la persona los revisa y confirma aquí.
import { useState } from 'react';
import { ExternalLink, FileText, ScanText } from 'lucide-react';
import { documentos } from '@/modules/documentos/composition.ts';
import {
    ACEPTA,
    etiquetaEstadoDoc,
    pideMonto,
    tonoDoc,
    type Documento,
    type Dueno,
    type Lectura,
    type TipoDoc,
} from '@/modules/documentos/application/views.ts';
import { Button, LINK_CLASS } from '@/shared/ui/button.tsx';
import { Chip } from '@/shared/ui/card.tsx';
import { Dialog } from '@/shared/ui/dialog.tsx';
import { DropZone } from '@/shared/ui/drop-zone.tsx';
import { Field, Input } from '@/shared/ui/field.tsx';
import { dmy, money } from '@/shared/ui/format.ts';
import { Hueco } from '@/shared/ui/hueco.tsx';
import { SelectMenu } from '@/shared/ui/select-menu.tsx';
import { toast } from '@/shared/ui/toaster.tsx';
import { keyed, refrescar } from '../_lib/resource.ts';

const claveDe = (d: Dueno) => ('ordenId' in d ? `o:${d.ordenId}` : 'desaduanajeId' in d ? `d:${d.desaduanajeId}` : `i:${d.solicitudItemId}`);
const duenoDe = (k: string): Dueno => {
    const [t, id] = [k.slice(0, 1), k.slice(2)];
    return t === 'o' ? { ordenId: id } : t === 'd' ? { desaduanajeId: id } : { solicitudItemId: id };
};
export const documentosStore = keyed<Documento[]>((k) => documentos().listar(duenoDe(k)), ['documentos']);

export function Documentos({
    dueno,
    tipos,
    puedeSubir,
    tocadas = [],
    moneda,
}: {
    dueno: Dueno;
    tipos: readonly TipoDoc[];
    puedeSubir: boolean;
    /** Lo que cambia al subir (p. ej. 'pagos' con una factura). */
    tocadas?: readonly string[];
    /** Moneda sugerida para el monto (la de la orden). */
    moneda?: string;
}) {
    const { data, error } = documentosStore.use(claveDe(dueno));
    const [subiendo, setSubiendo] = useState<File | null>(null);
    const [revisar, setRevisar] = useState<Documento | null>(null);

    async function abrir(d: Documento) {
        if (d.driveUrl) return window.open(d.driveUrl, '_blank', 'noopener');
        if (!d.storagePath) return;
        const r = await documentos().enlace(d.storagePath);
        if (r.isErr()) return toast.error(r.error.message);
        window.open(r.value, '_blank', 'noopener');
    }

    return (
        <div className="flex flex-col gap-3">
            {error ? (
                <p className="text-small text-danger-strong">{error}</p>
            ) : !data ? (
                <Hueco className="h-12 w-full" />
            ) : data.length === 0 ? (
                <p className="text-small text-ink-3">Aún no hay documentos.</p>
            ) : (
                <ul className="flex flex-col divide-y divide-divider">
                    {data.map((d) => (
                        <li key={d.id} className="flex items-start gap-3 py-2">
                            <FileText size={18} className="mt-0.5 flex-none text-ink-3" aria-hidden />
                            <div className="min-w-0 flex-1">
                                <button type="button" onClick={() => void abrir(d)} className={`${LINK_CLASS} max-w-full truncate text-left text-ui`}>
                                    {d.nombre}
                                    {d.driveUrl && <ExternalLink size={12} className="ml-1 inline" aria-hidden />}
                                </button>
                                <div className="text-small text-ink-2">
                                    {d.tipo}
                                    {d.numero && ` · ${d.numero}`}
                                    {d.fecha && ` · ${dmy(d.fecha)}`}
                                    {d.monto != null && ` · ${money(d.monto, d.moneda ?? 'PEN')}`}
                                </div>
                            </div>
                            <div className="flex flex-none flex-col items-end gap-1">
                                <Chip tone={tonoDoc(d)}>{etiquetaEstadoDoc(d)}</Chip>
                                {d.lecturaEstado === 'Leído' && (
                                    <Button variant="ghost" onClick={() => setRevisar(d)}>
                                        <ScanText size={15} /> Revisar lectura
                                    </Button>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            )}
            {puedeSubir && (
                <DropZone
                    compact
                    accept={ACEPTA}
                    onFiles={(fs) => fs[0] && setSubiendo(fs[0])}
                    label="Arrastra un documento o haz clic para elegirlo"
                    hint="PDF, imagen, XML o Excel, hasta 25 MB."
                />
            )}
            {subiendo && <FormSubida archivo={subiendo} dueno={dueno} tipos={tipos} moneda={moneda} tocadas={tocadas} onCerrar={() => setSubiendo(null)} />}
            {revisar && <RevisarLectura doc={revisar} tocadas={tocadas} onCerrar={() => setRevisar(null)} />}
        </div>
    );
}

function FormSubida({
    archivo,
    dueno,
    tipos,
    moneda,
    tocadas,
    onCerrar,
}: {
    archivo: File;
    dueno: Dueno;
    tipos: readonly TipoDoc[];
    moneda?: string;
    tocadas: readonly string[];
    onCerrar: () => void;
}) {
    const [tipo, setTipo] = useState<TipoDoc>(tipos[0]);
    const [numero, setNumero] = useState('');
    const [fecha, setFecha] = useState('');
    const [monto, setMonto] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [subiendo, setSubiendo] = useState(false);
    const conMonto = pideMonto(tipo);

    async function subir() {
        const m = monto.trim() ? Number(monto.replace(',', '.')) : null;
        if (m != null && !Number.isFinite(m)) return setError('El monto debe ser un número. Usa punto para los decimales: 1250.50');
        setSubiendo(true);
        const r = await documentos().subir(dueno, archivo, {
            tipo,
            numero,
            fecha: fecha || null,
            monto: conMonto ? m : null,
            moneda: conMonto && m != null ? (moneda ?? 'PEN') : null,
        });
        setSubiendo(false);
        if (r.isErr()) return setError(r.error.message);
        toast.success(`Se subió ${tipo.toLowerCase()} ${numero.trim() || archivo.name}. Pasa a Drive en segundo plano.`);
        refrescar(['documentos', ...tocadas, 'acciones', 'te_toca']);
        onCerrar();
    }
    return (
        <Dialog
            abierto
            onCerrar={onCerrar}
            titulo="Subir documento"
            descripcion={archivo.name}
            onEnviar={() => void subir()}
            pie={
                <>
                    <Button variant="secondary" onClick={onCerrar}>
                        Cancelar
                    </Button>
                    <Button type="submit" disabled={subiendo}>
                        {subiendo ? 'Subiendo…' : 'Subir'}
                    </Button>
                </>
            }
        >
            <Field label="Tipo de documento">
                {(p) => <SelectMenu {...p} value={tipo} onChange={(t) => setTipo(t as TipoDoc)} options={tipos.map((t) => ({ value: t, label: t }))} />}
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Serie y número" optional>
                    {(p) => <Input {...p} value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="F001-123" />}
                </Field>
                <Field label="Fecha del documento" optional>
                    {(p) => <Input {...p} type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />}
                </Field>
                {conMonto && (
                    <Field
                        label={`Monto total (${moneda ?? 'PEN'})`}
                        optional
                        hint={tipo === 'Factura' ? 'Si calza con una cuota, el pago se solicita solo.' : undefined}
                    >
                        {(p) => <Input {...p} inputMode="decimal" value={monto} onChange={(e) => setMonto(e.target.value)} />}
                    </Field>
                )}
            </div>
            {error && (
                <p role="alert" className="text-small font-medium text-danger-strong">
                    {error}
                </p>
            )}
        </Dialog>
    );
}

/** Lo que leyó el lector es una PROPUESTA: nada se guarda hasta que la persona confirma (docs/07 §5). */
function RevisarLectura({ doc, tocadas, onCerrar }: { doc: Documento; tocadas: readonly string[]; onCerrar: () => void }) {
    const l: Lectura = doc.lectura ?? {};
    const [numero, setNumero] = useState(doc.numero || l.numero || '');
    const [fecha, setFecha] = useState(doc.fecha || l.fecha || '');
    const [monto, setMonto] = useState(String(doc.monto ?? l.total ?? ''));
    const [moneda, setMoneda] = useState(doc.moneda || l.moneda || 'PEN');
    const [ruc, setRuc] = useState(doc.rucEmisor || l.ruc || '');
    const [error, setError] = useState<string | null>(null);
    const [confirmando, setConfirmando] = useState(false);
    async function confirmar() {
        const m = monto.trim() ? Number(monto.replace(',', '.')) : null;
        if (m != null && !Number.isFinite(m)) return setError('El total debe ser un número. Usa punto para los decimales: 1250.50');
        setConfirmando(true);
        const r = await documentos().confirmarLectura(doc.id, { numero, fecha: fecha || null, monto: m, moneda: moneda || null, ruc: ruc.trim() || null });
        setConfirmando(false);
        if (r.isErr()) return setError(r.error.message);
        toast.success(`Lectura de ${doc.nombre} confirmada.`);
        refrescar(['documentos', 'ordenes', ...tocadas]);
        onCerrar();
    }
    return (
        <Dialog
            abierto
            onCerrar={onCerrar}
            titulo="Revisar lo que se leyó"
            onEnviar={() => void confirmar()}
            descripcion={l.aviso ?? 'Corrige lo que no coincida con el documento y confirma.'}
            pie={
                <>
                    <Button variant="secondary" onClick={onCerrar}>
                        Cancelar
                    </Button>
                    <Button type="submit" disabled={confirmando}>
                        {confirmando ? 'Confirmando…' : 'Confirmar lectura'}
                    </Button>
                </>
            }
        >
            {l.razonSocial && <p className="text-ui">{l.razonSocial}</p>}
            <div className="grid gap-4 sm:grid-cols-2">
                <Field label="RUC del emisor">{(p) => <Input {...p} value={ruc} onChange={(e) => setRuc(e.target.value)} inputMode="numeric" />}</Field>
                <Field label="Serie y número">{(p) => <Input {...p} value={numero} onChange={(e) => setNumero(e.target.value)} />}</Field>
                <Field label="Fecha">{(p) => <Input {...p} type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />}</Field>
                <Field label="Moneda">
                    {(p) => (
                        <SelectMenu {...p} value={moneda} onChange={setMoneda} options={['PEN', 'USD', 'EUR', 'GBP'].map((m) => ({ value: m, label: m }))} />
                    )}
                </Field>
                <Field label="Total">{(p) => <Input {...p} inputMode="decimal" value={monto} onChange={(e) => setMonto(e.target.value)} />}</Field>
            </div>
            {error && (
                <p role="alert" className="text-small font-medium text-danger-strong">
                    {error}
                </p>
            )}
        </Dialog>
    );
}
