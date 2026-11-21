import 'server-only';
// El PDF de la orden con @react-pdf/renderer (docs/07 §6): versión interna (con aprobaciones y proyecto) y versión
// proveedor (descripción del proveedor; en inglés si es importación). Los textos y cálculos vienen del dominio.
// Colores de impresión fijos (el PDF no tiene modo oscuro ni tokens de la app).
import { Document, Page, StyleSheet, Text, View, renderToBuffer } from '@react-pdf/renderer';
import { TEXTOS, formaPagoTexto, idiomaPdf, lineasPdf, numeroPdf, type OrdenPdf, type VersionPdf } from '../domain/pdf.ts';
import type { PdfPort, R } from '../application/ports/IntegracionesPort.ts';
import { intentar } from './comun.ts';

const TINTA = '#1d1d1f';
const GRIS = '#6b6b70';
const LINEA = '#c9c9cf';
const FONDO = '#f1f1f4';

const s = StyleSheet.create({
    pag: { padding: 36, fontSize: 9, fontFamily: 'Helvetica', color: TINTA },
    fila: { flexDirection: 'row' },
    h1: { fontSize: 15, fontFamily: 'Helvetica-Bold', marginBottom: 2 },
    gris: { color: GRIS },
    negrita: { fontFamily: 'Helvetica-Bold' },
    caja: { borderWidth: 0.5, borderColor: LINEA, borderRadius: 4, padding: 8, marginTop: 10 },
    th: { fontFamily: 'Helvetica-Bold', backgroundColor: FONDO, paddingVertical: 4, paddingHorizontal: 3 },
    td: { paddingVertical: 3, paddingHorizontal: 3, borderBottomWidth: 0.5, borderColor: '#e3e3e8' },
    der: { textAlign: 'right' },
});

const dia = (iso: string | null) => (iso ? String(iso).slice(0, 10) : '');

function OrdenDoc({ o, version }: { o: OrdenPdf; version: VersionPdf }) {
    const idioma = idiomaPdf(version, o.procedencia);
    const t = TEXTOS[idioma];
    const lineas = lineasPdf(o);
    const a = o.aprobaciones;
    return (
        <Document title={o.numero ?? t.borrador} author={o.empresa.razonSocial}>
            <Page size="A4" style={s.pag}>
                <View style={[s.fila, { justifyContent: 'space-between' }]}>
                    <View>
                        <Text style={s.h1}>{o.clase === 'Servicio' ? t.srv : t.titulo}</Text>
                        <Text>
                            {o.numero ?? t.borrador}
                            {o.revision ? ` · ${t.rev} ${o.revision}` : ''}
                        </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                        <Text style={s.negrita}>{o.empresa.razonSocial}</Text>
                        {o.empresa.ruc ? <Text style={s.gris}>RUC {o.empresa.ruc}</Text> : null}
                        {o.empresa.direccion ? <Text style={s.gris}>{o.empresa.direccion}</Text> : null}
                    </View>
                </View>
                <View style={[s.caja, s.fila]}>
                    <View style={{ flex: 1 }}>
                        <Text style={s.gris}>{t.prov}</Text>
                        <Text>{o.proveedor?.razonSocial ?? '—'}</Text>
                        <Text>{o.proveedor?.ruc ? `RUC ${o.proveedor.ruc}` : (o.proveedor?.pais ?? '')}</Text>
                        {o.incoterm ? <Text>Incoterm: {o.incoterm}</Text> : null}
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text>
                            {t.fecha}: {o.fecha}
                        </Text>
                        <Text>
                            {t.moneda}: {o.moneda}
                        </Text>
                        <Text>
                            {t.pago}: {formaPagoTexto(o, idioma)}
                        </Text>
                        <Text>
                            {t.entrega}: {o.lugarEntrega ?? '—'}
                        </Text>
                        {o.plazoEntregaDias ? (
                            <Text>
                                {t.plazo}: {o.plazoEntregaDias} {t.dias}
                            </Text>
                        ) : null}
                        {version === 'interna' && o.proyecto ? (
                            <Text>
                                {t.proyecto}: {[o.proyecto.codigo, o.proyecto.nombre].filter(Boolean).join(' ')}
                            </Text>
                        ) : null}
                    </View>
                </View>
                <View style={{ marginTop: 10 }}>
                    <View style={s.fila} fixed>
                        <Text style={[s.th, { width: 24 }]}>{t.item}</Text>
                        <Text style={[s.th, { flex: 1 }]}>{t.desc}</Text>
                        <Text style={[s.th, { width: 36 }]}>{t.und}</Text>
                        <Text style={[s.th, s.der, { width: 44 }]}>{t.cant}</Text>
                        <Text style={[s.th, s.der, { width: 64 }]}>{t.pu}</Text>
                        <Text style={[s.th, s.der, { width: 70 }]}>{t.total}</Text>
                    </View>
                    {lineas.map((l, i) => (
                        <View key={i} style={s.fila} wrap={false}>
                            <Text style={[s.td, { width: 24 }]}>{i + 1}</Text>
                            <Text style={[s.td, { flex: 1 }]}>{version === 'proveedor' && l.descripcionProv ? l.descripcionProv : l.descripcion}</Text>
                            <Text style={[s.td, { width: 36 }]}>{l.unidad}</Text>
                            <Text style={[s.td, s.der, { width: 44 }]}>{numeroPdf(l.cantidad, Number.isInteger(l.cantidad) ? 0 : 3)}</Text>
                            <Text style={[s.td, s.der, { width: 64 }]}>{numeroPdf(l.precioUnit, 4)}</Text>
                            <Text style={[s.td, s.der, { width: 70 }]}>{numeroPdf(l.subtotal)}</Text>
                        </View>
                    ))}
                    <View style={{ alignItems: 'flex-end', marginTop: 6 }}>
                        <Text>
                            {t.sub}: {o.moneda} {numeroPdf(o.subtotal)}
                        </Text>
                        {o.tipoImpuesto === 'IGV 18%' ? (
                            <Text>
                                {t.igv}: {o.moneda} {numeroPdf(o.igv)}
                            </Text>
                        ) : null}
                        <Text style={[s.negrita, { fontSize: 11 }]}>
                            {t.tot}: {o.moneda} {numeroPdf(o.monto)}
                        </Text>
                    </View>
                </View>
                {o.terminos || o.penalidadPctDia ? (
                    <View style={s.caja}>
                        <Text style={[s.negrita, { marginBottom: 3 }]}>{t.terminos}</Text>
                        {o.terminos ? <Text>{o.terminos}</Text> : null}
                        {o.penalidadPctDia ? (
                            <Text>{t.penal(Number((o.penalidadPctDia * 100).toFixed(2)), Number(((o.penalidadTopePct ?? 0) * 100).toFixed(2)))}</Text>
                        ) : null}
                    </View>
                ) : null}
                {version === 'interna' ? (
                    <View style={s.caja}>
                        <Text style={[s.negrita, { marginBottom: 3 }]}>{t.aprob}</Text>
                        <Text>
                            Presupuesto (CG): {a.ppto ?? t.pendiente} {a.cgFecha ? `· ${dia(a.cgFecha)}` : ''}
                        </Text>
                        <Text>
                            GOP: {a.gop ?? t.pendiente} {a.gopFecha ? `· ${dia(a.gopFecha)}` : ''}
                        </Text>
                        {a.tipo === 'Aprobación Conjunta' ? (
                            <Text>
                                GAF: {a.gaf ?? t.pendiente} {a.gafFecha ? `· ${dia(a.gafFecha)}` : ''}
                            </Text>
                        ) : null}
                        <Text style={s.gris}>
                            {t.comprador}: {o.comprador.nombre}
                        </Text>
                    </View>
                ) : null}
            </Page>
        </Document>
    );
}

export class ReactPdfAdapter implements PdfPort {
    generar(o: OrdenPdf, version: VersionPdf): R<Uint8Array> {
        return intentar('PDF de la orden', async () => new Uint8Array(await renderToBuffer(<OrdenDoc o={o} version={version} />)));
    }
}
