# 11 · En qué mejora al AppSheet (sin cambiar sus reglas)

Las reglas de negocio son las del AppSheet v2. Esto es lo que se corrige o se agrega al pasarlo a código.

## Huecos de seguridad corregidos

| #    | En el AppSheet                                                                                                               | Aquí                                                                                                     |
| ---- | ---------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| B-00 | Sin filtros de seguridad: quien abría la app veía todas las órdenes y montos; las reglas solo ocultaban botones              | RLS: los montos solo los ve quien ve precios; los cambios de estado solo pasan por funciones que validan |
| B-01 | «Marcar como Ganado/Perdido» y «Borrar borrador» no pedían rol                                                               | Piden rol o área                                                                                         |
| B-02 | «Rechazar» una anulación de requerimiento no tenía condición                                                                 | Solo sus aprobadores                                                                                     |
| B-03 | `[_Rol_Jefe]` usa `JEFE_COMPRAS_I`, que no existía en la lista de roles: nadie podía aprobar la anulación de una importación | El rol existe                                                                                            |
| B-04 | La fórmula de `[Estado de Aprobación3]` no mira el VB de CG: solo la protege que la etapa impida firmar antes                | La fórmula también exige el VB de CG (doble defensa)                                                     |
| B-05 | «Confirmar modificación» ponía en Aprobación GAF el valor de la GOP                                                          | Limpia las tres firmas                                                                                   |
| B-06 | «Pagado» no pedía rol: cualquiera con la cuota «Programado» podía marcarla pagada                                            | Solo Finanzas, con N° de operación                                                                       |
| B-07 | Los pasos del desaduanaje (DAM, llegada, levante, almacén) no pedían rol                                                     | Compras o Importaciones                                                                                  |
| B-08 | Sin historial de quién cambió qué (solo algunas columnas _Por / _Fecha)                                                      | `historial` con cada cambio                                                                              |

## Lo que se agrega (acordado en reuniones)

- **Plan de compras por proyecto en la app** (saldo, semáforo, carrito) en lugar de los Sheets (C-15, C-17).
- **La OC nace en la app**, con numeración reservada por la base y PDF en español e inglés de los mismos datos.
- **Validación técnica por ítem** con marca y modelo (C-16).
- **Evaluación financiera del proveedor** antes de enviar la OC (18/11).
- **RQ del SIDIGE y SKU** por ítem (C-14, C-22).
- **Lectura de PDF** (RUC, montos e ítems) con confirmación humana.
- **TC congelado al numerar la DAM** y **costeo versionado** con reapertura (C-02, C-09).
- **«Te toca»:** una bandeja por persona en lugar de revisar varias vistas.
- **Notificaciones por correo** desde Workspace y campana en la app.
- **Conexión con InroPay** en los dos sentidos.
- **Corrección de estados por el administrador**, con motivo e historial.

## Lo que se deja como estaba (a propósito)

- Los nombres de los estados y de las aprobaciones («Observado por Ppto», «Aprobado para Compra», «Legajo incompleto»…), para que Compras se reconozca.
- La ruta de aprobación por monto (S/ 5,000) y el orden CG → GOP/GAF.
- Que Finanzas levante su propia observación de la OC.
- Las 37 columnas del cuadro de aprobaciones.
