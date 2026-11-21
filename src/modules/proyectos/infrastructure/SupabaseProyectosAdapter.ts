import type { SupabaseClient } from '@supabase/supabase-js';
import type { Result } from 'neverthrow';
import { resultado, resultadoUno, type ErrorFuente } from '@/shared/errores.ts';
import type { ProyectosPort } from '../application/ports/ProyectosPort.ts';
import type { EstadoProyecto, NuevoProyecto, Proyecto } from '../domain/proyecto.ts';
import { s, type Fila } from '@/shared/supabase/filas.ts';

const aFila = (p: NuevoProyecto) => ({
    codigo: p.codigo.trim() || null,
    nombre: p.nombre.trim(),
    cliente: p.cliente.trim() || null,
    empresa_id: p.empresaId,
    gerente_id: p.gerenteId,
    fecha_meta: p.fechaMeta,
    lugar_entrega: p.lugarEntrega.trim() || null,
});

function proyecto(f: Fila): Proyecto {
    return {
        id: s(f.id),
        codigo: s(f.codigo),
        nombre: s(f.nombre),
        cliente: s(f.cliente),
        empresaId: s(f.empresa_id),
        estado: s(f.estado) as EstadoProyecto,
        gerenteId: f.gerente_id ? s(f.gerente_id) : null,
        fechaMeta: f.fecha_meta ? s(f.fecha_meta) : null,
        lugarEntrega: s(f.lugar_entrega),
        creado: s(f.creado),
        etapas: ((f.proyecto_etapas as Fila[] | null) ?? [])
            .map((e) => ({ id: s(e.id), nombre: s(e.nombre), orden: Number(e.orden), aprobadores: ((e.aprobadores as string[] | null) ?? []).filter(Boolean) }))
            .sort((a, b) => a.orden - b.orden),
    };
}

export class SupabaseProyectosAdapter implements ProyectosPort {
    constructor(private readonly db: SupabaseClient) {}

    async listar(): Promise<Result<Proyecto[], ErrorFuente>> {
        const r = await this.db.from('proyectos').select('*, proyecto_etapas(id,nombre,orden,aprobadores)').order('creado', { ascending: false });
        return resultado<Fila[]>(r).map((fs) => fs.map(proyecto));
    }

    async crear(p: NuevoProyecto): Promise<Result<string, ErrorFuente>> {
        const { data: u } = await this.db.auth.getUser();
        const r = await this.db
            .from('proyectos')
            .insert({ ...aFila(p), creado_por: u.user?.id })
            .select('id')
            .single();
        return resultadoUno<Fila>(r).map((f) => s(f.id));
    }

    async editar(id: string, p: NuevoProyecto): Promise<Result<null, ErrorFuente>> {
        return resultado(await this.db.from('proyectos').update(aFila(p)).eq('id', id)).map(() => null);
    }

    async guardarEtapa(proyectoId: string, e: { id?: string; nombre: string; orden: number; aprobadores: string[] }): Promise<Result<null, ErrorFuente>> {
        const fila = { proyecto_id: proyectoId, nombre: e.nombre.trim(), orden: e.orden, aprobadores: e.aprobadores.filter(Boolean) };
        const r = e.id ? await this.db.from('proyecto_etapas').update(fila).eq('id', e.id) : await this.db.from('proyecto_etapas').insert(fila);
        return resultado(r).map(() => null);
    }

    async borrarEtapa(id: string): Promise<Result<null, ErrorFuente>> {
        return resultado(await this.db.from('proyecto_etapas').delete().eq('id', id)).map(() => null);
    }
}
