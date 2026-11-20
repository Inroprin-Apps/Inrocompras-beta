import type { Result } from 'neverthrow';
import type { ErrorFuente } from '@/shared/errores.ts';
import type { CambioEquipo, DatosEquipo, Miembro } from '../../domain/equipo.ts';

export interface EquipoPort {
    listar(): Promise<Result<Miembro[], ErrorFuente>>;
    /** ac_equipo_guardar: todo o nada, con historial (solo el administrador). */
    guardar(id: string, d: DatosEquipo): Promise<Result<null, ErrorFuente>>;
    historial(id: string): Promise<Result<CambioEquipo[], ErrorFuente>>;
}
