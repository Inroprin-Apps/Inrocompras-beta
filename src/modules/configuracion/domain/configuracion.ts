// Configuración: los parámetros (tabla config), las monedas y sus tasas, el tipo de cambio de costeo, los conceptos y
// los conceptos de gasto de importación, y el estado de la cola de trabajos. PURO: tipos, descripciones legibles y
// cómo se pasa cada valor entre la pantalla (texto) y la base (jsonb). Quién edita qué lo decide RLS (0002).
import { AREAS } from '@/shared/tipos.ts';

export type TipoParametro = 'texto' | 'booleano' | 'entero' | 'numero' | 'porcentaje' | 'correos' | 'area' | 'json';

export interface DefParametro {
    clave: string;
    etiqueta: string;
    descripcion: string;
    tipo: TipoParametro;
    /** Unidad que se muestra junto al número (días, soles). */
    unidad?: string;
}

/** Los parámetros que usa la base (app.cfg) y la app, con su descripción. Lo que no está aquí se edita como JSON. */
export const PARAMETROS: DefParametro[] = [
    { clave: 'dominio_permitido', etiqueta: 'Dominio de la empresa', descripcion: 'Solo entran cuentas de Google de este dominio.', tipo: 'texto' },
    {
        clave: 'admins_iniciales',
        etiqueta: 'Administradores iniciales',
        descripcion: 'Reciben el rol de administrador la primera vez que entran. Un correo por línea.',
        tipo: 'correos',
    },
    {
        clave: 'area_emisora_rq',
        etiqueta: 'Área que emite los requerimientos',
        descripcion: 'Recibe los requerimientos que nacen de una solicitud liberada.',
        tipo: 'area',
    },
    {
        clave: 'exigir_validacion_tecnica',
        etiqueta: 'Exigir validación técnica',
        descripcion: 'No se emite una orden si algún ítem no tiene la validación técnica (C-16).',
        tipo: 'booleano',
    },
    {
        clave: 'exigir_evaluacion_fin',
        etiqueta: 'Exigir evaluación de Finanzas',
        descripcion: 'No se envía una orden al proveedor si Finanzas no lo aprobó.',
        tipo: 'booleano',
    },
    {
        clave: 'retencion_tasa',
        etiqueta: 'Tasa de retención del IGV',
        descripcion: 'Se retiene a proveedores nacionales que no son agentes ni buenos contribuyentes.',
        tipo: 'porcentaje',
    },
    {
        clave: 'retencion_umbral_soles',
        etiqueta: 'Retención desde',
        descripcion: 'Monto del comprobante desde el que aplica la retención.',
        tipo: 'numero',
        unidad: 'soles',
    },
    {
        clave: 'dias_alerta_plan',
        etiqueta: 'Alerta del plan de compras',
        descripcion: 'Días antes de la fecha límite en que el semáforo pasa a ámbar.',
        tipo: 'entero',
        unidad: 'días',
    },
    {
        clave: 'dias_requerimiento_quieto',
        etiqueta: 'Requerimiento sin movimiento',
        descripcion: 'Días con saldo y sin movimiento para avisarlo en la bandeja.',
        tipo: 'entero',
        unidad: 'días',
    },
    { clave: 'lector_documentos', etiqueta: 'Lector de cotizaciones y facturas', descripcion: 'Proveedor del lector y si está activo (JSON).', tipo: 'json' },
];

export interface Parametro extends DefParametro {
    valor: unknown;
    nota: string;
    conocido: boolean;
}

/** Los conocidos primero (aunque aún no tengan valor: «Sin definir»), después los demás que haya en la tabla. */
export function parametros(filas: { clave: string; valor: unknown; nota: string }[]): Parametro[] {
    const conocidos = PARAMETROS.map((d) => {
        const f = filas.find((x) => x.clave === d.clave);
        return { ...d, valor: f?.valor ?? null, nota: f?.nota ?? '', conocido: true };
    });
    const otros = filas
        .filter((f) => !PARAMETROS.some((d) => d.clave === f.clave))
        .map((f) => ({
            clave: f.clave,
            etiqueta: f.clave.replace(/_/g, ' '),
            descripcion: f.nota || 'Parámetro sin descripción.',
            tipo: 'json' as const,
            valor: f.valor,
            nota: f.nota,
            conocido: false,
        }));
    return [...conocidos, ...otros];
}

/** El valor guardado (jsonb) como texto para el campo. */
export function aTexto(p: Pick<Parametro, 'tipo' | 'valor'>): string {
    const v = p.valor;
    if (v === null || v === undefined) return '';
    switch (p.tipo) {
        case 'booleano':
            return v === true ? 'true' : 'false';
        case 'porcentaje':
            return typeof v === 'number' ? String(Math.round(v * 100_000) / 1000) : '';
        case 'correos':
            return Array.isArray(v) ? v.join('\n') : '';
        case 'json':
            return JSON.stringify(v, null, 2);
        default:
            return typeof v === 'string' ? v : String(v);
    }
}

const num = (t: string) => Number(t.trim().replace(',', '.'));
const CORREO = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** Lo escrito → el valor a guardar, o el motivo en palabras. */
export function aValor(p: Pick<DefParametro, 'tipo' | 'etiqueta'>, texto: string): { valor: unknown } | { error: string } {
    const t = texto.trim();
    switch (p.tipo) {
        case 'booleano':
            return { valor: t === 'true' };
        case 'entero': {
            const n = num(t);
            return Number.isInteger(n) && n >= 0 ? { valor: n } : { error: `${p.etiqueta}: escribe un número entero (0 o más).` };
        }
        case 'numero': {
            const n = num(t);
            return t && Number.isFinite(n) && n >= 0 ? { valor: n } : { error: `${p.etiqueta}: escribe un número (0 o más).` };
        }
        case 'porcentaje': {
            const n = num(t.replace('%', ''));
            return t && Number.isFinite(n) && n >= 0 && n <= 100
                ? { valor: Math.round(n * 1000) / 100_000 }
                : { error: `${p.etiqueta}: escribe un porcentaje entre 0 y 100.` };
        }
        case 'correos': {
            const lista = [
                ...new Set(
                    t
                        .split(/[\s,;]+/)
                        .map((x) => x.toLowerCase())
                        .filter(Boolean),
                ),
            ];
            const malo = lista.find((c) => !CORREO.test(c));
            return malo ? { error: `«${malo}» no parece un correo.` } : { valor: lista };
        }
        case 'area':
            return (AREAS as readonly string[]).includes(t) ? { valor: t } : { error: 'Elige un área de la lista.' };
        case 'texto':
            return t ? { valor: t } : { error: `${p.etiqueta}: no puede quedar vacío.` };
        case 'json':
            try {
                return { valor: JSON.parse(t) };
            } catch {
                return { error: `${p.etiqueta}: el JSON no es válido. Revisa comillas y llaves.` };
            }
    }
}

/** Cómo se muestra un valor guardado en la lista. */
export function mostrar(p: Pick<Parametro, 'tipo' | 'valor' | 'unidad'>): string {
    if (p.valor === null || p.valor === undefined) return 'Sin definir';
    if (p.tipo === 'booleano') return p.valor === true ? 'Sí' : 'No';
    if (p.tipo === 'porcentaje') return `${aTexto(p)} %`;
    if (p.tipo === 'correos') return Array.isArray(p.valor) && p.valor.length ? p.valor.join(', ') : 'Nadie';
    if (p.tipo === 'json') return JSON.stringify(p.valor);
    return `${aTexto(p)}${p.unidad ? ` ${p.unidad}` : ''}`;
}

// ── Monedas y tipo de cambio de costeo ──
export interface Moneda {
    id: string;
    nombre: string;
    tasa: number;
    actualizado: string;
}

export interface TcCosteo {
    id: string;
    moneda: string;
    tc: number;
    vigenteDesde: string;
    registradoPor: string | null;
    comentario: string;
}

/** «3,75» o «3.75» → 3.75; null si no es una tasa válida (> 0). */
export function leerTasa(t: string): number | null {
    const n = num(t);
    return t.trim() && Number.isFinite(n) && n > 0 ? n : null;
}

/** El TC vigente de cada moneda hoy: el de fecha más reciente que no sea futura. */
export function tcVigentes(lista: TcCosteo[], hoy: string): Map<string, TcCosteo> {
    const m = new Map<string, TcCosteo>();
    for (const t of [...lista].sort((a, b) => a.vigenteDesde.localeCompare(b.vigenteDesde))) if (t.vigenteDesde <= hoy) m.set(t.moneda, t);
    return m;
}

// ── Conceptos ──
export const AMBITOS_CONCEPTO = ['OC', 'Item', 'Gasto'] as const;
export type AmbitoConcepto = (typeof AMBITOS_CONCEPTO)[number];
export const etiquetaAmbito = (a: AmbitoConcepto) => (a === 'OC' ? 'Orden' : a === 'Item' ? 'Ítem' : 'Gasto');

export interface Concepto {
    id: string;
    ambito: AmbitoConcepto;
    activo: boolean;
}

export interface ConceptoGasto {
    concepto: string;
    entraCosto: boolean;
    reparto: 'Producto' | 'Valor';
    orden: number;
    activo: boolean;
}

export const faltaEnConcepto = (nombre: string, existentes: string[]) =>
    !nombre.trim()
        ? 'Escribe el nombre del concepto.'
        : existentes.some((e) => e.toLowerCase() === nombre.trim().toLowerCase())
          ? 'Ese concepto ya existe.'
          : null;

// ── Cola de trabajos ──
export const ESTADOS_COLA = ['Pendiente', 'En curso', 'Error', 'Hecho', 'Descartado'] as const;
export type EstadoCola = (typeof ESTADOS_COLA)[number];

export interface TrabajoCola {
    id: number;
    tipo: string;
    refTabla: string | null;
    refId: string | null;
    estado: EstadoCola;
    intentos: number;
    error: string | null;
    creado: string;
    procesarDesde: string;
    terminado: string | null;
}

export interface ResumenCola {
    estado: EstadoCola;
    tipo: string;
    cantidad: number;
    masAntiguo: string;
}

const TIPOS: Record<string, string> = {
    crear_carpeta: 'Crear carpeta en Drive',
    archivar_doc: 'Archivar en Drive',
    pdf_oc: 'PDF de la orden',
    enviar_correo: 'Enviar orden al proveedor',
    leer_documento: 'Leer cotización o factura',
    notificar: 'Correo de aviso',
    inropay_solicitar: 'Solicitud a InroPay',
    sidige_escribir: 'Escribir en el SIDIGE',
};
export const etiquetaTipo = (t: string) => TIPOS[t] ?? t.replace(/_/g, ' ');

export type TonoChip = 'ok' | 'warn' | 'danger' | 'info' | 'muted';
export const tonoCola = (e: EstadoCola): TonoChip =>
    e === 'Hecho' ? 'ok' : e === 'Error' ? 'danger' : e === 'Descartado' ? 'muted' : e === 'En curso' ? 'info' : 'warn';

/** Totales por estado (para los contadores de arriba). */
export function totalesCola(r: ResumenCola[]): Record<EstadoCola, number> {
    const t = Object.fromEntries(ESTADOS_COLA.map((e) => [e, 0])) as Record<EstadoCola, number>;
    for (const x of r) t[x.estado] = (t[x.estado] ?? 0) + x.cantidad;
    return t;
}

/** Qué se puede hacer con un trabajo desde Configuración (la base lo vuelve a validar: 0021). */
export const puedeReintentar = (t: TrabajoCola) => t.estado === 'Error' || t.estado === 'Descartado';
export const puedeDescartar = (t: TrabajoCola) => t.estado === 'Error' || t.estado === 'Pendiente';
