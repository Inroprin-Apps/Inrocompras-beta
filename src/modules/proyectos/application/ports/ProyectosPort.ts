import type { Result } from 'neverthrow';
import type { ErrorFuente } from '@/shared/errores.ts';
import type { NuevoProyecto, Proyecto } from '../../domain/proyecto.ts';

export interface ProyectosPort {
    listar(): Promise<Result<Proyecto[], ErrorFuente>>;
    crear(p: NuevoProyecto): Promise<Result<string, ErrorFuente>>;
    editar(id: string, p: NuevoProyecto): Promise<Result<null, ErrorFuente>>;
    guardarEtapa(proyectoId: string, etapa: { id?: string; nombre: string; orden: number; aprobadores: string[] }): Promise<Result<null, ErrorFuente>>;
    borrarEtapa(id: string): Promise<Result<null, ErrorFuente>>;
}
