// Genera las descargas de la papelería en public/descargas/. Por cada pieza (hoja membretada, sobre, tarjeta de
// presentación, firma de correo y fotocheck) arma una carpeta con:
//
//   <pieza>/<pieza>.pdf     las caras a tamaño real, una por página, sin rótulos ni marco: para mandar a imprimir.
//   <pieza>/<pieza>.docx    el mismo diseño en Word: el fondo detrás y, encima, los textos que se cambian (nombre, cargo…).
//   <pieza>/vista-previa.png  la imagen que se ve en la galería.
//
// y, aparte, papeleria-roland-print.zip con todos los PDF y Word juntos.
//
//   pnpm descargas
//
// El diseño vive en src/guia/papeleria.ts y src/guia/marca-html.ts (los mismos que usa /dev/prueba). Este script importa
// archivos .ts: Node los lee tal cual desde la 22.18. No añade dependencias: imprime y fotografía con Edge o Chrome sin
// ventana, y el .docx y el .zip se escriben a mano (scripts/docx.mjs, scripts/zip.mjs).
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { PAPELERIA_CSS, piezas } from '../src/guia/papeleria.ts';
import { crearDocx } from './docx.mjs';
import { crearZip } from './zip.mjs';

const RAIZ = path.resolve(import.meta.dirname, '..');
const SALIDA = path.join(RAIZ, 'public', 'descargas');
const PX_POR_MM = 96 / 25.4; // el navegador dibuja a 96 px por pulgada

const FUENTE = `<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600&display=swap" rel="stylesheet">`;
const BASE = `*{box-sizing:border-box;margin:0;padding:0}html,body{font-family:'Montserrat',system-ui,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}`;
const logo = `data:image/png;base64,${readFileSync(path.join(RAIZ, 'public', 'IconRoland.png')).toString('base64')}`;

// --- Edge / Chrome ----------------------------------------------------------------------------------------------------------
function navegador() {
    const candidatos = [
        process.env.NAVEGADOR,
        'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
        'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
        'C:/Program Files/Google/Chrome/Application/chrome.exe',
        '/usr/bin/google-chrome',
        '/usr/bin/chromium',
    ].filter(Boolean);
    const ruta = candidatos.find((c) => existsSync(c));
    if (!ruta) throw new Error('No encontré Edge ni Chrome. Pon la ruta en la variable NAVEGADOR.');
    return ruta;
}

const tmp = mkdtempSync(path.join(tmpdir(), 'ui-guia-descargas-'));
const exe = navegador();
let n = 0;

/** Edge devuelve el control antes de terminar de escribir: se espera a que el archivo exista y deje de crecer. */
async function esperarArchivo(ruta, limiteMs = 60000) {
    const inicio = Date.now();
    let ultimo = -1;
    while (Date.now() - inicio < limiteMs) {
        const tam = existsSync(ruta) ? statSync(ruta).size : -1;
        if (tam > 0 && tam === ultimo) return;
        ultimo = tam;
        await new Promise((r) => setTimeout(r, 600));
    }
    throw new Error(`No apareció ${ruta}`);
}

/** Corre Edge sin ventana. `--user-data-dir` propio: sin él, Edge pasa la orden a la ventana que ya esté abierta y no escribe nada. */
function edge(args, html) {
    const archivo = path.join(tmp, `hoja-${++n}.html`);
    writeFileSync(archivo, html);
    execFileSync(exe, ['--headless=new', '--disable-gpu', `--user-data-dir=${path.join(tmp, 'perfil')}`, '--hide-scrollbars', '--virtual-time-budget=15000', ...args, pathToFileURL(archivo).href], { stdio: 'ignore' });
}

async function aPdf(html, destino) {
    rmSync(destino, { force: true });
    edge(['--no-pdf-header-footer', `--print-to-pdf=${destino}`], html);
    await esperarArchivo(destino);
}

/** Una captura PNG de `anchoPx` × `altoPx` píxeles CSS, con `escala` píxeles reales por cada uno. Devuelve el archivo. */
async function aPng(html, anchoPx, altoPx, escala, destino) {
    rmSync(destino, { force: true });
    edge([`--force-device-scale-factor=${escala}`, `--window-size=${anchoPx},${altoPx}`, `--screenshot=${destino}`], html);
    await esperarArchivo(destino);
    const png = readFileSync(destino);
    const w = png.readUInt32BE(16);
    const h = png.readUInt32BE(20);
    if (w !== Math.round(anchoPx * escala) || h !== Math.round(altoPx * escala)) {
        throw new Error(`La captura salió de ${w}×${h} y se esperaba ${Math.round(anchoPx * escala)}×${Math.round(altoPx * escala)} (${destino})`);
    }
    return png;
}

// --- Las hojas ----------------------------------------------------------------------------------------------------------------
const documento = (titulo, estilo, cuerpo) => `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${titulo}</title>${FUENTE}<style>${BASE}${PAPELERIA_CSS}.pp{border:0}${estilo}</style></head><body>${cuerpo}</body></html>`;

/** El PDF para imprimir: una página por cara, del tamaño exacto. */
function htmlPdf(p) {
    const { w, h } = p.caras[0];
    const paginas = p.caras.map((c) => `<section class="pag">${c.html}</section>`).join('');
    return documento(p.titulo, `@page{size:${w}mm ${h}mm;margin:0}.pag{width:${w}mm;height:${h}mm;overflow:hidden;break-after:page}.pag:last-child{break-after:auto}`, paginas);
}

/** El fondo de una página del Word: la cara sin los textos que se cambian. */
const htmlFondo = (c) => documento('fondo', `html,body{width:${c.w}mm;height:${c.h}mm;overflow:hidden}`, c.fondo);

/** La vista previa: las caras sobre un lienzo gris claro de 1200 × 630, escaladas para que quepan. */
function htmlVista(p) {
    const lienzo = { w: 1200, h: 630, margen: 56, hueco: 28 };
    const columna = p.vista === 'columna';
    const sumaW = p.caras.reduce((s, c) => s + c.w, 0);
    const sumaH = p.caras.reduce((s, c) => s + c.h, 0);
    const maxW = Math.max(...p.caras.map((c) => c.w));
    const maxH = Math.max(...p.caras.map((c) => c.h));
    // Las caras de colores y las blancas necesitan un hueco entre sí; en mm equivale a `hueco / k`, así que se resuelve en dos pasos.
    const k0 = Math.min((lienzo.w - lienzo.margen * 2) / (columna ? maxW : sumaW), (lienzo.h - lienzo.margen * 2) / (columna ? sumaH : maxH));
    const huecoTotal = lienzo.hueco * (p.caras.length - 1);
    const k = Math.min(
        (lienzo.w - lienzo.margen * 2 - (columna ? 0 : huecoTotal)) / (columna ? maxW : sumaW),
        (lienzo.h - lienzo.margen * 2 - (columna ? huecoTotal : 0)) / (columna ? sumaH : maxH),
        k0,
    );
    const caras = p.caras
        .map(
            (c) =>
                `<div style="width:${c.w * k}px;height:${c.h * k}px;box-shadow:0 2px 14px rgba(0,0,0,.16);border-radius:2px;overflow:hidden;flex:none"><div style="width:${c.w}mm;height:${c.h}mm;transform:scale(${k / PX_POR_MM});transform-origin:0 0">${c.html}</div></div>`,
        )
        .join('');
    return documento(
        p.titulo,
        `html,body{width:${lienzo.w}px;height:${lienzo.h}px;overflow:hidden;background:#f2f2f2}.lienzo{width:${lienzo.w}px;height:${lienzo.h}px;display:flex;align-items:center;justify-content:center;gap:${lienzo.hueco}px;flex-direction:${columna ? 'column' : 'row'}}`,
        `<div class="lienzo">${caras}</div>`,
    );
}

/** Cuántos píxeles reales por píxel CSS: lo justo para unos 2400 px en el lado largo, sin pasar de 6. */
const escalaDe = (c) => Math.min(6, Math.max(1, 2400 / Math.max(c.w * PX_POR_MM, c.h * PX_POR_MM)));

// --- Todo junto ------------------------------------------------------------------------------------------------------------------
mkdirSync(SALIDA, { recursive: true });
// Archivos de versiones anteriores que ya no existen.
for (const viejo of ['papeleria-roland-print.pdf', 'hoja-membretada-a4.pdf', 'sobre-roland-print.pdf', 'rombos-y-cubo.pdf']) rmSync(path.join(SALIDA, viejo), { force: true });

const paraElZip = [];
for (const p of piezas(logo)) {
    const dir = path.join(SALIDA, p.slug);
    mkdirSync(dir, { recursive: true });

    const pdf = path.join(dir, `${p.slug}.pdf`);
    await aPdf(htmlPdf(p), pdf);

    const paginasWord = p.paginasWord ?? p.caras;
    const paginas = [];
    for (const [i, c] of paginasWord.entries()) {
        const escala = escalaDe(c);
        const png = await aPng(htmlFondo(c), Math.round(c.w * PX_POR_MM), Math.round(c.h * PX_POR_MM), escala, path.join(tmp, `fondo-${p.slug}-${i}.png`));
        paginas.push({ w: c.w, h: c.h, png, campos: c.campos });
    }
    const docx = crearDocx({ paginas, cuerpo: p.cuerpoWord, titulo: `${p.titulo} · Roland Print` });
    writeFileSync(path.join(dir, `${p.slug}.docx`), docx);

    await aPng(htmlVista(p), 1200, 630, 1.5, path.join(dir, 'vista-previa.png'));

    paraElZip.push({ nombre: `${p.slug}/${p.slug}.pdf`, datos: readFileSync(pdf) }, { nombre: `${p.slug}/${p.slug}.docx`, datos: docx });
    console.log('listo:', p.slug);
}

writeFileSync(path.join(SALIDA, 'papeleria-roland-print.zip'), crearZip(paraElZip));
console.log('listo: papeleria-roland-print.zip');
rmSync(tmp, { recursive: true, force: true });
