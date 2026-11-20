// Tipos y catálogos compartidos. Las listas son las mismas que validan los «check» de la base (0001_esquema.sql).

export const AREAS = [
    'Compras', 'Importaciones', 'Finanzas', 'Contabilidad', 'Control de Gestión', 'Gerencia', 'Planeamiento',
    'Comercial', 'Técnica', 'Costos', 'Proyectos', 'Administración', 'Almacén', 'Sin área',
] as const;
export type Area = (typeof AREAS)[number];

export const ROLES = [
    { value: 'CONTROL_GESTION', label: 'Control de Gestión', detail: 'Valida el presupuesto de las órdenes' },
    { value: 'GOP', label: 'GOP', detail: 'Aprueba órdenes y decide demasías' },
    { value: 'GAF', label: 'GAF', detail: 'Aprueba órdenes (ruta conjunta)' },
    { value: 'JEFE_COMPRAS_N', label: 'Jefatura de Compras', detail: 'Decide anulaciones de compras nacionales' },
    { value: 'JEFE_COMPRAS_I', label: 'Jefatura de Importaciones', detail: 'Decide anulaciones de importación y reabre costeos' },
    { value: 'LIDER_COMPRAS', label: 'Líder de Compras', detail: 'Ve precios' },
    { value: 'FINANZAS', label: 'Finanzas', detail: 'Evalúa proveedores y paga' },
    { value: 'CONTABILIDAD', label: 'Contabilidad', detail: 'Verifica la retención de proveedores' },
    { value: 'TECNICA', label: 'Técnica', detail: 'Valida marca y modelo de los ítems' },
    { value: 'ADMIN', label: 'Administrador', detail: 'Equipo, configuración y correcciones' },
] as const;
export type Rol = (typeof ROLES)[number]['value'];
export const rolLabel = (r: string) => ROLES.find((x) => x.value === r)?.label ?? r;

export const AMBITOS = [
    { value: 'todas', label: 'Nacional e importación' },
    { value: 'nac', label: 'Solo nacional' },
    { value: 'imp', label: 'Solo importación' },
] as const;

export interface Perfil {
    id: string;
    email: string;
    nombre: string;
    area: Area;
    ambito: 'nac' | 'imp' | 'todas';
    activo: boolean;
    roles: Rol[];
    ve_precios: boolean;
    es_admin: boolean;
    es_compras: boolean;
}

export interface TeTocaFila {
    tabla: string;
    id: string;
    titulo: string;
    paso: string;
    desde: string | null;
}

/** Un error de Supabase/Postgres trae el motivo en español que escribió la base: va tal cual al aviso. */
export function motivo(e: { message?: string } | null | undefined, porDefecto = 'No se pudo completar. Inténtalo otra vez.') {
    const m = e?.message?.trim();
    if (!m) return porDefecto;
    if (/permission denied|row-level security/i.test(m)) return 'No tienes permiso para hacer esto. Si crees que deberías, pídelo al administrador.';
    if (/Failed to fetch|NetworkError|fetch failed/i.test(m)) return 'Sin conexión. Revisa tu internet e inténtalo otra vez.';
    return m;
}
