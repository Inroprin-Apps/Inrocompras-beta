import { describe, expect, it } from 'vitest';
import {
    dePestana,
    diaPago,
    fasePago,
    filtrarPagos,
    FILTROS_PAGO,
    formatoCuota,
    hoyLima,
    nombrePago,
    notaPago,
    ordenarPagos,
    resumenBloque,
    resumenPagos,
    seleccionable,
    vencida,
    type Pago,
} from '@/modules/pagos/domain/pago.ts';

const base: Pago = {
    id: 'p1',
    ordenId: 'o1',
    ordenNumero: 'INROPRIN-NAC-2026-0001',
    ordenEstatus: 'Pago pendiente',
    procedencia: 'Nacional',
    proveedorId: 'v1',
    proveedor: 'Proveedor Uno',
    compradorId: 'c1',
    moneda: 'PEN',
    nCuota: 1,
    tipo: 'Pago total',
    hito: 'Contado',
    porcentaje: 1,
    monto: 1000,
    montoSoles: 1000,
    aplicaRetencion: false,
    retencion: 0,
    neto: null,
    fechaLimite: '2026-11-25',
    fechaProgramada: null,
    fechaPago: null,
    estado: 'Solicitado',
    factura: null,
    sustento: '',
    nOperacion: '',
    voucherId: null,
    motivoObs: '',
    detalleObs: '',
    inropayRef: '',
    comentario: '',
    creado: '2026-11-20T10:00:00Z',
};
const p = (x: Partial<Pago>): Pago => ({ ...base, ...x });
const HOY = '2026-11-20';

describe('pagos', () => {
    it('hoy en Lima (UTC-5)', () => {
        expect(hoyLima(new Date('2026-11-21T03:00:00Z'))).toBe('2026-11-20');
        expect(hoyLima(new Date('2026-11-21T06:00:00Z'))).toBe('2026-11-21');
    });
    it('vencida: pendiente y con fecha límite antes de hoy', () => {
        expect(vencida(p({ fechaLimite: '2026-11-19' }), HOY)).toBe(true);
        expect(vencida(p({ fechaLimite: '2026-11-20' }), HOY)).toBe(false);
        expect(vencida(p({ fechaLimite: '2026-11-19', estado: 'Pagado' }), HOY)).toBe(false);
        expect(vencida(p({ fechaLimite: '2026-11-19', estado: 'Anulado' }), HOY)).toBe(false);
        expect(vencida(p({ fechaLimite: null }), HOY)).toBe(false);
    });
    it('filtra por estado, fecha límite, proveedor, moneda y texto', () => {
        const l = [
            p({ id: 'a', fechaLimite: '2026-11-10' }),
            p({ id: 'b', fechaLimite: '2026-11-24', moneda: 'USD', proveedorId: 'v2', proveedor: 'Otro' }),
            p({ id: 'c', fechaLimite: '2026-12-15', estado: 'Plan' }),
            p({ id: 'd', fechaLimite: null, estado: 'Pagado', nOperacion: 'OP-778' }),
        ];
        const ids = (f: Partial<typeof FILTROS_PAGO>) => filtrarPagos(l, { ...FILTROS_PAGO, ...f }, HOY).map((x) => x.id);
        expect(ids({ vence: 'vencidas' })).toEqual(['a']);
        expect(ids({ vence: 'semana' })).toEqual(['b']);
        expect(ids({ vence: 'mes' })).toEqual(['b', 'c']);
        expect(ids({ vence: 'sin' })).toEqual(['d']);
        expect(ids({ estado: 'Plan' })).toEqual(['c']);
        expect(ids({ moneda: 'USD' })).toEqual(['b']);
        expect(ids({ proveedor: 'v2' })).toEqual(['b']);
        expect(ids({ texto: 'op-778' })).toEqual(['d']);
    });
    it('pestañas: por atender (solicitado y programado), mías (sin anuladas) y todas', () => {
        const l = [
            p({ id: 'a' }),
            p({ id: 'b', estado: 'Programado' }),
            p({ id: 'c', estado: 'Plan', compradorId: 'yo' }),
            p({ id: 'd', estado: 'Anulado', compradorId: 'yo' }),
        ];
        expect(dePestana(l, 'atender', 'yo').map((x) => x.id)).toEqual(['a', 'b']);
        expect(dePestana(l, 'mias', 'yo').map((x) => x.id)).toEqual(['c']);
        expect(dePestana(l, 'todas', 'yo')).toHaveLength(4);
    });
    it('ordena por fecha límite (sin fecha al final), monto y orden', () => {
        const l = [
            p({ id: 'a', fechaLimite: null, montoSoles: 5 }),
            p({ id: 'b', fechaLimite: '2026-12-01', montoSoles: 50 }),
            p({ id: 'c', fechaLimite: '2026-11-01', montoSoles: 10 }),
        ];
        expect(ordenarPagos(l, 'limite').map((x) => x.id)).toEqual(['c', 'b', 'a']);
        expect(ordenarPagos(l, 'monto').map((x) => x.id)).toEqual(['b', 'c', 'a']);
        const cuotas = [p({ id: 'x', nCuota: 2 }), p({ id: 'y', nCuota: 1 })];
        expect(ordenarPagos(cuotas, 'orden').map((x) => x.id)).toEqual(['y', 'x']);
    });
    it('KPIs: por programar, por pagar, observadas, pagado del mes (en soles) y vencidas', () => {
        const r = resumenPagos(
            [
                p({ estado: 'Solicitado', montoSoles: 100 }),
                p({ estado: 'Solicitado', montoSoles: 50, fechaLimite: '2026-11-01' }),
                p({ estado: 'Programado', montoSoles: 375 }),
                p({ estado: 'Observado Finanzas', montoSoles: 10 }),
                p({ estado: 'Pagado', montoSoles: 200, fechaPago: '2026-11-03T15:00:00Z' }),
                p({ estado: 'Pagado', montoSoles: 999, fechaPago: '2026-10-31T15:00:00Z' }),
                p({ estado: 'Pagado', montoSoles: 7, fechaPago: '2026-11-01T03:00:00Z' }), // 31/10 en Lima
            ],
            HOY,
        );
        expect(r.porProgramar).toEqual({ n: 2, soles: 150 });
        expect(r.porPagar).toEqual({ n: 1, soles: 375 });
        expect(r.observadas).toEqual({ n: 1, soles: 10 });
        expect(r.pagadoMes).toEqual({ n: 1, soles: 200 });
        expect(r.vencidas).toBe(1);
        expect(diaPago({ fechaPago: '2026-11-01T03:00:00Z' })).toBe('2026-10-31');
    });
    it('en bloque se marcan las solicitadas; el resumen separa las que fallaron', () => {
        expect(seleccionable({ estado: 'Solicitado' })).toBe(true);
        expect(seleccionable({ estado: 'Programado' })).toBe(false);
        const r = resumenBloque([
            { id: 'a', nombre: 'A', error: null },
            { id: 'b', nombre: 'B', error: 'La cuota no está solicitada.' },
        ]);
        expect(r.hechas).toBe(1);
        expect(r.fallidas.map((x) => x.id)).toEqual(['b']);
    });
    it('presentación: nombre, cuota partida, fases y nota', () => {
        expect(nombrePago(p({ nCuota: 1.1 }))).toBe('INROPRIN-NAC-2026-0001 · cuota 1.1');
        expect(formatoCuota(2)).toBe('2');
        expect(fasePago('Observado Finanzas')).toBe(1);
        expect(fasePago('Pagado')).toBe(3);
        expect(fasePago('Anulado')).toBe(-1);
        expect(notaPago(p({ estado: 'Plan' }))).toMatch(/Sube la factura/);
        expect(notaPago(p({ estado: 'Plan', tipo: 'Adelanto' }))).toBeNull();
        expect(notaPago(p({ estado: 'Observado Finanzas', motivoObs: 'Falta factura' }))).toMatch(/Falta factura.*subsánala/);
    });
});
