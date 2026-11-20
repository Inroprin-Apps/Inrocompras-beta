import 'server-only';
// Google Drive: el legajo oficial en una Unidad compartida (docs/07 §2). Cuenta de servicio miembro de la unidad
// como «Administrador de contenido» (sin delegación de dominio). Variables: GOOGLE_SERVICE_ACCOUNT_JSON,
// DRIVE_UNIDAD_ID, DRIVE_CARPETA_RAIZ_ID. Sin ellas, falta() dice cuáles y ningún trabajo la llama.
import { Readable } from 'node:stream';
import { auth, drive, type drive_v3 } from '@googleapis/drive';
import { err, ok } from 'neverthrow';
import { escaparConsultaDrive } from '../domain/carpetas.ts';
import type { CarpetaDrive, DrivePort, R } from '../application/ports/IntegracionesPort.ts';
import { credencialesGoogle, faltan, intentar } from './comun.ts';

const comunes = { supportsAllDrives: true } as const;
const CARPETA = 'application/vnd.google-apps.folder';
const urlCarpeta = (id: string) => `https://drive.google.com/drive/folders/${id}`;

export class GoogleDriveAdapter implements DrivePort {
    private cliente: drive_v3.Drive | null = null;

    falta(): string[] | null {
        const f = faltan('DRIVE_UNIDAD_ID', 'DRIVE_CARPETA_RAIZ_ID');
        if (!credencialesGoogle()) f.unshift('GOOGLE_SERVICE_ACCOUNT_JSON');
        return f.length ? f : null;
    }

    private api(): drive_v3.Drive {
        if (this.cliente) return this.cliente;
        const c = credencialesGoogle()!;
        const a = new auth.GoogleAuth({ credentials: c, scopes: ['https://www.googleapis.com/auth/drive'] });
        this.cliente = drive({ version: 'v3', auth: a });
        return this.cliente;
    }

    private async buscar(nombre: string, padre: string): Promise<string | null> {
        const q = `name = '${escaparConsultaDrive(nombre)}' and '${padre}' in parents and mimeType = '${CARPETA}' and trashed = false`;
        const r = await this.api().files.list({ q, fields: 'files(id)', includeItemsFromAllDrives: true, corpora: 'drive', driveId: process.env.DRIVE_UNIDAD_ID, ...comunes });
        return r.data.files?.[0]?.id ?? null;
    }

    private async asegurar(nombre: string, padre: string): Promise<string> {
        const ya = await this.buscar(nombre, padre);
        if (ya) return ya;
        const r = await this.api().files.create({ requestBody: { name: nombre, mimeType: CARPETA, parents: [padre] }, fields: 'id', ...comunes });
        return r.data.id!;
    }

    carpeta(nombre: string, padre: string): R<CarpetaDrive> {
        return intentar('Drive (carpeta)', async () => {
            const id = await this.asegurar(nombre, padre);
            return { id, url: urlCarpeta(id) };
        });
    }

    carpetaOC(ruta: string[], subcarpetas: readonly string[]): R<CarpetaDrive> {
        return intentar('Drive (carpeta de la OC)', async () => {
            let padre = process.env.DRIVE_CARPETA_RAIZ_ID!;
            for (const parte of ruta) padre = await this.asegurar(parte, padre);
            for (const s of subcarpetas) await this.asegurar(s, padre);
            const meta = await this.api().files.get({ fileId: padre, fields: 'webViewLink', ...comunes });
            return { id: padre, url: meta.data.webViewLink ?? urlCarpeta(padre) };
        });
    }

    subir(p: { carpeta: string; subcarpeta: string; nombre: string; mime: string; datos: Uint8Array }): R<CarpetaDrive> {
        return intentar('Drive (subir archivo)', async () => {
            const sub = await this.asegurar(p.subcarpeta, p.carpeta);
            const r = await this.api().files.create({
                requestBody: { name: p.nombre, parents: [sub] },
                media: { mimeType: p.mime, body: Readable.from(Buffer.from(p.datos)) },
                fields: 'id, webViewLink',
                ...comunes,
            });
            return { id: r.data.id!, url: r.data.webViewLink ?? `https://drive.google.com/file/d/${r.data.id}/view` };
        });
    }

    async bajar(fileId: string): R<Uint8Array> {
        if (this.falta()) return err({ tipo: 'final', mensaje: 'Drive no configurado: no se puede bajar el archivo.' });
        const r = await intentar('Drive (bajar archivo)', () => this.api().files.get({ fileId, alt: 'media', ...comunes }, { responseType: 'arraybuffer' }));
        return r.isErr() ? err(r.error) : ok(new Uint8Array(r.value.data as unknown as ArrayBuffer));
    }
}
