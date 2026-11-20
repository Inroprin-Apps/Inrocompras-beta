import { describe, expect, it } from 'vitest';
import {
    FILTROS_REQ,
    anulacionPendiente,
    esEditable,
    faltaEnAnulacion,
    faltaEnCabecera,
    faltaEnItem,
    faseActual,
    filtrarRequerimientos,
    itemsAnidados,
    resumenTecnica,
    type Anulacion,
    type ItemRequerimiento,
    type Requerimiento,
} from '@/modules/requerimientos/domain/requerimiento.ts';
import { contarPorEstado, estadoCompra, filtrarSeguimiento, type FilaSeguimiento } from '@/modules/requerimientos/domain/seguimiento.ts';
import { agruparPorRequerimiento, faltaEnTecnica, filtrarTecnica, paramsTecnica, FILTROS_TECNICA, type ItemTecnica } from '@/modules/requerimientos/domain/validacion.ts';

const rq = (x: Partial<Requerimiento>): Requerimiento => ({
    id: 'r', numero: '', rqSidige: '', empresaId: 'INROPRIN', areaEmisora: 'Planeamiento', tipoCompra: null, proyectoId: null, motivo: '',
    destino: '', direccion: '', receptor: '', conceptoGeneral: '', solicitudId: null, estado: 'En Proceso', emisorId: null, fechaEmision: null,
    motivoObservacion: '', creado: '2026-11-01', nItems: 0, ...x,
});
const it_ = (x: Partial<ItemRequerimiento>): ItemRequerimiento => ({
    id: 'i', requerimientoId: 'r', nItem: 1, tipo: 'Bienes', codigoCliente: '', codigoSidige: '', descripcion: 'x', unidad: 'UND', cantidad: 1,
    concepto: '', canal: null, plazoEntregaDias: null, fechaMeta: null, presupuestoUnit: null, monedaPpto: null, incluidoEn: null, anulado: false,
    validacionTecnica: 'Pendiente', marca: '', modelo: '', tecPor: null, tecFecha: null, tecMotivo: '', ...x,
});
const tec = (x: Partial<ItemTecnica>, req: Partial<ItemTecnica['req']> = {}): ItemTecnica => ({
    ...it_(x), req: { id: 'r', numero: '', motivo: 'Proyecto', estado: 'En Proceso', proyectoId: null, ...req },
});

describe('requerimientos', () => {
    it('filtra por estado, área y texto sin tildes', () => {
        const l = [rq({ id: 'a', numero: 'RC-2026-0001', estado: 'Emitido' }), rq({ id: 'b', motivo: 'Señalética', areaEmisora: 'Compras' })];
        expect(filtrarRequerimientos(l, { ...FILTROS_REQ, estado: 'Emitido' }).map((r) => r.id)).toEqual(['a']);
        expect(filtrarRequerimientos(l, { ...FILTROS_REQ, area: 'Compras' }).map((r) => r.id)).toEqual(['b']);
        expect(filtrarRequerimientos(l, { ...FILTROS_REQ, texto: 'senaletica' }).map((r) => r.id)).toEqual(['b']);
    });
    it('edita el área emisora solo en proceso; fases', () => {
        expect(esEditable(rq({}), 'Planeamiento')).toBe(true);
        expect(esEditable(rq({ estado: 'Emitido' }), 'Planeamiento')).toBe(false);
        expect(esEditable(rq({}), 'Compras')).toBe(false);
        expect(faseActual('Anulado')).toBe(-1);
        expect(faseActual('Observado')).toBe(0);
    });
    it('formularios: qué falta', () => {
        expect(faltaEnCabecera({ empresaId: 'INROPRIN', tipoCompra: null, destino: '', direccion: '', receptor: '', conceptoGeneral: '' })).toMatch(/tipo de compra/);
        expect(faltaEnCabecera({ empresaId: 'INROPRIN', tipoCompra: 'Nacional', destino: ' ', direccion: '', receptor: '', conceptoGeneral: '' })).toMatch(/destino/);
        expect(faltaEnItem({ concepto: '', canal: null, fechaMeta: null, plazoEntregaDias: '3.5' })).toMatch(/días/);
        expect(faltaEnItem({ concepto: '', canal: null, fechaMeta: null, plazoEntregaDias: '30' })).toBeNull();
        expect(faltaEnAnulacion({ itemId: null, causa: '', motivo: 'x' })).toMatch(/causa/);
        expect(faltaEnAnulacion({ itemId: null, causa: 'Otro', motivo: ' ' })).toMatch(/motivo/);
    });
    it('accesorios bajo su equipo, resumen técnico sin anulados y anulación pendiente por ítem', () => {
        const l = [it_({ id: 'acc', nItem: 2, incluidoEn: 'eq' }), it_({ id: 'eq', nItem: 1, validacionTecnica: 'Validado' }), it_({ id: 'x', nItem: 3, anulado: true })];
        expect(itemsAnidados(l).map((x) => x.item.id)).toEqual(['eq', 'acc', 'x']);
        expect(resumenTecnica(l)).toEqual({ Pendiente: 1, Validado: 1, Observado: 0, 'No aplica': 0 });
        const an = [{ id: 'a1', itemId: 'eq', estado: 'Pendiente' }, { id: 'a2', itemId: null, estado: 'Rechazada' }] as Anulacion[];
        expect(anulacionPendiente(an, 'eq')?.id).toBe('a1');
        expect(anulacionPendiente(an, null)).toBeNull();
    });
});

describe('validación técnica', () => {
    it('agrupa por requerimiento y filtra pendientes por defecto', () => {
        const l = [
            tec({ id: '1', nItem: 2 }, { id: 'r2', numero: 'RC-2026-0002' }),
            tec({ id: '2', nItem: 1 }, { id: 'r2', numero: 'RC-2026-0002' }),
            tec({ id: '3', validacionTecnica: 'Validado' }, { id: 'r1', numero: 'RC-2026-0001' }),
        ];
        const pend = filtrarTecnica(l, FILTROS_TECNICA);
        expect(pend.map((i) => i.id)).toEqual(['1', '2']);
        const g = agruparPorRequerimiento(l);
        expect(g.map((x) => x.req.id)).toEqual(['r1', 'r2']);
        expect(g[1].items.map((i) => i.id)).toEqual(['2', '1']);
    });
    it('validado pide marca o modelo; observado, el motivo; los parámetros van como espera la base', () => {
        expect(faltaEnTecnica({ resultado: 'Validado', marca: '', modelo: '', motivo: '' })).toMatch(/marca/);
        expect(faltaEnTecnica({ resultado: 'Observado', marca: '', modelo: '', motivo: '' })).toMatch(/observas/);
        expect(faltaEnTecnica({ resultado: 'No aplica', marca: '', modelo: '', motivo: '' })).toBeNull();
        expect(paramsTecnica('i1', { resultado: 'Validado', marca: ' Bosch ', modelo: '', motivo: '' })).toEqual({
            p_item: 'i1', p_resultado: 'Validado', p_marca: 'Bosch', p_modelo: null, p_motivo: null,
        });
        expect(paramsTecnica('i1', { resultado: 'No aplica', marca: 'X', modelo: 'Y', motivo: '' }).p_marca).toBeNull();
    });
});

describe('seguimiento', () => {
    const f = (x: Partial<FilaSeguimiento>): FilaSeguimiento => ({
        itemId: 'i', proyecto: 'P', requerimiento: 'RC-1', rqSidige: '', codigoCliente: '', codigoSidige: '', descripcion: 'Mesa', cantidad: 1, saldo: 1,
        validacionTecnica: 'Pendiente', marca: '', modelo: '', ordenes: '', estadoOrden: '', fechaMeta: null, pagado: false, ...x,
    });
    it('por comprar, con OC o pagado; cuenta y filtra', () => {
        const l = [f({ itemId: 'a' }), f({ itemId: 'b', ordenes: 'INROPRIN-NAC-2026-0001', descripcion: 'Silla' }), f({ itemId: 'c', ordenes: 'X', pagado: true })];
        expect(l.map(estadoCompra)).toEqual(['por_comprar', 'con_oc', 'pagado']);
        expect(contarPorEstado(l)).toEqual({ por_comprar: 1, con_oc: 1, pagado: 1 });
        expect(filtrarSeguimiento(l, { estado: 'con_oc', texto: '' }).map((x) => x.itemId)).toEqual(['b']);
        expect(filtrarSeguimiento(l, { estado: '', texto: 'nac-2026' }).map((x) => x.itemId)).toEqual(['b']);
    });
});
