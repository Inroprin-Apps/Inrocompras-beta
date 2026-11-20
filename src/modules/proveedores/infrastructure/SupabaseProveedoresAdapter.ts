import type { SupabaseClient } from '@supabase/supabase-js';
import { err, ok, type Result } from 'neverthrow';
import { resultado, resultadoUno, type ErrorFuente } from '@/shared/errores.ts';
import type { ProveedoresPort } from '../application/ports/ProveedoresPort.ts';
import { cuentasLimpias, rucParaGuardar, type Cuenta, type DatosProveedor, type Evaluacion, type NuevoProveedor, type Origen, type Proveedor } from '../domain/proveedor.ts';

type Fila = Record<string, unknown>;
const s = (v: unknown) => (v == null ? '' : String(v));
const sn = (v: unknown) => (v == null ? null : String(v));

const COLUMNAS =
    'id,ruc,razon_social,origen,pais,correo,telefono,contacto,cuentas,es_agente_retencion,es_buen_contribuyente,verificado_contab,verificado_por,fecha_verificacion,evaluacion_fin,evaluacion_fin_por,evaluacion_fin_fecha,evaluacion_fin_nota,creado_por,creado';

function cuentas(v: unknown): Cuenta[] {
    if (!Array.isArray(v)) return [];
    return v.map((c: Fila) => ({ banco: s(c?.banco), moneda: s(c?.moneda) || 'PEN', numero: s(c?.numero), cci: s(c?.cci), swift: s(c?.swift), iban: s(c?.iban) }));
}

function proveedor(f: Fila): Proveedor {
    return {
        id: s(f.id),
        ruc: s(f.ruc),
        razonSocial: s(f.razon_social),
        origen: (s(f.origen) || 'Nacional') as Origen,
        pais: s(f.pais),
        correo: s(f.correo),
        telefono: s(f.telefono),
        contacto: s(f.contacto),
        cuentas: cuentas(f.cuentas),
        esAgenteRetencion: f.es_agente_retencion === true,
        esBuenContribuyente: f.es_buen_contribuyente === true,
        verificadoContab: f.verificado_contab === true,
        verificadoPor: sn(f.verificado_por),
        fechaVerificacion: sn(f.fecha_verificacion),
        evaluacion: (s(f.evaluacion_fin) || 'Pendiente') as Evaluacion,
        evaluacionPor: sn(f.evaluacion_fin_por),
        evaluacionFecha: sn(f.evaluacion_fin_fecha),
        evaluacionNota: s(f.evaluacion_fin_nota),
        creadoPor: sn(f.creado_por),
        creado: s(f.creado),
    };
}

const aFila = (d: DatosProveedor) => ({
    razon_social: d.razonSocial.trim(),
    pais: d.pais.trim() || null,
    contacto: d.contacto.trim() || null,
    correo: d.correo.trim().toLowerCase() || null,
    telefono: d.telefono.trim() || null,
    cuentas: cuentasLimpias(d.cuentas),
    es_agente_retencion: d.esAgenteRetencion,
    es_buen_contribuyente: d.esBuenContribuyente,
});

export class SupabaseProveedoresAdapter implements ProveedoresPort {
    constructor(private readonly db: SupabaseClient) {}

    async listar(): Promise<Result<Proveedor[], ErrorFuente>> {
        const r = await this.db.from('proveedores').select(COLUMNAS).order('razon_social');
        return resultado<Fila[]>(r).map((fs) => fs.map(proveedor));
    }

    async crear(p: NuevoProveedor): Promise<Result<string, ErrorFuente>> {
        // Evaluación y verificación las fija la base al dar de alta (0020): aquí solo van los datos.
        const r = await this.db
            .from('proveedores')
            .insert({ ...aFila(p), origen: p.origen, ruc: rucParaGuardar(p) || null })
            .select('id')
            .single();
        return resultadoUno<Fila>(r).map((f) => s(f.id));
    }

    async editar(id: string, d: DatosProveedor): Promise<Result<null, ErrorFuente>> {
        const r = await this.db.from('proveedores').update(aFila(d)).eq('id', id).select('id');
        // RLS deja el UPDATE en 0 filas (sin error) cuando no le toca: se dice igual que un permiso negado.
        return resultado<Fila[]>(r).andThen((fs) =>
            fs.length ? ok(null) : err<null, ErrorFuente>({ kind: 'permiso', message: 'No tienes permiso para editar este proveedor. Lo editan Compras, Importaciones o Finanzas.' }),
        );
    }
}
