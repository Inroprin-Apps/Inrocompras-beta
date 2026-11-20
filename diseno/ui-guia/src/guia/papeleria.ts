// La papelería de Roland Print: hoja membretada, sobre, tarjeta de presentación, firma de correo y fotocheck, según el
// manual de marca (docs/MANUAL DE MARCA- ROLAND PRINT.pdf, págs. 16 a 18 y las láminas de tarjeta y fotocheck).
// La usan DOS sitios con el mismo diseño: el script de las descargas (scripts/generar-descargas.mjs: PDF, Word y vista
// previa) y la galería de /dev/prueba. Todo se dibuja en milímetros reales.
//
// Cada cara se arma DOS veces: `html` (completa, con el texto de ejemplo, para el PDF y la vista previa) y `fondo` (sin
// el texto que la persona cambia, para el Word). Ese texto va en `campos`: en el Word se escribe encima del fondo.
// NOMBRE, CARGO, DNI, teléfono y correo son de relleno; la foto del fotocheck es un círculo gris.
import { CONTACTO, HEX, cuboHtml, iconoContacto, qrHtml, rombosHtml } from './marca-html.ts';

/** El estilo de la papelería: va una vez, en el <head> del PDF o de la captura. */
export const PAPELERIA_CSS = `
.pp{position:relative;overflow:hidden;background:#fff;box-sizing:border-box;font-family:inherit;color:${HEX.texto};line-height:1.25}
.pp *{box-sizing:border-box}
.pp .abs{position:absolute}
.pp .logo{display:flex;align-items:center}
.pp .logo small{display:block;font-weight:600;line-height:1}
.pp .logo b{display:block;font-weight:600;line-height:1;letter-spacing:-.02em;white-space:nowrap}
.pp .fila{display:flex;align-items:center;white-space:nowrap}
`;

const COL = { gris: '#4a4a48' };

/** El logo: la imagen oficial (o el cubo blanco sobre un fondo de color) con «Industrias Roland Print» al lado. */
function logo(src: string, alto: number, blanco = false): string {
    const icono = blanco ? cuboHtml(alto, { variante: 'relleno', color: 'blanco' }) : `<img src="${src}" alt="" style="display:block;width:${alto}mm;height:${alto}mm;object-fit:contain">`;
    const color = blanco ? HEX.blanco : HEX.texto;
    return `<div class="logo" style="gap:${alto * 0.2}mm;color:${color}">${icono}<div><small style="font-size:${alto * 0.17}mm;margin-bottom:${alto * 0.04}mm">Industrias</small><b style="font-size:${alto * 0.4}mm">Roland Print</b></div></div>`;
}

type Icono = Parameters<typeof iconoContacto>[0];
const fila = (icono: Icono, texto: string, d: number, fs: number, color: string = COL.gris, gap = d * 0.5) =>
    `<div class="fila" style="gap:${gap}mm;font-size:${fs}mm;color:${color}">${iconoContacto(icono, d)}<span>${texto}</span></div>`;

/** Un texto que la persona cambia: dónde va (mm desde la esquina de la cara), cuánto mide y cómo se ve. */
export interface Campo {
    texto: string;
    x: number;
    y: number;
    w: number;
    /** Tamaño de la letra en mm. */
    size: number;
    color: string;
    peso: 400 | 500 | 600;
    align: 'left' | 'center' | 'right';
}

const campoHtml = (c: Campo) =>
    `<div class="abs" style="left:${c.x}mm;top:${c.y}mm;width:${c.w}mm;font-size:${c.size}mm;font-weight:${c.peso};color:${c.color};text-align:${c.align};white-space:nowrap">${c.texto}</div>`;

/** Una cara de una pieza: su tamaño real en mm, completa, sin los campos, y los campos. */
export interface Cara {
    rotulo?: string;
    w: number;
    h: number;
    html: string;
    fondo: string;
    campos: Campo[];
}

/** Arma una cara dos veces: con los campos escritos y sin ellos (recogiéndolos para el Word). */
function cara(w: number, h: number, rotulo: string | undefined, construir: (t: (c: Campo) => string) => string): Cara {
    const campos: Campo[] = [];
    const html = construir(campoHtml);
    const fondo = construir((c) => {
        campos.push(c);
        return '';
    });
    return { rotulo, w, h, html, fondo, campos };
}

export interface Pieza {
    id: string;
    /** El nombre de su carpeta y de sus archivos en public/descargas/. */
    slug: string;
    titulo: string;
    medida: string;
    nota: string;
    /** Las caras tal como salen en el PDF (una página por cara, del tamaño exacto). */
    caras: Cara[];
    /** Las páginas del Word, si no son las mismas que las del PDF (el sobre: Word no admite 64 cm de ancho). */
    paginasWord?: Cara[];
    /** Para la hoja membretada: el Word deja un cuerpo donde escribir, con estos márgenes (mm). */
    cuerpoWord?: { arriba: number; abajo: number; izquierda: number; derecha: number; texto: string };
    /** Cómo se acomodan las caras en la vista previa. */
    vista: 'fila' | 'columna';
}

export function piezas(logoSrc: string): Pieza[] {
    // --- Hoja membretada (21 × 29,7 cm, A4) -----------------------------------------------------------------------------
    const membretada = cara(
        210,
        297,
        undefined,
        () => `<div class="pp" style="width:210mm;height:297mm">
<div class="abs" style="top:18mm;left:20mm">${logo(logoSrc, 17)}</div>
<div class="abs" style="left:-62mm;top:92mm;opacity:.5">${cuboHtml(170, { grosor: 0.5 })}</div>
<div class="abs" style="left:0;bottom:0;width:20mm;height:26mm;background:${HEX.azul};border-top-right-radius:6mm"></div>
<div class="abs" style="left:27mm;bottom:10mm;display:flex;flex-direction:column;gap:1.4mm">
${fila('telefono', CONTACTO.telefono, 3.6, 2.7)}${fila('correo', CONTACTO.correo, 3.6, 2.7)}${fila('lugar', CONTACTO.direccion, 3.6, 2.7)}
</div>
<div class="abs" style="right:20mm;bottom:11mm;text-align:right;font-size:2.9mm;color:${HEX.azul}"><div style="margin-left:auto;width:fit-content;margin-bottom:1.2mm">${rombosHtml(4.2)}</div>${CONTACTO.web}</div>
</div>`,
    );

    // --- Sobre: dos paneles de 32 × 45 cm; abierto son 64 × 45 cm -----------------------------------------------------
    const panelIzquierdo = `<div class="abs" style="left:0;width:320mm;bottom:38mm;display:flex;flex-direction:column;align-items:center;gap:5mm">
${rombosHtml(9)}
<div style="font-size:6mm;color:${HEX.azul}">${CONTACTO.web}</div>
<div style="display:flex;gap:10mm">${fila('telefono', CONTACTO.telefono, 7, 4.4)}${fila('correo', CONTACTO.correo, 7, 4.4)}${fila('lugar', 'Jr. Cuzco N° 365<br>Magdalena del Mar - Lima', 7, 4.4)}</div>
</div>`;
    const panelDerecho = `<div class="abs" style="left:75mm;top:105mm">${logo(logoSrc, 40)}</div>
<div class="abs" style="right:-62mm;bottom:48mm">${cuboHtml(230)}</div>
<div class="abs" style="left:25mm;bottom:58mm;width:150mm;text-align:center;font-size:7.4mm;line-height:1.3;color:${HEX.turquesa}">“La <b style="font-weight:600">EDUCACIÓN</b> es el<br><b style="font-weight:600">CAMINO</b> para un<br><b style="font-weight:600">FUTURO BRILLANTE</b>”</div>
<div class="abs" style="left:10mm;right:0;bottom:0;height:9mm;background:${HEX.azul}"></div>`;
    const panel = (contenido: string) => `<div class="pp" style="width:320mm;height:450mm">${contenido}</div>`;
    const sobreAbierto = `<div class="pp" style="width:640mm;height:450mm;display:flex">
<div style="position:relative;flex:none;width:320mm;height:450mm;overflow:hidden;border-right:.5mm solid #d4d4d2">${panelIzquierdo}</div>
<div style="position:relative;flex:none;width:320mm;height:450mm;overflow:hidden">${panelDerecho}</div>
</div>`;
    const sobre = cara(640, 450, undefined, () => sobreAbierto);
    const sobreInterior = cara(320, 450, 'Panel interior', () => panel(panelIzquierdo));
    const sobreFrente = cara(320, 450, 'Panel de adelante', () => panel(panelDerecho));

    // --- Tarjeta de presentación (9 × 5 cm): frente y dorso -----------------------------------------------------------
    const tarjetaFrente = cara(
        90,
        50,
        'Frente',
        () => `<div class="pp" style="width:90mm;height:50mm;background:${HEX.azul}">
<div class="abs" style="left:-24mm;top:-8mm">${cuboHtml(58, { color: 'blanco', grosor: 0.7 })}</div>
<div class="abs" style="left:34mm;top:17mm">${logo(logoSrc, 13, true)}</div>
<div class="abs" style="right:5mm;bottom:5mm;border-radius:1.2mm;overflow:hidden">${qrHtml(15)}</div>
<div class="abs" style="right:23mm;bottom:7mm;font-size:2.6mm;color:#fff;text-align:right">${CONTACTO.web}</div>
</div>`,
    );
    const tarjetaDorso = cara(
        90,
        50,
        'Dorso',
        (t) => `<div class="pp" style="width:90mm;height:50mm">
<div class="abs" style="left:5mm;top:5mm;bottom:5mm;width:7mm;background:${HEX.azul};border-radius:3mm"></div>
<div class="abs" style="right:-22mm;top:-6mm">${cuboHtml(56, { grosor: 0.6 })}</div>
${t({ texto: 'Nombre y Apellidos', x: 17, y: 5.5, w: 56, size: 4.4, color: HEX.azul, peso: 600, align: 'left' })}
${t({ texto: 'Cargo actual', x: 17, y: 11.5, w: 56, size: 3.2, color: HEX.turquesa, peso: 500, align: 'left' })}
<div class="abs" style="left:17mm;top:18mm">${iconoContacto('telefono', 3.4)}</div>
${t({ texto: '(51) 000-000-000', x: 22.1, y: 18.2, w: 40, size: 2.7, color: COL.gris, peso: 400, align: 'left' })}
<div class="abs" style="left:17mm;top:23mm">${iconoContacto('correo', 3.4)}</div>
${t({ texto: 'nombre@inroprin.com', x: 22.1, y: 23.2, w: 40, size: 2.7, color: COL.gris, peso: 400, align: 'left' })}
<div class="abs" style="left:17mm;top:28mm;font-size:2.7mm;color:${COL.gris}">${fila('lugar', 'Jr. Cuzco N° 365<br>Magdalena del Mar - Lima', 3.4, 2.7)}</div>
<div class="abs" style="right:6mm;bottom:3.5mm">${logo(logoSrc, 7)}</div>
</div>`,
    );

    // --- Firma digital de correo (12 × 5 cm) ------------------------------------------------------------------------
    const firma = cara(
        120,
        50,
        undefined,
        (t) => `<div class="pp" style="width:120mm;height:50mm">
<div class="abs" style="left:-26mm;top:-3mm">${cuboHtml(56, { grosor: 0.6 })}</div>
<div class="abs" style="left:34mm;top:9mm;bottom:9mm;width:.3mm;background:${HEX.azul}"></div>
<div class="abs" style="left:38mm;top:10mm">${rombosHtml(3.6)}</div>
${t({ texto: 'Nombre y Apellidos', x: 38, y: 16, w: 42, size: 4.2, color: HEX.azul, peso: 600, align: 'left' })}
${t({ texto: 'Cargo actual', x: 38, y: 22, w: 42, size: 3.2, color: HEX.turquesa, peso: 400, align: 'left' })}
<div class="abs" style="left:38mm;top:29mm">${iconoContacto('telefono', 4)}</div>
${t({ texto: '(51) 000 - 000 - 0000', x: 44, y: 29.4, w: 36, size: 2.9, color: COL.gris, peso: 400, align: 'left' })}
<div class="abs" style="left:38mm;top:35mm">${iconoContacto('correo', 4)}</div>
${t({ texto: 'nombre@inroprin.com', x: 44, y: 35.4, w: 36, size: 2.9, color: COL.gris, peso: 400, align: 'left' })}
<div class="abs" style="left:82mm;top:12mm;bottom:12mm;width:.3mm;background:${HEX.azul}"></div>
<div class="abs" style="left:86mm;top:17mm">${logo(logoSrc, 6.5)}</div>
<div class="abs" style="left:86mm;top:29mm;font-size:2.4mm;color:${COL.gris}">${CONTACTO.web}</div>
<div class="abs" style="right:0;top:3mm;bottom:3mm;width:6mm;background:${HEX.azul};border-radius:3mm 0 0 3mm"></div>
</div>`,
    );

    // --- Fotocheck (5,4 × 8,6 cm): frente y dorso ----------------------------------------------------------------------
    const barras = `<div class="abs" style="left:0;right:0;top:0;height:3.4mm;background:${HEX.azul}"></div><div class="abs" style="left:0;right:0;bottom:0;height:3.4mm;background:${HEX.azul}"></div>`;
    const fotoFrente = cara(
        54,
        86,
        'Frente',
        (t) => `<div class="pp" style="width:54mm;height:86mm">
<div class="abs" style="left:6mm;top:-10mm">${cuboHtml(50, { grosor: 0.5 })}</div>
<div class="abs" style="left:12mm;top:17mm;width:30mm;height:30mm;border-radius:50%;background:#e6e6e6;display:grid;place-items:center"><svg width="16mm" height="16mm" viewBox="0 0 24 24" fill="none" stroke="#9a9a98" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div>
${t({ texto: 'Nombre y Apellido', x: 0, y: 50, w: 54, size: 4.2, color: HEX.azul, peso: 600, align: 'center' })}
${t({ texto: 'Cargo actual', x: 0, y: 55.5, w: 54, size: 3, color: HEX.turquesa, peso: 400, align: 'center' })}
${t({ texto: 'DNI: 00000000', x: 0, y: 61, w: 54, size: 2.7, color: COL.gris, peso: 400, align: 'center' })}
${t({ texto: 'nombre@inroprin.com', x: 0, y: 65, w: 54, size: 2.7, color: COL.gris, peso: 400, align: 'center' })}
<div class="abs" style="left:0;right:0;bottom:7mm;display:flex;justify-content:center">${logo(logoSrc, 7)}</div>
${barras}
</div>`,
    );
    const fotoDorso = cara(
        54,
        86,
        'Dorso',
        () => `<div class="pp" style="width:54mm;height:86mm">
<div class="abs" style="left:14mm;bottom:-20mm">${cuboHtml(48, { grosor: 0.5 })}</div>
<div class="abs" style="left:5mm;right:5mm;top:8mm;text-align:justify;font-size:2.4mm;line-height:1.5;color:${COL.gris}">Este documento es de uso exclusivo del portador, el mismo que será usado en el ejercicio de sus funciones.</div>
<div class="abs" style="left:5mm;top:25mm">${logo(logoSrc, 7.5)}</div>
<div class="abs" style="left:5mm;top:37mm;display:flex;flex-direction:column;gap:1.6mm">${fila('telefono', CONTACTO.telefono, 3.3, 2.5)}${fila('correo', CONTACTO.correo, 3.3, 2.5)}${fila('lugar', 'Jr. Cuzco N° 365<br>Magdalena del Mar - Lima', 3.3, 2.5)}</div>
${barras}
</div>`,
    );

    return [
        {
            id: 'membretada',
            slug: 'hoja-membretada',
            titulo: 'Hoja membretada',
            medida: 'A4 · 21 × 29,7 cm',
            nota: 'En Word queda un cuerpo en blanco para escribir la carta.',
            caras: [membretada],
            cuerpoWord: { arriba: 45, abajo: 38, izquierda: 25, derecha: 20, texto: 'Escribe aquí el contenido de la carta.' },
            vista: 'fila',
        },
        {
            id: 'sobre',
            slug: 'sobre',
            titulo: 'Sobre',
            medida: '64 × 45 cm abierto',
            nota: 'El PDF trae el sobre abierto, en una página. El Word trae los dos paneles de 32 × 45 cm en dos páginas, porque Word no admite 64 cm de ancho.',
            caras: [sobre],
            paginasWord: [sobreInterior, sobreFrente],
            vista: 'fila',
        },
        {
            id: 'tarjeta',
            slug: 'tarjeta-de-presentacion',
            titulo: 'Tarjeta de presentación',
            medida: '9 × 5 cm',
            nota: 'Frente y dorso. El QR lleva a inroprin.com. Nombre, cargo, teléfono y correo se escriben en el Word.',
            caras: [tarjetaFrente, tarjetaDorso],
            vista: 'columna',
        },
        {
            id: 'firma',
            slug: 'firma-de-correo',
            titulo: 'Firma de correo',
            medida: '12 × 5 cm',
            nota: 'Nombre, cargo, teléfono y correo se escriben en el Word.',
            caras: [firma],
            vista: 'fila',
        },
        {
            id: 'fotocheck',
            slug: 'fotocheck',
            titulo: 'Fotocheck',
            medida: '5,4 × 8,6 cm',
            nota: 'Frente y dorso. Nombre, cargo, DNI y correo se escriben en el Word; la foto va sobre el círculo gris.',
            caras: [fotoFrente, fotoDorso],
            vista: 'fila',
        },
    ];
}
