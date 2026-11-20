import { describe, expect, it } from 'vitest';
import {
    aCsv,
    COLUMNAS_CUADRO,
    filtrarCuadro,
    FILTROS_CUADRO,
    ordenarCuadro,
    ordenarPorAprobar,
    textoCelda,
    textoRuta,
    valorExcel,
    yaFirmaron,
    type FilaCuadro,
    type OrdenPorAprobar,
    type TituloCuadro,
    type Valor,
} from '@/modules/cuadro/domain/cuadro.ts';

// Las 35 columnas de docs/04, en su orden (D-05: faltan 2 por confirmar).
const DOCS_04 =
    'VB C. GESTION · OC · Estatus Compra · Comprador · N° Requerimiento · Procedencia · Unidad de negocio · Fecha · Proveedor · Proyecto · Concepto · Link de la carpeta OC · Monto · Moneda original · Monto en Soles · Tipo de aprobación · Forma de pago · % adelanto · Días de crédito · Condición · Aprobación Ppto · Aprobación GOP · Aprobación GAF · Check Aprobació · Check Control Gestión · Estado de Aprobación3 · Observación finanzas · Criterio de observación finanzas · LEGAJO PARA PAGO · OC CERRADA · Cuadro de pagos · Comentarios compras · UBICACIÓN · SUSTENTO DEL EXCESO PARA LA BD · Concatenado';

function fila(id: string, v: Partial<Record<TituloCuadro, Valor>>, empresaId = 'INROPRIN'): FilaCuadro {
    const valores = Object.fromEntries(COLUMNAS_CUADRO.map((c) => [c.titulo, null])) as Record<TituloCuadro, Valor>;
    return { id, empresaId, valores: { ...valores, ...v } };
}

describe('cuadro de aprobaciones', () => {
    it('tiene las 35 columnas de docs/04, con sus nombres exactos y en orden', () => {
        expect(COLUMNAS_CUADRO.map((c) => c.titulo)).toEqual(DOCS_04.split(' · '));
        expect(COLUMNAS_CUADRO).toHaveLength(35);
    });
    it('filtra por estatus, aprobación, procedencia, empresa, fechas y texto', () => {
        const l = [
            fila('a', { OC: 'INROPRIN-NAC-2026-0001', 'Estatus Compra': 'Pago pendiente', 'Estado de Aprobación3': 'Aprobado para Compra', Procedencia: 'Nacional', Fecha: '2026-11-02', Proveedor: 'Ácido SAC' }),
            fila('b', { OC: 'INROPRIN-IMP-2026-0001', 'Estatus Compra': 'Pendiente de aprobación', 'Estado de Aprobación3': 'Observado por GOP', Procedencia: 'Importación', Fecha: '2026-11-15' }, 'INROPLAS'),
        ];
        const ids = (f: Partial<typeof FILTROS_CUADRO>) => filtrarCuadro(l, { ...FILTROS_CUADRO, ...f }).map((x) => x.id);
        expect(ids({ estatus: 'Pago pendiente' })).toEqual(['a']);
        expect(ids({ aprobacion: 'Observado' })).toEqual(['b']);
        expect(ids({ procedencia: 'Importación' })).toEqual(['b']);
        expect(ids({ empresa: 'INROPLAS' })).toEqual(['b']);
        expect(ids({ desde: '2026-11-10' })).toEqual(['b']);
        expect(ids({ hasta: '2026-11-10' })).toEqual(['a']);
        expect(ids({ texto: 'acido' })).toEqual(['a']);
        expect(ordenarCuadro(l).map((x) => x.id)).toEqual(['b', 'a']);
    });
    it('celdas: sí/no, montos es-PE, porcentaje y fecha', () => {
        const col = (t: TituloCuadro) => COLUMNAS_CUADRO.find((c) => c.titulo === t)!;
        expect(textoCelda(col('VB C. GESTION'), true)).toBe('Sí');
        expect(textoCelda(col('Monto'), 1234.5)).toBe('1,234.50');
        expect(textoCelda(col('% adelanto'), 0.3)).toBe('30 %');
        expect(textoCelda(col('Fecha'), '2026-11-02')).toBe('02/11/2026');
        expect(valorExcel(col('Monto'), '10.5')).toBe(10.5);
        expect(valorExcel(col('Fecha'), '2026-11-02')).toEqual(new Date('2026-11-02T00:00:00Z'));
        expect(valorExcel(col('OC'), null)).toBeNull();
    });
    it('CSV con BOM, encabezados exactos y comillas donde hace falta', () => {
        const csv = aCsv([fila('a', { OC: 'X-1', Proveedor: 'Uno, Dos "y" Tres', 'LEGAJO PARA PAGO': true, Monto: 10 })]);
        const [cab, uno] = csv.replace('﻿', '').trim().split('\r\n');
        expect(csv.startsWith('﻿')).toBe(true);
        expect(cab.split(',')).toHaveLength(35);
        expect(cab.startsWith('VB C. GESTION,OC,Estatus Compra')).toBe(true);
        expect(uno).toContain('"Uno, Dos ""y"" Tres"');
        expect(uno).toContain('TRUE');
    });
    it('tarjetas por firmar: ruta, quién ya firmó y lo que más espera primero', () => {
        const o = (id: string, x: Partial<OrdenPorAprobar> = {}): OrdenPorAprobar => ({
            id, numero: id, proveedor: 'P', proyecto: '', compradorId: 'c', moneda: 'PEN', monto: 1, montoSoles: 1, tipoAprobacion: 'Aprobación Conjunta',
            estadoAprobacion: 'Falta Aprobación', aprobacionPpto: 'Presupuestado', ppto: { valor: 'Presupuestado', por: 'cg', fecha: null },
            gop: { valor: 'Aprobado', por: 'gop', fecha: null }, gaf: { valor: null, por: null, fecha: null }, demasias: [], fechaEmision: null, lineas: 1, ...x,
        });
        expect(yaFirmaron(o('a')).map((f) => f.quien)).toEqual(['Control de Gestión', 'GOP']);
        expect(textoRuta('Aprobación Única')).toMatch(/basta la GOP/);
        expect(ordenarPorAprobar([o('a'), o('b')], new Map([['a', '2026-11-10'], ['b', '2026-11-01']])).map((x) => x.id)).toEqual(['b', 'a']);
    });
});
