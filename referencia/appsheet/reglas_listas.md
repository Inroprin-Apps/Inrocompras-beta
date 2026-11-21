# Reglas reales del AppSheet (desde Listas.xlsx, 2026-11-06)

Fuente: `D:\Downloads\Listas.xlsx`, una copia de la base del AppSheet que trae 25 hojas.
No copio aquí los webhooks ni los tokens que trae el archivo.

## 1. Cuadro de aprobaciones: el contrato con otras áreas

- La hoja OC repite **exactamente** las 37 columnas del cuadro de aprobaciones actual, con los mismos nombres y en el mismo orden. Las áreas que leen ese cuadro no deben notar ningún cambio.
- Las columnas nuevas van de la 38 en adelante. Algunas son: ID_OC, RUC_Proveedor, Fecha_Aprobacion, Fecha_Legajo, Fecha_Observacion, Fecha_Subsanacion, Es_Credito, Fecha_Limite_Factura, Validacion_Tecnica, Tipo_Pago, Monto_Adelanto, Monto_Saldo y Modificada_Tras_Aprobada.
- **INROCOMPRAS debe seguir entregando ese cuadro de 37 columnas**, como reporte o como vista exportable.

## 2. Ruta de aprobación (Reglas_Aprobacion)

| Monto en soles    | Ruta                |
| ----------------- | ------------------- |
| 0 a 5,000         | Aprobación única    |
| 5,000 en adelante | Aprobación conjunta |

- Siempre la valida primero **Control de Gestión** (Aprobación Ppto).
- Los estados de presupuesto son: Presupuestado, No presupuestado, Excede presupuesto, Preinversión, Adm, Pre aprobado, Observado, Subsanado y Anular OC.
- Después aprueban **GOP** y **GAF**. Los estados "Observado por GOP", "Observado por GAF" y "Observado por GOP GAF" sugieren que, en la ruta conjunta, firman **en paralelo**.
- **Confirmado con los datos** (OC 0002 y 0003 de la hoja): en la aprobación única firma solo la **GOP**; en la conjunta firman **GOP y GAF**.
- Roles en Aprobadores_OC: CONTROL_GESTION, GOP, GAF, JEFE_COMPRAS_N, CONTABILIDAD y FINANZAS.

## 3. Estatus Compra: el motor de estados (22 valores)

- **Borrador y aprobación:** Borrador · Pendiente de aprobación · Observado por Ppto · Observado por GOP · Observado por GAF · Observado por GOP GAF · Aprobada
- **Observación de Finanzas:** Observado por Finanzas · Subsanada
- **Pago:** Legajo incompleto · Adelanto pendiente · Saldo pendiente · Pago pendiente · Crédito · Crédito letra · Caja Chica · Tarjeta de crédito
- **Cierre:** Oc Pagada · OC Cerrada
- **Cambios a la orden:** Anulación solicitada · Anulada · En modificación

## 4. Forma de pago (7) y condición

- **Formas de pago:** Contado · Crédito · Adelanto · Tarjeta de crédito · Caja chica · Contra entrega · Letra. Se registran también el "% adelanto" y los "Días de crédito".
- **Tipo de pago:** Contado · Adelanto + Saldo · Crédito.
- **Condición:** Normal · Urgente.
- **Conceptos de cuota:** Adelanto · Valorización · Pago parcial · Saldo · Pago total · Caja chica · Reembolso.

## 5. Pagos: cuotas

- Campos de cada cuota:
  - N_Cuota, Hito, Porcentaje, Dias_Credito y Es_Letra;
  - Fecha_Limite_Pago y Fecha_Programada;
  - N_Operacion y Voucher_Ref;
  - Aprobado_Fin_Por y Motivo_Obs_Fin;
  - Aplica_Retencion, Monto_Retencion y Neto_Referencial.
- **Al subir la factura, el pago se solicita solo.** El comentario que deja el sistema es "Solicitado automáticamente al subir factura".
- Se puede pagar sin factura dejando un sustento (Sustento_Falta_Factura). En crédito, Fecha_Limite_Factura sirve de recordatorio.
- Si cambian las condiciones de pago, las cuotas anteriores se anulan y se vuelven a calcular. El comentario es "Reemplazada por cambio de condiciones de pago".
- Estados de la cuota: Plan · Solicitado · Programado · Pagado · Anulado.
- Motivos para que Finanzas observe: Documentos incompletos · Datos incorrectos · Falta factura · Falta validación técnica · Monto no coincide · Proveedor incorrecto · Otros.

## 6. Solicitudes

- **Tipo:** Proyecto o Administrativa.
  - Si es de Proyecto, la libera la etapa del proyecto (Proyecto_Etapas: Muestras, Adquisición, Transporte… cada una con sus aprobadores).
  - Si es Administrativa, la libera el jefe del usuario.
- **Estados:** Borrador · Pendiente · Observada · Liberada · En Req · Rechazada · Cancelada.
  - Una solicitud se puede volver a crear a partir de otra (Nueva_Solicitud_ID).
- **Carga desde Excel por lote** (Carga_items): cada fila se valida. Un ejemplo de error es "La fecha de Plazo_Adquisicion ya pasó".
- **Datos de cada ítem:** Tipo (Bienes o Accesorios…), Codigo_Cliente, ficha técnica, link de referencia y plazo.
- **Proyectos:** cada uno tiene gerente y estado (Ganado o Estudio de mercado) y cliente (Pronied, DVC…).

## 7. Documentos y Drive

- **Una carpeta por OC**, con subcarpetas: 001 Requerimiento · 002 Cotizaciones · 004 Documentos Contables…
  - Un documento queda "Pendiente" hasta que se emite la OC; ahí se archiva solo en el legajo.
- **Tipos de documento:** Cotización · Factura · Guía de remisión · Correo de sustento · Validación técnica.
- **PDF interno y PDF para el proveedor.**
- **Numeración por serie** `EMPRESA|PROCEDENCIA|AÑO`. Hoy va en INROPRIN|NACIONAL|2026 = 24.
- **Cola de trabajos** (Apps Script): reservar_oc · pdf_oc · sync_items_oc · archivar_doc · recalcular_cuotas.

## 8. Catálogos

- **Unidad de negocio:** Inroprin · Inroplas · Consorcio Inroprin–PUCP. La hoja Empresas trae además a Cooteq.
- **Monedas:** PEN · USD · EUR · GBP, con su tabla de tipo de cambio.
- **Conceptos:** 43 en la OC (Administrativo, Activos fijos, Materia prima, Mercadería…) y otros para el ítem.
- **Usuarios:** área + jefe. **PCP = "Planeamiento"** (la responsable de Planeamiento).
- **Canales de chat:** Compras–CG y Compras–Finanzas.

## 9. Lo que cambia en INROCOMPRAS

1. **Ruta de aprobación:** quitar el tope inventado de S/ 10,000. La nueva ruta:
   - Control de Gestión (presupuesto);
   - si es menos de S/ 5,000, una gerencia;
   - si es S/ 5,000 o más, GOP y GAF en paralelo.
   - Que cada observación diga quién la hizo.
2. **Contado:** el AppSheet solicita el pago al subir la factura, así que la **factura va antes del pago**. El orden corregido queda: Aprobación → Envío → Factura → Pago → Guía → Conformidad.
3. Sumar las formas de pago **Tarjeta de crédito, Caja chica y Letra**, y la condición **Urgente**.
4. **Finanzas** puede observar con un motivo, y Compras subsana: Observado por Finanzas → Subsanada.
5. **Cambios a la orden:** En modificación (vuelve a aprobación si cambian el monto, la moneda o la forma de pago) y Anulación solicitada (la aprueba el Jefe de Compras).
6. **Cuotas:** con hito, %, letra, retención, neto, N° de operación y voucher. Se puede pagar sin factura dejando un sustento.
7. **Solicitudes:** Proyecto o Administrativa, con la etapa del proyecto y su aprobador; carga desde Excel validada fila por fila.
8. **Unidad de negocio**, 4 monedas, concepto de la OC y la exportación del **cuadro de aprobaciones de 37 columnas**.

## 10. Aplicado en INROCOMPRAS v6 (2026-11-06)

Todo lo de la sección 9, más estados fijos (observado por Finanzas, anulación solicitada), retención del 3% con neto, pago sin factura con sustento, canje por letra y la vista «Cuadro de aprobaciones» que se descarga para Excel con las 37 columnas tal cual.

## 11. Pedidos de la reunión con gerencia (06/11/2026) — aplicados en v7

1. **Gastos de importación (desaduanaje):** hoy Contabilidad llena el cuadro a mano. Ahora se sube el XML de la factura y se leen RUC, número, fecha, moneda, base e IGV. El usuario solo indica el **tipo de gasto** y **a qué orden o embarque** va, y el cuadro de costos y el factor se calculan solos.
   - Las facturas del exterior (Alibaba, fletes) no traen XML: se registran a mano.
2. **Gasto que cubre varias órdenes** (caso: service fee de Alibaba, cuando la compra llega en embarques distintos). Se reparte según el valor FOB de cada orden o en partes iguales. **La regla debe confirmarse con Heidi y Contabilidad.**
3. **Qué documentos pide el pago, según la condición** (regla inicial; la fijan Geanfranco y Heidi):
   - Contado, adelanto, tarjeta o caja chica: factura.
   - Crédito, letra o contra entrega: factura y guía.
   - Servicio: factura y conformidad.
   - Importación: invoice, BL y DAM.
   - Con el último documento que falta, la orden deja de estar en "Legajo incompleto" y pasa a pago.
4. **Kardex de Inroprin, igual que el de Inroplas:** las órdenes aprobadas (nacionales e importadas) cargan sus ítems como "Pendiente de ingreso". Almacén solo registra la guía y la orden vuelve a INROCOMPRAS como "Ingresado". Los servicios no pasan por almacén.
5. **Pantallas por perfil:** cada perfil ve solo lo que le compete. Por ejemplo, Proyectos no ve Pagos, y Compras ve el estado de los pagos pero no los mueve.
6. **Cambio de año** (propuesta): lo pendiente de diciembre (RQ y OC abiertos) pasa solo al año nuevo con referencia a su número original. Falta definir con Contabilidad si conserva el número o recibe uno nuevo.

**Pendiente para la versión real (no es del prototipo):**

- **Sesión:** si se cae internet, no debe perderse lo que se estaba trabajando. Se guarda el borrador en el navegador y la sesión se renueva sola.
- **Tablas:** usar nombres con el formato del SIDIGE.
- **Memos:** el módulo de memos que está traspasando Geanfranco debería vivir en la misma base.
- **Estructura:** Geanfranco la arma con Heidi; luego se pasa a código compatible con el SIDIGE.
