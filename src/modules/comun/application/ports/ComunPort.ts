import type { Result } from 'neverthrow';
import type { ErrorFuente } from '@/shared/errores.ts';
import type { Cambio, Catalogos, Notificacion, Pendiente, Persona } from '../../domain/tipos.ts';

export interface PersonasPort {
    listar(): Promise<Result<Persona[], ErrorFuente>>;
}
export interface CatalogosPort {
    leer(): Promise<Result<Catalogos, ErrorFuente>>;
}
export interface BandejaPort {
    teToca(): Promise<Result<Pendiente[], ErrorFuente>>;
    notificaciones(): Promise<Result<Notificacion[], ErrorFuente>>;
    marcarLeidas(ids: number[]): Promise<Result<null, ErrorFuente>>;
}
export interface HistorialPort {
    de(tabla: string, id: string): Promise<Result<Cambio[], ErrorFuente>>;
}
