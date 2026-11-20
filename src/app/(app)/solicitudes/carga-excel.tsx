'use client';

// Carga masiva de ítems desde Excel (AppSheet: Carga_items). Pasos: descargar la plantilla (opcional) → elegir el
// archivo → ver qué se entendió → «Subir y validar»: las filas van a carga_items con un lote nuevo y
// ac_carga_procesar las valida en la base. Las buenas pasan a ítems; las malas quedan con su error en la ficha,
// donde se descartan. Leer el archivo y entender sus columnas es del dominio (domain/carga.ts).
import { useState } from 'react';
import { Download, FileSpreadsheet } from 'lucide-react';
import { excel, solicitudes } from '@/modules/solicitudes/composition.ts';
import { COLUMNAS_PLANTILLA, esErrorLectura, leerFilas, siguienteNItem, type ItemSolicitud, type Lectura } from '@/modules/solicitudes/application/views.ts';
import { Notice } from '@/shared/ui/bits.tsx';
import { Button } from '@/shared/ui/button.tsx';
import { Dialog } from '@/shared/ui/dialog.tsx';
import { DropZone } from '@/shared/ui/drop-zone.tsx';
import { toast } from '@/shared/ui/toaster.tsx';
import { ejecutarAccion } from '../_acciones/panel-acciones.tsx';
import { refrescar } from '../_lib/resource.ts';

export function CargaExcel({ solicitudId, items, onCerrar }: { solicitudId: string; items: ItemSolicitud[]; onCerrar: () => void }) {
    const [archivo, setArchivo] = useState<string | null>(null);
    const [lectura, setLectura] = useState<Lectura | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [ocupado, setOcupado] = useState<string | null>(null);

    async function elegir(files: File[]) {
        const f = files[0];
        if (!f) return;
        setError(null);
        setLectura(null);
        setOcupado('Leyendo el archivo…');
        const hoja = await excel.leerHoja(f);
        setOcupado(null);
        if (hoja.isErr()) return setError(hoja.error.message);
        const l = leerFilas(hoja.value);
        if (esErrorLectura(l)) return setError(l.mensaje);
        setArchivo(f.name);
        setLectura(l);
    }

    async function plantilla() {
        const r = await excel.descargarPlantilla();
        if (r.isErr()) toast.error(r.error.message);
    }

    async function subir() {
        if (!lectura) return;
        setOcupado('Subiendo y validando…');
        setError(null);
        const lote = crypto.randomUUID();
        const desde = siguienteNItem(items);
        const sub = await solicitudes().subirCarga(
            solicitudId,
            lote,
            lectura.filas.map((fila, k) => ({ nFila: desde + k, fila })),
        );
        if (sub.isErr()) {
            setOcupado(null);
            return setError(sub.error.message);
        }
        const r = await ejecutarAccion('ac_carga_procesar', { p_solicitud: solicitudId, p_lote: lote });
        setOcupado(null);
        refrescar(['solicitudes', 'solicitud_items', 'carga_items', 'acciones']);
        if (r.isErr()) return setError(r.error.message);
        const cargados = Number(r.value.cargados ?? 0);
        const mal = Number(r.value.con_error ?? 0);
        if (mal) toast.warning(`${cargados} ítems cargados; ${mal} filas con error. Revísalas en la ficha: corrige el Excel y vuelve a subirlo, o descártalas.`);
        else toast.success(`${cargados} ítems cargados.`);
        onCerrar();
    }

    const reconocidas = lectura ? COLUMNAS_PLANTILLA.filter((c) => lectura.columnas[c.clave]) : [];
    return (
        <Dialog
            abierto
            onCerrar={onCerrar}
            titulo="Cargar ítems desde Excel"
            descripcion="La primera hoja, con una fila de títulos. Las filas buenas se agregan a los ítems; las que tengan error quedan marcadas para que las corrijas o descartes."
            pie={
                <>
                    <Button variant="secondary" onClick={onCerrar} disabled={!!ocupado}>
                        Volver
                    </Button>
                    <Button onClick={() => void subir()} disabled={!lectura || !!ocupado}>
                        {ocupado && lectura ? 'Validando…' : lectura ? `Subir y validar ${lectura.filas.length} filas` : 'Subir y validar'}
                    </Button>
                </>
            }
        >
            <div className="flex flex-wrap items-center gap-2 text-small text-ink-2">
                <Button variant="ghost" onClick={() => void plantilla()}>
                    <Download size={15} /> Descargar plantilla
                </Button>
                <span>Columnas: {COLUMNAS_PLANTILLA.map((c) => c.titulo).join(', ')}.</span>
            </div>
            <DropZone
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onFiles={(f) => void elegir(f)}
                label={archivo ? `Otro archivo en lugar de «${archivo}»` : 'Arrastra el Excel aquí o haz clic para elegirlo'}
                hint="Archivo .xlsx"
                busy={ocupado && !lectura ? <span className="text-ui">{ocupado}</span> : null}
            />
            {lectura && (
                <div className="flex flex-col gap-2 rounded-card border border-line bg-surface-2 px-4 py-3 text-small">
                    <p className="flex items-center gap-2 text-ui font-medium">
                        <FileSpreadsheet size={16} className="text-success" aria-hidden /> {lectura.filas.length} filas con datos en «{archivo}»
                    </p>
                    <p className="text-ink-2">
                        Entendí: {reconocidas.map((c) => (lectura.columnas[c.clave] === c.titulo ? c.titulo : `${lectura.columnas[c.clave]} → ${c.titulo}`)).join(' · ')}
                    </p>
                    {lectura.ignoradas.length > 0 && <p className="text-ink-3">No se usan: {lectura.ignoradas.join(', ')}.</p>}
                </div>
            )}
            {error && (
                <Notice tone="danger" cerrable={false}>
                    {error}
                </Notice>
            )}
        </Dialog>
    );
}
