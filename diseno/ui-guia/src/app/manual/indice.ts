// El índice del manual: cada escena a la que se puede saltar. `nivel` 1 va sangrado bajo el capítulo de arriba.
// El `id` es el de la escena en la página.
export interface EntradaIndice {
    id: string;
    titulo: string;
    nivel: 0 | 1;
}

export const INDICE: EntradaIndice[] = [
    { id: 'portada', titulo: 'Portada', nivel: 0 },
    { id: 'colores', titulo: 'Marca', nivel: 0 },
    { id: 'rombos', titulo: 'Los rombos', nivel: 1 },
    { id: 'cubo', titulo: 'El cubo', nivel: 1 },
    { id: 'tipografia', titulo: 'Tipografía', nivel: 1 },
    { id: 'color', titulo: 'Color', nivel: 0 },
    { id: 'contraste', titulo: 'El contraste', nivel: 1 },
    { id: 'forma', titulo: 'Forma', nivel: 0 },
    { id: 'bordes', titulo: 'Bordes y sombra', nivel: 1 },
    { id: 'espaciado', titulo: 'El espacio', nivel: 1 },
    { id: 'componentes', titulo: 'Componentes', nivel: 0 },
    { id: 'pantalla', titulo: 'Estructura de pantalla', nivel: 0 },
    { id: 'patrones', titulo: 'Patrones', nivel: 0 },
    { id: 'experiencia', titulo: 'Experiencia', nivel: 0 },
    { id: 'descargas', titulo: 'Descargas', nivel: 0 },
];
