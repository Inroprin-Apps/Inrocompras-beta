import 'server-only';
// Google Drive: el legajo (docs/07 §2, docs/13 §1.1). La cuenta de servicio tiene que poder EDITAR las carpetas
// madre (como «Editor» de la carpeta compartida, o «Administrador de contenido» si están en una Unidad compartida).
// Variables: GOOGLE_SERVICE_ACCOUNT_JSON y la carpeta madre:
//   DRIVE_RAIZ_NACIONAL_ID y DRIVE_RAIZ_IMPORTACION_ID (si falta alguna, DRIVE_CARPETA_RAIZ_ID para las dos).
//   Mientras se valida, apuntan a una carpeta de PRUEBA; al arrancar, a «5. Ordenes de Compra» y a la de importaciones.
//   DRIVE_UNIDAD_ID solo si las carpetas están en una Unidad compartida.
// Sin ellas, falta() dice cuáles y ningún trabajo la llama.
import { Readable } from 'node:stream';
import { auth, drive, type drive_v3 } from '@googleapis/drive';
import { err, ok } from 'neverthrow';
import { escaparConsultaDrive } from '../domain/carpetas.ts';
import type { CarpetaDrive, DrivePort, R } from '../application/ports/IntegracionesPort.ts';
import { credencialesGoogle, intentar } from './comun.ts';

const comunes = { supportsAllDrives: true } as const;
const CARPETA = 'application/vnd.google-apps.folder';
const urlCarpeta = (id: string) => `https://drive.google.com/drive/folders/${id}`;

export class GoogleDriveAdapter implements DrivePort {
    private cliente: drive_v3.Drive | null = null;

    private readonly raizComun = process.env.DRIVE_CARPETA_RAIZ_ID?.trim() ?? '';
    private readonly raices = {
        Nacional: process.env.DRIVE_RAIZ_NACIONAL_ID?.trim() || this.raizComun,
        Importación: process.env.DRIVE_RAIZ_IMPORTACION_ID?.trim() || this.raizComun,
    };
    /** En una Unidad compartida se busca dentro de ella; si no, en todo lo que la cuenta ve. */
    private readonly donde = process.env.DRIVE_UNIDAD_ID?.trim()
        ? ({ corpora: 'drive', driveId: process.env.DRIVE_UNIDAD_ID.trim(), includeItemsFromAllDrives: true } as const)
        : ({ corpora: 'allDrives', includeItemsFromAllDrives: true } as const);

    falta(): string[] | null {
        const f: string[] = [];
        if (!credencialesGoogle()) f.push('GOOGLE_SERVICE_ACCOUNT_JSON');
        if (!this.raices.Nacional) f.push('DRIVE_RAIZ_NACIONAL_ID (o DRIVE_CARPETA_RAIZ_ID)');
        if (!this.raices.Importación) f.push('DRIVE_RAIZ_IMPORTACION_ID (o DRIVE_CARPETA_RAIZ_ID)');
        return f.length ? f : null;
    }

    raiz(procedencia: 'Nacional' | 'Importación'): string {
        return this.raices[procedencia];
    }

    hijas(padre: string): R<{ id: string; nombre: string }[]> {
        return intentar('Drive (carpetas)', async () => {
            const todas: { id: string; nombre: string }[] = [];
            let pageToken: string | undefined;
            do {
                const r = await this.api().files.list({
                    q: `'${escaparConsultaDrive(padre)}' in parents and mimeType = '${CARPETA}' and trashed = false`,
                    fields: 'nextPageToken, files(id, name)',
                    pageSize: 1000,
                    pageToken,
                    ...this.donde,
                    ...comunes,
                });
                for (const f of r.data.files ?? []) if (f.id && f.name) todas.push({ id: f.id, nombre: f.name });
                pageToken = r.data.nextPageToken ?? undefined;
            } while (pageToken);
            return todas;
        });
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
        const r = await this.api().files.list({
            q,
            fields: 'files(id)',
            ...this.donde,
            ...comunes,
        });
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

    carpetaOC(padre: string, nombre: string, subcarpetas: readonly string[]): R<CarpetaDrive> {
        return intentar('Drive (carpeta de la OC)', async () => {
            const id = await this.asegurar(nombre, padre);
            for (const s of subcarpetas) await this.asegurar(s, id);
            const meta = await this.api().files.get({ fileId: id, fields: 'webViewLink', ...comunes });
            return { id, url: meta.data.webViewLink ?? urlCarpeta(id) };
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
