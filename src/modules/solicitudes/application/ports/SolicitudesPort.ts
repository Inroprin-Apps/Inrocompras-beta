import type { Result } from 'neverthrow';
import type { ErrorFuente } from '@/shared/errores.ts';
import type { FilaLeida } from '../../domain/carga.ts';
import type { NuevaSolicitud, NuevoItem, Solicitud, SolicitudDetalle } from '../../domain/solicitud.ts';

export interface SolicitudesPort {
    listar(): Promise<Result<Solicitud[], ErrorFuente>>;
    leer(id: string): Promise<Result<SolicitudDetalle, ErrorFuente>>;
    /** Crea el borrador (RLS «alta»: solicitante = yo, estado Borrador). Devuelve el id. */
    crear(s: NuevaSolicitud): Promise<Result<string, ErrorFuente>>;
    editar(id: string, s: NuevaSolicitud): Promise<Result<null, ErrorFuente>>;
    /** Borra un borrador (RLS «borrar»: solo el solicitante y solo en Borrador). */
    borrar(id: string): Promise<Result<null, ErrorFuente>>;
    guardarItem(solicitudId: string, i: NuevoItem): Promise<Result<null, ErrorFuente>>;
    borrarItem(id: string): Promise<Result<null, ErrorFuente>>;
    /** Sube las filas leídas del Excel a carga_items (estado Revision) con un lote nuevo. */
    subirCarga(solicitudId: string, lote: string, filas: { nFila: number; fila: FilaLeida }[]): Promise<Result<null, ErrorFuente>>;
    /** El jefe que el administrador me asignó en Equipo (para proponerlo en una administrativa). */
    miJefe(): Promise<Result<string | null, ErrorFuente>>;
}
