// Los adornos de la marca (rombos y cubo) y los iconos de contacto como TEXTO HTML/SVG, para lo que no es React: el
// script de los PDF (scripts/generar-pdfs.mjs) y la papelería que se ve en /dev/prueba. La geometría es la de
// src/ui/marca.tsx. Aquí SÍ van hex: un PDF no lee las variables CSS; son los de src/app/globals.css (primary,
// secondary, brand-red, brand-yellow, texto). Si cambia la paleta, se cambian aquí también.
// Solo sintaxis que Node borra sola (sin enum ni namespaces), porque el script lo importa tal cual.

export const HEX = { azul: '#006db1', turquesa: '#00a298', rojo: '#e30613', amarillo: '#ffdd00', texto: '#1d1d1b', gris: '#b9b9b7', blanco: '#ffffff' } as const;
export type Color = 'azul' | 'turquesa' | 'rojo' | 'amarillo';
export type CuboColor = 'marca' | 'gris' | 'blanco' | Color;

export const CONTACTO = {
    telefono: '(51) 983-553-373',
    correo: 'contacto@inroprin.com',
    direccion: 'Jr. Cuzco N° 365, Magdalena del Mar - Lima',
    web: 'www.inroprin.com',
} as const;

export const rombo = (cx: number, cy: number, r: number) => `${cx},${cy - r} ${cx + r},${cy} ${cx},${cy + r} ${cx - r},${cy}`;

/** Los cuatro rombos de contorno en fila, de `alto` (en `unidad`) de alto. */
export function rombosHtml(alto: number, unidad = 'mm', grosor = 1.6): string {
    const cols = [HEX.azul, HEX.turquesa, HEX.rojo, HEX.amarillo];
    const polis = cols.map((c, i) => `<polygon points="${rombo(11 + i * 22, 12, 10)}" stroke="${c}"/>`).join('');
    return `<svg width="${(alto * 88) / 24}${unidad}" height="${alto}${unidad}" viewBox="0 0 88 24" fill="none" stroke-width="${grosor}" style="display:block">${polis}</svg>`;
}

export const CELDAS: [number, number, Color][] = [
    [0, -2, 'azul'],
    [-1, -1, 'rojo'],
    [1, -1, 'turquesa'],
    [-2, 0, 'azul'],
    [0, 0, 'amarillo'],
    [-1, 1, 'turquesa'],
    [1, 1, 'azul'],
    [0, 2, 'rojo'],
];

/** El cubo de rombos (la cuadrícula 3 × 3 girada 45° del logo). */
export function cuboHtml(tam: number, o: { variante?: 'contorno' | 'relleno'; color?: CuboColor; unidad?: string; grosor?: number; estilo?: string } = {}): string {
    const { variante = 'contorno', color = 'marca', unidad = 'mm', grosor = 1.2, estilo = '' } = o;
    const h = 20;
    const r = h * 0.85;
    const lleno = variante === 'relleno';
    const pinta = (c: Color) => {
        const hex = HEX[color === 'marca' ? c : color];
        return lleno ? `fill="${hex}"` : `fill="none" stroke="${hex}"`;
    };
    const celdas = CELDAS.map(([x, y, c]) => `<polygon points="${rombo(x * h, y * h, r)}" ${pinta(c)}/>`).join('');
    const suelta = `<polygon points="${rombo(43.7, -1, r)}" transform="rotate(-28 43.7 -1)" ${pinta('rojo')}/>`;
    return `<svg width="${tam}${unidad}" height="${tam}${unidad}" viewBox="-62 -62 128 124" stroke-width="${grosor}" stroke-linejoin="miter" style="display:block;${estilo}">${celdas}${suelta}</svg>`;
}

/** Iconos de contacto (los de lucide: teléfono, correo y ubicación), de contorno, en `color`. */
export const ICONO = {
    telefono: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>',
    correo: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
    lugar: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
    persona: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
} as const;

/** Un icono de contacto dentro de un círculo fino, como en el manual. `d` es el diámetro en mm. */
export function iconoContacto(nombre: keyof typeof ICONO, d: number, color: string = HEX.azul): string {
    return `<svg width="${d}mm" height="${d}mm" viewBox="-6 -6 36 36" fill="none" stroke="${color}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="flex:none"><circle cx="12" cy="12" r="16.5" stroke-width="1.2"/>${ICONO[nombre]}</svg>`;
}

// El QR de https://inroprin.com, versión 2 (25 × 25 módulos) con corrección de errores M. Se generó una vez con el
// codificador de reportlab (`reportlab.graphics.barcode.qrencoder`) y se guarda aquí como filas de 0 y 1: así no hace falta
// ninguna librería. Si el enlace cambia, hay que volver a generarlo. Probarlo con un celular antes de imprimir.
export const QR_URL = 'https://inroprin.com';
const QR_FILAS = (
    '1111111001100011001111111|1000001001101101101000001|1011101001110011001011101|1011101001110010001011101|1011101001011011001011101|1000001011110001001000001|1111111010101010101111111|0000000000100010000000000|1001011010101111110100000|0100110010110000111000001|0101001011011100110010011|0110110011101101001100000|1100111001000011111001011|0010100011110100001101101|1000011011110110111110101|0101100000110000011010010|1111101011001100111111100|0000000011001110100011001|1111111001011011101011011|1000001011001010100011110|1011101001100000111111001|1011101011010011000111100|1011101001000000000110101|1000001000000010111001000|1111111011101001110100011'
).split('|');

/**
 * El QR de inroprin.com como SVG, de `mm` milímetros de lado, con 4 módulos de borde en blanco (la zona de silencio que
 * pide el estándar, para que lo lea cualquier celular). Módulos oscuros sobre fondo blanco: es lo que mejor se lee.
 */
export function qrHtml(mm: number, color: string = HEX.texto): string {
    const n = QR_FILAS.length;
    const borde = 4;
    const lado = n + borde * 2;
    let d = '';
    QR_FILAS.forEach((fila, r) => {
        let c = 0;
        while (c < n) {
            if (fila[c] !== '1') {
                c++;
                continue;
            }
            let fin = c;
            while (fin < n && fila[fin] === '1') fin++;
            d += `M${c + borde} ${r + borde}h${fin - c}v1h-${fin - c}z`;
            c = fin;
        }
    });
    return `<svg width="${mm}mm" height="${mm}mm" viewBox="0 0 ${lado} ${lado}" shape-rendering="crispEdges" style="display:block"><rect width="${lado}" height="${lado}" fill="#fff"/><path d="${d}" fill="${color}"/></svg>`;
}
