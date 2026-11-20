// LOS DOS ADORNOS DE LA MARCA, sacados del manual de Roland Print (docs/MANUAL DE MARCA- ROLAND PRINT.pdf, págs. 9 a 18)
// y del logo (public/IconRoland.png): los cuatro rombos de contorno en una fila y el cubo de rombos, la cuadrícula 3 × 3
// girada 45° del logo. Son SOLO decoración: van con `aria-hidden`, nunca llevan texto. Los colores son los del logo y
// salen de los roles (azul = primary, turquesa = secondary, rojo = danger, amarillo = warning), no de un hex.

type Color = 'azul' | 'turquesa' | 'rojo' | 'amarillo';
/** Cómo se pinta el cubo: con los cuatro colores del logo, o todo de uno solo (gris discreto, un color de la marca, o blanco sobre un fondo de color). */
export type CuboColor = 'marca' | 'gris' | 'blanco' | Color;
export const CUBO_COLORES: CuboColor[] = ['marca', 'gris', 'azul', 'turquesa', 'rojo', 'amarillo', 'blanco'];

const TRAZO: Record<Color, string> = { azul: 'stroke-primary', turquesa: 'stroke-secondary', rojo: 'stroke-danger', amarillo: 'stroke-warning' };
const RELLENO: Record<Color, string> = { azul: 'fill-primary', turquesa: 'fill-secondary', rojo: 'fill-danger', amarillo: 'fill-warning' };
const UNICO = {
    gris: { trazo: 'stroke-divider-strong', relleno: 'fill-divider-strong' },
    blanco: { trazo: 'stroke-on-fill', relleno: 'fill-on-fill' },
} as const;

/** Un rombo con centro (cx, cy) y media diagonal `r`. */
const rombo = (cx: number, cy: number, r: number) => `${cx},${cy - r} ${cx + r},${cy} ${cx},${cy + r} ${cx - r},${cy}`;

/**
 * Los cuatro rombos de colores en fila: el sello que va sobre un título (págs. 10 y 16 a 18 del manual).
 * `size` es el alto en px; el ancho sale de la proporción 88 × 24.
 */
export function Rombos({ size = 18, className = '' }: { size?: number; className?: string }) {
    const colores: Color[] = ['azul', 'turquesa', 'rojo', 'amarillo'];
    return (
        <svg width={(size * 88) / 24} height={size} viewBox="0 0 88 24" fill="none" strokeWidth="1.6" strokeLinejoin="miter" aria-hidden="true" className={`flex-none ${className}`}>
            {colores.map((c, i) => (
                <polygon key={c} points={rombo(11 + i * 22, 12, 10)} className={TRAZO[c]} />
            ))}
        </svg>
    );
}

/**
 * Las celdas del logo: una cuadrícula 3 × 3 girada 45°. Cada celda es (x, y) en medias diagonales desde el centro: el
 * amarillo está en el medio, el azul arriba, el rojo abajo; la celda de la derecha es el cuadrado rojo suelto del logo.
 */
const CELDAS: [number, number, Color][] = [
    [0, -2, 'azul'],
    [-1, -1, 'rojo'],
    [1, -1, 'turquesa'],
    [-2, 0, 'azul'],
    [0, 0, 'amarillo'],
    [-1, 1, 'turquesa'],
    [1, 1, 'azul'],
    [0, 2, 'rojo'],
];

/**
 * El cubo de rombos: el logo en versión decorativa. `variante`: `contorno` (por defecto) es el de la hoja membretada, el
 * sobre y la firma del manual; `relleno` es el logo tal cual. `color`: `marca` usa los cuatro del logo; los demás pintan
 * todo de un solo color (gris discreto, uno de la marca, o blanco sobre un fondo de color). Los rombos son un poco más
 * chicos que su celda, así queda una línea de aire entre ellos, y el cuadrado rojo de la derecha, del mismo tamaño que los demás, va suelto y torcido,
 * como en el logo.
 */
export function CuboRombos({
    size = 96,
    variante = 'contorno',
    color = 'marca',
    className = '',
}: {
    size?: number;
    variante?: 'contorno' | 'relleno';
    color?: CuboColor;
    className?: string;
}) {
    const h = 20; // media diagonal de la celda
    const r = h * 0.85; // el rombo dibujado
    const lleno = variante === 'relleno';
    const estilo = (c: Color) => {
        if (color === 'marca') return lleno ? RELLENO[c] : TRAZO[c];
        if (color === 'gris' || color === 'blanco') return lleno ? UNICO[color].relleno : UNICO[color].trazo;
        return lleno ? RELLENO[color] : TRAZO[color];
    };
    return (
        <svg width={size} height={size} viewBox="-62 -62 128 124" fill="none" strokeWidth="1.2" strokeLinejoin="miter" aria-hidden="true" className={`flex-none ${className}`}>
            {CELDAS.map(([x, y, c]) => (
                <polygon key={`${x},${y}`} points={rombo(x * h, y * h, r)} className={estilo(c)} />
            ))}
            {/* La celda de la derecha: suelta, un poco más arriba y torcida. */}
            <polygon points={rombo(43.7, -1, r)} transform={`rotate(-28 43.7 -1)`} className={estilo('rojo')} />
        </svg>
    );
}
