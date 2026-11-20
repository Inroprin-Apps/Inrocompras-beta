import type { Result } from 'neverthrow';
import type { ErrorFuente } from '@/shared/errores.ts';
import type { Pago } from '../../domain/pago.ts';

export interface PagosPort {
    /** Las cuotas que la persona ve (RLS: solo quien ve precios), sin las de órdenes en borrador. */
    listar(): Promise<Result<Pago[], ErrorFuente>>;
    detalle(id: string): Promise<Result<Pago, ErrorFuente>>;
}
