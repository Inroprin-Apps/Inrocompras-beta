import { describe, expect, it } from 'vitest';
import {
    dePestana,
    faltaEnCabecera,
    faseOrden,
    filtrarOrdenes,
    FILTROS_ORDEN,
    lateral,
    leerNumero,
    monto,
    nombreOrden,
    ordenarOrdenes,
    totales,
    type Cabecera,
    type Orden,
} from '@/modules/ordenes/domain/orden.ts';

const o = (x: Partial<Orden>): Orden => ({
    id: '1', numero: 'INROPRIN-NAC-2026-0001', estatus: 'Borrador', estadoAprobacion: null, tipoAprobacion: null, procedencia: 'Nacional',
    clase: 'Compra', proyectoId: 'p1', proyecto: 'P-001 · Talleres', proveedorId: 'v1', proveedor: 'Proveedor Uno', compradorId: 'u1',
    fecha: '2026-11-20', moneda: 'PEN', formaPago: 'Contado', monto: 100, montoSoles: 100, fechaEmision: null, creado: '2026-11-20T10:00:00Z', ...x,
});
const cab: Cabecera = {
    proveedorId: 'v1', moneda: 'PEN', tipoImpuesto: 'IGV 18%', formaPago: 'Contado', pctAdelanto: null, hitoSaldo: '', diasCredito: null,
    condicion: 'Normal', concepto: '', lugarEntrega: '', plazoEntregaDias: null, terminos: '', incoterm: '', referenciaProv: '', correoEnvio: '',
};

describe('órdenes', () => {
    it('fases: borrador, por aprobar (con observaciones de aprobación), aprobada, legajo, pago, pagada, cerrada', () => {
        expect(faseOrden({ estatus: 'Borrador' })).toBe(0);
        expect(faseOrden({ estatus: 'Observado por Ppto' })).toBe(1);
        expect(faseOrden({ estatus: 'Legajo incompleto' })).toBe(2);
        expect(faseOrden({ estatus: 'Legajo incompleto', envioSolicitado: '2026-11-20' })).toBe(3);
        expect(faseOrden({ estatus: 'Observado por Finanzas' })).toBe(4);
        expect(faseOrden({ estatus: 'OC pagada' })).toBe(5);
        expect(faseOrden({ estatus: 'OC cerrada' })).toBe(6);
        expect(faseOrden({ estatus: 'Anulada' })).toBe(-1);
        expect(faseOrden({ estatus: 'En modificación', estadoPrevio: 'Pago pendiente' })).toBe(4);
        expect(lateral({ estatus: 'Observado por GOP' })).toMatch(/reenvía/);
        expect(lateral({ estatus: 'Pago pendiente' })).toBeNull();
    });
    it('pestañas: mías, por aprobar (lo que la base puso en Te toca) y todas', () => {
        const l = [o({ id: 'a' }), o({ id: 'b', compradorId: 'u2' })];
        expect(dePestana(l, 'mias', 'u1', new Set()).map((x) => x.id)).toEqual(['a']);
        expect(dePestana(l, 'aprobar', 'u9', new Set(['b'])).map((x) => x.id)).toEqual(['b']);
        expect(dePestana(l, 'todas', 'u1', new Set())).toHaveLength(2);
    });
    it('filtra por estatus, aprobación, procedencia, proyecto («sin»), proveedor y texto', () => {
        const l = [
            o({ id: 'a', estatus: 'Observado por Ppto', estadoAprobacion: 'Observado por Ppto' }),
            o({ id: 'b', procedencia: 'Importación', proyectoId: null, proveedor: 'Overseas Ltd', numero: null }),
        ];
        const ids = (f: Partial<typeof FILTROS_ORDEN>) => filtrarOrdenes(l, { ...FILTROS_ORDEN, ...f }).map((x) => x.id);
        expect(ids({ aprobacion: 'Observado' })).toEqual(['a']);
        expect(ids({ procedencia: 'Importación' })).toEqual(['b']);
        expect(ids({ proyecto: 'sin' })).toEqual(['b']);
        expect(ids({ proyecto: 'p1' })).toEqual(['a']);
        expect(ids({ texto: 'overseas' })).toEqual(['b']);
        expect(ids({ texto: 'borrador' })).toEqual(['b']);
        expect(nombreOrden(l[1])).toBe('Borrador de importación');
    });
    it('ordena por monto en soles', () => {
        expect(ordenarOrdenes([o({ id: 'a', montoSoles: 5 }), o({ id: 'b', montoSoles: 50 })], 'monto').map((x) => x.id)).toEqual(['b', 'a']);
    });
    it('totales con IGV, sin demasías rechazadas', () => {
        const t = totales(
            [
                { cantidad: 10, precioUnit: 250, esDemasia: false, demasiaEstado: null },
                { cantidad: 2, precioUnit: 250, esDemasia: true, demasiaEstado: 'Rechazada' },
            ],
            'IGV 18%',
        );
        expect(t).toEqual({ subtotal: 2500, igv: 450, total: 2950 });
        expect(totales([{ cantidad: 1, precioUnit: 10, esDemasia: false, demasiaEstado: null }], 'Sin IGV').igv).toBe(0);
    });
    it('la cabecera pide % de adelanto o días de crédito según la forma de pago', () => {
        expect(faltaEnCabecera(cab)).toBeNull();
        expect(faltaEnCabecera({ ...cab, proveedorId: null })).toMatch(/proveedor/);
        expect(faltaEnCabecera({ ...cab, formaPago: 'Adelanto' })).toMatch(/adelanto/);
        expect(faltaEnCabecera({ ...cab, formaPago: 'Adelanto', pctAdelanto: 0.3 })).toBeNull();
        expect(faltaEnCabecera({ ...cab, formaPago: 'Crédito' })).toMatch(/días/);
    });
    it('lee números escritos a mano y escribe montos en es-PE', () => {
        expect(leerNumero('1,250.5')).toBe(1250.5);
        expect(leerNumero('12,5')).toBe(12.5);
        expect(leerNumero('x')).toBeNull();
        expect(leerNumero(' ')).toBeNull();
        expect(monto(3894)).toMatch(/S\/\s?3,894\.00/);
    });
});
