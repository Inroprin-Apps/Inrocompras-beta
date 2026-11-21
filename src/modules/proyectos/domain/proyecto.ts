// Proyectos y sus etapas (AppSheet: Proyectos, Proyecto_Etapas). PURO: tipos, filtros, orden y reglas de
// presentación. Las reglas de negocio (quién marca ganado, quién edita) viven en la base (0002/0003).

import { fechaExcel, type ColumnaExcel } from '@/shared/exportar/excel.ts';
import { palabrasDe, plano } from '@/shared/texto.ts';

export const ESTADOS_PROYECTO = ['Estudio de mercado', 'Ganado', 'Perdido', 'Cerrado'] as const;
export type EstadoProyecto = (typeof ESTADOS_PROYECTO)[number];

export interface Etapa {
    id: string;
    nombre: string;
    orden: number;
    aprobadores: string[];
}

export interface Proyecto {
    id: string;
    codigo: string;
    nombre: string;
    cliente: string;
    empresaId: string;
    estado: EstadoProyecto;
    gerenteId: string | null;
    fechaMeta: string | null;
    lugarEntrega: string;
    creado: string;
    etapas: Etapa[];
}

export interface NuevoProyecto {
    codigo: string;
    nombre: string;
    cliente: string;
    empresaId: string;
    gerenteId: string | null;
    fechaMeta: string | null;
    lugarEntrega: string;
}

export type TonoChip = 'ok' | 'warn' | 'danger' | 'info' | 'muted';
export const tonoEstado = (e: EstadoProyecto): TonoChip => (e === 'Ganado' ? 'ok' : e === 'Perdido' ? 'danger' : e === 'Cerrado' ? 'muted' : 'info');

/** Hilo de fases de la ficha: Estudio → Ganado → Cerrado (Perdido corta el hilo). */
export const FASES_PROYECTO = ['Estudio de mercado', 'Ganado', 'Cerrado'];
export const faseActual = (e: EstadoProyecto) => (e === 'Perdido' ? -1 : FASES_PROYECTO.indexOf(e));

export interface FiltrosProyecto {
    estado: '' | EstadoProyecto;
    texto: string;
}
export const FILTROS_PROYECTO: FiltrosProyecto = { estado: '', texto: '' };

export function filtrarProyectos(lista: Proyecto[], f: FiltrosProyecto): Proyecto[] {
    const palabras = palabrasDe(f.texto);
    return lista.filter((p) => {
        if (f.estado && p.estado !== f.estado) return false;
        if (!palabras.length) return true;
        const t = plano(`${p.codigo} ${p.nombre} ${p.cliente}`);
        return palabras.every((w) => t.includes(w));
    });
}

export type OrdenProyecto = 'recientes' | 'nombre' | 'codigo';
export function ordenarProyectos(lista: Proyecto[], o: OrdenProyecto): Proyecto[] {
    const c = [...lista];
    if (o === 'nombre') return c.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
    if (o === 'codigo') return c.sort((a, b) => a.codigo.localeCompare(b.codigo, 'es', { numeric: true }));
    return c.sort((a, b) => b.creado.localeCompare(a.creado));
}

/** Qué falta para guardar un proyecto (en palabras), o null. */
export function faltaEnProyecto(p: NuevoProyecto): string | null {
    if (!p.nombre.trim()) return 'Escribe el nombre del proyecto.';
    if (!p.empresaId) return 'Elige la empresa.';
    return null;
}

/** Una etapa sin aprobadores no deja emitir solicitudes de proyecto (app.p_solicitud_emitir). */
export const etapasSinAprobador = (p: Proyecto) => p.etapas.filter((e) => e.aprobadores.length === 0);

// ── Exportar ──
/** Las columnas del Excel de la lista: las de la tabla, con la sub-línea (código) en su propia columna. */
export function columnasExcelProyectos(gerente: (id: string | null) => string): ColumnaExcel<Proyecto>[] {
    return [
        { titulo: 'Código', valor: (p) => p.codigo, ancho: 14 },
        { titulo: 'Proyecto', valor: (p) => p.nombre, ancho: 36 },
        { titulo: 'Cliente', valor: (p) => p.cliente, ancho: 28 },
        { titulo: 'Estado', valor: (p) => p.estado, ancho: 18 },
        { titulo: 'Gerente', valor: (p) => gerente(p.gerenteId), ancho: 24 },
        { titulo: 'Fecha meta', tipo: 'fecha', valor: (p) => fechaExcel(p.fechaMeta) },
    ];
}
