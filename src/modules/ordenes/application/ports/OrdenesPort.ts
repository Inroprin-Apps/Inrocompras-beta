import type { Result } from 'neverthrow';
import type { ErrorFuente } from '@/shared/errores.ts';
import type { Cabecera, Edicion, NuevaOrden, Orden, OrdenDetalle, Proveedor } from '../../domain/orden.ts';

export interface OrdenesPort {
    listar(): Promise<Result<Orden[], ErrorFuente>>;
    detalle(id: string): Promise<Result<OrdenDetalle, ErrorFuente>>;
    edicion(id: string): Promise<Result<Edicion, ErrorFuente>>;
    proveedores(): Promise<Result<Proveedor[], ErrorFuente>>;
    /** ac_oc_crear: el borrador desde el carrito del plan. Devuelve el id. */
    crear(o: NuevaOrden): Promise<Result<string, ErrorFuente>>;
    /** UPDATE directo de las columnas que permite app.proteger + ac_oc_recalcular. */
    guardarCabecera(id: string, c: Partial<Cabecera>): Promise<Result<null, ErrorFuente>>;
    /** UPDATE directo de cantidad / precio / descripción del proveedor + ac_oc_recalcular. */
    guardarLinea(ordenId: string, lineaId: string, l: { cantidad: number; precioUnit: number; descripcionProv: string }): Promise<Result<null, ErrorFuente>>;
    quitarLinea(ordenId: string, lineaId: string): Promise<Result<null, ErrorFuente>>;
    /** ac_oc_demasia: cantidad adicional con motivo (la decide la GOP). */
    demasia(lineaId: string, cantidad: number, motivo: string): Promise<Result<null, ErrorFuente>>;
}
