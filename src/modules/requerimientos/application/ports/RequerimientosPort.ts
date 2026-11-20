import type { Result } from 'neverthrow';
import type { ErrorFuente } from '@/shared/errores.ts';
import type { CabeceraReq, EdicionItem, Requerimiento, RequerimientoDetalle } from '../../domain/requerimiento.ts';
import type { FilaSeguimiento } from '../../domain/seguimiento.ts';
import type { ItemTecnica } from '../../domain/validacion.ts';

export interface RequerimientosPort {
    listar(): Promise<Result<Requerimiento[], ErrorFuente>>;
    leer(id: string): Promise<Result<RequerimientoDetalle, ErrorFuente>>;
    /** El requerimiento de una anulación (la bandeja enlaza /requerimientos?anulacion=<id>). */
    requerimientoDeAnulacion(anulacionId: string): Promise<Result<string, ErrorFuente>>;
    /** Cabecera e ítems: update directo (RLS: área emisora, En Proceso; app.proteger deja solo estas columnas). */
    editarCabecera(id: string, c: CabeceraReq): Promise<Result<null, ErrorFuente>>;
    editarItem(id: string, e: EdicionItem): Promise<Result<null, ErrorFuente>>;
    /** Los ítems vivos de requerimientos en proceso o emitidos, con su validación técnica. */
    itemsTecnica(): Promise<Result<ItemTecnica[], ErrorFuente>>;
    /** Un ítem cualquiera (para abrir /validaciones?ver=<id> aunque ya no esté pendiente). */
    itemTecnica(id: string): Promise<Result<ItemTecnica, ErrorFuente>>;
    /** seguimiento_items(p_proyecto): sin montos. */
    seguimiento(proyectoId: string | null): Promise<Result<FilaSeguimiento[], ErrorFuente>>;
}
