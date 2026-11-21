import { describe, expect, it } from 'vitest';
import { aTexto, aValor, leerTasa, mostrar, parametros, tcVigentes, totalesCola, faltaEnConcepto } from '@/modules/configuracion/domain/configuracion.ts';
import { columnasCola } from '@/modules/configuracion/domain/exportar.ts';
import { columnasEquipo } from '@/modules/equipo/domain/exportar.ts';
import { filtrarEquipo, hayCambios, datosDe, valorCambio, sinArea, type Miembro } from '@/modules/equipo/domain/equipo.ts';

describe('parámetros de config', () => {
    const ps = parametros([
        { clave: 'retencion_tasa', valor: 0.03, nota: '' },
        { clave: 'exigir_evaluacion_fin', valor: true, nota: '' },
        { clave: 'algo_nuevo', valor: { a: 1 }, nota: 'Nota del admin' },
    ]);
    const p = (k: string) => ps.find((x) => x.clave === k)!;
    it('los conocidos con su descripción; los demás como JSON', () => {
        expect(p('retencion_tasa').etiqueta).toBe('Tasa de retención del IGV');
        expect(p('dias_alerta_plan').valor).toBeNull();
        expect(mostrar(p('dias_alerta_plan'))).toBe('Sin definir');
        expect(p('algo_nuevo').tipo).toBe('json');
        expect(p('algo_nuevo').descripcion).toBe('Nota del admin');
    });
    it('cada tipo ida y vuelta', () => {
        expect(aTexto(p('retencion_tasa'))).toBe('3');
        expect(mostrar(p('retencion_tasa'))).toBe('3 %');
        expect(aValor(p('retencion_tasa'), '3,5')).toEqual({ valor: 0.035 });
        expect(aValor(p('retencion_tasa'), '150')).toHaveProperty('error');
        expect(mostrar(p('exigir_evaluacion_fin'))).toBe('Sí');
        expect(aValor({ tipo: 'entero', etiqueta: 'X' }, '7')).toEqual({ valor: 7 });
        expect(aValor({ tipo: 'entero', etiqueta: 'X' }, '7.5')).toHaveProperty('error');
        expect(aValor({ tipo: 'correos', etiqueta: 'X' }, 'A@x.pe\nb@x.pe, a@x.pe')).toEqual({ valor: ['a@x.pe', 'b@x.pe'] });
        expect(aValor({ tipo: 'correos', etiqueta: 'X' }, 'nadie')).toEqual({ error: '«nadie» no parece un correo.' });
        expect(aValor({ tipo: 'area', etiqueta: 'X' }, 'Planeamiento')).toEqual({ valor: 'Planeamiento' });
        expect(aValor({ tipo: 'area', etiqueta: 'X' }, 'Marte')).toHaveProperty('error');
        expect(aValor({ tipo: 'json', etiqueta: 'X' }, '{"a":')).toHaveProperty('error');
        expect(aValor({ tipo: 'texto', etiqueta: 'X' }, '  ')).toHaveProperty('error');
    });
    it('tasas, TC vigente, conceptos y cola', () => {
        expect(leerTasa('3,75')).toBe(3.75);
        expect(leerTasa('0')).toBeNull();
        const v = tcVigentes(
            [
                { id: '1', moneda: 'USD', tc: 3.7, vigenteDesde: '2026-11-01', registradoPor: null, comentario: '' },
                { id: '2', moneda: 'USD', tc: 3.8, vigenteDesde: '2026-11-15', registradoPor: null, comentario: '' },
                { id: '3', moneda: 'USD', tc: 3.9, vigenteDesde: '2026-12-01', registradoPor: null, comentario: '' },
            ],
            '2026-11-20',
        );
        expect(v.get('USD')?.tc).toBe(3.8);
        expect(faltaEnConcepto('servicios', ['Servicios'])).toMatch(/ya existe/);
        expect(
            totalesCola([
                { estado: 'Error', tipo: 'a', cantidad: 2, masAntiguo: '' },
                { estado: 'Error', tipo: 'b', cantidad: 1, masAntiguo: '' },
            ]).Error,
        ).toBe(3);
    });
});

describe('equipo', () => {
    const m = (x: Partial<Miembro>): Miembro => ({
        id: 'x',
        email: 'x@inroprin.com',
        nombre: 'X',
        area: 'Compras',
        jefeId: null,
        ambito: 'todas',
        activo: true,
        creado: '',
        roles: [],
        ...x,
    });
    const lista = [
        m({ id: 'a', nombre: 'Ana Pérez', roles: ['ADMIN'] }),
        m({ id: 'b', nombre: 'Beto', area: 'Sin área' }),
        m({ id: 'c', nombre: 'Ciro', activo: false }),
    ];
    it('filtra por sin área, desactivadas y texto (también por rol)', () => {
        expect(filtrarEquipo(lista, 'sin-area', '').map((x) => x.id)).toEqual(['b']);
        expect(filtrarEquipo(lista, 'inactivas', '').map((x) => x.id)).toEqual(['c']);
        expect(filtrarEquipo(lista, 'todas', 'perez administrador').map((x) => x.id)).toEqual(['a']);
        expect(sinArea(lista)).toBe(1);
    });
    it('sabe si hay cambios y lee el historial', () => {
        const a = lista[0];
        expect(hayCambios(a, datosDe(a))).toBe(false);
        expect(hayCambios(a, { ...datosDe(a), roles: ['ADMIN', 'GOP'] })).toBe(true);
        expect(valorCambio({ accion: 'equipo_jefe' }, 'a', (id) => (id === 'a' ? 'Ana' : undefined))).toBe('Ana');
        expect(valorCambio({ accion: 'equipo_activo' }, 'false', () => undefined)).toBe('No');
    });
});

describe('Excel de equipo y de la cola', () => {
    it('equipo: roles juntos, jefe por nombre y el día en Lima', () => {
        const m: Miembro = {
            id: 'u1',
            email: 'ana@ejemplo.com',
            nombre: 'Ana',
            area: 'Compras',
            jefeId: 'u2',
            ambito: 'nac',
            activo: true,
            creado: '2026-11-21T03:00:00Z',
            roles: [],
        };
        const cols = columnasEquipo((id) => (id === 'u2' ? 'Beto' : undefined));
        const v = (t: string) => cols.find((c) => c.titulo === t)!.valor(m);
        expect(v('Jefe')).toBe('Beto');
        expect(v('Ámbito')).toBe('Solo nacional');
        expect(v('Entró por primera vez')).toEqual(new Date(Date.UTC(2026, 10, 20)));
    });
    it('cola: el próximo intento solo para lo pendiente', () => {
        const x = {
            id: 7,
            tipo: 'correo',
            refTabla: null,
            refId: null,
            estado: 'Error' as const,
            intentos: 3,
            error: 'Sin respuesta',
            creado: '2026-11-20T15:00:00Z',
            procesarDesde: '2026-11-20T16:00:00Z',
            terminado: null,
        };
        const v = (t: string) =>
            columnasCola()
                .find((c) => c.titulo === t)!
                .valor(x);
        expect(v('Próximo intento')).toBeNull();
        expect(v('Mensaje')).toBe('Sin respuesta');
        expect(v('Intentos')).toBe(3);
    });
});
