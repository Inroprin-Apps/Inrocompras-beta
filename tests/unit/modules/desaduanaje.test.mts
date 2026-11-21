import { describe, expect, it } from 'vitest';
import {
    checklist,
    costeoDesactualizado,
    faltaEnGasto,
    faltantes,
    faseDes,
    filtrarDes,
    gastoVacio,
    leerNumero,
    monto,
    montoS,
    ordenarDes,
    tcSugerido,
    tcVigente,
    totalesCosteo,
    type Checklist,
    type Desaduanaje,
    type GastoDes,
} from '@/modules/desaduanaje/application/views.ts';
import { columnasDes } from '@/modules/desaduanaje/domain/exportar.ts';

const sinChk: Checklist = { factura: false, bl: false, certOrigen: false, seguro: false, permiso: false };

const d = (x: Partial<Desaduanaje>): Desaduanaje => ({
    id: '1',
    numero: 'DES-2026-0001',
    romano: 'I',
    estado: 'Borrador',
    tipo: 'Marítimo',
    alcance: 'Total',
    ordenId: 'o1',
    ordenNumero: 'INROPRIN-IMP-2026-0001',
    proveedor: 'Overseas Machinery',
    proyecto: '',
    nDam: '',
    blAwb: '',
    fechaEmbarque: null,
    fechaLlegadaEst: null,
    fechaNumeracion: null,
    fechaLlegada: null,
    fechaLevante: null,
    fechaAlmacen: null,
    fi: null,
    versionCosteo: 0,
    creado: '2026-11-01',
    ...x,
});

const g = (x: Partial<GastoDes>): GastoDes => ({
    id: 'g',
    concepto: 'Flete internacional',
    entraCosto: true,
    emisor: '',
    rucEmisor: '',
    tipoComprobante: 'Factura',
    nComprobante: '',
    fechaComprobante: null,
    moneda: 'USD',
    montoSinIgv: 100,
    tcCosteo: 3.8,
    montoS: 380,
    ocHijaId: null,
    ocHija: '',
    registradoPor: 'u',
    fechaRegistro: '2026-11-20',
    comentario: '',
    ...x,
});

describe('checklist (réplica de app.des_docs_faltantes)', () => {
    it('sin nada, faltan los cuatro con las palabras de la base; el permiso solo si se requiere', () => {
        expect(faltantes({ chk: sinChk, requierePermiso: false }, [])).toEqual(['Factura comercial', 'BL / AWB', 'Certificado de origen', 'Seguro']);
        expect(faltantes({ chk: sinChk, requierePermiso: true }, [])).toContain('Permiso');
        expect(checklist({ chk: sinChk, requierePermiso: false }, []).map((i) => i.campo)).not.toContain('permiso');
    });
    it('un documento subido cuenta igual que el check', () => {
        const items = checklist({ chk: { ...sinChk, factura: true, bl: true }, requierePermiso: true }, [
            'Póliza de seguro',
            'Certificado de origen',
            'Packing list',
        ]);
        expect(items.find((i) => i.campo === 'seguro')).toMatchObject({ marcado: false, subido: true, cumple: true });
        expect(faltantes({ chk: { ...sinChk, factura: true, bl: true }, requierePermiso: true }, ['Póliza de seguro', 'Certificado de origen'])).toEqual([
            'Permiso',
        ]);
        expect(
            faltantes({ chk: { ...sinChk, factura: true, bl: true, permiso: true }, requierePermiso: true }, ['Póliza de seguro', 'Certificado de origen']),
        ).toEqual([]);
    });
});

describe('TC de costeo sugerido', () => {
    const tcs = [
        { moneda: 'USD', tc: 3.7, vigenteDesde: '2026-11-01' },
        { moneda: 'USD', tc: 3.8, vigenteDesde: '2026-11-15' },
        { moneda: 'EUR', tc: 4.1, vigenteDesde: '2026-11-01' },
    ];
    const des = { tcUsd: 3.75, tcEur: 4.0, tcGbp: 4.6, fechaNumeracion: null as string | null };
    it('el vigente es el último con vigente_desde ≤ fecha', () => {
        expect(tcVigente(tcs, 'USD', '2026-11-14')).toBe(3.7);
        expect(tcVigente(tcs, 'USD', '2026-11-15')).toBe(3.8);
        expect(tcVigente(tcs, 'USD', '2026-10-01')).toBeNull();
    });
    it('en soles es 1', () => expect(tcSugerido('PEN', '2026-11-20', des, tcs)).toMatchObject({ tc: 1, origen: 'soles' }));
    it('antes de numerar la DAM: el vigente a la fecha del comprobante', () =>
        expect(tcSugerido('USD', '2026-11-10', des, tcs)).toMatchObject({ tc: 3.7, origen: 'vigente' }));
    it('con la DAM numerada: el congelado, aunque haya otro vigente', () =>
        expect(tcSugerido('USD', '2026-11-20', { ...des, tcUsd: 3.8, fechaNumeracion: '2026-11-18' }, tcs)).toMatchObject({ tc: 3.8, origen: 'congelado' }));
    it('sin TC de costeo: el referencial del desaduanaje', () =>
        expect(tcSugerido('GBP', '2026-11-20', des, tcs)).toMatchObject({ tc: 4.6, origen: 'referencial' }));
});

describe('totales del costeo', () => {
    const productos = [
        { exwS: 7600, adValoremS: 380 },
        { exwS: 3800, adValoremS: 0 },
    ];
    it('suma EXW, gastos que entran (la nota de crédito resta), ad valorem y da el FI', () => {
        const t = totalesCosteo(productos, [
            g({ montoS: 1900 }),
            g({ concepto: 'Agente de aduanas', moneda: 'PEN', montoS: 750 }),
            g({ concepto: 'Flete internacional', tipoComprobante: 'Nota de crédito', montoS: 100 }),
            g({ concepto: 'IGV importación', entraCosto: false, montoS: 2052 }),
        ]);
        expect(t).toMatchObject({ exwS: 11400, gastosCostoS: 2550, gastosFueraS: 2052, adValoremS: 380, costoTotalS: 14330 });
        expect(t.fi).toBeCloseTo(14330 / 11400, 6);
    });
    it('sin calcular (EXW en null) el FI es null', () => expect(totalesCosteo([{ exwS: null, adValoremS: null }], []).fi).toBeNull());
    it('avisa si hay gastos que el costeo guardado no incluye', () => {
        const t = totalesCosteo(productos, [g({ montoS: 1900 })]);
        expect(costeoDesactualizado({ gastosCostoS: 1900, estado: 'En almacén' }, t)).toBe(false);
        expect(costeoDesactualizado({ gastosCostoS: 0, estado: 'En almacén' }, t)).toBe(true);
        expect(costeoDesactualizado({ gastosCostoS: 0, estado: 'Costeo cerrado' }, t)).toBe(false);
    });
    it('monto en soles redondeado a 2', () => expect(montoS(123.45, 3.789)).toBe(467.75));
});

describe('gastos: qué falta', () => {
    it('pide concepto, monto > 0, TC si no es en soles, RUC de 11', () => {
        expect(faltaEnGasto(gastoVacio())).toMatch(/concepto/);
        expect(faltaEnGasto({ ...gastoVacio(), concepto: 'Seguro', montoSinIgv: 0 })).toMatch(/mayor que cero/);
        expect(faltaEnGasto({ ...gastoVacio(), concepto: 'Seguro', montoSinIgv: 10 })).toMatch(/tipo de cambio/);
        expect(faltaEnGasto({ ...gastoVacio('PEN'), concepto: 'Seguro', montoSinIgv: 10 })).toBeNull();
        expect(faltaEnGasto({ ...gastoVacio('PEN'), concepto: 'Seguro', montoSinIgv: 10, rucEmisor: '2010' })).toMatch(/11 dígitos/);
    });
    it('lee números escritos a mano', () => {
        expect(leerNumero('1,234.5')).toBe(1234.5);
        expect(leerNumero('3,85')).toBe(3.85);
        expect(leerNumero('')).toBeNull();
    });
});

describe('lista', () => {
    const l = [
        d({ id: '1', numero: 'DES-2026-0001', estado: 'Costeo cerrado', creado: '2026-11-01', fechaLlegada: '2026-11-10' }),
        d({
            id: '2',
            numero: 'DES-2026-0002',
            estado: 'Llegada',
            tipo: 'Aéreo',
            proveedor: 'Máquinas Lejanas',
            nDam: '118-2026-10-555',
            creado: '2026-11-05',
            fechaLlegadaEst: '2026-11-08',
        }),
    ];
    it('filtra por estado («sin costeo cerrado»), tipo y texto sin tildes (DAM, proveedor)', () => {
        expect(filtrarDes(l, { estado: 'abiertos', tipo: '', texto: '' }).map((x) => x.id)).toEqual(['2']);
        expect(filtrarDes(l, { estado: '', tipo: 'Aéreo', texto: '' }).map((x) => x.id)).toEqual(['2']);
        expect(filtrarDes(l, { estado: '', tipo: '', texto: 'maquinas 555' }).map((x) => x.id)).toEqual(['2']);
    });
    it('ordena por recientes y por llegada', () => {
        expect(ordenarDes(l, 'recientes').map((x) => x.id)).toEqual(['2', '1']);
        expect(ordenarDes(l, 'llegada').map((x) => x.id)).toEqual(['2', '1']);
    });
    it('las fases siguen los siete estados', () => {
        expect(faseDes('Borrador')).toBe(0);
        expect(faseDes('Costeo cerrado')).toBe(6);
    });
});

describe('formato de montos', () => {
    it('como money() de la guía: símbolo, coma de miles, dos decimales y signo menos', () => {
        expect(monto(1234.5)).toBe('S/ 1,234.50');
        expect(monto(1234567.891, 'USD')).toBe('US$ 1,234,567.89');
        expect(monto(-480.5)).toBe('-S/ 480.50');
        expect(monto(10, 'EUR')).toBe('€ 10.00');
        expect(monto(0)).toBe('S/ 0.00');
        expect(monto(-0.001)).toBe('S/ 0.00');
    });
});

describe('Excel de desaduanaje', () => {
    it('cada fecha en su columna; el FI solo para quien ve precios', () => {
        const titulos = (ve: boolean) => columnasDes(ve).map((c) => c.titulo);
        expect(titulos(true)).toContain('FI');
        expect(titulos(false)).not.toContain('FI');
        expect(titulos(false)).toEqual(expect.arrayContaining(['Embarque', 'Llegada', 'Levante', 'Ingreso a almacén']));
        const fila = d({ numero: 'DES-2026-0001', romano: '', fechaLevante: '2026-11-12' });
        expect(
            columnasDes(true)
                .find((c) => c.titulo === 'Levante')!
                .valor(fila),
        ).toEqual(new Date(Date.UTC(2026, 10, 12)));
        expect(
            columnasDes(true)
                .find((c) => c.titulo === 'Desaduanaje')!
                .valor(fila),
        ).toBe('DES-2026-0001');
    });
});
