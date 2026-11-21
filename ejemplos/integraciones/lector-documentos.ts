// Lector de cotizaciones y facturas (PDF).
// Paso 1 (gratis, sin IA): saca el texto del PDF y busca RUC válidos (módulo 11), montos y moneda.
// Paso 2 (Gemini, plan gratuito): si se pide detalle o el paso 1 no basta, lee el PDF y devuelve JSON con esquema fijo.
// La persona SIEMPRE confirma lo leído antes de guardarlo (documentos.lectura_estado: 'Leído' → 'Confirmado').
//
// Dependencias: npm i unpdf @google/genai
// Variables: GEMINI_API_KEY (de Google AI Studio), GEMINI_MODEL (opcional; por defecto gemini-2.5-flash)
// OJO plan gratuito: Google puede usar el contenido para mejorar sus productos. Ver docs/10_DECISIONES_ABIERTAS.md (D-07).
import { extractText, getDocumentProxy } from 'unpdf';
import { GoogleGenAI, Type } from '@google/genai';

export type LecturaDocumento = {
  fuente: 'texto' | 'gemini';
  ruc: string | null;              // RUC del emisor (proveedor)
  rucs_encontrados: string[];      // todos los RUC válidos del documento (el de INROPRIN se descarta)
  razon_social: string | null;
  tipo: 'Cotización' | 'Factura' | 'Proforma' | 'Otro' | null;
  numero: string | null;
  fecha: string | null;            // AAAA-MM-DD
  moneda: 'PEN' | 'USD' | 'EUR' | 'GBP' | null;
  subtotal: number | null;
  igv: number | null;
  total: number | null;
  validez_dias: number | null;
  plazo_entrega_dias: number | null;
  forma_pago: string | null;
  items: { descripcion: string; cantidad: number | null; unidad: string | null; precio_unitario: number | null; total: number | null; marca: string | null; modelo: string | null }[];
  avisos: string[];                // lo que la persona debe revisar
};

// RUC de INROPRIN, INROPLAS y demás empresas del grupo: nunca son el proveedor.
const rucsPropios = () => (process.env.RUCS_PROPIOS ?? '').split(',').map((s) => s.trim()).filter(Boolean);

export function rucValido(ruc: string): boolean {
  if (!/^(10|15|16|17|20)\d{9}$/.test(ruc)) return false;
  const f = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const s = f.reduce((a, x, i) => a + x * Number(ruc[i]), 0);
  let d = 11 - (s % 11);
  if (d === 10) d = 0; else if (d === 11) d = 1;
  return d === Number(ruc[10]);
}

// Prueba las etiquetas en orden de prioridad y toma el primer número que sigue a la etiqueta.
function leerMonto(txt: string, etiquetas: RegExp[]): number | null {
  for (const etiqueta of etiquetas) {
    const m = txt.match(new RegExp('(?:' + etiqueta.source + ')' + String.raw`[^\d\n]{0,25}([\d.,]+\d)`, 'i'));
    if (!m) continue;
    let v = m[1];
    // 1.234,56 → 1234.56 ; 1,234.56 → 1234.56
    if (/,\d{2}$/.test(v)) v = v.replace(/\./g, '').replace(',', '.'); else v = v.replace(/,/g, '');
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

/** Paso 1: sin IA. Rápido y gratis. */
export async function leerConTexto(pdf: Uint8Array): Promise<{ texto: string; lectura: LecturaDocumento }> {
  const doc = await getDocumentProxy(pdf.slice());   // copia: pdf.js transfiere (y vacía) el buffer que recibe
  const { text } = await extractText(doc, { mergePages: true });
  const texto = Array.isArray(text) ? text.join('\n') : text;
  const rucs = [...new Set((texto.match(/\b(10|15|16|17|20)\d{9}\b/g) ?? []).filter(rucValido))].filter((r) => !rucsPropios().includes(r));
  const moneda = /US\$|USD|D[ÓO]LARES/i.test(texto) ? 'USD' : /€|EUR/i.test(texto) ? 'EUR' : /S\/\.?|PEN|SOLES/i.test(texto) ? 'PEN' : null;
  const avisos: string[] = [];
  if (texto.trim().length < 50) avisos.push('El PDF parece escaneado (sin texto): conviene leerlo con Gemini.');
  if (rucs.length > 1) avisos.push('Hay más de un RUC en el documento: confirma cuál es el del proveedor.');
  if (rucs.length === 0) avisos.push('No se encontró un RUC válido.');
  return {
    texto,
    lectura: {
      fuente: 'texto', ruc: rucs[0] ?? null, rucs_encontrados: rucs, razon_social: null,
      tipo: /FACTURA ELECTR/i.test(texto) ? 'Factura' : /COTIZACI|PROFORMA|QUOTATION/i.test(texto) ? 'Cotización' : null,
      numero: texto.match(/\b([EF][A-Z0-9]{3})\s*[-–]\s*(\d{1,8})\b/)?.slice(1).join('-') ?? null,
      fecha: null, moneda,
      subtotal: leerMonto(texto, [/sub\s*-?\s*total/, /valor\s+(de\s+)?venta/, /op\.?\s*gravadas?/]),
      igv: leerMonto(texto, [/\bI\.?G\.?V\.?(?![a-z])/]),
      total: leerMonto(texto, [/importe\s+total/, /total\s+a\s+pagar/, /total\s+general/, /(?<!sub\s?)\btotal\b/]),
      validez_dias: null, plazo_entrega_dias: null, forma_pago: null, items: [], avisos,
    },
  };
}

const ESQUEMA = {
  type: Type.OBJECT,
  properties: {
    ruc: { type: Type.STRING, nullable: true, description: 'RUC (11 dígitos) del EMISOR del documento, no del cliente' },
    razon_social: { type: Type.STRING, nullable: true },
    tipo: { type: Type.STRING, enum: ['Cotización', 'Factura', 'Proforma', 'Otro'], nullable: true },
    numero: { type: Type.STRING, nullable: true },
    fecha: { type: Type.STRING, nullable: true, description: 'AAAA-MM-DD' },
    moneda: { type: Type.STRING, enum: ['PEN', 'USD', 'EUR', 'GBP'], nullable: true },
    subtotal: { type: Type.NUMBER, nullable: true },
    igv: { type: Type.NUMBER, nullable: true },
    total: { type: Type.NUMBER, nullable: true },
    validez_dias: { type: Type.INTEGER, nullable: true },
    plazo_entrega_dias: { type: Type.INTEGER, nullable: true },
    forma_pago: { type: Type.STRING, nullable: true },
    items: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          descripcion: { type: Type.STRING },
          cantidad: { type: Type.NUMBER, nullable: true },
          unidad: { type: Type.STRING, nullable: true },
          precio_unitario: { type: Type.NUMBER, nullable: true },
          total: { type: Type.NUMBER, nullable: true },
          marca: { type: Type.STRING, nullable: true },
          modelo: { type: Type.STRING, nullable: true },
        },
        required: ['descripcion'],
      },
    },
  },
  required: ['items'],
};

const instruccion = () => `Eres un asistente del área de Compras de una empresa peruana. Lee el documento adjunto (cotización, proforma o factura de un proveedor)
y extrae los datos en el esquema JSON. Reglas:
- "ruc" es el del EMISOR (proveedor). Ignora el RUC del cliente${rucsPropios().length ? ' (' + rucsPropios().join(', ') + ')' : ''}.
- Montos como números, sin separador de miles. Si un dato no aparece, usa null; no lo inventes.
- Un ítem por línea del documento, en el mismo orden.`;

/** Paso 2: Gemini (plan gratuito). Solo se llama desde el servidor; la llave nunca va al navegador. */
export async function leerConGemini(pdf: Uint8Array): Promise<LecturaDocumento> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('Falta GEMINI_API_KEY');
  const ai = new GoogleGenAI({ apiKey });
  const r = await ai.models.generateContent({
    model: process.env.GEMINI_MODEL ?? 'gemini-2.5-flash',
    contents: [{ role: 'user', parts: [
      { inlineData: { mimeType: 'application/pdf', data: Buffer.from(pdf).toString('base64') } },
      { text: instruccion() },
    ] }],
    config: { responseMimeType: 'application/json', responseSchema: ESQUEMA, temperature: 0 },
  });
  const datos = JSON.parse(r.text ?? '{}') as Omit<LecturaDocumento, 'fuente' | 'rucs_encontrados' | 'avisos'>;
  const avisos: string[] = [];
  if (datos.ruc && !rucValido(datos.ruc)) { avisos.push(`El RUC leído (${datos.ruc}) no pasa la validación: revísalo.`); }
  const sumaItems = (datos.items ?? []).reduce((a, i) => a + (i.total ?? 0), 0);
  if (datos.subtotal && sumaItems && Math.abs(sumaItems - datos.subtotal) > 1) avisos.push('La suma de los ítems no coincide con el subtotal.');
  return { fuente: 'gemini', rucs_encontrados: datos.ruc && rucValido(datos.ruc) ? [datos.ruc] : [], avisos, ...datos };
}

/** Lo que usa la app: primero texto; Gemini si el texto no alcanza o si se pide el detalle de ítems. */
export async function leerDocumento(pdf: Uint8Array, opciones: { detalle?: boolean } = {}): Promise<LecturaDocumento> {
  const { texto, lectura } = await leerConTexto(pdf);
  const basta = lectura.ruc && lectura.rucs_encontrados.length === 1 && lectura.total && texto.length > 50;
  if (basta && !opciones.detalle) return lectura;
  try {
    const g = await leerConGemini(pdf);
    // si el texto halló un RUC válido único y Gemini otro, gana el texto y se avisa
    if (lectura.ruc && g.ruc && lectura.ruc !== g.ruc && lectura.rucs_encontrados.length === 1) {
      g.avisos.push(`Gemini leyó el RUC ${g.ruc}, pero en el texto aparece ${lectura.ruc}: se usa el del texto.`);
      g.ruc = lectura.ruc;
    }
    return g;
  } catch (e) {
    // sin cuota o sin llave: se queda con la lectura gratuita
    lectura.avisos.push('No se pudo leer con Gemini (' + (e as Error).message + '). Completa los datos a mano.');
    return lectura;
  }
}
