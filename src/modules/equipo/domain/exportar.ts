// Las columnas del Excel de Equipo: las de la tabla (persona, área, roles, jefe), con el correo y si está activa en
// su propia columna. PURO: `nombreDe` traduce el id del jefe a su nombre.
import { fechaExcel, type ColumnaExcel } from '@/shared/exportar/excel.ts';
import { AMBITOS, rolLabel } from '@/shared/tipos.ts';
import type { Miembro } from './equipo.ts';

/** El día en Lima de un instante ISO (un registro creado a las 22:00 de Lima no pasa al día siguiente). */
const diaLima = (iso: string | null | undefined) =>
    iso ? fechaExcel(new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(new Date(iso))) : null;

export function columnasEquipo(nombreDe: (id: string) => string | undefined): ColumnaExcel<Miembro>[] {
    return [
        { titulo: 'Nombre', valor: (p) => p.nombre, ancho: 28 },
        { titulo: 'Correo', valor: (p) => p.email, ancho: 30 },
        { titulo: 'Área', valor: (p) => p.area, ancho: 18 },
        { titulo: 'Roles', valor: (p) => p.roles.map(rolLabel).join(', '), ancho: 36 },
        { titulo: 'Jefe', valor: (p) => (p.jefeId ? (nombreDe(p.jefeId) ?? '') : ''), ancho: 28 },
        { titulo: 'Ámbito', valor: (p) => AMBITOS.find((a) => a.value === p.ambito)?.label ?? p.ambito },
        { titulo: 'Activa', valor: (p) => p.activo, ancho: 8 },
        { titulo: 'Entró por primera vez', tipo: 'fecha', valor: (p) => diaLima(p.creado), ancho: 14 },
    ];
}
