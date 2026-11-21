// Las columnas del Excel de la lista de solicitudes: las de la tabla, cada dato en su columna (la sub-línea de la
// tabla se desarma). PURO: los nombres de proyecto y de personas los da la pantalla.
import { fechaExcel, type ColumnaExcel } from '@/shared/exportar/excel.ts';
import type { Solicitud } from './solicitud.ts';

export interface ContextoExportarSolicitudes {
    nombreProyecto: (id: string | null) => string;
    nombrePersona: (id: string | null) => string;
}

export function columnasSolicitudes({ nombreProyecto, nombrePersona }: ContextoExportarSolicitudes): ColumnaExcel<Solicitud>[] {
    return [
        { titulo: 'Solicitud', ancho: 16, valor: (s) => s.numero || 'Borrador sin número' },
        { titulo: 'Tipo', ancho: 14, valor: (s) => s.tipo },
        { titulo: 'Proyecto', ancho: 32, valor: (s) => (s.tipo === 'Proyecto' ? nombreProyecto(s.proyectoId) : '') },
        { titulo: 'Jefe que la libera', valor: (s) => (s.tipo === 'Administrativa' ? nombrePersona(s.jefeId) : '') },
        { titulo: 'Estado', ancho: 20, valor: (s) => s.estado },
        { titulo: 'Solicitante', valor: (s) => nombrePersona(s.solicitanteId) },
        { titulo: 'Sustento', ancho: 48, valor: (s) => s.sustento },
        { titulo: 'Ítems', tipo: 'entero', valor: (s) => s.nItems },
        { titulo: 'Creada', tipo: 'fecha', valor: (s) => fechaExcel(s.creado) },
        { titulo: 'Liberada', tipo: 'fecha', valor: (s) => fechaExcel(s.fechaLiberacion) },
    ];
}
