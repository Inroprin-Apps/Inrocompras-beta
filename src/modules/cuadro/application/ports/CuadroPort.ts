import type { Result } from 'neverthrow';
import type { ErrorFuente } from '@/shared/errores.ts';
import type { FilaCuadro, OrdenPorAprobar } from '../../domain/cuadro.ts';

export interface CuadroPort {
    /** v_cuadro_aprobaciones_app (RLS: solo quien ve precios). */
    listar(): Promise<Result<FilaCuadro[], ErrorFuente>>;
    /** Las órdenes con estos ids (las que te_toca() pone para firmar), con firmas y demasías pendientes. */
    porAprobar(ids: string[]): Promise<Result<OrdenPorAprobar[], ErrorFuente>>;
}

export interface ExportarPort {
    excel(filas: FilaCuadro[], archivo: string): Promise<Result<null, ErrorFuente>>;
    csv(filas: FilaCuadro[], archivo: string): Result<null, ErrorFuente>;
}
