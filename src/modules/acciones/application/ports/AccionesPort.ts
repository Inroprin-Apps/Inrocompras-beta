import type { Result } from 'neverthrow';
import type { ErrorFuente } from '@/shared/errores.ts';
import type { Accion } from '../../domain/accion.ts';

export interface AccionesPort {
    disponibles(tabla: string, id: string): Promise<Result<Accion[], ErrorFuente>>;
    ejecutar(funcion: string, params: Record<string, unknown>): Promise<Result<Record<string, unknown>, ErrorFuente>>;
}
