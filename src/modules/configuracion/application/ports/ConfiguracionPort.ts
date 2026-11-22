import type { Result } from 'neverthrow';
import type { ErrorFuente } from '@/shared/errores.ts';
import type { AmbitoConcepto, ConceptoGasto, Concepto, Empresa, Moneda, ResumenCola, TcCosteo, TrabajoCola } from '../../domain/configuracion.ts';

export interface DatosConfiguracion {
    config: { clave: string; valor: unknown; nota: string }[];
    monedas: Moneda[];
    tcCosteo: TcCosteo[];
    conceptos: Concepto[];
    gastos: ConceptoGasto[];
    empresas: Empresa[];
}

export interface ConfiguracionPort {
    leer(): Promise<Result<DatosConfiguracion, ErrorFuente>>;
    guardarParametro(clave: string, valor: unknown, nota: string): Promise<Result<null, ErrorFuente>>;
    guardarTasa(moneda: string, tasa: number): Promise<Result<null, ErrorFuente>>;
    agregarTc(t: { moneda: string; tc: number; vigenteDesde: string; comentario: string }): Promise<Result<null, ErrorFuente>>;
    agregarConcepto(id: string, ambito: AmbitoConcepto): Promise<Result<null, ErrorFuente>>;
    activarConcepto(id: string, activo: boolean): Promise<Result<null, ErrorFuente>>;
    guardarGasto(g: ConceptoGasto, nuevo: boolean): Promise<Result<null, ErrorFuente>>;
    guardarEmpresa(e: Empresa, nueva: boolean): Promise<Result<null, ErrorFuente>>;
}

export interface ColaPort {
    resumen(): Promise<Result<ResumenCola[], ErrorFuente>>;
    listar(estado: string | null): Promise<Result<TrabajoCola[], ErrorFuente>>;
    reintentar(id: number): Promise<Result<null, ErrorFuente>>;
    descartar(id: number, motivo: string): Promise<Result<null, ErrorFuente>>;
}
