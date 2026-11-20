# Auditoría de integración: AppSheet de Compras ↔ SIDIGE (compras) ↔ INROCOMPRAS
Empresa: INROPRIN · 06/11/2026 · Fuentes: documentación completa del AppSheet (27 tablas, 100 vistas, 241 acciones), configuración del SIDIGE de INROPRIN en [servidor SIDIGE] (CFGDOC00, EVENTO, CAMPOS, catálogos), la app web de Roberto en 192.168.2[servidor de apps] y el prototipo INROCOMPRAS v2. Todo leído en solo lectura.

## 1. Regla de integración propuesta
1. **El SIDIGE es la fuente oficial** de todo documento con número, kardex, cuenta corriente o asiento: RQ, OC/PO, ingresos, comprobantes, pagos, file, DAM y costeo.
2. **INROCOMPRAS guarda en DB_CENTRAL** solo lo que el SIDIGE no tiene (solicitud previa, observaciones con motivo, demasías, plan de cuotas visible, enlaces de Drive, avisos) y lo **amarra por número de documento** (CODDOC + NUMDOC + NUMITE).
3. **Nada se escribe dos veces.** Si el dato existe en el SIDIGE, la vista lo lee de ahí.
4. **Escritura al SIDIGE** solo por vías del propio sistema: procedimientos (sp_CrearArticulo, sp_eve_doc_val_per), evento en MovHis00 + cabecera (como el módulo de aprobaciones de Roberto) o SIDIGE Web. Nunca INSERT directo de cabeceras nuevas sin validar con Intuitive (hay disparadores).
5. El AppSheet se apaga cuando INROCOMPRAS cubra la columna «AppSheet» de esta tabla. Antes, se migran sus datos vivos (OC abiertas, pagos pendientes, proveedores con cuentas).

Leyenda: **Sí** existe · **Parcial** · **No** · Vía: L = lectura SQL · E = evento MovHis00 + cabecera · P = procedimiento del SIDIGE · W = SIDIGE Web · C = DB_CENTRAL (propio de la vista).

## 2. Matriz de funciones
| # | Función | AppSheet | SIDIGE INROPRIN | Prototipo | Fuente oficial e integración |
|---|---|---|---|---|---|
| 1 | Solicitud previa del área (antes del RQ) | Sí: Solicitudes + Solicitud_Items, carga desde Excel con validación por fila | No | Sí | C. Al liberarse genera el RQ en el SIDIGE (W o P). |
| 2 | Aprobación de la solicitud por jefe o etapa de proyecto | Sí: aprobadores por etapa (Proyecto_Etapas) o jefe del usuario | No (el RQ tiene RQSAC jefatura) | Sí | C para la solicitud; al emitir el RQ se registra RQSAC por E. |
| 3 | Proyectos y etapas | Sí: Proyectos, Proyecto_Etapas, estado ganado o perdido | Parcial: REFINT, centro de costo, partida presupuestal | Parcial (lista fija) | Definir: proyecto = centro de costo o partida del SIDIGE; las etapas y aprobadores quedan en C. |
| 4 | Requerimiento (RC) con ítems | Sí: N° RC propio, área emisora, concepto general, destino | Sí: RQ (MOVCABE1RQ/MOVDETE1RQ), numeración AAMM-NNNN | Sí | SIDIGE. La vista crea el RQ (W/P) y guarda el N° de solicitud en TIPTR1/NUMRF1. |
| 5 | Variantes de requerimiento | No | Sí: RQE exterior, RQA activo fijo, RQIS servicios, RQC consolidado, RQX cierre | Parcial (nacional o importación) | Agregar tipo de RQ al crear (servicios y activo fijo después). |
| 6 | Aprobación del RQ | Parcial (estado Emitido/Observado) | Sí: RQSAC jefatura, RQSAC1 gerencia, RQACJL jefe logística, RQACGG, RQRCH | Parcial | SIDIGE por E, validando permiso con sp_eve_doc_val_per. |
| 7 | Avance por ítem (pendiente, parcial, atendido) | Sí: con cantidad cubierta por OC | Sí: saldo del RQ por línea (enlace TIPDOC_P/NUM_P/NUMITE_P) | Sí | L desde el SIDIGE; el AppSheet lo calculaba aparte. |
| 8 | Anular o rehabilitar ítems del RQ, cierre del RQ | Sí: Anulaciones con causa y aprobación | Sí: RQAN, RQX cierre de requerimiento | No | SIDIGE por E/W. Motivo y aprobación en C. |
| 9 | Caja chica para un ítem | Sí: Caja_Chica marca el ítem | Sí: compra por caja chica, LCCH liquidación | No | SIDIGE. Agregar vista «Caja chica». |
| 10 | Comparativo de cotizaciones | No | Sí: COP cotización de proveedores (sin uso hoy), LIP lista de precios | No | SIDIGE COP. Recomendado para la siguiente versión. |
| 11 | Orden de compra nacional | Sí: OC con N° propio (0024-2026) | Sí: OCN, numeración AAMM-NNNN | Sí | SIDIGE. Conflicto de numeración (ver 3.1). |
| 12 | Purchase order de importación | Parcial (Procedencia = Importación) | Sí: OCE con Incoterm, puerto, ship date, moneda ME | Sí | SIDIGE OCE. |
| 13 | OC de servicios, activo fijo y póliza | No | Sí: OCS, OCNA, OCP | No | Siguiente fase. |
| 14 | Líneas de la OC enlazadas al RQ | Sí | Sí: por línea | Sí | SIDIGE. |
| 15 | Demasía (comprar más de lo pedido) | Sí: con sustento y aprobación GOP | No (solo deja comprar más) | Parcial (aviso) | C (sustento y aprobación) + la OC en el SIDIGE. |
| 16 | Descuento, tipo de impuesto, lugar de entrega | Sí | Sí: TOTDSC, IMP001, LugEnt y almacén | Parcial | SIDIGE. |
| 17 | Validación de presupuesto | Sí: Control de Gestión con estado de presupuesto | Parcial: partida presupuestal (TIPPARPRE/ParPre); sin control de saldo visto | Sí (texto) | Definir la fuente del presupuesto (PARTIDAS del SIDIGE o hoja de CG). |
| 18 | Ruta de aprobación de la OC | Sí: CG → GOP → GAF, por tipo y monto (Reglas_Aprobacion) | Sí: niveles 1 a 5 (OCNSAC1…OCNSAC); topes en pantallas: N4 ≥ US$ 3,000, N5 ≥ US$ 50,000 | Sí (CG → GOP → GAF) | **Decisión pendiente** (ver 3.2). Escritura por E, como el módulo de Roberto. |
| 19 | Observar, rechazar, reenviar | Sí | Parcial: OCNRCH rechazo (libera el bloqueo y vuelve al nivel 1) | Sí | Rechazo por E; motivo de la observación en C. |
| 20 | Modificar OC aprobada (reaprobación si sube monto, moneda o forma de pago) | Sí | Parcial: edición del documento; sin reaprobación automática | No | Regla en la vista: revocar (E) + editar (W) + reaprobar. |
| 21 | Anular OC | Sí: solicitud del comprador y aprobación del jefe de compras | Sí: OCNAN | No | SIDIGE por E; la aprobación en C. |
| 22 | PDF interno y PDF para el proveedor | Sí | Sí: impresión del SIDIGE; la app de Roberto genera PDFs (m04, TCPDF) | Parcial | Reusar el generador de PDF de Roberto. |
| 23 | Envío de la OC al proveedor por correo | Sí | Parcial: cola de correos ProRspEnv | Parcial | ProRspEnv (como m14). |
| 24 | Términos y condiciones de la OC | No | No (los gestiona la app de Roberto, m11) | No | Reusar m11. |
| 25 | Seguimiento de la entrega nacional | Parcial: «Entrega_Total» | Sí: OCN01SACK estado de entrega | Parcial | SIDIGE. |
| 26 | Seguimiento del embarque de importación | No | Sí: FIL con 9 hitos (acuse → retiro), naviera, operador logístico | Sí | SIDIGE FIL por E. |
| 27 | Aduana: DAM, canal, levante | No | Sí: DUA/DAM (canal, aduana, régimen, gastos CIF, THC) | Sí | SIDIGE. |
| 28 | Costeo de importación | No | Sí: DPCI/DPGI, gastos de importación | Sí (estimado) | SIDIGE; la vista solo lo muestra. |
| 29 | Ingreso a almacén | No | Sí: NIN desde OC (kardex), NIX no atendido | Parcial | SIDIGE (Almacén). La vista lo lee. |
| 30 | Evaluación del proveedor al recibir | No | Sí: eventos NIN/NIA de puntualidad, precio, calidad y SGC (casi sin uso) | No | SIDIGE por E. Gran mejora visible. |
| 31 | Legajo documental | Sí: Documentos_OC (cotización, factura, guía, acta, valorización…) + carpeta Drive | Parcial: adjuntos ARCDOC/SDGOBJ | Sí | Archivos en Drive (C) + adjunto en el SIDIGE. INROCONTA ya audita el legajo. |
| 32 | Factura del proveedor | Sí: se sube a Documentos_OC | Sí: CP (MOVCABE1CP), enlazado a la OC por línea | Parcial | SIDIGE CP; INROCONTA ya cruza SUNAT ↔ CP. |
| 33 | Notas de crédito y débito | Parcial (tipo de documento) | Sí: NCP, NDP | No | SIDIGE. |
| 34 | Aprobación del comprobante | No | Sí: CPAC aceptación | No | SIDIGE por E. |
| 35 | Plan de pagos por cuotas e hitos | Sí: Pagos con N° de cuota, hito, %, letras | Parcial: cuotas (TipCuoIni) y letras LP | Sí | C para el plan visible; las letras en el SIDIGE. |
| 36 | Solicitud y programación del pago | Sí: Solicitado → Programado → Pagado; Finanzas observa | Sí: RES recibo de salida; telecrédito BCP, telebanking Scotiabank | Sí | Pago real en el SIDIGE (RES); estado intermedio en C. |
| 37 | Retención y detracción | Sí: retención calculada; verificación contable | Sí: CRP retención, DETP detracción | Parcial | SIDIGE; INROCONTA ya controla detracciones y retenciones. |
| 38 | Proveedores | Sí: 2 cuentas por moneda, CCI, cuenta de detracción, verificado por Contabilidad | Sí: ANEXO tipo PRO (494) y PROI | Sí | Maestro en el SIDIGE; cuentas bancarias en DB_CENTRAL.CtaBanProveedor (ya existe). Fusionar el maestro del AppSheet. |
| 39 | Artículos | No (descripción libre) | Sí: Articulo (6,400) y alta con sp_CrearArticulo | Parcial | SIDIGE; alta por P (como el m02 de Roberto). |
| 40 | Empresas | Sí: Inroprin, Inroplas, Consorcio | Una base por empresa | No | Una vista por empresa; empezar por INROPRIN. |
| 41 | Usuarios, roles y permisos | Sí: Usuarios, Aprobadores_OC | Sí: usuarios del SIDIGE, permisos por evento, CodRes | Sí (simulado) | Login con el usuario del SIDIGE (como la app de Roberto); permisos por sp_eve_doc_val_per. |
| 42 | Tipo de cambio | Sí: tabla propia | Sí: TIPCAM del documento | Sí | SIDIGE. |
| 43 | Conceptos de gasto | Sí: Conceptos, Conceptos_Item | Sí: centros de costo, categoría (V01) | No | SIDIGE. |
| 44 | Avisos por chat | Sí: webhooks por canal | No (sí correo) | No | C. |
| 45 | Indicadores | Parcial: estatus | Sí: tablas BI (HEC_ATP_COM_NAC, COMPRAS_CP, FAC_IMP) e historial MovHis00 | Sí (ejemplo) | L desde MovHis00 y el BI del SIDIGE. |

## 3. Decisiones que hay que tomar
1. **Numeración.** El AppSheet numera la OC como 0024-2026; el SIDIGE como 2611-0011. Propuesta: manda el número del SIDIGE y el del AppSheet queda como referencia histórica en la migración.
2. **Ruta de aprobación.** Equivalencia propuesta, a confirmar con la jefatura:
   - Control de Gestión (presupuesto) = nivel 2 «Costos»;
   - Gerencia de Adm. y Finanzas = nivel 3 «Finanzas»;
   - Gerencia de Operaciones = nivel 4 (desde US$ 3,000);
   - Gerencia General = nivel 5 (desde US$ 50,000);
   - nivel 1 «Compras» = Jefe de Compras.
   Hay que alinear también los topes del AppSheet (Reglas_Aprobacion) con los del SIDIGE.
3. **Presupuesto.** ¿De dónde valida Control de Gestión: partidas del SIDIGE o su propia hoja?
4. **Maestro de proveedores.** Fusionar los proveedores del AppSheet (con cuentas y verificación) con el ANEXO del SIDIGE y CtaBanProveedor de DB_CENTRAL; una sola verdad.
5. **Cuándo nace el RQ en el SIDIGE:** al liberar la solicitud o cuando Compras la acepta.
6. **Vía de escritura de cabeceras nuevas** (RQ, OC, PO): SIDIGE Web, un procedimiento nuevo de Intuitive o INSERT controlado. Preguntar a Intuitive.

## 4. Lo que falta en el prototipo para la integración total
Anular o rehabilitar ítems y cierre del RQ · caja chica · comparativo de cotizaciones · modificar y revocar una OC aprobada · anular OC con aprobación del jefe · aprobación de demasías · OC de servicios y activo fijo · ingreso a almacén y evaluación del proveedor · notas de crédito y aprobación del comprobante · letras · observación de Finanzas al pago · presupuesto por partida · conceptos y centros de costo · selector de empresa · avisos.

## 5. Riesgos
- **Disparadores** en las tablas del RQ y la OC del SIDIGE: no escribir cabeceras sin la vía oficial.
- **Credencial `[usuario de lectura]`** expuesta en el código de la app de Roberto y en este chat: cambiarla antes de producción y usar un login propio para INROCOMPRAS con permisos mínimos.
- **Base viva de INROPRIN en [nube del proveedor del SIDIGE]**: esta auditoría se basó en la copia de configuración de [servidor real]; confirmar contra la base viva.
- **Doble registro durante la transición**: mientras convivan el AppSheet y la vista, definir una fecha de corte por OC.
