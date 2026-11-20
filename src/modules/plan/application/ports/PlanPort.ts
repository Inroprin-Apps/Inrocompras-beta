import type { Result } from 'neverthrow';
import type { ErrorFuente } from '@/shared/errores.ts';
import type { LineaPlan } from '../../domain/plan.ts';

/** Alcance del plan: un proyecto, lo que no tiene proyecto, o todo. */
export type AlcancePlan = { proyectoId: string } | 'sin' | 'todos';

export interface PlanPort {
    /** public.plan_compras: las líneas sin montos (el presupuesto solo para quien ve precios). */
    listar(alcance: AlcancePlan): Promise<Result<LineaPlan[], ErrorFuente>>;
}
