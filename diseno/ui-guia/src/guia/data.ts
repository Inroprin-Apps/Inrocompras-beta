// Datos inventados para los ejemplos: proveedores, comprobantes y montos que parecen reales sin
// serlo. Fijos (no aleatorios) para que el servidor y el navegador pinten lo mismo.
export interface Doc {
    id: string;
    serie: string;
    fecha: string; // ISO
    ruc: string;
    nombre: string;
    moneda: 'PEN' | 'USD';
    total: number;
    estado: 'pagado' | 'pendiente' | 'sin-oc' | 'anulado';
}

const NAMES = [
    'Proveedor Andino SAC',
    'Papeles del Pacífico EIRL',
    'Tintas Lima Norte SAC',
    'Transportes Rímac SRL',
    'Cartones Huallaga SA',
    'Servicios Gráficos Miraflores SAC',
    'Distribuidora Chavín EIRL',
    'Insumos Industriales Sur SAC',
    'Logística Callao SAC',
    'Imprenta Barranco SRL',
    'Químicos del Centro SA',
    'Mantenimiento Ate EIRL',
];
const STATES: Doc['estado'][] = ['pagado', 'pagado', 'pendiente', 'pagado', 'sin-oc', 'pendiente', 'pagado', 'anulado'];

export const DOCS: Doc[] = Array.from({ length: 73 }, (_, i) => {
    const n = (i * 7919) % 1000;
    const day = 1 + ((i * 13) % 28);
    const month = 9 + (i % 3);
    return {
        id: `d${i}`,
        serie: `F${String(1 + (i % 3)).padStart(3, '0')}-${String(10230 + i * 37).padStart(8, '0')}`,
        fecha: `2026-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
        ruc: `20${String(500000000 + i * 104729).slice(0, 9)}`,
        nombre: NAMES[i % NAMES.length],
        moneda: i % 5 === 0 ? 'USD' : 'PEN',
        total: Math.round((n * 37.3 + 180 + (i % 4) * 2150) * 100) / 100,
        estado: STATES[i % STATES.length],
    };
});

export const ESTADO_LABEL: Record<Doc['estado'], string> = { pagado: 'Pagado', pendiente: 'Pendiente', 'sin-oc': 'Sin OC', anulado: 'Anulado' };
export const ESTADO_TONE = { pagado: 'ok', pendiente: 'warn', 'sin-oc': 'danger', anulado: 'muted' } as const;
