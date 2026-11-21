// Checklist de documentos del desaduanaje (réplica de app.des_docs_faltantes). PURO.
import type { Checklist } from './desaduanaje.ts';

// ───────────────────────── Checklist (réplica de app.des_docs_faltantes) ─────────────────────────
export interface ItemChecklist {
    campo: keyof Checklist;
    /** Columna chk_* que se marca. */
    columna: 'chk_factura' | 'chk_bl' | 'chk_cert_origen' | 'chk_seguro' | 'chk_permiso';
    etiqueta: string;
    /** El tipo de documento que, subido, también lo cumple. */
    tipoDoc: string;
    /** El nombre con el que lo dice la base en «Falta: …». */
    falta: string;
    marcado: boolean;
    subido: boolean;
    cumple: boolean;
}

const ITEMS: Omit<ItemChecklist, 'marcado' | 'subido' | 'cumple'>[] = [
    { campo: 'factura', columna: 'chk_factura', etiqueta: 'Factura comercial', tipoDoc: 'Factura comercial', falta: 'Factura comercial' },
    { campo: 'bl', columna: 'chk_bl', etiqueta: 'BL / AWB', tipoDoc: 'BL / AWB', falta: 'BL / AWB' },
    { campo: 'certOrigen', columna: 'chk_cert_origen', etiqueta: 'Certificado de origen', tipoDoc: 'Certificado de origen', falta: 'Certificado de origen' },
    { campo: 'seguro', columna: 'chk_seguro', etiqueta: 'Póliza de seguro', tipoDoc: 'Póliza de seguro', falta: 'Seguro' },
    { campo: 'permiso', columna: 'chk_permiso', etiqueta: 'Permiso (MTC / DIGESA)', tipoDoc: 'Permiso (MTC / DIGESA)', falta: 'Permiso' },
];

/** Los documentos del checklist: un documento cuenta si se marcó o si se subió el archivo (el permiso, solo si se requiere). */
export function checklist(d: { chk: Checklist; requierePermiso: boolean }, tiposSubidos: readonly string[]): ItemChecklist[] {
    return ITEMS.filter((i) => i.campo !== 'permiso' || d.requierePermiso).map((i) => {
        const marcado = d.chk[i.campo];
        const subido = tiposSubidos.includes(i.tipoDoc);
        return { ...i, marcado, subido, cumple: marcado || subido };
    });
}

/** Lo que falta, con las mismas palabras que la base (app.des_docs_faltantes). */
export const faltantes = (d: { chk: Checklist; requierePermiso: boolean }, tiposSubidos: readonly string[]) =>
    checklist(d, tiposSubidos)
        .filter((i) => !i.cumple)
        .map((i) => i.falta);
