import type { SupabaseClient } from '@supabase/supabase-js';
import { err, type Result } from 'neverthrow';
import { errorFuente, resultado, resultadoUno, type ErrorFuente } from '@/shared/errores.ts';
import type { DocumentosPort } from '../application/ports/DocumentosPort.ts';
import {
    problemaArchivo,
    rutaStorage,
    type Documento,
    type Dueno,
    type EstadoDoc,
    type EstadoLectura,
    type Lectura,
    type NuevoDocumento,
    type TipoDoc,
} from '../domain/documento.ts';
import { nn as n, s, type Fila } from '@/shared/supabase/filas.ts';

function documento(f: Fila): Documento {
    return {
        id: s(f.id),
        ordenId: f.orden_id ? s(f.orden_id) : null,
        desaduanajeId: f.desaduanaje_id ? s(f.desaduanaje_id) : null,
        tipo: s(f.tipo_doc) as TipoDoc,
        nombre: s(f.nombre_archivo),
        mime: s(f.mime),
        numero: s(f.numero),
        fecha: f.fecha_doc ? s(f.fecha_doc) : null,
        monto: n(f.monto_doc),
        moneda: f.moneda ? s(f.moneda) : null,
        rucEmisor: s(f.ruc_emisor),
        storagePath: f.storage_path ? s(f.storage_path) : null,
        driveUrl: f.drive_url ? s(f.drive_url) : null,
        estado: s(f.estado) as EstadoDoc,
        lectura: (f.lectura as Lectura | null) ?? null,
        lecturaEstado: (f.lectura_estado as EstadoLectura) ?? null,
        subidoPor: s(f.subido_por),
        creado: s(f.creado),
    };
}
const columna = (d: Dueno) =>
    ('ordenId' in d ? ['orden_id', d.ordenId] : 'desaduanajeId' in d ? ['desaduanaje_id', d.desaduanajeId] : ['solicitud_item_id', d.solicitudItemId]) as [
        string,
        string,
    ];

export class SupabaseDocumentosAdapter implements DocumentosPort {
    constructor(private readonly db: SupabaseClient) {}

    async listar(dueno: Dueno): Promise<Result<Documento[], ErrorFuente>> {
        const [col, id] = columna(dueno);
        return resultado<Fila[]>(await this.db.from('documentos').select('*').eq(col, id).order('creado', { ascending: false })).map((fs) => fs.map(documento));
    }

    async subir(dueno: Dueno, archivo: File, meta: NuevoDocumento): Promise<Result<Documento, ErrorFuente>> {
        const problema = problemaArchivo(archivo);
        if (problema) return err({ kind: 'regla', message: problema });
        const { data: u } = await this.db.auth.getUser();
        const uid = u.user?.id;
        if (!uid) return err({ kind: 'permiso', message: 'Tu sesión venció. Vuelve a entrar.' });
        const ruta = rutaStorage(uid, archivo.name, crypto.randomUUID());
        const up = await this.db.storage.from('documentos').upload(ruta, archivo, { contentType: archivo.type || 'application/octet-stream', upsert: false });
        if (up.error) return err(errorFuente(up.error));
        const [col, id] = columna(dueno);
        const r = await this.db
            .from('documentos')
            .insert({
                [col]: id,
                tipo_doc: meta.tipo,
                numero: meta.numero?.trim() || null,
                fecha_doc: meta.fecha || null,
                monto_doc: meta.monto ?? null,
                moneda: meta.moneda || null,
                nombre_archivo: archivo.name,
                mime: archivo.type || 'application/octet-stream',
                storage_path: ruta,
                subido_por: uid,
            })
            .select('*')
            .single();
        if (r.error) await this.db.storage.from('documentos').remove([ruta]); // sin fila, el archivo no sirve
        return resultadoUno<Fila>(r).map(documento);
    }

    async enlace(storagePath: string): Promise<Result<string, ErrorFuente>> {
        const r = await this.db.storage.from('documentos').createSignedUrl(storagePath, 600);
        return r.error ? err(errorFuente(r.error)) : resultadoUno({ data: r.data?.signedUrl ?? null, error: null });
    }

    async confirmarLectura(
        id: string,
        d: { numero: string; fecha: string | null; monto: number | null; moneda: string | null; ruc: string | null },
    ): Promise<Result<null, ErrorFuente>> {
        const r = await this.db.rpc('ac_documento_confirmar_lectura', {
            p_id: id,
            p_numero: d.numero,
            p_fecha: d.fecha,
            p_monto: d.monto,
            p_moneda: d.moneda,
            p_ruc: d.ruc,
        });
        return resultado(r).map(() => null);
    }
}
