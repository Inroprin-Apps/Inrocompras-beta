# 01 · Alcance

## Objetivo

Terminar lo que Geanfranco empezó con el AppSheet: que Compras e Importaciones trabajen en una sola app con reglas claras por rol. Hoy el plan de compras vive en varios Sheets y la orden se arma desde un Sheet. En la app nueva, las dos cosas nacen dentro, con legajo en Drive, correos reales y conexión con InroPay.

## Entra (go-live 01/01/2027)

| Módulo                           | Origen en el AppSheet                     | Qué cambia                                                                                                                                |
| -------------------------------- | ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Acceso                           | Usuarios + Aprobadores_OC                 | Google con la cuenta de la empresa. Área + roles, igual que el AppSheet; los asigna el administrador                                      |
| Proyectos y etapas               | Proyectos, Proyecto_Etapas                | Igual. «Ganado» crea la etapa General con el gerente como aprobador                                                                       |
| Solicitudes                      | Solicitudes, Solicitud_Items, Carga_items | Igual, incluida la carga masiva desde Excel validada fila por fila y el «rehacer» desde una rechazada                                     |
| Requerimientos                   | Requerimientos, Items, Anulaciones        | Igual, más el número del RQ del SIDIGE (PCP), el SKU y la validación técnica por ítem                                                     |
| **Plan de compras por proyecto** | (Sheets aparte)                           | **Nuevo:** vista por proyecto con saldo, semáforo, validación técnica, OC y pago de cada línea. Reemplaza los Sheets                      |
| **Generar OC**                   | Base de datos OC NAC (Sheet)              | **Nuevo:** «carrito» con las líneas con saldo; la OC nace en la app con numeración por serie                                              |
| Aprobación de OC                 | OC (CG → GOP / GAF)                       | Igual: ruta por monto (S/ 5,000), observar, rechazar, reenviar, revocar y demasías que decide la GOP                                      |
| Modificación y anulación         | OC                                        | Igual, con reaprobación si sube el monto o cambian la moneda o la forma de pago                                                           |
| Documentos y legajo              | Documentos_OC, OC_Docs                    | Drive real: carpeta por OC con las mismas subcarpetas. Lectura de cotizaciones y facturas (RUC, montos)                                   |
| PDF de la OC                     | Apps Script pdf_oc                        | PDF interno y para el proveedor (en inglés si es importación), con los mismos datos                                                       |
| Envío al proveedor               | OC + correo                               | Correo real desde Workspace con el PDF adjunto                                                                                            |
| Pagos                            | Pagos, Conceptos_Pagos                    | Cuotas según la forma de pago, pago que se pide solo al subir la factura, retención del 3 %, observación de Finanzas. Conectado a InroPay |
| Proveedores                      | Base de datos Proveedores                 | Igual, más la evaluación financiera (Finanzas) y la verificación de retención (Contabilidad)                                              |
| Desaduanaje y costeo             | Desaduanajes, Des_* , TC_Costeo           | Igual: checklist, DAM, llegada, levante, almacén, gastos, reparto, costeo versionado con reapertura                                       |
| Cuadro de aprobaciones           | Hoja OC (37 columnas)                     | Vista exportable con las mismas columnas, para que las otras áreas no noten el cambio                                                     |
| Bandeja «Te toca»                | (varias vistas del AppSheet)              | Nuevo: lo pendiente de cada persona en un solo lugar                                                                                      |
| Notificaciones                   | Correos y chat del AppSheet               | Correo + campana en la app                                                                                                                |

## No entra en esta etapa

- Licitaciones, ficha de proyecto, presupuesto de Costos por partida, kick-off y centro de costo: es el recorrido de la v3, para después.
- Escribir en el SIDIGE (RQ, OC, CP, RES). Lo hace la integración de Roberto; aquí solo se encola.
- Kardex o ingreso a almacén (puede ir después del 01/01).
- Seguimiento automático de couriers (C-25).
- Caja chica como módulo completo: solo se marca el ítem y se registra el comprobante.

## Fuentes

- Reglas exactas: `referencia/appsheet/appsheet_v2_referencia.md`, extraído por máquina del PDF de documentación del AppSheet v2.
- Reglas de negocio: `referencia/appsheet/reglas_listas.md` y `referencia/casuisticas.md`.
- Comportamiento esperado de la UI: `referencia/prototipo_v3/` (el prototipo cubre más de lo que entra aquí; tomar solo lo de este tramo).
