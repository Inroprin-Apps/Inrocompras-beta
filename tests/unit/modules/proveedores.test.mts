import { describe, expect, it } from 'vitest';
import {
    FILTROS_PROVEEDOR,
    NUEVO_PROVEEDOR,
    cuentasLimpias,
    faltaEnAlta,
    faltaEnDatos,
    faseProveedor,
    filtrarProveedores,
    ordenarProveedores,
    retencion,
    yaRegistrado,
    type Proveedor,
} from '@/modules/proveedores/domain/proveedor.ts';
import { digitoVerificador, motivoRuc, rucValido } from '@/modules/proveedores/domain/ruc.ts';

const p = (x: Partial<Proveedor>): Proveedor => ({
    id: 'x', ruc: '20100100101', razonSocial: 'Proveedor SAC', origen: 'Nacional', pais: '', correo: '', telefono: '', contacto: '', cuentas: [],
    esAgenteRetencion: false, esBuenContribuyente: false, verificadoContab: false, verificadoPor: null, fechaVerificacion: null,
    evaluacion: 'Pendiente', evaluacionPor: null, evaluacionFecha: null, evaluacionNota: '', creadoPor: null, creado: '2026-11-01T00:00:00Z', ...x,
});

describe('RUC (módulo 11, igual que public.ruc_valido)', () => {
    it('acepta RUC válidos y rechaza el dígito verificador mal', () => {
        expect(rucValido('20100100101')).toBe(true);
        expect(rucValido('20555666773')).toBe(true);
        expect(rucValido('20100100102')).toBe(false);
        expect(rucValido('30100100101')).toBe(false);
        expect(rucValido('2010010010')).toBe(false);
    });
    it('el dígito verificador: 10 → 0 y 11 → 1', () => {
        // Se buscan prefijos que den resto 1 y 0 (11-1=10→0, 11-0=11→1).
        for (let i = 0; i < 2000; i++) {
            const diez = '20' + String(i).padStart(8, '0');
            const d = digitoVerificador(diez);
            expect(d).toBeGreaterThanOrEqual(0);
            expect(d).toBeLessThanOrEqual(9);
            expect(rucValido(diez + d)).toBe(true);
        }
    });
    it('dice qué le pasa al RUC mientras se escribe', () => {
        expect(motivoRuc('')).toMatch(/Escribe el RUC/);
        expect(motivoRuc('2010')).toMatch(/llevas 4 de 11/);
        expect(motivoRuc('201001001011')).toMatch(/Sobran/);
        expect(motivoRuc('2010010010a')).toMatch(/solo lleva números/);
        expect(motivoRuc('30100100101')).toMatch(/empieza con 10, 15, 16, 17 o 20/);
        expect(motivoRuc('20100100102')).toMatch(/verificador/);
        expect(motivoRuc(' 20.100.100-101 ')).toBeNull();
    });
});

describe('alta y edición', () => {
    it('nacional exige RUC válido; extranjero, país', () => {
        expect(faltaEnAlta({ ...NUEVO_PROVEEDOR, ruc: '20100100102', razonSocial: 'X' })).toMatch(/verificador/);
        expect(faltaEnAlta({ ...NUEVO_PROVEEDOR, ruc: '20100100101', razonSocial: '' })).toMatch(/razón social/);
        expect(faltaEnAlta({ ...NUEVO_PROVEEDOR, ruc: '20100100101', razonSocial: 'X' })).toBeNull();
        expect(faltaEnAlta({ ...NUEVO_PROVEEDOR, origen: 'Extranjero', razonSocial: 'Abroad' })).toMatch(/país/);
        expect(faltaEnAlta({ ...NUEVO_PROVEEDOR, origen: 'Extranjero', razonSocial: 'Abroad', pais: 'China' })).toBeNull();
    });
    it('revisa el correo y las cuentas', () => {
        const base = { ...NUEVO_PROVEEDOR, razonSocial: 'X' };
        expect(faltaEnDatos({ ...base, correo: 'ventas' }, 'Nacional')).toMatch(/correo/);
        expect(faltaEnDatos({ ...base, cuentas: [{ banco: '', moneda: 'PEN', numero: '123', cci: '', swift: '', iban: '' }] }, 'Nacional')).toMatch(/Cuenta 1: escribe el banco/);
        expect(faltaEnDatos({ ...base, cuentas: [{ banco: 'BCP', moneda: 'PEN', numero: '1', cci: '123', swift: '', iban: '' }] }, 'Nacional')).toMatch(/CCI tiene 20/);
        expect(faltaEnDatos({ ...base, pais: 'China', cuentas: [{ banco: 'HSBC', moneda: 'USD', numero: '', cci: '', swift: 'HSBCHKHH', iban: 'GB00X' }] }, 'Extranjero')).toBeNull();
        expect(faltaEnDatos({ ...base, pais: 'China', cuentas: [{ banco: 'HSBC', moneda: 'USD', numero: '1', cci: '', swift: 'HSB', iban: '' }] }, 'Extranjero')).toMatch(/SWIFT/);
    });
    it('las cuentas vacías no se guardan y se limpian', () => {
        expect(cuentasLimpias([{ banco: ' BCP ', moneda: 'PEN', numero: '1', cci: '002-191 0000', swift: '', iban: '' }, { banco: '', moneda: 'PEN', numero: '', cci: '', swift: '', iban: '' }])).toEqual([
            { banco: 'BCP', moneda: 'PEN', numero: '1', cci: '0021910000', swift: '', iban: '' },
        ]);
    });
});

describe('lista', () => {
    const lista = [
        p({ id: 'a', razonSocial: 'Ñandú Ferretería', evaluacion: 'Aprobado', verificadoContab: true, creado: '2026-11-03' }),
        p({ id: 'b', razonSocial: 'Acero Andino', ruc: '20555666773', creado: '2026-11-05' }),
        p({ id: 'c', razonSocial: 'Overseas Ltd', origen: 'Extranjero', ruc: '', pais: 'China', evaluacion: 'Observado', creado: '2026-11-01' }),
    ];
    it('filtra por origen, evaluación, verificación y texto (sin tildes)', () => {
        expect(filtrarProveedores(lista, { ...FILTROS_PROVEEDOR, origen: 'Extranjero' }).map((x) => x.id)).toEqual(['c']);
        expect(filtrarProveedores(lista, { ...FILTROS_PROVEEDOR, evaluacion: 'Aprobado' }).map((x) => x.id)).toEqual(['a']);
        expect(filtrarProveedores(lista, { ...FILTROS_PROVEEDOR, verificado: 'no' }).map((x) => x.id)).toEqual(['b']);
        expect(filtrarProveedores(lista, { ...FILTROS_PROVEEDOR, texto: 'nandu' }).map((x) => x.id)).toEqual(['a']);
        expect(filtrarProveedores(lista, { ...FILTROS_PROVEEDOR, texto: '20555' }).map((x) => x.id)).toEqual(['b']);
        expect(filtrarProveedores(lista, { ...FILTROS_PROVEEDOR, texto: 'china' }).map((x) => x.id)).toEqual(['c']);
    });
    it('ordena por razón social o por recientes', () => {
        expect(ordenarProveedores(lista, 'nombre').map((x) => x.id)).toEqual(['b', 'a', 'c']);
        expect(ordenarProveedores(lista, 'recientes').map((x) => x.id)).toEqual(['b', 'a', 'c']);
    });
    it('avisa un RUC ya registrado', () => expect(yaRegistrado(lista, '20 555 666 773')?.id).toBe('b'));
    it('retención y fases', () => {
        expect(retencion(lista[2]).texto).toBe('No aplica');
        expect(retencion(lista[1]).texto).toBe('Por verificar');
        expect(faseProveedor(lista[0])).toBe(3);
        expect(faseProveedor(lista[1])).toBe(1);
        expect(faseProveedor(p({ origen: 'Extranjero', evaluacion: 'Aprobado' }))).toBe(2);
    });
});
