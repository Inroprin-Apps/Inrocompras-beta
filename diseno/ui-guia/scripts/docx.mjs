// Un escritor de .docx mínimo, sin dependencias, para la papelería. Cada página del Word es del tamaño de la pieza, tiene
// su fondo (una imagen a todo el tamaño, detrás del texto) y, encima, los textos que la persona cambia en marcos
// posicionados: se hace clic y se escribe. La hoja membretada además deja un cuerpo en blanco para escribir la carta.
import { crearZip } from './zip.mjs';

const MM_A_TWIPS = 56.6929; // 1 mm = 56,69 twips (1/20 de punto)
const MM_A_EMU = 36000; // 1 mm = 36 000 EMU
const MM_A_PT = 2.83465; // 1 mm = 2,83 puntos
const tw = (mm) => Math.round(mm * MM_A_TWIPS);
const emu = (mm) => Math.round(mm * MM_A_EMU);

const escapa = (s) => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const FUENTE = 'Montserrat';
const rFonts = `<w:rFonts w:ascii="${FUENTE}" w:hAnsi="${FUENTE}" w:cs="${FUENTE}"/>`;

/** El fondo: una imagen del tamaño de la página, anclada a la página y detrás del texto. */
function fondoXml(id, rid, w, h) {
    return `<w:r><w:rPr><w:sz w:val="2"/></w:rPr><w:drawing><wp:anchor distT="0" distB="0" distL="0" distR="0" simplePos="0" relativeHeight="${id}" behindDoc="1" locked="0" layoutInCell="1" allowOverlap="1"><wp:simplePos x="0" y="0"/><wp:positionH relativeFrom="page"><wp:posOffset>0</wp:posOffset></wp:positionH><wp:positionV relativeFrom="page"><wp:posOffset>0</wp:posOffset></wp:positionV><wp:extent cx="${emu(w)}" cy="${emu(h)}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:wrapNone/><wp:docPr id="${id}" name="Fondo ${id}"/><wp:cNvGraphicFramePr/><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="${id}" name="fondo${id}.png"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${rid}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${emu(w)}" cy="${emu(h)}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:anchor></w:drawing></w:r>`;
}

/** Un texto editable: un marco anclado a la página en (x, y) mm, con la letra, el color y la alineación del diseño. */
function campoXml(c) {
    const linea = Math.round(c.size * 1.25 * MM_A_TWIPS); // el mismo interlineado del diseño (1,25)
    const medioPunto = Math.round(c.size * MM_A_PT * 2);
    const negrita = c.peso >= 600 ? '<w:b/>' : '';
    const color = c.color.replace('#', '').toUpperCase();
    return `<w:p><w:pPr><w:framePr w:w="${tw(c.w)}" w:h="${linea}" w:hRule="exact" w:wrap="around" w:vAnchor="page" w:hAnchor="page" w:x="${tw(c.x)}" w:y="${tw(c.y)}"/><w:spacing w:before="0" w:after="0" w:line="${linea}" w:lineRule="exact"/><w:jc w:val="${c.align}"/></w:pPr><w:r><w:rPr>${rFonts}${negrita}<w:color w:val="${color}"/><w:sz w:val="${medioPunto}"/></w:rPr><w:t xml:space="preserve">${escapa(c.texto)}</w:t></w:r></w:p>`;
}

const parrafoChico = (contenido) => `<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="20" w:lineRule="exact"/></w:pPr>${contenido}</w:p>`;
const saltoDePagina = '<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="20" w:lineRule="exact"/></w:pPr><w:r><w:br w:type="page"/></w:r></w:p>';

/**
 * @param {{ paginas: { w: number, h: number, png: Buffer, campos: object[] }[], cuerpo?: { arriba: number, abajo: number, izquierda: number, derecha: number, texto: string }, titulo: string }} o
 * @returns {Buffer} el .docx
 */
export function crearDocx({ paginas, cuerpo, titulo }) {
    const { w, h } = paginas[0];
    const m = cuerpo ?? { arriba: 0, abajo: 0, izquierda: 0, derecha: 0 };

    const medios = [];
    const relaciones = [];
    const cuerpoXml = paginas
        .map((p, i) => {
            const rid = `rIdImg${i + 1}`;
            medios.push({ nombre: `word/media/fondo${i + 1}.png`, datos: p.png });
            relaciones.push(
                `<Relationship Id="${rid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/fondo${i + 1}.png"/>`,
            );
            let xml = parrafoChico(fondoXml(i + 1, rid, p.w, p.h));
            xml += p.campos.map(campoXml).join('');
            if (cuerpo && i === 0) {
                xml += `<w:p><w:pPr><w:spacing w:before="0" w:after="160" w:line="300" w:lineRule="auto"/></w:pPr><w:r><w:rPr>${rFonts}<w:color w:val="4A4A48"/><w:sz w:val="21"/></w:rPr><w:t xml:space="preserve">${escapa(cuerpo.texto)}</w:t></w:r></w:p>`;
            }
            if (i < paginas.length - 1) xml += saltoDePagina;
            return xml;
        })
        .join('');

    const documento = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><w:body>${cuerpoXml}<w:sectPr><w:pgSz w:w="${tw(w)}" w:h="${tw(h)}"/><w:pgMar w:top="${tw(m.arriba)}" w:right="${tw(m.derecha)}" w:bottom="${tw(m.abajo)}" w:left="${tw(m.izquierda)}" w:header="0" w:footer="0" w:gutter="0"/></w:sectPr></w:body></w:document>`;

    const estilos = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr>${rFonts}<w:sz w:val="21"/><w:lang w:val="es-PE"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style></w:styles>`;

    const tipos = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>`;

    const raiz = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>`;

    const relDoc = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdEst" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>${relaciones.join('')}</Relationships>`;

    const nucleo = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${escapa(titulo)}</dc:title><dc:creator>Industrias Roland Print</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString().slice(0, 19)}Z</dcterms:created></cp:coreProperties>`;

    const buf = (s) => Buffer.from(s, 'utf8');
    return crearZip([
        { nombre: '[Content_Types].xml', datos: buf(tipos) },
        { nombre: '_rels/.rels', datos: buf(raiz) },
        { nombre: 'docProps/core.xml', datos: buf(nucleo) },
        { nombre: 'word/document.xml', datos: buf(documento) },
        { nombre: 'word/_rels/document.xml.rels', datos: buf(relDoc) },
        { nombre: 'word/styles.xml', datos: buf(estilos) },
        ...medios,
    ]);
}
