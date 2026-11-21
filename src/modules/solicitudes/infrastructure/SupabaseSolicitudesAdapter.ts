import type { SupabaseClient } from '@supabase/supabase-js';
import { err, ok, type Result } from 'neverthrow';
import { resultado, resultadoUno, type ErrorFuente } from '@/shared/errores.ts';
import type { SolicitudesPort } from '../application/ports/SolicitudesPort.ts';
import type { FilaLeida } from '../domain/carga.ts';
import {
    aNumero,
    type Canal,
    type EstadoFila,
    type EstadoSolicitud,
    type FilaCarga,
    type ItemSolicitud,
    type NuevaSolicitud,
    type NuevoItem,
    type Solicitud,
    type SolicitudDetalle,
    type TipoItem,
    type TipoSolicitud,
} from '../domain/solicitud.ts';
import { nn, s, sn, type Fila } from '@/shared/supabase/filas.ts';

const COLS =
    'id,numero,tipo,proyecto_id,etapa_id,jefe_id,solicitante_id,sustento,estado,liberado_por,fecha_liberacion,motivo_rechazo,motivo_observacion,motivo_cancelacion,nueva_solicitud_id,requerimiento_id,estado_carga,lote_actual,creado';

function solicitud(f: Fila): Solicitud {
    const conteo = f.solicitud_items as { count: number }[] | null | undefined;
    return {
        id: s(f.id),
        numero: s(f.numero),
        tipo: s(f.tipo) as TipoSolicitud,
        proyectoId: sn(f.proyecto_id),
        etapaId: sn(f.etapa_id),
        jefeId: sn(f.jefe_id),
        solicitanteId: s(f.solicitante_id),
        sustento: s(f.sustento),
        estado: s(f.estado) as EstadoSolicitud,
        liberadoPor: sn(f.liberado_por),
        fechaLiberacion: sn(f.fecha_liberacion),
        motivoRechazo: s(f.motivo_rechazo),
        motivoObservacion: s(f.motivo_observacion),
        motivoCancelacion: s(f.motivo_cancelacion),
        nuevaSolicitudId: sn(f.nueva_solicitud_id),
        requerimientoId: sn(f.requerimiento_id),
        estadoCarga: sn(f.estado_carga),
        loteActual: sn(f.lote_actual),
        creado: s(f.creado),
        nItems: Array.isArray(conteo) ? Number(conteo[0]?.count ?? 0) : 0,
    };
}

function item(f: Fila): ItemSolicitud {
    return {
        id: s(f.id),
        solicitudId: s(f.solicitud_id),
        nItem: nn(f.n_item),
        tipo: s(f.tipo) as TipoItem,
        codigoCliente: s(f.codigo_cliente),
        descripcion: s(f.descripcion),
        detalle: s(f.detalle),
        unidad: s(f.unidad),
        cantidad: Number(f.cantidad),
        plazoAdquisicion: sn(f.plazo_adquisicion),
        canal: sn(f.canal) as Canal | null,
        presupuestoUnit: nn(f.presupuesto_unit),
        monedaPpto: sn(f.moneda_ppto),
        incluidoEn: sn(f.incluido_en),
        referenciaLink: s(f.referencia_link),
    };
}

function filaCarga(f: Fila): FilaCarga {
    const d = (f.datos ?? {}) as Record<string, unknown>;
    return {
        id: s(f.id),
        loteId: s(f.lote_id),
        nFila: Number(f.n_fila),
        datos: Object.fromEntries(Object.entries(d).map(([k, v]) => [k, s(v)])),
        estadoFila: s(f.estado_fila) as EstadoFila,
        errores: ((f.errores as string[] | null) ?? []).filter(Boolean),
    };
}

const aFila = (x: NuevaSolicitud) => ({
    tipo: x.tipo,
    proyecto_id: x.tipo === 'Proyecto' ? x.proyectoId : null,
    etapa_id: x.tipo === 'Proyecto' ? x.etapaId : null,
    jefe_id: x.tipo === 'Administrativa' ? x.jefeId : null,
    sustento: x.sustento.trim(),
});

const aFilaItem = (i: NuevoItem) => {
    const ppto = aNumero(i.presupuestoUnit);
    return {
        n_item: i.nItem,
        tipo: i.tipo,
        codigo_cliente: i.codigoCliente.trim() || null,
        descripcion: i.descripcion.trim(),
        detalle: i.detalle.trim() || null,
        unidad: i.unidad.trim().toUpperCase() || 'UND',
        cantidad: aNumero(i.cantidad),
        plazo_adquisicion: i.plazoAdquisicion || null,
        canal: i.canal,
        presupuesto_unit: ppto,
        moneda_ppto: ppto == null ? null : i.monedaPpto,
        incluido_en: i.incluidoEn,
        referencia_link: i.referenciaLink.trim() || null,
    };
};

export class SupabaseSolicitudesAdapter implements SolicitudesPort {
    constructor(private readonly db: SupabaseClient) {}

    private async yo(): Promise<string | null> {
        const { data } = await this.db.auth.getUser();
        return data.user?.id ?? null;
    }

    async listar(): Promise<Result<Solicitud[], ErrorFuente>> {
        const r = await this.db.from('solicitudes').select(`${COLS}, solicitud_items(count)`).order('creado', { ascending: false });
        return resultado<Fila[]>(r).map((fs) => fs.map(solicitud));
    }

    async leer(id: string): Promise<Result<SolicitudDetalle, ErrorFuente>> {
        const r = resultadoUno<Fila>(await this.db.from('solicitudes').select(COLS).eq('id', id).maybeSingle(), 'No encontré esa solicitud.');
        if (r.isErr()) return err(r.error);
        const sol = solicitud(r.value);
        const [it, ca, rq] = await Promise.all([
            this.db.from('solicitud_items').select('*').eq('solicitud_id', id).order('n_item', { ascending: true, nullsFirst: false }),
            sol.loteActual
                ? this.db
                      .from('carga_items')
                      .select('id,lote_id,n_fila,datos,estado_fila,errores')
                      .eq('solicitud_id', id)
                      .eq('lote_id', sol.loteActual)
                      .order('n_fila')
                : Promise.resolve({ data: [] as Fila[], error: null }),
            sol.requerimientoId
                ? this.db.from('requerimientos').select('numero,estado').eq('id', sol.requerimientoId).maybeSingle()
                : Promise.resolve({ data: null as Fila | null, error: null }),
        ]);
        return resultado<Fila[]>(it).andThen((items) =>
            resultado<Fila[]>(ca).andThen((carga) =>
                resultado<Fila | null>(rq).andThen((req) =>
                    ok({
                        solicitud: { ...sol, nItems: items.length },
                        items: items.map(item),
                        carga: carga.map(filaCarga),
                        requerimientoNumero: req ? sn(req.numero) : null,
                        requerimientoEstado: req ? sn(req.estado) : null,
                    }),
                ),
            ),
        );
    }

    async crear(x: NuevaSolicitud): Promise<Result<string, ErrorFuente>> {
        const yo = await this.yo();
        const r = await this.db
            .from('solicitudes')
            .insert({ ...aFila(x), solicitante_id: yo })
            .select('id')
            .single();
        return resultadoUno<Fila>(r).map((f) => s(f.id));
    }

    async editar(id: string, x: NuevaSolicitud): Promise<Result<null, ErrorFuente>> {
        return resultado(await this.db.from('solicitudes').update(aFila(x)).eq('id', id)).map(() => null);
    }

    async borrar(id: string): Promise<Result<null, ErrorFuente>> {
        // Las filas de carga y los ítems se van en cascada.
        return resultado(await this.db.from('solicitudes').delete().eq('id', id)).map(() => null);
    }

    async guardarItem(solicitudId: string, i: NuevoItem): Promise<Result<null, ErrorFuente>> {
        const fila = aFilaItem(i);
        const r = i.id
            ? await this.db.from('solicitud_items').update(fila).eq('id', i.id)
            : await this.db.from('solicitud_items').insert({ ...fila, solicitud_id: solicitudId });
        return resultado(r).map(() => null);
    }

    async borrarItem(id: string): Promise<Result<null, ErrorFuente>> {
        // Si era equipo de algún accesorio, el accesorio queda suelto (la FK no tiene cascada).
        const suelta = await this.db.from('solicitud_items').update({ incluido_en: null }).eq('incluido_en', id);
        if (suelta.error) return resultado(suelta).map(() => null);
        return resultado(await this.db.from('solicitud_items').delete().eq('id', id)).map(() => null);
    }

    async subirCarga(solicitudId: string, lote: string, filas: { nFila: number; fila: FilaLeida }[]): Promise<Result<null, ErrorFuente>> {
        const r = await this.db
            .from('carga_items')
            .insert(filas.map((f) => ({ solicitud_id: solicitudId, lote_id: lote, n_fila: f.nFila, datos: f.fila.datos, estado_fila: 'Revision' })));
        return resultado(r).map(() => null);
    }

    async miJefe(): Promise<Result<string | null, ErrorFuente>> {
        const yo = await this.yo();
        if (!yo) return ok(null);
        const r = await this.db.from('usuarios').select('jefe_id').eq('id', yo).maybeSingle();
        return resultado<Fila | null>(r).map((f) => (f ? sn(f.jefe_id) : null));
    }
}
