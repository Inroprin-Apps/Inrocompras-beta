import 'server-only';
// El PDF de la orden con @react-pdf/renderer (docs/07 §6), con el formato que hoy recibe el proveedor: logo y recuadro
// con N° y fecha; datos de la empresa y del pedido; datos del proveedor con su cuenta; detalle con concepto, código
// interno y código de proyecto; totales; instrucciones de entrega, adelantos y saldo, nota y texto legal.
// Versión interna: además, las aprobaciones con su fecha. Proveedor: descripción del proveedor; en inglés si es
// importación. Los textos y los cálculos vienen del dominio (domain/pdf.ts).
// Colores: los de la guía (primary, line, ink…) escritos en hex porque el PDF no lee los tokens CSS de la app; en
// impresión no hay modo oscuro.
import { Document, Link, Page, Polygon, StyleSheet, Svg, Text, View, renderToBuffer } from '@react-pdf/renderer';
import {
    TEXTOS,
    adelantosPdf,
    condicionPago,
    fechaPdf,
    idiomaPdf,
    lineasPdf,
    monedaPdf,
    notaPago,
    numeroPdf,
    piePdf,
    type OrdenPdf,
    type VersionPdf,
} from '../domain/pdf.ts';
import type { PdfPort, R } from '../application/ports/IntegracionesPort.ts';
import { intentar } from './comun.ts';

// Tokens de diseno/ui-guia/src/app/globals.css
const PRIMARY = '#006db1';
const SECONDARY = '#00a298';
const ROJO = '#e30613';
const AMARILLO = '#ffdd00';
const TINTA = '#1d1d1b';
const TINTA2 = '#4a4a48';
const LINEA = '#cccccc';
const CABECERA = '#f4f4f4';

const s = StyleSheet.create({
    pag: { paddingVertical: 16, paddingHorizontal: 24, fontSize: 8, fontFamily: 'Helvetica', color: TINTA },
    marco: { borderWidth: 0.75, borderColor: LINEA },
    fila: { flexDirection: 'row' },
    negrita: { fontFamily: 'Helvetica-Bold' },
    barra: { backgroundColor: PRIMARY, color: '#ffffff', fontFamily: 'Helvetica-Bold', paddingVertical: 3, paddingHorizontal: 6, fontSize: 8.5 },
    par: { flexDirection: 'row', marginBottom: 1.8 },
    etq: { width: 92, fontFamily: 'Helvetica-Bold' },
    val: { flex: 1 },
    th: {
        fontFamily: 'Helvetica-Bold',
        backgroundColor: CABECERA,
        paddingVertical: 3,
        paddingHorizontal: 3,
        borderRightWidth: 0.5,
        borderColor: LINEA,
        textAlign: 'center',
        fontSize: 7.5,
    },
    td: { paddingVertical: 3, paddingHorizontal: 3, borderRightWidth: 0.5, borderTopWidth: 0.5, borderColor: LINEA, textAlign: 'center' },
    der: { textAlign: 'right' },
    caja: { borderWidth: 0.5, borderColor: LINEA },
    celda: { paddingVertical: 2.5, paddingHorizontal: 5, borderTopWidth: 0.5, borderColor: LINEA },
});

/** El logo del grupo (el cubo de rombos de diseno/ui-guia/src/ui/marca.tsx, versión rellena) y el nombre. */
function Logo({ empresaId, razonSocial }: { empresaId: string; razonSocial: string }) {
    const h = 20;
    const r = h * 0.85;
    const rombo = (cx: number, cy: number) => `${cx},${cy - r} ${cx + r},${cy} ${cx},${cy + r} ${cx - r},${cy}`;
    const celdas: [number, number, string][] = [
        [0, -2, PRIMARY],
        [-1, -1, ROJO],
        [1, -1, SECONDARY],
        [-2, 0, PRIMARY],
        [0, 0, AMARILLO],
        [-1, 1, SECONDARY],
        [1, 1, PRIMARY],
        [0, 2, ROJO],
    ];
    return (
        <View style={[s.fila, { alignItems: 'center' }]}>
            <Svg width={34} height={34} viewBox="-62 -62 128 124">
                {celdas.map(([x, y, c]) => (
                    <Polygon key={`${x},${y}`} points={rombo(x * h, y * h)} fill={c} />
                ))}
                <Polygon points={rombo(43.7, -1)} fill={ROJO} transform="rotate(-28 43.7 -1)" />
            </Svg>
            {empresaId === 'INROPRIN' ? (
                <View style={{ marginLeft: 6 }}>
                    <Text style={{ fontSize: 6 }}>Industrias</Text>
                    <Text style={[s.negrita, { fontSize: 16, marginTop: -1 }]}>Roland Print</Text>
                </View>
            ) : (
                <Text style={[s.negrita, { fontSize: 11, marginLeft: 6, maxWidth: 240 }]}>{razonSocial}</Text>
            )}
        </View>
    );
}

function Par({ etq, children }: { etq: string; children: React.ReactNode }) {
    return (
        <View style={s.par}>
            <Text style={s.etq}>{etq}</Text>
            <Text style={s.val}>{children || ' '}</Text>
        </View>
    );
}

function OrdenDoc({ o, version }: { o: OrdenPdf; version: VersionPdf }) {
    const idioma = idiomaPdf(version, o.procedencia);
    const t = TEXTOS[idioma];
    const lineas = lineasPdf(o);
    const servicio = o.clase === 'Servicio';
    const importacion = o.procedencia === 'Importación';
    const cond = condicionPago(o, idioma);
    const p = o.proveedor;
    const a = o.aprobaciones;
    const pie = piePdf(o.pie, idioma);
    const col = { item: 34, cant: 52, und: 70, concepto: 70, codInt: 62, codProy: 62, pu: 62, total: 70 };
    return (
        <Document title={o.numero ?? t.borrador} author={o.empresa.razonSocial}>
            <Page size="A4" orientation="landscape" style={s.pag}>
                <View style={s.marco}>
                    {/* Logo y recuadro con el número y la fecha */}
                    <View
                        style={[
                            s.fila,
                            {
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                paddingVertical: 6,
                                paddingHorizontal: 10,
                                borderBottomWidth: 0.75,
                                borderColor: LINEA,
                            },
                        ]}
                    >
                        <Logo empresaId={o.empresa.id} razonSocial={o.empresa.razonSocial} />
                        <View style={[s.caja, { width: 200 }]}>
                            <Text style={[s.barra, { textAlign: 'center', fontSize: 10 }]}>{servicio ? t.srv : t.titulo}</Text>
                            <View style={s.fila}>
                                <Text style={[s.celda, { width: 90, textAlign: 'center' }]}>{servicio ? t.nOs : t.nOc}</Text>
                                <Text style={[s.celda, s.negrita, { flex: 1, textAlign: 'center', borderLeftWidth: 0.5 }]}>
                                    {o.numero ?? t.borrador}
                                    {o.revision ? ` · ${t.rev} ${o.revision}` : ''}
                                </Text>
                            </View>
                            <View style={s.fila}>
                                <Text style={[s.celda, { width: 90, textAlign: 'center' }]}>{t.fecha}</Text>
                                <Text style={[s.celda, { flex: 1, textAlign: 'center', borderLeftWidth: 0.5 }]}>{fechaPdf(o.fecha)}</Text>
                            </View>
                        </View>
                    </View>

                    {/* La empresa y el pedido */}
                    <View style={[s.fila, { paddingVertical: 6, paddingHorizontal: 10 }]}>
                        <View style={{ flex: 1.25, paddingRight: 12 }}>
                            <Par etq={t.razon}>{o.empresa.razonSocial}</Par>
                            <Par etq={t.ruc}>{o.empresa.ruc}</Par>
                            <Par etq={t.direccion}>{o.empresa.direccion}</Par>
                            <Par etq={t.comprador}>{o.comprador.nombre}</Par>
                            <Par etq={t.entrega}>{o.lugarEntrega}</Par>
                            <Par etq={t.plazo}>{o.plazoEntregaDias ? `${o.plazoEntregaDias} ${t.dias}` : ''}</Par>
                            <Par etq={t.motivo}>{o.pedido.motivo}</Par>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Par etq={t.proyecto}>{o.proyecto ? [o.proyecto.codigo, o.proyecto.nombre].filter(Boolean).join(' - ') : ''}</Par>
                            <Par etq={t.requerimiento}>{o.pedido.requerimientos.join(', ')}</Par>
                            <Par etq={t.solicitado}>{o.pedido.solicitado}</Par>
                            <Par etq={t.supervisor}>{o.pedido.supervisor}</Par>
                            <Par etq={t.aprob1}>{o.firmas.primera}</Par>
                            <Par etq={t.aprob2}>{o.firmas.segunda}</Par>
                        </View>
                    </View>

                    {/* El proveedor */}
                    <Text style={s.barra}>{t.datosProv}</Text>
                    <View style={[s.fila, { paddingVertical: 6, paddingHorizontal: 10 }]}>
                        <View style={{ flex: 1.25, paddingRight: 12 }}>
                            <Par etq={importacion ? 'Tax ID' : t.ruc}>{p?.ruc ?? (importacion ? p?.pais : '')}</Par>
                            <Par etq={t.razon}>{p?.razonSocial}</Par>
                            <Par etq={t.direccion}>{p?.direccion}</Par>
                            <Par etq={t.atencion}>{p?.atencion}</Par>
                            <Par etq={t.telefono}>{p?.telefono}</Par>
                            <Par etq={t.correo}>{p?.correo}</Par>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Par etq={t.moneda}>{monedaPdf(o.moneda, idioma)}</Par>
                            <View style={s.par}>
                                <Text style={s.etq}>{t.condicion}</Text>
                                <Text style={{ width: 90 }}>{cond.forma}</Text>
                                <Text style={{ width: 40 }}>{cond.valor}</Text>
                                <Text>{cond.unidad}</Text>
                            </View>
                            <Par etq={t.nota}>{notaPago(o, idioma)}</Par>
                            {importacion && o.incoterm ? <Par etq={t.incoterm}>{o.incoterm}</Par> : null}
                            <Par etq={t.banco}>{p?.cuenta?.banco}</Par>
                            <Par etq={t.cuenta}>{p?.cuenta?.numero}</Par>
                            <Par etq={t.cci}>{p?.cuenta?.cci}</Par>
                            {!importacion ? <Par etq={t.detraccion}>{p?.detraccion}</Par> : null}
                        </View>
                    </View>

                    {/* El detalle */}
                    <Text style={s.barra}>{t.detalle}</Text>
                    <View style={{ paddingVertical: 6, paddingHorizontal: 10 }}>
                        <View style={s.caja}>
                            <View style={s.fila} fixed>
                                <Text style={[s.th, { width: col.item }]}>{t.item}</Text>
                                <Text style={[s.th, { width: col.cant }]}>{t.cant}</Text>
                                <Text style={[s.th, { width: col.und }]}>{t.und}</Text>
                                <Text style={[s.th, { width: col.concepto }]}>{t.concepto}</Text>
                                <Text style={[s.th, { width: col.codInt }]}>{t.codInt}</Text>
                                <Text style={[s.th, { width: col.codProy }]}>{t.codProy}</Text>
                                <Text style={[s.th, { flex: 1 }]}>{t.desc}</Text>
                                <Text style={[s.th, { width: col.pu }]}>{t.pu}</Text>
                                <Text style={[s.th, { width: col.total, borderRightWidth: 0 }]}>{t.total}</Text>
                            </View>
                            {lineas.map((l, i) => (
                                <View key={i} style={s.fila} wrap={false}>
                                    <Text style={[s.td, s.negrita, { width: col.item }]}>{i + 1}</Text>
                                    <Text style={[s.td, { width: col.cant }]}>{numeroPdf(l.cantidad, Number.isInteger(l.cantidad) ? 0 : 3)}</Text>
                                    <Text style={[s.td, { width: col.und }]}>{l.unidad}</Text>
                                    <Text style={[s.td, { width: col.concepto }]}>{l.concepto ?? ''}</Text>
                                    <Text style={[s.td, { width: col.codInt }]}>{l.codInt ?? ''}</Text>
                                    <Text style={[s.td, { width: col.codProy }]}>{l.codProy ?? ''}</Text>
                                    <Text style={[s.td, { flex: 1 }]}>{version === 'proveedor' && l.descripcionProv ? l.descripcionProv : l.descripcion}</Text>
                                    <Text style={[s.td, s.der, { width: col.pu }]}>{numeroPdf(l.precioUnit, l.precioUnit < 1 ? 4 : 2)}</Text>
                                    <Text style={[s.td, s.der, { width: col.total, borderRightWidth: 0 }]}>{numeroPdf(l.subtotal)}</Text>
                                </View>
                            ))}
                        </View>
                        <View style={{ alignItems: 'flex-end', marginTop: 4 }} wrap={false}>
                            <View style={[s.caja, { width: col.pu + col.total + 40 }]}>
                                <View style={s.fila}>
                                    <Text style={[s.celda, s.negrita, { flex: 1, borderTopWidth: 0 }]}>{t.sub}</Text>
                                    <Text style={[s.celda, s.der, { width: col.total, borderTopWidth: 0, borderLeftWidth: 0.5 }]}>{numeroPdf(o.subtotal)}</Text>
                                </View>
                                {o.tipoImpuesto === 'IGV 18%' ? (
                                    <View style={s.fila}>
                                        <Text style={[s.celda, s.negrita, { flex: 1 }]}>{t.igv}</Text>
                                        <Text style={[s.celda, s.der, { width: col.total, borderLeftWidth: 0.5 }]}>{numeroPdf(o.igv)}</Text>
                                    </View>
                                ) : null}
                                <View style={s.fila}>
                                    <Text style={[s.celda, s.negrita, { flex: 1, fontSize: 9 }]}>
                                        {t.tot} {o.moneda}
                                    </Text>
                                    <Text style={[s.celda, s.der, s.negrita, { width: col.total, borderLeftWidth: 0.5, fontSize: 9 }]}>
                                        {numeroPdf(o.monto)}
                                    </Text>
                                </View>
                            </View>
                        </View>
                        {o.terminos || o.penalidadPctDia ? (
                            <View style={{ marginTop: 6 }} wrap={false}>
                                <Text style={[s.negrita, { marginBottom: 2 }]}>{t.terminos}</Text>
                                {o.terminos ? <Text>{o.terminos}</Text> : null}
                                {o.penalidadPctDia ? (
                                    <Text>{t.penal(Number((o.penalidadPctDia * 100).toFixed(2)), Number(((o.penalidadTopePct ?? 0) * 100).toFixed(2)))}</Text>
                                ) : null}
                            </View>
                        ) : null}
                    </View>

                    {/* Instrucciones, adelantos y texto legal */}
                    <View style={[s.fila, { paddingHorizontal: 10, paddingBottom: 10 }]} wrap={false}>
                        <View style={{ flex: 1, paddingRight: 16 }}>
                            <Text style={[s.negrita, { marginBottom: 3 }]}>{t.instrucciones}:</Text>
                            {pie.horario ? <Text style={{ marginBottom: 3 }}>{pie.horario}</Text> : null}
                            {pie.documentos.length ? (
                                <>
                                    <Text style={{ marginBottom: 1 }}>{t.documentos}:</Text>
                                    {pie.documentos.map((d) => (
                                        <Text key={d} style={{ color: PRIMARY, marginLeft: 4 }}>
                                            - {d}
                                        </Text>
                                    ))}
                                </>
                            ) : null}
                            {pie.nota ? <Text style={{ marginTop: 4 }}>{pie.nota}</Text> : null}
                            {pie.legal ? (
                                <Text style={{ marginTop: 4, color: TINTA2, fontSize: 7 }}>
                                    {pie.legal}
                                    {pie.enlace ? (
                                        <>
                                            {' '}
                                            <Link src={pie.enlace} style={{ color: PRIMARY }}>
                                                {pie.enlace}
                                            </Link>
                                        </>
                                    ) : null}
                                </Text>
                            ) : null}
                            {version === 'interna' ? (
                                <View style={{ marginTop: 6, color: TINTA2 }}>
                                    <Text style={s.negrita}>{t.aprob}</Text>
                                    <Text>
                                        CG: {a.ppto ?? t.pendiente}
                                        {a.cgFecha ? ` · ${fechaPdf(a.cgFecha)}` : ''} · GOP: {a.gop ?? t.pendiente}
                                        {a.gopFecha ? ` · ${fechaPdf(a.gopFecha)}` : ''}
                                        {a.tipo === 'Aprobación Conjunta'
                                            ? ` · GAF: ${a.gaf ?? t.pendiente}${a.gafFecha ? ` · ${fechaPdf(a.gafFecha)}` : ''}`
                                            : ''}
                                    </Text>
                                </View>
                            ) : null}
                        </View>
                        <View style={[s.caja, { width: 250, alignSelf: 'flex-start' }]}>
                            <View style={s.fila}>
                                <Text style={{ flex: 1 }} />
                                <Text style={[s.barra, { width: 70, textAlign: 'center' }]}>{t.pct}</Text>
                                <Text style={[s.barra, { width: 80, textAlign: 'center' }]}>{t.montoTit}</Text>
                            </View>
                            {adelantosPdf(o, idioma).map((x) => (
                                <View key={x.etiqueta} style={s.fila}>
                                    <Text style={[s.celda, s.negrita, { flex: 1 }]}>{x.etiqueta}</Text>
                                    <Text style={[s.celda, s.der, { width: 70, borderLeftWidth: 0.5 }]}>{numeroPdf(x.pct * 100)} %</Text>
                                    <Text style={[s.celda, s.der, s.negrita, { width: 80, borderLeftWidth: 0.5 }]}>{numeroPdf(x.monto)}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                </View>
            </Page>
        </Document>
    );
}

export class ReactPdfAdapter implements PdfPort {
    generar(o: OrdenPdf, version: VersionPdf): R<Uint8Array> {
        return intentar('PDF de la orden', async () => new Uint8Array(await renderToBuffer(<OrdenDoc o={o} version={version} />)));
    }
}
