import { describe, expect, it } from 'vitest';
import { faltaEnProyecto, filtrarProyectos, faseActual, etapasSinAprobador, type Proyecto } from '@/modules/proyectos/domain/proyecto.ts';

const p = (x: Partial<Proyecto>): Proyecto => ({
    id: '1', codigo: 'P-001', nombre: 'Talleres EPT', cliente: 'Cliente', empresaId: 'INROPRIN', estado: 'Estudio de mercado',
    gerenteId: null, fechaMeta: null, lugarEntrega: '', creado: '2026-11-01', etapas: [], ...x,
});

describe('proyectos', () => {
    it('busca sin tildes ni mayúsculas, por todas las palabras', () => {
        const l = [p({ nombre: 'Equipamiento Técnico' }), p({ id: '2', nombre: 'Mobiliario' })];
        expect(filtrarProyectos(l, { estado: '', texto: 'tecnico equip' }).map((x) => x.id)).toEqual(['1']);
    });
    it('perdido corta el hilo de fases', () => {
        expect(faseActual('Perdido')).toBe(-1);
        expect(faseActual('Ganado')).toBe(1);
    });
    it('pide nombre y avisa de etapas sin aprobador', () => {
        expect(faltaEnProyecto({ codigo: '', nombre: ' ', cliente: '', empresaId: 'INROPRIN', gerenteId: null, fechaMeta: null, lugarEntrega: '' })).toMatch(/nombre/);
        expect(etapasSinAprobador(p({ etapas: [{ id: 'e', nombre: 'General', orden: 1, aprobadores: [] }] }))).toHaveLength(1);
    });
});
