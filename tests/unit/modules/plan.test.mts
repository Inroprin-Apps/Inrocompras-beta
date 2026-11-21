import { describe, expect, it } from 'vitest';
import {
    bloqueo,
    calcular,
    criticidad,
    faltaEnLineaCarrito,
    fechaLimite,
    filtrarPlan,
    FILTROS_PLAN,
    hoyLima,
    lineasCarrito,
    motivoNoMarcar,
    ordenarPlan,
    resumir,
    semaforo,
    type ConfigPlan,
    type LineaPlan,
    columnasExcelPlan,
} from '@/modules/plan/domain/plan.ts';

const l = (x: Partial<LineaPlan>): LineaPlan => ({
    itemId: 'i1',
    requerimientoId: 'r1',
    requerimiento: 'RC-2026-0001',
    rqSidige: '',
    reqEstado: 'Emitido',
    proyectoId: 'p1',
    nItem: 1,
    tipo: 'Bienes',
    codigoCliente: 'C-1',
    sku: '',
    descripcion: 'Torno',
    unidad: 'UND',
    cantidad: 10,
    saldo: 10,
    canal: 'Nacional',
    plazoDias: 20,
    fechaMeta: '2026-12-31',
    incluidoEn: null,
    anulado: false,
    validacion: 'Validado',
    marca: '',
    modelo: '',
    presupuestoUnit: 100,
    monedaPpto: 'PEN',
    ordenes: [],
    pagado: false,
    ...x,
});
const cfg: ConfigPlan = { hoy: '2026-11-20', diasAlerta: 7, exigirValidacion: true };
const num = (t: string) => (t.trim() === '' || Number.isNaN(Number(t)) ? null : Number(t));

describe('plan de compras: fechas y semáforo', () => {
    it('fecha límite = meta − plazo (nacional) y − 15 más en importación', () => {
        expect(fechaLimite(l({}))).toBe('2026-12-11');
        expect(fechaLimite(l({ canal: 'Importación' }))).toBe('2026-11-26');
        expect(fechaLimite(l({ fechaMeta: null }))).toBeNull();
        expect(fechaLimite(l({ plazoDias: null }))).toBe('2026-12-31');
    });
    it('vencida si pasó la fecha límite con saldo; ámbar a 7 días o menos; con OC si no hay saldo', () => {
        expect(semaforo(l({ fechaMeta: '2026-12-05' }), cfg)).toBe('vencida'); // límite 15/11
        expect(semaforo(l({ fechaMeta: '2026-12-17' }), cfg)).toBe('ambar'); // límite 27/11: faltan 7
        expect(semaforo(l({ fechaMeta: '2026-12-18' }), cfg)).toBe('a_tiempo'); // faltan 8
        expect(semaforo(l({ fechaMeta: '2026-12-05', saldo: 0 }), cfg)).toBe('cubierta');
        expect(semaforo(l({ fechaMeta: null }), cfg)).toBe('sin_fecha');
    });
    it('criticidad por plazo', () => {
        expect([121, 120, 100, 99, 60, 30, 29, null].map(criticidad)).toEqual([
            'Fuera de plazo',
            'Muy crítico',
            'Muy crítico',
            'Crítico',
            'Crítico',
            'Normal',
            'Sencillo',
            'Sin plazo',
        ]);
    });
    it('hoy en Lima (UTC−5)', () => {
        expect(hoyLima(new Date('2026-11-21T03:00:00Z'))).toBe('2026-11-20');
        expect(hoyLima(new Date('2026-11-21T06:00:00Z'))).toBe('2026-11-21');
    });
});

describe('plan de compras: bloqueos, orden y filtros', () => {
    it('bloquea: anulado, incluido, req no emitido, sin validación (si se exige), sin canal', () => {
        expect(bloqueo(l({ anulado: true }), cfg)).toMatch(/anulado/);
        expect(bloqueo(l({ incluidoEn: 'x' }), cfg, 'Torno')).toMatch(/incluido en «Torno»/);
        expect(bloqueo(l({ reqEstado: 'En Proceso' }), cfg)).toMatch(/no está emitido/);
        expect(bloqueo(l({ validacion: 'Pendiente' }), cfg)).toMatch(/validación técnica/);
        expect(bloqueo(l({ validacion: 'Pendiente' }), { exigirValidacion: false })).toBeNull();
        expect(bloqueo(l({ validacion: 'No aplica' }), cfg)).toBeNull();
        expect(bloqueo(l({ canal: null }), cfg)).toMatch(/canal/);
        expect(bloqueo(l({}), cfg)).toBeNull();
    });
    it('ordena por criticidad y días a la fecha límite; el accesorio va bajo su equipo', () => {
        const filas = calcular(
            [
                l({ itemId: 'a', plazoDias: 10, fechaMeta: '2026-12-01' }),
                l({ itemId: 'b', plazoDias: 130 }),
                l({ itemId: 'c', plazoDias: 10, fechaMeta: '2026-11-25' }),
                l({ itemId: 'd', plazoDias: 200, incluidoEn: 'a', descripcion: 'Llave' }),
            ],
            cfg,
        );
        const o = ordenarPlan(filas);
        expect(o.map((x) => x.itemId)).toEqual(['b', 'c', 'a', 'd']);
        expect(o[3].nivel).toBe(1);
        expect(filas.find((x) => x.itemId === 'd')!.bloqueo).toMatch(/«Torno»/);
    });
    it('filtra por estado, canal, semáforo, validación y texto', () => {
        const filas = calcular(
            [
                l({ itemId: 'a' }),
                l({ itemId: 'b', saldo: 0, ordenes: [{ id: 'o', numero: 'INROPRIN-NAC-2026-0001', estatus: 'OC pagada' }], pagado: true }),
                l({ itemId: 'c', canal: 'Importación', validacion: 'Pendiente', descripcion: 'Fresadora CNC' }),
            ],
            cfg,
        );
        const ids = (f: Partial<typeof FILTROS_PLAN>) => filtrarPlan(filas, { ...FILTROS_PLAN, ...f }).map((x) => x.itemId);
        expect(ids({ estado: 'por_comprar' })).toEqual(['a', 'c']);
        expect(ids({ estado: 'con_oc' })).toEqual(['b']);
        expect(ids({ estado: 'pagado' })).toEqual(['b']);
        expect(ids({ canal: 'Importación' })).toEqual(['c']);
        expect(ids({ semaforo: 'cubierta' })).toEqual(['b']);
        expect(ids({ validacion: 'pendiente' })).toEqual(['c']);
        expect(ids({ texto: 'fresadora' })).toEqual(['c']);
        expect(ids({ texto: 'nac-2026-0001' })).toEqual(['b']);
        expect(resumir(filas)).toMatchObject({ lineas: 3, porComprar: 2, conOc: 1, validacionPendiente: 1 });
    });
});

describe('carrito «Generar OC»', () => {
    const [a, b, c, d] = calcular(
        [l({ itemId: 'a' }), l({ itemId: 'b', canal: 'Importación' }), l({ itemId: 'c', saldo: 0 }), l({ itemId: 'd', proyectoId: 'p2' })],
        cfg,
    );
    it('no deja mezclar canales ni proyectos, ni marcar sin saldo o bloqueadas', () => {
        expect(motivoNoMarcar(a, [])).toBeNull();
        expect(motivoNoMarcar(b, [a])).toMatch(/un solo canal/);
        expect(motivoNoMarcar(c, [])).toMatch(/saldo/);
        expect(motivoNoMarcar(d, [a])).toMatch(/un solo proyecto/);
        const [x] = calcular([l({ reqEstado: 'En Proceso' })], cfg);
        expect(motivoNoMarcar(x, [])).toMatch(/no está emitido/);
    });
    it('propone el saldo como cantidad y el presupuesto como precio si la moneda calza', () => {
        expect(lineasCarrito([a], 'PEN')[0]).toMatchObject({ cantidad: '10', precio: '100' });
        expect(lineasCarrito([a], 'USD')[0].precio).toBe('');
    });
    it('valida cantidad (≤ saldo) y precio', () => {
        const [x] = lineasCarrito([a], 'PEN');
        expect(faltaEnLineaCarrito(x, num)).toBeNull();
        expect(faltaEnLineaCarrito({ ...x, cantidad: '11' }, num)).toMatch(/saldo es 10/);
        expect(faltaEnLineaCarrito({ ...x, cantidad: '0' }, num)).toMatch(/cantidad/);
        expect(faltaEnLineaCarrito({ ...x, precio: '' }, num)).toMatch(/precio/);
    });
});

describe('exportar el plan', () => {
    it('cada dato en su columna, con las fechas como Date y las OC juntas', () => {
        const [f] = calcular([l({ fechaMeta: '2026-12-31', plazoDias: 10, ordenes: [{ id: 'o', numero: 'OC-9', estatus: 'Borrador' }] })], cfg);
        const v = Object.fromEntries(columnasExcelPlan().map((c) => [c.titulo, c.valor(f)]));
        expect(v['Fecha meta']).toEqual(new Date(Date.UTC(2026, 11, 31)));
        expect(v['OC']).toBe('OC-9 (Borrador)');
        expect(columnasExcelPlan().some((c) => c.tipo === 'monto')).toBe(false);
    });
});
