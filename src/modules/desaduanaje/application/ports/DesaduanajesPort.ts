import type { Result } from 'neverthrow';
import type { ErrorFuente } from '@/shared/errores.ts';
import type { Alcance, Checklist, ConceptoGasto, DatosDes, Desaduanaje, DesaduanajeDetalle, NuevoGasto, OcElegible, TcCosteo, TipoDes } from '../../domain/desaduanaje.ts';

export interface DesaduanajesPort {
    listar(): Promise<Result<Desaduanaje[], ErrorFuente>>;
    detalle(id: string): Promise<Result<DesaduanajeDetalle, ErrorFuente>>;
    /** Órdenes de importación aprobadas y no anuladas (para «Nuevo desaduanaje»). */
    ocsElegibles(): Promise<Result<OcElegible[], ErrorFuente>>;
    conceptos(): Promise<Result<ConceptoGasto[], ErrorFuente>>;
    tcCosteo(): Promise<Result<TcCosteo[], ErrorFuente>>;
    /** ac_des_crear. Devuelve el id. */
    crear(ordenId: string, tipo: TipoDes, alcance: Alcance): Promise<Result<string, ErrorFuente>>;
    /** UPDATE directo de las columnas que permite app.proteger. */
    guardarDatos(id: string, d: DatosDes): Promise<Result<null, ErrorFuente>>;
    marcar(id: string, campo: keyof Checklist, valor: boolean): Promise<Result<null, ErrorFuente>>;
    guardarProducto(id: string, p: { adValoremUsd: number; cantRecibida: number | null; incidencia: string }): Promise<Result<null, ErrorFuente>>;
    guardarGasto(desaduanajeId: string, g: NuevoGasto, id?: string): Promise<Result<null, ErrorFuente>>;
    borrarGasto(id: string): Promise<Result<null, ErrorFuente>>;
}
