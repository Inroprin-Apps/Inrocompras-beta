import 'server-only';
// La cola y lo que leen y escriben los trabajos, con el cliente de SERVICIO (service_role: sin RLS).
// Solo lo usa el servidor (/api/cola, /api/inropay). Mapea filas snake_case → tipos del dominio.
import type { SupabaseClient } from '@supabase/supabase-js';
import { err, ok, type Result } from 'neverthrow';
import type { ModoCorreo } from '../domain/correo.ts';
import type { EventoInroPay, PagoInroPay } from '../domain/inropay.ts';
import type { LecturaDocumento } from '../domain/lectura.ts';
import { tipoDocPdf, type OrdenPdf, type VersionPdf } from '../domain/pdf.ts';
import { final, reintentar, type Fallo, type Trabajo } from '../domain/trabajo.ts';
import type {
    CarpetaDrive,
    ColaPort,
    DocumentoCola,
    NotificacionCorreo,
    OrdenCarpeta,
    OrdenCorreo,
    R,
    RepositorioPort,
} from '../application/ports/IntegracionesPort.ts';
import { n, nn, s, sn, type Fila, uno } from '@/shared/supabase/filas.ts';

type Respuesta = { data: unknown; error: { message?: string; code?: string } | null };

/** Un error de la base: la red o un 5xx se reintentan; una regla o un dato malo, no. */
function falloDe(e: { message?: string; code?: string }, que: string): Fallo {
    const m = `${que}: ${e.message ?? 'error desconocido'}`;
    return /fetch failed|ECONN|ETIMEDOUT|network|socket|502|503|504/i.test(e.message ?? '') ? reintentar(m) : final(m);
}
function res<T>(r: Respuesta, que: string): Result<T, Fallo> {
    return r.error ? err(falloDe(r.error, que)) : ok(r.data as T);
}

function documento(f: Fila): DocumentoCola {
    const des = uno(f.desaduanajes);
    const oc = uno(f.ordenes);
    return {
        id: s(f.id),
        tipoDoc: s(f.tipo_doc),
        nombre: s(f.nombre_archivo),
        mime: s(f.mime) || 'application/pdf',
        storagePath: sn(f.storage_path),
        driveFileId: sn(f.drive_file_id),
        estado: s(f.estado),
        ordenId: sn(f.orden_id),
        desaduanajeId: sn(f.desaduanaje_id),
        carpetaId: sn(des?.carpeta_drive_id) ?? sn(oc?.carpeta_drive_id),
    };
}
const COLS_DOC =
    'id,tipo_doc,nombre_archivo,mime,storage_path,drive_file_id,estado,orden_id,desaduanaje_id,ordenes(carpeta_drive_id),desaduanajes(carpeta_drive_id)';

export class SupabaseIntegracionesAdapter implements ColaPort, RepositorioPort {
    constructor(private readonly db: SupabaseClient) {}

    // ── Cola ──
    async tomar(cuantos: number): R<Trabajo[]> {
        const r = res<Fila[]>(await this.db.rpc('cola_tomar', { p_n: cuantos }), 'No se pudo tomar trabajos de la cola');
        return r.map((fs) =>
            (fs ?? []).map((f) => ({
                id: Number(f.id),
                tipo: s(f.tipo),
                refTabla: sn(f.ref_tabla),
                refId: sn(f.ref_id),
                payload: (f.payload as Record<string, unknown>) ?? {},
                intentos: Number(f.intentos),
            })),
        );
    }

    async terminar(id: number, okk: boolean, mensaje: string | null, fin: 'Error' | 'Descartado' | null): R<string> {
        const r = res<Fila>(await this.db.rpc('cola_terminar', { p_id: id, p_ok: okk, p_error: mensaje, p_final: fin }), 'No se pudo cerrar el trabajo');
        return r.map((f) => s(uno(f)?.estado));
    }

    async encolar(tipo: string, tabla: string, id: string, payload: Record<string, unknown> = {}): R<null> {
        return res<null>(await this.db.from('cola_trabajos').insert({ tipo, ref_tabla: tabla, ref_id: id, payload }), 'No se pudo encolar').map(() => null);
    }

    // ── Carpetas ──
    async ordenCarpeta(id: string): R<OrdenCarpeta | null> {
        const r = res<Fila | null>(
            await this.db.from('ordenes').select('numero,empresa_id,procedencia,clase,fecha,proveedores(razon_social)').eq('id', id).maybeSingle(),
            'No se pudo leer la orden',
        );
        return r.map((f) =>
            f
                ? {
                      numero: sn(f.numero),
                      empresaId: s(f.empresa_id),
                      procedencia: s(f.procedencia),
                      clase: s(f.clase),
                      fecha: sn(f.fecha),
                      proveedor: s(uno(f.proveedores)?.razon_social),
                  }
                : null,
        );
    }

    async guardarCarpetaOrden(id: string, c: CarpetaDrive): R<null> {
        return res<null>(
            await this.db.from('ordenes').update({ carpeta_drive_id: c.id, carpeta_drive_url: c.url }).eq('id', id),
            'No se pudo guardar la carpeta',
        ).map(() => null);
    }

    async documentosSinArchivar(ordenId: string): R<string[]> {
        const r = res<Fila[]>(
            await this.db
                .from('documentos')
                .select('id')
                .eq('orden_id', ordenId)
                .in('estado', ['Subido', 'Error'])
                .is('drive_file_id', null)
                .not('storage_path', 'is', null),
            'No se pudo leer los documentos',
        );
        return r.map((fs) => fs.map((f) => s(f.id)));
    }

    async desaduanajeCarpeta(id: string): R<{ numero: string | null; romano: string | null; carpetaOC: string | null } | null> {
        const r = res<Fila | null>(
            await this.db.from('desaduanajes').select('numero,romano,ordenes(carpeta_drive_id)').eq('id', id).maybeSingle(),
            'No se pudo leer el desaduanaje',
        );
        return r.map((f) => (f ? { numero: sn(f.numero), romano: sn(f.romano), carpetaOC: sn(uno(f.ordenes)?.carpeta_drive_id) } : null));
    }

    async guardarCarpetaDes(id: string, c: CarpetaDrive): R<null> {
        return res<null>(
            await this.db.from('desaduanajes').update({ carpeta_drive_id: c.id, carpeta_drive_url: c.url }).eq('id', id),
            'No se pudo guardar la carpeta',
        ).map(() => null);
    }

    // ── Documentos ──
    async documento(id: string): R<DocumentoCola | null> {
        const r = res<Fila | null>(await this.db.from('documentos').select(COLS_DOC).eq('id', id).maybeSingle(), 'No se pudo leer el documento');
        return r.map((f) => (f ? documento(f) : null));
    }

    async marcarArchivado(id: string, c: CarpetaDrive): R<null> {
        return res<null>(
            await this.db.from('documentos').update({ drive_file_id: c.id, drive_url: c.url, estado: 'Archivado' }).eq('id', id),
            'No se pudo marcar el documento',
        ).map(() => null);
    }

    async guardarLectura(id: string, lectura: LecturaDocumento): R<null> {
        // Propuesta: lectura_estado = 'Leído'. Solo ac_documento_confirmar_lectura la pasa a 'Confirmado'.
        const r = await this.db
            .from('documentos')
            .update({ lectura, lectura_estado: 'Leído' })
            .eq('id', id)
            .or('lectura_estado.is.null,lectura_estado.neq.Confirmado');
        return res<null>(r, 'No se pudo guardar la lectura').map(() => null);
    }

    async bajarArchivo(ruta: string): R<Uint8Array> {
        const { data, error } = await this.db.storage.from('documentos').download(ruta);
        if (error || !data) return err(reintentar(`No se pudo leer el archivo de Storage (${ruta}): ${error?.message ?? 'vacío'}`));
        return ok(new Uint8Array(await data.arrayBuffer()));
    }

    // ── PDF de la orden ──
    async ordenPdf(id: string): R<OrdenPdf | null> {
        const r = res<Fila | null>(
            await this.db
                .from('ordenes')
                .select(
                    '*, empresas(razon_social,ruc,direccion), proveedores(razon_social,ruc,pais), proyectos(codigo,nombre), oc_lineas(*), comprador:usuarios!ordenes_comprador_id_fkey(id,nombre)',
                )
                .eq('id', id)
                .maybeSingle(),
            'No se pudo leer la orden',
        );
        return r.map((o) => {
            if (!o) return null;
            const emp = uno(o.empresas);
            const prov = uno(o.proveedores);
            const proy = uno(o.proyectos);
            const comp = uno(o.comprador);
            return {
                id: s(o.id),
                numero: sn(o.numero),
                revision: n(o.revision),
                clase: s(o.clase),
                procedencia: s(o.procedencia),
                fecha: s(o.fecha),
                moneda: s(o.moneda),
                tipoImpuesto: s(o.tipo_impuesto),
                subtotal: n(o.subtotal),
                igv: n(o.igv),
                monto: n(o.monto),
                formaPago: s(o.forma_pago),
                pctAdelanto: nn(o.pct_adelanto),
                hitoSaldo: sn(o.hito_saldo),
                diasCredito: nn(o.dias_credito),
                lugarEntrega: sn(o.lugar_entrega),
                plazoEntregaDias: nn(o.plazo_entrega_dias),
                terminos: sn(o.terminos),
                incoterm: sn(o.incoterm),
                penalidadPctDia: nn(o.penalidad_pct_dia),
                penalidadTopePct: nn(o.penalidad_tope_pct),
                empresa: { razonSocial: s(emp?.razon_social), ruc: sn(emp?.ruc), direccion: sn(emp?.direccion) },
                proveedor: prov ? { razonSocial: s(prov.razon_social), ruc: sn(prov.ruc), pais: sn(prov.pais) } : null,
                proyecto: proy ? { codigo: sn(proy.codigo), nombre: s(proy.nombre) } : null,
                aprobaciones: {
                    ppto: sn(o.aprobacion_ppto),
                    cgFecha: sn(o.cg_fecha),
                    gop: sn(o.aprobacion_gop),
                    gopFecha: sn(o.gop_fecha),
                    gaf: sn(o.aprobacion_gaf),
                    gafFecha: sn(o.gaf_fecha),
                    tipo: sn(o.tipo_aprobacion),
                },
                comprador: { id: s(comp?.id ?? o.comprador_id), nombre: s(comp?.nombre) },
                lineas: ((o.oc_lineas as Fila[] | null) ?? []).map((l) => ({
                    nLinea: n(l.n_linea),
                    descripcion: s(l.descripcion),
                    descripcionProv: sn(l.descripcion_prov),
                    unidad: s(l.unidad),
                    cantidad: n(l.cantidad),
                    precioUnit: n(l.precio_unit),
                    subtotal: n(l.subtotal),
                    esDemasia: l.es_demasia === true,
                    demasiaEstado: sn(l.demasia_estado),
                })),
            };
        });
    }

    async registrarPdf(o: OrdenPdf, version: VersionPdf, nombre: string, pdf: Uint8Array): R<string> {
        const ruta = `${o.comprador.id}/${crypto.randomUUID()}-${nombre}`;
        const sub = await this.db.storage.from('documentos').upload(ruta, pdf, { contentType: 'application/pdf', upsert: false });
        if (sub.error) return err(reintentar(`No se pudo subir el PDF a Storage: ${sub.error.message}`));
        const tipo = tipoDocPdf(version);
        const ant = await this.db.from('documentos').update({ estado: 'Reemplazado' }).eq('orden_id', o.id).eq('tipo_doc', tipo).neq('estado', 'Reemplazado');
        if (ant.error) return err(falloDe(ant.error, 'No se pudo marcar el PDF anterior'));
        // El disparador al_registrar_documento encola su «archivar_doc» (pasa a la carpeta 003 Orden del legajo).
        const ins = res<Fila>(
            await this.db
                .from('documentos')
                .insert({
                    orden_id: o.id,
                    tipo_doc: tipo,
                    nombre_archivo: nombre,
                    mime: 'application/pdf',
                    storage_path: ruta,
                    subido_por: o.comprador.id,
                    lectura_estado: 'No aplica',
                })
                .select('id')
                .single(),
            'No se pudo registrar el PDF',
        );
        if (ins.isErr()) return err(ins.error);
        const id = s(ins.value.id);
        const enl = await this.db
            .from('ordenes')
            .update(version === 'interna' ? { pdf_interna_doc: id } : { pdf_proveedor_doc: id })
            .eq('id', o.id);
        return enl.error ? err(falloDe(enl.error, 'No se pudo enlazar el PDF a la orden')) : ok(id);
    }

    // ── Correo ──
    async ordenCorreo(id: string): R<OrdenCorreo | null> {
        const r = res<Fila | null>(
            await this.db
                .from('ordenes')
                .select(
                    'id,numero,procedencia,correo_envio,pdf_proveedor_doc,empresas(razon_social),proveedores(razon_social),comprador:usuarios!ordenes_comprador_id_fkey(nombre,email)',
                )
                .eq('id', id)
                .maybeSingle(),
            'No se pudo leer la orden',
        );
        if (r.isErr()) return err(r.error);
        const o = r.value;
        if (!o) return ok(null);
        let pdf: DocumentoCola | null = null;
        if (o.pdf_proveedor_doc) {
            const d = await this.documento(s(o.pdf_proveedor_doc));
            if (d.isErr()) return err(d.error);
            pdf = d.value;
        }
        const comp = uno(o.comprador);
        return ok({
            id: s(o.id),
            numero: sn(o.numero),
            procedencia: s(o.procedencia),
            correoEnvio: sn(o.correo_envio),
            empresa: s(uno(o.empresas)?.razon_social),
            proveedor: s(uno(o.proveedores)?.razon_social),
            comprador: { nombre: s(comp?.nombre), email: s(comp?.email) },
            pdfProveedor: pdf,
        });
    }

    async marcarEnviada(id: string, para: string, modo: ModoCorreo): R<null> {
        // En modo registro no sale nada: no se marca como enviada, solo queda en el historial.
        if (modo !== 'registro') {
            const u = await this.db.from('ordenes').update({ envio_hecho: new Date().toISOString() }).eq('id', id);
            if (u.error) return err(falloDe(u.error, 'No se pudo marcar la orden como enviada'));
        }
        const h = await this.db
            .from('historial')
            .insert({ tabla: 'ordenes', registro_id: id, accion: modo === 'registro' ? 'correo_registrado' : 'correo_enviado', a: para, datos: { modo } });
        return res<null>(h, 'No se pudo dejar el historial').map(() => null);
    }

    async notificacion(id: number): R<NotificacionCorreo | null> {
        const r = res<Fila | null>(
            await this.db.from('notificaciones').select('titulo,cuerpo,ref_tabla,ref_id,correo,usuarios(nombre,email,activo)').eq('id', id).maybeSingle(),
            'No se pudo leer la notificación',
        );
        return r.map((f) => {
            if (!f) return null;
            const u = uno(f.usuarios);
            return {
                titulo: s(f.titulo),
                cuerpo: sn(f.cuerpo),
                tabla: sn(f.ref_tabla),
                refId: sn(f.ref_id),
                correo: f.correo !== false,
                usuario: u ? { nombre: s(u.nombre), email: s(u.email), activo: u.activo === true } : null,
            };
        });
    }

    // ── InroPay ──
    async pagoInroPay(id: string): R<PagoInroPay | null> {
        const r = res<Fila | null>(
            await this.db
                .from('pagos')
                .select(
                    'id,n_cuota,monto_pago,monto_retencion,neto_referencial,fecha_limite_pago,factura_id,ordenes(numero,moneda,proveedores(razon_social,ruc,cuentas))',
                )
                .eq('id', id)
                .maybeSingle(),
            'No se pudo leer el pago',
        );
        return r.map((g) => {
            if (!g) return null;
            const o = uno(g.ordenes);
            const p = uno(o?.proveedores);
            return {
                id: s(g.id),
                nCuota: n(g.n_cuota),
                monto: n(g.monto_pago),
                retencion: n(g.monto_retencion),
                neto: nn(g.neto_referencial),
                fechaLimite: sn(g.fecha_limite_pago),
                facturaId: sn(g.factura_id),
                orden: {
                    numero: sn(o?.numero),
                    moneda: s(o?.moneda),
                    proveedor: p ? { razon_social: s(p.razon_social), ruc: sn(p.ruc), cuentas: Array.isArray(p.cuentas) ? p.cuentas : [] } : null,
                },
            };
        });
    }

    async guardarInroPayRef(id: string, ref: string): R<null> {
        return res<null>(await this.db.from('pagos').update({ inropay_ref: ref }).eq('id', id), 'No se pudo guardar la referencia de InroPay').map(() => null);
    }

    async inropayActualizar(e: EventoInroPay): R<null> {
        const r = await this.db.rpc('inropay_actualizar', {
            p_pago: e.pago_id,
            p_estado: e.estado,
            p_fecha: e.fecha,
            p_n_operacion: e.n_operacion,
            p_ref: e.ref,
        });
        return res<unknown>(r, 'InroPay').map(() => null);
    }
}
