import type { SupabaseClient } from '@supabase/supabase-js';
import { err, ok, type Result } from 'neverthrow';
import { resultado, resultadoUno, type ErrorFuente } from '@/shared/errores.ts';
import type { DesaduanajesPort } from '../application/ports/DesaduanajesPort.ts';
import type {
    Alcance,
    Checklist,
    ConceptoGasto,
    DatosDes,
    Desaduanaje,
    DesaduanajeDetalle,
    EstadoDes,
    GastoDes,
    MonedaGasto,
    NuevoGasto,
    OcElegible,
    ProductoDes,
    TcCosteo,
    TipoComprobante,
    TipoDes,
    VersionCosteo,
} from '../domain/desaduanaje.ts';
import { filas, n, s, type Fila } from '@/shared/supabase/filas.ts';

const nOrNull = (v: unknown) => (v == null || v === '' ? null : Number(v));
const sOrNull = (v: unknown) => (v == null || v === '' ? null : String(v));
const uno = <T extends Fila>(v: unknown): T | null => (Array.isArray(v) ? ((v[0] as T) ?? null) : ((v as T) ?? null));

const OC = 'ordenes!orden_duena_id(numero,moneda,proveedores(razon_social),proyectos(codigo,nombre))';
const LISTA = `id,numero,romano,estado,tipo,alcance,orden_duena_id,n_dam,bl_awb,fecha_embarque,fecha_llegada_est,fecha_numeracion,fecha_llegada,fecha_levante,fecha_almacen,fi,version_costeo,creado,${OC}`;
const DETALLE = `*,${OC},des_productos(*),des_gastos(*,ordenes!oc_hija_id(numero)),des_costeo_hist(*),documentos(tipo_doc)`;

/** Un UPDATE/DELETE que RLS filtra no falla: devuelve 0 filas. Se dice por qué. */
const NADA: ErrorFuente = {
    kind: 'regla',
    message: 'No se guardó: el costeo está cerrado (pide a la jefatura de Importaciones que lo reabra) o tu perfil no edita este desaduanaje.',
};
const alMenosUna = (r: Result<Fila[] | null, ErrorFuente>): Result<null, ErrorFuente> => r.andThen((fs) => ((fs ?? []).length ? ok(null) : err(NADA)));

function desaduanaje(f: Fila): Desaduanaje {
    const o = uno(f.ordenes);
    const prov = o ? uno(o.proveedores) : null;
    const proy = o ? uno(o.proyectos) : null;
    return {
        id: s(f.id),
        numero: s(f.numero),
        romano: s(f.romano),
        estado: s(f.estado) as EstadoDes,
        tipo: s(f.tipo) as TipoDes,
        alcance: s(f.alcance) as Alcance,
        ordenId: s(f.orden_duena_id),
        ordenNumero: o ? s(o.numero) : '',
        proveedor: prov ? s(prov.razon_social) : '',
        proyecto: proy ? [s(proy.codigo), s(proy.nombre)].filter(Boolean).join(' · ') : '',
        nDam: s(f.n_dam),
        blAwb: s(f.bl_awb),
        fechaEmbarque: sOrNull(f.fecha_embarque),
        fechaLlegadaEst: sOrNull(f.fecha_llegada_est),
        fechaNumeracion: sOrNull(f.fecha_numeracion),
        fechaLlegada: sOrNull(f.fecha_llegada),
        fechaLevante: sOrNull(f.fecha_levante),
        fechaAlmacen: sOrNull(f.fecha_almacen),
        fi: nOrNull(f.fi),
        versionCosteo: n(f.version_costeo),
        creado: s(f.creado),
    };
}

function producto(f: Fila): ProductoDes {
    return {
        id: s(f.id),
        ordenId: s(f.orden_id),
        descripcion: s(f.descripcion),
        esMuestra: Boolean(f.es_muestra),
        cantidad: n(f.cantidad),
        moneda: s(f.moneda),
        precioExw: n(f.precio_exw),
        adValoremUsd: n(f.ad_valorem_usd),
        exwS: nOrNull(f.exw_s),
        pctReparto: nOrNull(f.pct_reparto),
        gastosS: nOrNull(f.gastos_valor_s),
        adValoremS: nOrNull(f.ad_valorem_s),
        costoTotalS: nOrNull(f.costo_total_s),
        costoUnitS: nOrNull(f.costo_unit_s),
        cantRecibida: nOrNull(f.cant_recibida),
        incidencia: s(f.incidencia),
    };
}

function gasto(f: Fila): GastoDes {
    const hija = uno(f.ordenes);
    return {
        id: s(f.id),
        concepto: s(f.concepto),
        entraCosto: Boolean(f.entra_costo),
        emisor: s(f.emisor),
        rucEmisor: s(f.ruc_emisor),
        tipoComprobante: s(f.tipo_comprobante) as TipoComprobante,
        nComprobante: s(f.n_comprobante),
        fechaComprobante: sOrNull(f.fecha_comprobante),
        moneda: s(f.moneda) as MonedaGasto,
        montoSinIgv: n(f.monto_sin_igv),
        tcCosteo: n(f.tc_costeo),
        montoS: n(f.monto_s),
        ocHijaId: sOrNull(f.oc_hija_id),
        ocHija: hija ? s(hija.numero) : '',
        registradoPor: s(f.registrado_por),
        fechaRegistro: s(f.fecha_registro),
        comentario: s(f.comentario),
    };
}

function versiones(hist: Fila[]): VersionCosteo[] {
    const por = new Map<number, VersionCosteo>();
    for (const h of hist) {
        const v = n(h.version);
        if (!por.has(v)) por.set(v, { version: v, fecha: s(h.fecha), cerradoPor: sOrNull(h.cerrado_por), motivo: s(h.motivo), fi: null, productos: [] });
        por.get(v)!.productos.push({
            producto: s(h.producto),
            cantidad: n(h.cantidad),
            exwUnitS: nOrNull(h.exw_unit_s),
            fi: nOrNull(h.fi),
            costoUnitS: nOrNull(h.costo_unit_s),
        });
    }
    // FI de la versión = Σ costo / Σ EXW de sus productos (lo mismo que guarda desaduanajes.fi al cerrar).
    for (const v of por.values()) {
        const exw = v.productos.reduce((a, p) => a + (p.exwUnitS ?? 0) * p.cantidad, 0);
        const costo = v.productos.reduce((a, p) => a + (p.costoUnitS ?? 0) * p.cantidad, 0);
        v.fi = exw ? Math.round((costo / exw) * 1e6) / 1e6 : null;
    }
    return [...por.values()].sort((a, b) => b.version - a.version);
}

function detalle(f: Fila): DesaduanajeDetalle {
    const o = uno(f.ordenes);
    return {
        ...desaduanaje(f),
        empresaId: s(f.empresa_id),
        ordenMoneda: o ? s(o.moneda) : '',
        agente: s(f.agente),
        monedaDam: s(f.moneda_dam) || 'USD',
        requierePermiso: Boolean(f.requiere_permiso),
        tipoPermiso: s(f.tipo_permiso),
        comentario: s(f.comentario),
        tcUsd: nOrNull(f.tc_usd),
        tcEur: nOrNull(f.tc_eur),
        tcGbp: nOrNull(f.tc_gbp),
        chk: {
            factura: Boolean(f.chk_factura),
            bl: Boolean(f.chk_bl),
            certOrigen: Boolean(f.chk_cert_origen),
            seguro: Boolean(f.chk_seguro),
            permiso: Boolean(f.chk_permiso),
        },
        tiposSubidos: [...new Set(filas(f.documentos).map((d) => s(d.tipo_doc)))],
        carpetaDriveUrl: s(f.carpeta_drive_url),
        exwTotalS: nOrNull(f.exw_total_s),
        gastosCostoS: nOrNull(f.gastos_costo_s),
        cerradoPor: sOrNull(f.cerrado_por),
        fechaCierre: sOrNull(f.fecha_cierre),
        motivoReapertura: s(f.motivo_reapertura),
        creadoPor: s(f.creado_por),
        productos: filas(f.des_productos)
            .map(producto)
            .sort((a, b) => a.descripcion.localeCompare(b.descripcion, 'es')),
        gastos: filas(f.des_gastos)
            .map(gasto)
            .sort((a, b) => a.fechaRegistro.localeCompare(b.fechaRegistro)),
        versiones: versiones(filas(f.des_costeo_hist)),
    };
}

const COLUMNA_CHK: Record<keyof Checklist, string> = {
    factura: 'chk_factura',
    bl: 'chk_bl',
    certOrigen: 'chk_cert_origen',
    seguro: 'chk_seguro',
    permiso: 'chk_permiso',
};

export class SupabaseDesaduanajesAdapter implements DesaduanajesPort {
    constructor(private readonly db: SupabaseClient) {}

    async listar(): Promise<Result<Desaduanaje[], ErrorFuente>> {
        const r = await this.db.from('desaduanajes').select(LISTA).order('creado', { ascending: false });
        return resultado<Fila[]>(r).map((fs) => (fs ?? []).map(desaduanaje));
    }

    async detalle(id: string): Promise<Result<DesaduanajeDetalle, ErrorFuente>> {
        const r = await this.db.from('desaduanajes').select(DETALLE).eq('id', id).maybeSingle();
        return resultadoUno<Fila>(r, 'No se encontró el desaduanaje o tu perfil no lo ve.').map(detalle);
    }

    async ocsElegibles(): Promise<Result<OcElegible[], ErrorFuente>> {
        const r = await this.db
            .from('ordenes')
            .select('id,numero,moneda,monto,proveedores(razon_social),proyectos(codigo,nombre),desaduanajes!orden_duena_id(id)')
            .eq('procedencia', 'Importación')
            .eq('estado_aprobacion', 'Aprobado para Compra')
            .not('estatus', 'in', '("Anulada","Anulación solicitada")')
            .order('fecha_aprobacion', { ascending: false, nullsFirst: false });
        return resultado<Fila[]>(r).map((fs) =>
            (fs ?? []).map((f) => {
                const prov = uno(f.proveedores);
                const proy = uno(f.proyectos);
                return {
                    id: s(f.id),
                    numero: s(f.numero) || 'Sin número',
                    proveedor: prov ? s(prov.razon_social) : '',
                    proyecto: proy ? [s(proy.codigo), s(proy.nombre)].filter(Boolean).join(' · ') : '',
                    moneda: s(f.moneda),
                    monto: n(f.monto),
                    desaduanajes: filas(f.desaduanajes).length,
                };
            }),
        );
    }

    async conceptos(): Promise<Result<ConceptoGasto[], ErrorFuente>> {
        const r = await this.db.from('conceptos_gasto_imp').select('*').order('orden');
        return resultado<Fila[]>(r).map((fs) =>
            (fs ?? []).map((f) => ({
                concepto: s(f.concepto),
                entraCosto: Boolean(f.entra_costo),
                reparto: (s(f.reparto) === 'Producto' ? 'Producto' : 'Valor') as ConceptoGasto['reparto'],
                orden: n(f.orden),
                activo: Boolean(f.activo),
            })),
        );
    }

    async tcCosteo(): Promise<Result<TcCosteo[], ErrorFuente>> {
        const r = await this.db.from('tc_costeo').select('moneda,tc,vigente_desde').order('vigente_desde', { ascending: false });
        return resultado<Fila[]>(r).map((fs) => (fs ?? []).map((f) => ({ moneda: s(f.moneda), tc: n(f.tc), vigenteDesde: s(f.vigente_desde) })));
    }

    async crear(ordenId: string, tipo: TipoDes, alcance: Alcance): Promise<Result<string, ErrorFuente>> {
        const r = await this.db.rpc('ac_des_crear', { p_oc: ordenId, p_tipo: tipo, p_alcance: alcance });
        return resultado<Fila>(r).map((d) => s(d?.id));
    }

    async guardarDatos(id: string, d: DatosDes): Promise<Result<null, ErrorFuente>> {
        const r = await this.db
            .from('desaduanajes')
            .update({
                agente: d.agente.trim() || null,
                bl_awb: d.blAwb.trim() || null,
                fecha_embarque: d.fechaEmbarque,
                fecha_llegada_est: d.fechaLlegadaEst,
                moneda_dam: d.monedaDam,
                requiere_permiso: d.requierePermiso,
                tipo_permiso: d.requierePermiso ? d.tipoPermiso.trim() || null : null,
                comentario: d.comentario.trim() || null,
            })
            .eq('id', id)
            .select('id');
        return alMenosUna(resultado<Fila[]>(r));
    }

    async marcar(id: string, campo: keyof Checklist, valor: boolean): Promise<Result<null, ErrorFuente>> {
        const r = await this.db
            .from('desaduanajes')
            .update({ [COLUMNA_CHK[campo]]: valor })
            .eq('id', id)
            .select('id');
        return alMenosUna(resultado<Fila[]>(r));
    }

    async guardarProducto(id: string, p: { adValoremUsd: number; cantRecibida: number | null; incidencia: string }): Promise<Result<null, ErrorFuente>> {
        const r = await this.db
            .from('des_productos')
            .update({ ad_valorem_usd: p.adValoremUsd, cant_recibida: p.cantRecibida, incidencia: p.incidencia.trim() || null })
            .eq('id', id)
            .select('id');
        return alMenosUna(resultado<Fila[]>(r));
    }

    async guardarGasto(desaduanajeId: string, g: NuevoGasto, id?: string): Promise<Result<null, ErrorFuente>> {
        const fila = {
            concepto: g.concepto,
            // Lo pone la base desde el concepto (0050); va solo porque la columna es NOT NULL.
            entra_costo: true,
            emisor: g.emisor.trim() || null,
            ruc_emisor: g.rucEmisor.trim() || null,
            tipo_comprobante: g.tipoComprobante,
            n_comprobante: g.nComprobante.trim() || null,
            fecha_comprobante: g.fechaComprobante,
            moneda: g.moneda,
            monto_sin_igv: g.montoSinIgv,
            tc_costeo: g.moneda === 'PEN' ? 1 : g.tcCosteo,
            oc_hija_id: g.ocHijaId,
            comentario: g.comentario.trim() || null,
        };
        if (id) return alMenosUna(resultado<Fila[]>(await this.db.from('des_gastos').update(fila).eq('id', id).select('id')));
        const { data: u } = await this.db.auth.getUser();
        const r = await this.db.from('des_gastos').insert({ ...fila, desaduanaje_id: desaduanajeId, registrado_por: u.user?.id });
        return resultado(r).map(() => null);
    }

    async borrarGasto(id: string): Promise<Result<null, ErrorFuente>> {
        return alMenosUna(resultado<Fila[]>(await this.db.from('des_gastos').delete().eq('id', id).select('id')));
    }
}
