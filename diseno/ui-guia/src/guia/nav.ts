// El índice de la guía: el menú lateral y los «siguiente / anterior» salen de aquí.
export interface NavItem {
    href: string;
    label: string;
}
export interface NavGroup {
    title: string;
    items: NavItem[];
}

export const NAV: NavGroup[] = [
    {
        title: 'Empezar',
        items: [
            { href: '/introduccion', label: 'Introducción' },
            { href: '/principios', label: 'Principios' },
            { href: '/uso', label: 'Cómo usarla en una app' },
        ],
    },
    {
        title: 'Fundamentos',
        items: [
            { href: '/fundamentos/color', label: 'Color' },
            { href: '/fundamentos/tipografia', label: 'Tipografía' },
            { href: '/fundamentos/forma', label: 'Espaciado, radios y bordes' },
            { href: '/fundamentos/iconos', label: 'Iconos' },
        ],
    },
    {
        title: 'Componentes',
        items: [
            { href: '/componentes/botones', label: 'Botones y enlaces' },
            { href: '/componentes/formularios', label: 'Campos de formulario' },
            { href: '/componentes/filtros', label: 'Filtros' },
            { href: '/componentes/tarjetas', label: 'Tarjetas y KPI' },
            { href: '/componentes/estado', label: 'Chips, avisos y toasts' },
            { href: '/componentes/tablas', label: 'Tablas y paginación' },
            { href: '/componentes/graficos', label: 'Barras y anillos' },
            { href: '/componentes/carga', label: 'Carga (huecos)' },
        ],
    },
    {
        title: 'Patrones',
        items: [
            { href: '/patrones/listado', label: 'Pantalla de listado' },
            { href: '/patrones/tablero', label: 'Tablero con KPI' },
            { href: '/patrones/formulario', label: 'Formulario completo' },
            { href: '/patrones/estados', label: 'Vacío, carga y error' },
        ],
    },
    {
        title: 'Experiencia',
        items: [
            { href: '/ux/redaccion', label: 'Cómo se escribe' },
            { href: '/ux/formatos', label: 'Montos, fechas y números' },
            { href: '/ux/accesibilidad', label: 'Accesibilidad y teclado' },
        ],
    },
];

export const FLAT = NAV.flatMap((g) => g.items);
