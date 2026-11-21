import { describe, expect, it } from 'vitest';
import { avisoHecho, enCurso, faltante, necesitaDialogo, ordenar, parametroId, parametros, type Accion } from '@/modules/acciones/domain/accion.ts';

const a = (x: Partial<Accion>): Accion => ({ accion: 'x', etiqueta: 'X', tipo: 's', funcion: 'ac_x', pide: [], ...x });

describe('acciones', () => {
    it('una sola principal: la segunda se pinta secundaria y las peligrosas van al final', () => {
        const r = ordenar([a({ accion: 'd', tipo: 'd' }), a({ accion: 'p1', tipo: 'p' }), a({ accion: 'p2', tipo: 'p' }), a({ accion: 's', tipo: 's' })]);
        expect(r.map((x) => `${x.accion}:${x.tipo}`)).toEqual(['p1:p', 'p2:s', 's:s', 'd:d']);
    });
    it('un campo con valor y sin tipo va fijo: no abre diálogo', () => {
        const x = a({ tipo: 'p', pide: [{ campo: 'p_aprobar', valor: true }] });
        expect(necesitaDialogo(x)).toBe(false);
        expect(parametros(x, 'p_id', 'id1', {})).toEqual({ p_id: 'id1', p_aprobar: true });
    });
    it('las peligrosas siempre confirman', () => expect(necesitaDialogo(a({ tipo: 'd' }))).toBe(true));
    it('dice qué falta y convierte números', () => {
        const x = a({
            pide: [
                { campo: 'p_monto', tipo: 'numero' },
                { campo: 'p_sustento', tipo: 'texto', opcional: true },
            ],
        });
        expect(faltante(x, { p_monto: '' })).toMatch(/Completa: monto/);
        expect(faltante(x, { p_monto: 'abc' })).toMatch(/número/);
        expect(parametros(x, 'p_id', 'i', { p_monto: '12,5', p_sustento: ' ' })).toEqual({ p_id: 'i', p_monto: 12.5, p_sustento: null });
    });
    it('el id se llama distinto según la función', () => {
        expect(parametroId('ac_oc_demasia')).toBe('p_linea');
        expect(parametroId('ac_item_tecnica')).toBe('p_item');
        expect(parametroId('ac_oc_emitir')).toBe('p_id');
    });
    it('el botón en curso dice qué hace, en gerundio', () => {
        expect(enCurso('Emitir solicitud')).toBe('Emitiendo solicitud…');
        expect(enCurso('Aprobar')).toBe('Aprobando…');
        expect(enCurso('Corregir y reenviar')).toBe('Corrigiendo y reenviando…');
        expect(enCurso('Emitir y enviar a aprobación')).toBe('Emitiendo y enviando a aprobación…');
        expect(enCurso('Pedir anulación')).toBe('Pidiendo anulación…');
        expect(enCurso('Nuevo desaduanaje')).toBe('Un momento…');
    });
    it('el aviso nombra la acción y el registro', () => {
        expect(avisoHecho('Emitir solicitud', 'SOL-2026-0012')).toBe('Emitir solicitud SOL-2026-0012: hecho.');
        expect(avisoHecho('Liberar')).toBe('Liberar: hecho.');
    });
});
