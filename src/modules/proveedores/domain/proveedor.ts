// Proveedores (AppSheet: «Base de datos Proveedores»). PURO: tipos, filtros, orden y reglas de presentación.
// Las reglas de negocio (quién evalúa, quién verifica la retención, RUC al dar de alta) viven en la base
// (0002, 0003 y 0020): la ficha muestra lo que devuelve acciones_disponibles.
import { limpiarRuc, motivoRuc } from './ruc.ts';
import { type ColumnaExcel } from '@/shared/exportar/excel.ts';
import { palabrasDe, plano } from '@/shared/texto.ts';

export const ORIGENES = ['Nacional', 'Extranjero'] as const;
export type Origen = (typeof ORIGENES)[number];
export const EVALUACIONES = ['Pendiente', 'Aprobado', 'Observado'] as const;
export type Evaluacion = (typeof EVALUACIONES)[number];
export const MONEDAS_CUENTA = ['PEN', 'USD', 'EUR', 'GBP'] as const;

export interface Cuenta {
    banco: string;
    moneda: string;
    numero: string;
    cci: string;
    swift: string;
    iban: string;
}

export interface Proveedor {
    id: string;
    ruc: string;
    razonSocial: string;
    origen: Origen;
    pais: string;
    correo: string;
    telefono: string;
    contacto: string;
    direccion: string;
    cuentaDetraccion: string;
    cuentas: Cuenta[];
    esAgenteRetencion: boolean;
    esBuenContribuyente: boolean;
    verificadoContab: boolean;
    verificadoPor: string | null;
    fechaVerificacion: string | null;
    evaluacion: Evaluacion;
    evaluacionPor: string | null;
    evaluacionFecha: string | null;
    evaluacionNota: string;
    creadoPor: string | null;
    creado: string;
}

/** Lo que se edita directo (columnas que permite app.proteger en 0002). */
export interface DatosProveedor {
    razonSocial: string;
    pais: string;
    contacto: string;
    correo: string;
    telefono: string;
    direccion: string;
    cuentaDetraccion: string;
    cuentas: Cuenta[];
    esAgenteRetencion: boolean;
    esBuenContribuyente: boolean;
}

export interface NuevoProveedor extends DatosProveedor {
    origen: Origen;
    ruc: string;
}

export const CUENTA_VACIA: Cuenta = { banco: '', moneda: 'PEN', numero: '', cci: '', swift: '', iban: '' };
export const NUEVO_PROVEEDOR: NuevoProveedor = {
    origen: 'Nacional',
    ruc: '',
    razonSocial: '',
    pais: '',
    contacto: '',
    correo: '',
    telefono: '',
    direccion: '',
    cuentaDetraccion: '',
    cuentas: [],
    esAgenteRetencion: false,
    esBuenContribuyente: false,
};

export const datosDe = (p: Proveedor): DatosProveedor => ({
    razonSocial: p.razonSocial,
    pais: p.pais,
    contacto: p.contacto,
    correo: p.correo,
    telefono: p.telefono,
    direccion: p.direccion,
    cuentaDetraccion: p.cuentaDetraccion,
    cuentas: p.cuentas.map((c) => ({ ...c })),
    esAgenteRetencion: p.esAgenteRetencion,
    esBuenContribuyente: p.esBuenContribuyente,
});

const CORREO = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const vacia = (c: Cuenta) => !c.banco.trim() && !c.numero.trim() && !c.cci.trim() && !c.swift.trim() && !c.iban.trim();

/** Las cuentas tal como se guardan: sin filas vacías y sin espacios de más. */
export const cuentasLimpias = (cs: Cuenta[]): Cuenta[] =>
    cs
        .filter((c) => !vacia(c))
        .map((c) => ({
            banco: c.banco.trim(),
            moneda: c.moneda,
            numero: c.numero.trim(),
            cci: c.cci.replace(/[\s-]/g, ''),
            swift: c.swift.trim().toUpperCase(),
            iban: c.iban.replace(/\s/g, '').toUpperCase(),
        }));

/** Qué falta en una cuenta (en palabras), o null. `n` = su número en la lista. */
export function faltaEnCuenta(c: Cuenta, n: number, origen: Origen): string | null {
    if (vacia(c)) return null;
    if (!c.banco.trim()) return `Cuenta ${n}: escribe el banco.`;
    if (!c.numero.trim() && !c.iban.trim()) return `Cuenta ${n}: escribe el número de cuenta${origen === 'Extranjero' ? ' o el IBAN' : ''}.`;
    const cci = c.cci.replace(/[\s-]/g, '');
    if (cci && !/^\d{20}$/.test(cci)) return `Cuenta ${n}: el CCI tiene 20 dígitos.`;
    const swift = c.swift.trim();
    if (swift && !/^[A-Za-z]{6}[A-Za-z0-9]{2}([A-Za-z0-9]{3})?$/.test(swift)) return `Cuenta ${n}: el SWIFT tiene 8 u 11 caracteres.`;
    return null;
}

/** Qué falta para guardar los datos (en palabras), o null. */
export function faltaEnDatos(d: DatosProveedor, origen: Origen): string | null {
    if (!d.razonSocial.trim()) return 'Escribe la razón social.';
    if (origen === 'Extranjero' && !d.pais.trim()) return 'Escribe el país del proveedor extranjero.';
    if (d.correo.trim() && !CORREO.test(d.correo.trim())) return 'El correo no parece válido. Revisa que tenga @ y dominio.';
    for (const [i, c] of d.cuentas.entries()) {
        const f = faltaEnCuenta(c, i + 1, origen);
        if (f) return f;
    }
    return null;
}

/** Qué falta para dar de alta (en palabras), o null. Nacional: RUC válido (módulo 11). */
export function faltaEnAlta(p: NuevoProveedor): string | null {
    if (p.origen === 'Nacional') {
        const m = motivoRuc(p.ruc);
        if (m) return m;
    } else if (p.ruc.trim() && /\s/.test(p.ruc.trim())) return 'El identificador fiscal va sin espacios.';
    return faltaEnDatos(p, p.origen);
}

export const rucParaGuardar = (p: NuevoProveedor) => (p.origen === 'Nacional' ? limpiarRuc(p.ruc) : p.ruc.trim());

export type TonoChip = 'ok' | 'warn' | 'danger' | 'info' | 'muted';
export const tonoEvaluacion = (e: Evaluacion): TonoChip => (e === 'Aprobado' ? 'ok' : e === 'Observado' ? 'danger' : 'warn');
export const etiquetaEvaluacion = (e: Evaluacion) =>
    e === 'Pendiente' ? 'Sin evaluar' : e === 'Aprobado' ? 'Aprobado por Finanzas' : 'Observado por Finanzas';

/** Lo que dice la columna de retención (solo aplica a nacionales). */
export function retencion(p: Proveedor): { texto: string; tono: TonoChip } {
    if (p.origen === 'Extranjero') return { texto: 'No aplica', tono: 'muted' };
    if (!p.verificadoContab) return { texto: 'Por verificar', tono: 'warn' };
    if (p.esBuenContribuyente) return { texto: 'Buen contribuyente', tono: 'ok' };
    if (p.esAgenteRetencion) return { texto: 'Agente de retención', tono: 'ok' };
    return { texto: 'Verificado', tono: 'ok' };
}

/** Hilo de fases de la ficha: Alta → Evaluado por Finanzas → Verificado por Contabilidad (solo nacionales). */
export const fasesProveedor = (p: Proveedor) =>
    p.origen === 'Nacional' ? ['Alta', 'Evaluación de Finanzas', 'Retención verificada'] : ['Alta', 'Evaluación de Finanzas'];
export function faseProveedor(p: Proveedor): number {
    const evaluado = p.evaluacion === 'Aprobado';
    if (p.origen === 'Extranjero') return evaluado ? 2 : 1;
    if (evaluado && p.verificadoContab) return 3;
    return evaluado || p.verificadoContab ? 2 : 1;
}

/** Identificación en una línea: el RUC o el país. */
export const identificacion = (p: Proveedor) => (p.origen === 'Nacional' ? `RUC ${p.ruc}` : [p.pais, p.ruc].filter(Boolean).join(' · '));

export interface FiltrosProveedor {
    origen: '' | Origen;
    evaluacion: '' | Evaluacion;
    verificado: '' | 'si' | 'no';
    texto: string;
}
export const FILTROS_PROVEEDOR: FiltrosProveedor = { origen: '', evaluacion: '', verificado: '', texto: '' };

export function filtrarProveedores(lista: Proveedor[], f: FiltrosProveedor): Proveedor[] {
    const palabras = palabrasDe(f.texto);
    return lista.filter((p) => {
        if (f.origen && p.origen !== f.origen) return false;
        if (f.evaluacion && p.evaluacion !== f.evaluacion) return false;
        // «Verificado por contabilidad» solo tiene sentido en nacionales.
        if (f.verificado === 'si' && !(p.origen === 'Nacional' && p.verificadoContab)) return false;
        if (f.verificado === 'no' && !(p.origen === 'Nacional' && !p.verificadoContab)) return false;
        if (!palabras.length) return true;
        const t = plano(`${p.razonSocial} ${p.ruc} ${p.pais} ${p.contacto} ${p.correo}`);
        return palabras.every((w) => t.includes(w));
    });
}

export type OrdenProveedor = 'nombre' | 'recientes';
export function ordenarProveedores(lista: Proveedor[], o: OrdenProveedor): Proveedor[] {
    const c = [...lista];
    if (o === 'recientes') return c.sort((a, b) => b.creado.localeCompare(a.creado));
    return c.sort((a, b) => a.razonSocial.localeCompare(b.razonSocial, 'es'));
}

/** Un proveedor con el mismo RUC ya registrado (para avisar antes de guardar), o null. */
export const yaRegistrado = (lista: Proveedor[], ruc: string) => {
    const r = limpiarRuc(ruc);
    return r ? (lista.find((p) => p.ruc === r) ?? null) : null;
};

// ── Exportar ──
/** Las columnas del Excel de la lista: las de la tabla, con cada sub-línea en su propia columna. Sin montos. */
export function columnasExcelProveedores(): ColumnaExcel<Proveedor>[] {
    return [
        { titulo: 'Razón social', valor: (p) => p.razonSocial, ancho: 36 },
        { titulo: 'RUC o identificación fiscal', valor: (p) => p.ruc, ancho: 16 },
        { titulo: 'País', valor: (p) => (p.origen === 'Nacional' ? p.pais || 'Perú' : p.pais), ancho: 14 },
        { titulo: 'Origen', valor: (p) => p.origen, ancho: 12 },
        { titulo: 'Evaluación financiera', valor: (p) => etiquetaEvaluacion(p.evaluacion), ancho: 20 },
        { titulo: 'Retención', valor: (p) => retencion(p).texto, ancho: 20 },
        { titulo: 'Contacto', valor: (p) => p.contacto, ancho: 24 },
        { titulo: 'Correo', valor: (p) => p.correo, ancho: 28 },
    ];
}
