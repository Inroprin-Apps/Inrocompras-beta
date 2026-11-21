import type { Result } from 'neverthrow';
import type { ErrorFuente } from '@/shared/errores.ts';
import type { Documento, Dueno, NuevoDocumento } from '../../domain/documento.ts';

export interface DocumentosPort {
    listar(dueno: Dueno): Promise<Result<Documento[], ErrorFuente>>;
    subir(dueno: Dueno, archivo: File, meta: NuevoDocumento): Promise<Result<Documento, ErrorFuente>>;
    /** Un enlace temporal para abrir el archivo de Storage (mientras no está en Drive). */
    enlace(storagePath: string): Promise<Result<string, ErrorFuente>>;
    confirmarLectura(
        id: string,
        d: { numero: string; fecha: string | null; monto: number | null; moneda: string | null; ruc: string | null },
    ): Promise<Result<null, ErrorFuente>>;
}
