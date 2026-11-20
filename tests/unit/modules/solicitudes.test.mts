import { describe, expect, it } from 'vitest';
import {
    claveDeTitulo,
    esErrorLectura,
    fechaDeSerial,
    leerFilas,
    normalizarCanal,
    normalizarFecha,
    normalizarMoneda,
    normalizarNumero,
    normalizarTipo,
} from '@/modules/solicitudes/domain/carga.ts';
import {
    faltaEnItem,
    faltaEnSolicitud,
    faseActual,
    filtrarSolicitudes,
    itemsAnidados,
    ITEM_VACIO,
    siguienteNItem,
    FILTROS_SOLICITUD,
    type ItemSolicitud,
    type Solicitud,
} from '@/modules/solicitudes/domain/solicitud.ts';

describe('carga Excel: títulos', () => {
    it('reconoce tildes, mayúsculas, guiones bajos y sinónimos', () => {
        expect(claveDeTitulo('DESCRIPCIÓN')).toBe('descripcion');
        expect(claveDeTitulo('Plazo_Adquisicion')).toBe('plazo_adquisicion');
        expect(claveDeTitulo('  Código   Cliente ')).toBe('codigo_cliente');
        expect(claveDeTitulo('Unidad de medida')).toBe('unidad');
        expect(claveDeTitulo('U.M.')).toBe('unidad');
        expect(claveDeTitulo('Cant.')).toBe('cantidad');
        expect(claveDeTitulo('Precio unitario (S/)')).toBe('presupuesto_unit');
        expect(claveDeTitulo('Especificaciones técnicas')).toBe('detalle');
        expect(claveDeTitulo('Link')).toBe('referencia_link');
        expect(claveDeTitulo('Observaciones del cliente')).toBeNull();
    });
});

describe('carga Excel: valores', () => {
    it('fechas: Date, serial de Excel, dd/mm/aaaa, aaaa-mm-dd', () => {
        expect(normalizarFecha(new Date(Date.UTC(2027, 2, 15)))).toBe('2027-03-15');
        expect(fechaDeSerial(46461)).toBe('2027-03-15');
        expect(normalizarFecha(46461)).toBe('2027-03-15');
        expect(normalizarFecha('15/03/2027')).toBe('2027-03-15');
        expect(normalizarFecha('5-3-27')).toBe('2027-03-05');
        expect(normalizarFecha('2027-03-15')).toBe('2027-03-15');
        expect(normalizarFecha('31/02/2027')).toBe('31/02/2027'); // no existe: va tal cual y la base lo marca
        expect(normalizarFecha('mañana')).toBe('mañana');
        expect(normalizarFecha(null)).toBe('');
    });
    it('números con coma o punto, miles y símbolos de moneda', () => {
        expect(normalizarNumero(12)).toBe('12');
        expect(normalizarNumero('12,5')).toBe('12.5');
        expect(normalizarNumero('1,234.50')).toBe('1234.50');
        expect(normalizarNumero('1.234,50')).toBe('1234.50');
        expect(normalizarNumero('1,234')).toBe('1234');
        expect(normalizarNumero('S/ 1 200')).toBe('1200');
        expect(normalizarNumero('US$ 30.5')).toBe('30.5');
        expect(normalizarNumero('dos')).toBe('dos');
        expect(normalizarNumero('')).toBe('');
    });
    it('tipo, canal y moneda', () => {
        expect(normalizarTipo('bien')).toBe('Bienes');
        expect(normalizarTipo('SERVICIOS')).toBe('Servicio');
        expect(normalizarTipo('Insumos')).toBe('Insumos');
        expect(normalizarCanal('importación')).toBe('Importación');
        expect(normalizarCanal('NAC')).toBe('Nacional');
        expect(normalizarMoneda('S/')).toBe('PEN');
        expect(normalizarMoneda('dólares')).toBe('USD');
        expect(normalizarMoneda('US$')).toBe('USD');
        expect(normalizarMoneda('€')).toBe('EUR');
    });
});

describe('carga Excel: leerFilas', () => {
    it('encuentra la fila de títulos aunque haya un encabezado arriba y salta las vacías', () => {
        const hoja = [
            ['Plan de compras — Proyecto X', null, null],
            [null, null, null],
            ['N°', 'Descripción', 'Cant.', 'Fecha requerida', 'Tipo de compra', 'Columna rara'],
            [1, 'Taladro', 2, 46461, 'Importación', 'x'],
            [null, null, null, null, null, null],
            [2, 'Brocas', '10', '15/03/2027', 'nacional', null],
        ];
        const l = leerFilas(hoja);
        expect(esErrorLectura(l)).toBe(false);
        if (esErrorLectura(l)) return;
        expect(l.filas).toHaveLength(2);
        expect(l.filas[0]).toEqual({
            filaExcel: 4,
            datos: { fila_excel: '4', descripcion: 'Taladro', cantidad: '2', plazo_adquisicion: '2027-03-15', canal: 'Importación' },
        });
        expect(l.filas[1].datos.canal).toBe('Nacional');
        expect(l.ignoradas).toEqual(['N°', 'Columna rara']);
    });
    it('sin títulos reconocibles o sin cantidad, dice qué falta', () => {
        const a = leerFilas([['a', 'b'], [1, 2]]);
        expect(esErrorLectura(a) && a.mensaje).toMatch(/fila de títulos/);
        const b = leerFilas([['Descripción', 'Unidad'], ['x', 'UND']]);
        expect(esErrorLectura(b) && b.mensaje).toMatch(/Cantidad/);
        const c = leerFilas([['Descripción', 'Cantidad']]);
        expect(esErrorLectura(c) && c.mensaje).toMatch(/no tiene filas/);
    });
    it('no manda las celdas vacías (la base pone sus valores por defecto)', () => {
        const l = leerFilas([['Tipo', 'Descripción', 'Cantidad', 'Unidad'], [null, 'Mesa', 1, '']]);
        if (esErrorLectura(l)) throw new Error(l.mensaje);
        expect(l.filas[0].datos).toEqual({ fila_excel: '2', descripcion: 'Mesa', cantidad: '1' });
    });
});

const sol = (x: Partial<Solicitud>): Solicitud => ({
    id: '1', numero: '', tipo: 'Proyecto', proyectoId: 'p', etapaId: 'e', jefeId: null, solicitanteId: 'yo', sustento: '', estado: 'Borrador',
    liberadoPor: null, fechaLiberacion: null, motivoRechazo: '', motivoObservacion: '', motivoCancelacion: '', nuevaSolicitudId: null,
    requerimientoId: null, estadoCarga: null, loteActual: null, creado: '2026-11-01', nItems: 0, ...x,
});
const it_ = (x: Partial<ItemSolicitud>): ItemSolicitud => ({
    id: 'i', solicitudId: '1', nItem: 1, tipo: 'Bienes', codigoCliente: '', descripcion: 'x', detalle: '', unidad: 'UND', cantidad: 1,
    plazoAdquisicion: null, canal: null, presupuestoUnit: null, monedaPpto: null, incluidoEn: null, referenciaLink: '', ...x,
});

describe('solicitudes', () => {
    it('pestañas: mías, por liberar (según te_toca) y todas', () => {
        const l = [sol({ id: 'a' }), sol({ id: 'b', solicitanteId: 'otro', estado: 'Pendiente Liberación', sustento: 'Equipos de taller' })];
        const ctx = { yo: 'yo', porLiberar: new Set(['b']) };
        expect(filtrarSolicitudes(l, FILTROS_SOLICITUD, ctx).map((s) => s.id)).toEqual(['a']);
        expect(filtrarSolicitudes(l, { ...FILTROS_SOLICITUD, pestana: 'liberar' }, ctx).map((s) => s.id)).toEqual(['b']);
        expect(filtrarSolicitudes(l, { ...FILTROS_SOLICITUD, pestana: 'todas', texto: 'TALLER' }, ctx).map((s) => s.id)).toEqual(['b']);
    });
    it('fases: observada vuelve al inicio; rechazada corta el hilo', () => {
        expect(faseActual('En Req')).toBe(3);
        expect(faseActual('Observada')).toBe(0);
        expect(faseActual('Rechazada')).toBe(-1);
    });
    it('el formulario dice qué falta', () => {
        expect(faltaEnSolicitud({ tipo: 'Proyecto', proyectoId: null, etapaId: null, jefeId: null, sustento: 'x' })).toMatch(/proyecto/);
        expect(faltaEnSolicitud({ tipo: 'Administrativa', proyectoId: null, etapaId: null, jefeId: null, sustento: 'x' })).toMatch(/jefe/);
        expect(faltaEnSolicitud({ tipo: 'Administrativa', proyectoId: null, etapaId: null, jefeId: 'j', sustento: ' ' })).toMatch(/sustento/);
        expect(faltaEnItem({ ...ITEM_VACIO, descripcion: 'Mesa', cantidad: '0' })).toMatch(/cantidad/);
        expect(faltaEnItem({ ...ITEM_VACIO, descripcion: 'Mesa', cantidad: '1,5', presupuestoUnit: 'abc' })).toMatch(/presupuesto/);
        expect(faltaEnItem({ ...ITEM_VACIO, descripcion: 'Mesa', cantidad: '1,5' })).toBeNull();
    });
    it('los accesorios incluidos van debajo de su equipo y el siguiente N° sigue al mayor', () => {
        const l = [it_({ id: 'acc', nItem: 1, incluidoEn: 'eq' }), it_({ id: 'eq', nItem: 2 }), it_({ id: 'otro', nItem: 3 })];
        expect(itemsAnidados(l).map((x) => `${x.item.id}:${x.nivel}`)).toEqual(['eq:0', 'acc:1', 'otro:0']);
        expect(siguienteNItem(l)).toBe(4);
    });
});
