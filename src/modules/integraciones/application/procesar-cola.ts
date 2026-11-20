// Caso de uso: procesar la cola de trabajos (lo que la base encoló: Drive, PDF, correo, lectura, InroPay).
// Toma de a pocos con app.cola_tomar (sin pisarse con otra corrida), ejecuta cada uno y lo cierra con
// app.cola_terminar: Hecho, Descartado (a propósito), Pendiente con espera (reintentar) o Error (final).
// Sin credenciales, cada tipo termina en un estado claro («Drive no configurado…») sin reintentar sin fin.
import { err, ok, type Result } from 'neverthrow';
import { rutaDe } from '@/modules/comun/application/views.ts';
import { rucValido } from '@/modules/proveedores/application/views.ts';
import { SUBCARPETAS_OC, nombreCarpetaDes, rutaCarpetaOC, subcarpetaDe } from '../domain/carpetas.ts';
import { correoValido, notificacion, ocProveedor, primerNombre } from '../domain/correo.ts';
import { solicitudInroPay } from '../domain/inropay.ts';
import { bastaElTexto, combinar, extraerDeTexto, LECTURA_VACIA, revisarGemini, sinGemini } from '../domain/lectura.ts';
import { idiomaPdf, nombrePdf, versionDe } from '../domain/pdf.ts';
import {
    POR_VUELTA,
    PRESUPUESTO_MS,
    RESUMEN_VACIO,
    cierre,
    descartado,
    final,
    hecho,
    mensajeDe,
    noConfigurado,
    reintentar,
    type Desenlace,
    type Fallo,
    type ResumenCola,
    type Trabajo,
} from '../domain/trabajo.ts';
import type { Integraciones } from './ports/IntegracionesPort.ts';

type Paso = Promise<Result<Desenlace, Fallo>>;

/** Procesa trabajos hasta vaciar lo disponible o agotar el tiempo (una función de Vercel tiene límite). */
export async function procesarCola(d: Integraciones, opciones: { maximo?: number; presupuestoMs?: number } = {}): Promise<Result<ResumenCola, Fallo>> {
    const maximo = opciones.maximo ?? 50;
    const limite = Date.now() + (opciones.presupuestoMs ?? PRESUPUESTO_MS);
    const resumen: ResumenCola = { ...RESUMEN_VACIO, detalle: [] };
    while (resumen.tomados < maximo && Date.now() < limite) {
        const lote = await d.cola.tomar(Math.min(POR_VUELTA, maximo - resumen.tomados));
        if (lote.isErr()) return resumen.tomados ? ok(resumen) : err(lote.error);
        if (!lote.value.length) break;
        for (const t of lote.value) {
            resumen.tomados++;
            const r = await ejecutar(d, t).catch((e: unknown) => err<Desenlace, Fallo>(reintentar(mensajeDe(e))));
            const c = cierre(r.isOk() ? { ok: true, valor: r.value } : { ok: false, fallo: r.error });
            const fin = await d.cola.terminar(t.id, c.ok, c.mensaje, c.final);
            const estado = fin.isOk() ? fin.value : `No se pudo cerrar: ${fin.error.mensaje}`;
            if (estado === 'Hecho') resumen.hechos++;
            else if (estado === 'Descartado') resumen.descartados++;
            else if (estado === 'Error') resumen.errores++;
            else resumen.reintentar++;
            resumen.detalle.push({ id: t.id, tipo: t.tipo, estado, mensaje: c.mensaje });
        }
    }
    return ok(resumen);
}

/** Ejecuta un trabajo. Exportado para probarlo por tipo. */
export function ejecutar(d: Integraciones, t: Trabajo): Paso {
    switch (t.tipo) {
        case 'crear_carpeta':
            return crearCarpeta(d, t);
        case 'archivar_doc':
            return archivarDoc(d, t);
        case 'pdf_oc':
            return pdfOC(d, t);
        case 'enviar_correo':
            return enviarCorreo(d, t);
        case 'leer_documento':
            return leerDocumento(d, t);
        case 'notificar':
            return notificar(d, t);
        case 'inropay_solicitar':
            return inropay(d, t);
        case 'sidige_escribir':
            // CLAUDE.md: no se escribe en el SIDIGE; lo hará la integración oficial.
            return Promise.resolve(ok(descartado('La escritura al SIDIGE no está habilitada en esta etapa: la hará la integración oficial.')));
        default:
            return Promise.resolve(err(final(`Tipo de trabajo desconocido: ${t.tipo}.`)));
    }
}

const sinDrive = (d: Integraciones) => {
    const f = d.drive.falta();
    return f ? noConfigurado('Drive', f) : null;
};

async function crearCarpeta(d: Integraciones, t: Trabajo): Paso {
    if (!t.refId) return err(final('El trabajo no dice qué carpeta crear.'));
    const nd = sinDrive(d);
    if (nd) return err(nd);
    if (t.refTabla === 'ordenes') {
        const o = await d.repo.ordenCarpeta(t.refId);
        if (o.isErr()) return err(o.error);
        if (!o.value) return err(final('La orden ya no existe.'));
        if (!o.value.numero) return err(reintentar('La orden aún no tiene número.'));
        const c = await d.drive.carpetaOC(rutaCarpetaOC({ ...o.value, numero: o.value.numero }), SUBCARPETAS_OC);
        if (c.isErr()) return err(c.error);
        const g = await d.repo.guardarCarpetaOrden(t.refId, c.value);
        if (g.isErr()) return err(g.error);
        // Lo subido al borrador antes de que existiera la carpeta (p. ej. la cotización) se archiva ahora.
        const docs = await d.repo.documentosSinArchivar(t.refId);
        if (docs.isOk()) for (const id of docs.value) await d.cola.encolar('archivar_doc', 'documentos', id);
        return ok(hecho(`Carpeta ${c.value.url}`));
    }
    if (t.refTabla === 'desaduanajes') {
        const x = await d.repo.desaduanajeCarpeta(t.refId);
        if (x.isErr()) return err(x.error);
        if (!x.value) return err(final('El desaduanaje ya no existe.'));
        if (!x.value.carpetaOC) return err(reintentar('La OC dueña aún no tiene carpeta en Drive.'));
        const c = await d.drive.carpeta(nombreCarpetaDes(x.value.numero ?? 'DES', x.value.romano), x.value.carpetaOC);
        if (c.isErr()) return err(c.error);
        const g = await d.repo.guardarCarpetaDes(t.refId, c.value);
        return g.isErr() ? err(g.error) : ok(hecho(`Carpeta ${c.value.url}`));
    }
    return err(final(`No sé crear carpetas para «${t.refTabla ?? '—'}».`));
}

async function archivarDoc(d: Integraciones, t: Trabajo): Paso {
    if (!t.refId) return err(final('El trabajo no dice qué documento archivar.'));
    const doc = await d.repo.documento(t.refId);
    if (doc.isErr()) return err(doc.error);
    const x = doc.value;
    if (!x) return err(final('El documento ya no existe.'));
    if (x.driveFileId) return ok(hecho('Ya estaba en Drive.'));
    if (x.estado === 'Reemplazado') return ok(descartado('El documento fue reemplazado: no se archiva.'));
    if (!x.storagePath) return err(final('El documento no tiene archivo en Storage.'));
    // Ficha técnica de una solicitud: no tiene legajo; se queda en Storage.
    if (!x.ordenId && !x.desaduanajeId) return ok(descartado('No pertenece a una orden ni a un desaduanaje: se queda en Storage.'));
    const nd = sinDrive(d);
    if (nd) return err(nd);
    if (!x.carpetaId) return err(reintentar('La carpeta del legajo aún no existe (se crea al emitir la orden).'));
    const datos = await d.repo.bajarArchivo(x.storagePath);
    if (datos.isErr()) return err(datos.error);
    const r = await d.drive.subir({ carpeta: x.carpetaId, subcarpeta: subcarpetaDe(x.tipoDoc), nombre: x.nombre, mime: x.mime, datos: datos.value });
    if (r.isErr()) return err(r.error);
    const g = await d.repo.marcarArchivado(x.id, r.value);
    return g.isErr() ? err(g.error) : ok(hecho(r.value.url));
}

async function leerDocumento(d: Integraciones, t: Trabajo): Paso {
    if (!t.refId) return err(final('El trabajo no dice qué documento leer.'));
    const doc = await d.repo.documento(t.refId);
    if (doc.isErr()) return err(doc.error);
    if (!doc.value) return err(final('El documento ya no existe.'));
    if (!doc.value.storagePath) return err(final('El documento no tiene archivo en Storage.'));
    const archivo = await d.repo.bajarArchivo(doc.value.storagePath);
    if (archivo.isErr()) return err(archivo.error);
    const lectura = await leer(d, archivo.value, doc.value.mime);
    // Nunca se confirma solo: queda como propuesta (lectura_estado = 'Leído') para que la persona la revise.
    const g = await d.repo.guardarLectura(doc.value.id, lectura);
    return g.isErr() ? err(g.error) : ok(hecho(`Leído (${lectura.fuente}).${lectura.avisos.length ? ' ' + lectura.avisos.join(' ') : ''}`));
}

/** Paso 1 gratis (texto) y, si no basta y hay llave, paso 2 con Gemini. Si Gemini falla, queda la lectura gratuita. */
export async function leer(d: Pick<Integraciones, 'lector'>, archivo: Uint8Array, mime: string) {
    const t = await d.lector.texto(archivo, mime);
    const texto = t.isOk() ? t.value : '';
    const base = mime === 'application/pdf' ? extraerDeTexto(texto, rucValido, d.lector.rucsPropios) : { ...LECTURA_VACIA, avisos: ['No es un PDF: el lector gratuito no lo lee.'] };
    if (t.isErr()) base.avisos.push(`No se pudo sacar el texto: ${t.error.mensaje}`);
    if (bastaElTexto(base, texto)) return base;
    if (!d.lector.gemini) return sinGemini(base, 'falta GEMINI_API_KEY');
    const g = await d.lector.gemini(archivo, mime, d.lector.rucsPropios);
    if (g.isErr()) return sinGemini(base, g.error.mensaje);
    return combinar(base, revisarGemini(g.value, rucValido));
}

async function pdfOC(d: Integraciones, t: Trabajo): Paso {
    if (!t.refId) return err(final('El trabajo no dice de qué orden es el PDF.'));
    const version = versionDe(t.payload);
    const o = await d.repo.ordenPdf(t.refId);
    if (o.isErr()) return err(o.error);
    if (!o.value) return err(final('La orden ya no existe.'));
    const pdf = await d.pdf.generar(o.value, version);
    if (pdf.isErr()) return err(pdf.error);
    const nombre = nombrePdf(o.value, version);
    const r = await d.repo.registrarPdf(o.value, version, nombre, pdf.value);
    return r.isErr() ? err(r.error) : ok(hecho(`${nombre} (${idiomaPdf(version, o.value.procedencia) === 'en' ? 'en inglés' : 'en español'})`));
}

async function enviarCorreo(d: Integraciones, t: Trabajo): Paso {
    if (t.payload.plantilla !== 'oc_proveedor' || !t.refId) return err(final(`Plantilla de correo desconocida: ${String(t.payload.plantilla ?? '—')}.`));
    const o = await d.repo.ordenCorreo(t.refId);
    if (o.isErr()) return err(o.error);
    if (!o.value) return err(final('La orden ya no existe.'));
    const para = String(t.payload.para ?? o.value.correoEnvio ?? '').trim();
    if (!correoValido(para)) return err(final(`El correo del proveedor no es válido («${para}»). Corrígelo y vuelve a enviar la orden.`));
    if (!o.value.pdfProveedor?.storagePath && !o.value.pdfProveedor?.driveFileId) return err(reintentar('El PDF para el proveedor aún no está listo.'));
    const falta = d.correo.falta();
    if (falta) return err(noConfigurado(`Correo (${d.correo.modo})`, falta));
    const doc = o.value.pdfProveedor;
    const datos = doc.driveFileId ? await d.drive.bajar(doc.driveFileId) : await d.repo.bajarArchivo(doc.storagePath!);
    if (datos.isErr()) return err(datos.error);
    const p = ocProveedor({
        proveedor: o.value.proveedor,
        numero: o.value.numero ?? '',
        empresa: o.value.empresa,
        comprador: o.value.comprador.nombre,
        idioma: o.value.procedencia === 'Importación' ? 'en' : 'es',
    });
    const r = await d.correo.enviar({
        para: [para],
        cc: o.value.comprador.email ? [o.value.comprador.email] : [],
        responderA: o.value.comprador.email || undefined,
        asunto: p.asunto,
        html: p.html,
        adjuntos: [{ nombre: doc.nombre, mime: 'application/pdf', datos: datos.value }],
    });
    if (r.isErr()) return err(r.error);
    const g = await d.repo.marcarEnviada(o.value.id, para, d.correo.modo);
    if (g.isErr()) return err(g.error);
    return ok(d.correo.modo === 'registro' ? descartado(`Correo en modo registro: no se envió a ${para}. Configura CORREO_MODO (gmail o smtp).`) : hecho(`Enviado a ${para}.`));
}

async function notificar(d: Integraciones, t: Trabajo): Paso {
    const id = Number(t.payload.notificacion_id);
    if (!Number.isFinite(id)) return err(final('El trabajo no dice qué notificación enviar.'));
    const n = await d.repo.notificacion(id);
    if (n.isErr()) return err(n.error);
    if (!n.value) return ok(descartado('La notificación ya no existe.'));
    const u = n.value.usuario;
    if (!n.value.correo) return ok(descartado('Esta notificación no va por correo.'));
    if (!u?.activo || !u.email) return ok(descartado('La persona no está activa: no se le escribe.'));
    const falta = d.correo.falta();
    if (falta) return err(noConfigurado(`Correo (${d.correo.modo})`, falta));
    const p = notificacion({ nombre: primerNombre(u.nombre), titulo: n.value.titulo, cuerpo: n.value.cuerpo, enlace: d.appUrl + rutaDe(n.value.tabla, n.value.refId) });
    const r = await d.correo.enviar({ para: [u.email], asunto: p.asunto, html: p.html });
    if (r.isErr()) return err(r.error);
    return ok(d.correo.modo === 'registro' ? descartado(`Correo en modo registro: no se envió a ${u.email}.`) : hecho(`Enviado a ${u.email}.`));
}

async function inropay(d: Integraciones, t: Trabajo): Paso {
    // Sin InroPay configurado no se envía nada: Finanzas mueve los estados con los botones de la app (docs/07 §4).
    if (!d.inropay.configurado) return ok(descartado('InroPay no configurado (falta INROPAY_URL): Finanzas mueve el pago con los botones de la app.'));
    if (!t.refId) return err(final('El trabajo no dice qué pago solicitar.'));
    const g = await d.repo.pagoInroPay(t.refId);
    if (g.isErr()) return err(g.error);
    if (!g.value) return err(final('El pago ya no existe.'));
    const r = await d.inropay.solicitar(solicitudInroPay(g.value));
    if (r.isErr()) return err(r.error);
    const s = await d.repo.guardarInroPayRef(g.value.id, r.value.id);
    return s.isErr() ? err(s.error) : ok(hecho(`Solicitud ${r.value.id} en InroPay.`));
}
