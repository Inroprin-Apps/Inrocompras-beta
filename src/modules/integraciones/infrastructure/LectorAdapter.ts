import 'server-only';
// Lector de cotizaciones y facturas (docs/07 §5). Paso 1: el texto del PDF con unpdf (gratis). Paso 2: Gemini
// (plan gratuito, @google/genai con responseSchema y temperatura 0) solo si hay GEMINI_API_KEY. La llave vive solo
// en el servidor. Privacidad (D-07): en el plan gratuito Google puede usar el contenido; decidir antes de producción.
import { GoogleGenAI, Type } from '@google/genai';
import { extractText, getDocumentProxy } from 'unpdf';
import { LECTURA_VACIA, type LecturaDocumento } from '../domain/lectura.ts';
import type { LectorPort, R } from '../application/ports/IntegracionesPort.ts';
import { intentar } from './comun.ts';

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

const instruccion = (propios: string[]) =>
    `Eres un asistente del área de Compras de una empresa peruana. Lee el documento adjunto (cotización, proforma o factura de un proveedor) ` +
    `y extrae los datos en el esquema JSON. Reglas:\n- "ruc" es el del EMISOR (proveedor). Ignora el RUC del cliente${propios.length ? ' (' + propios.join(', ') + ')' : ''}.\n` +
    `- Montos como números, sin separador de miles. Si un dato no aparece, usa null; no lo inventes.\n- Un ítem por línea del documento, en el mismo orden.`;

export class LectorAdapter implements LectorPort {
    readonly rucsPropios = (process.env.RUCS_PROPIOS ?? '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

    texto(archivo: Uint8Array, mime: string): R<string> {
        return intentar('Texto del PDF', async () => {
            if (mime !== 'application/pdf') return '';
            const doc = await getDocumentProxy(archivo.slice()); // copia: pdf.js se queda con el buffer que recibe
            const { text } = await extractText(doc, { mergePages: true });
            return text;
        });
    }

    readonly gemini = process.env.GEMINI_API_KEY?.trim()
        ? (archivo: Uint8Array, mime: string, propios: string[]): R<LecturaDocumento> =>
              intentar('Gemini', async () => {
                  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
                  const r = await ai.models.generateContent({
                      model: process.env.GEMINI_MODEL?.trim() || 'gemini-2.5-flash',
                      contents: [
                          {
                              role: 'user',
                              parts: [{ inlineData: { mimeType: mime, data: Buffer.from(archivo).toString('base64') } }, { text: instruccion(propios) }],
                          },
                      ],
                      config: { responseMimeType: 'application/json', responseSchema: ESQUEMA, temperature: 0 },
                  });
                  const datos = JSON.parse(r.text ?? '{}') as Partial<LecturaDocumento>;
                  return { ...LECTURA_VACIA, ...datos, items: Array.isArray(datos.items) ? datos.items : [], avisos: [], fuente: 'gemini' as const };
              })
        : null;
}
