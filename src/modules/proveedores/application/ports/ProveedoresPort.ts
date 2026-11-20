import type { Result } from 'neverthrow';
import type { ErrorFuente } from '@/shared/errores.ts';
import type { DatosProveedor, NuevoProveedor, Proveedor } from '../../domain/proveedor.ts';

export interface ProveedoresPort {
    listar(): Promise<Result<Proveedor[], ErrorFuente>>;
    crear(p: NuevoProveedor): Promise<Result<string, ErrorFuente>>;
    editar(id: string, d: DatosProveedor): Promise<Result<null, ErrorFuente>>;
}
