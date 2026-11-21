# Mapa de campos: vista INROCOMPRAS → SIDIGE INROPRIN

Fuente: configuración de INROPRIN en [servidor SIDIGE] (tablas CAMPOS, CFGDOC00, EVENTO, MAETABDET, SUBALM, ANEXO, Articulo), leída solo con el portal. 06/11/2026.
La base viva de INROPRIN está en [nube del proveedor del SIDIGE]. Allí se confirmará antes de escribir nada.

Leyenda: **OBL** = obligatorio según la tabla CAMPOS (REQUE=1) · _auto_ = lo calcula o asigna el sistema.

## 1. Requerimiento (RQ) → `MOVCABE1RQ` / `MOVDETE1RQ`

### Cabecera

| Campo en la vista            | Columna SIDIGE                           | Regla / catálogo                                                               |
| ---------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------ |
| N.° de requerimiento         | NUMDOC                                   | OBL · _auto_, formato AAMM-NNNN (CFGNUMDOC)                                    |
| Fecha de emisión             | FECDOC                                   | OBL                                                                            |
| Necesito para (fecha)        | FECENT                                   | OBL · etiqueta "Fec.Ent.*"                                                     |
| Fecha de entrega al cliente  | FECENT02                                 | opcional                                                                       |
| Solicitante                  | CODVEN                                   | etiqueta "Solicitante*" · anexo (PER/RES)                                      |
| Responsable                  | CODRES                                   | OBL · anexo tipo RES (sale del usuario: CodRes)                                |
| Proveedor sugerido           | CODANE, NOMANE, IDEANE, XTIPIDE, XTIPANE | OBL · por defecto el proveedor genérico "PROVEEDOR SUGERIDO" (RUC 20600612922) |
| Proveedor sugerido 2         | CODANE02                                 | opcional                                                                       |
| Moneda                       | XTIPMON                                  | OBL · catálogo XTIPMON: MN Soles, ME Dólares, EU Euros                         |
| Tipo de movimiento           | XTIPMOV                                  | OBL · valor por defecto 01                                                     |
| Proyecto / referencia        | REFINT                                   | etiqueta "Referencia"                                                          |
| Centro de costo / beneficio  | CENCOS / CENCOS2                         | catálogo CENCOSTRA                                                             |
| Categoría                    | V01                                      | etiqueta "Categor."                                                            |
| Partida presupuestal         | TIPPARPRE / ParPre                       | opcional                                                                       |
| N.° de solicitud de la vista | TIPTR1 + NUMRF1                          | propuesta: guardar aquí la referencia a la solicitud de INROCOMPRAS            |
| Estado                       | XESTDOC / XTIPEVE                        | _auto_ · P (pendiente) + evento RQEM                                           |

### Detalle (por ítem)

| Campo en la vista   | Columna SIDIGE | Regla / catálogo                                                    |
| ------------------- | -------------- | ------------------------------------------------------------------- |
| N.° de ítem         | NUMITE         | OBL · _auto_                                                        |
| Artículo            | CODART         | OBL · catálogo Articulo (6,400)                                     |
| Descripción         | DESART         | se copia del artículo; editable                                     |
| Almacén             | CODSUBALM      | por defecto 011001;012001;016004;056101;056201;GI · catálogo SUBALM |
| Cantidad            | CANTOT         | OBL                                                                 |
| Unidad              | XTIPUNI        | del artículo                                                        |
| IGV                 | IMP001         | por defecto 18.00                                                   |
| Centro de beneficio | CENCOS2        | opcional                                                            |
| Ubicación           | UBIALM         | opcional                                                            |

## 2. Orden de compra (OCN) → `MOVCABE1OCN` / `MOVDETE1OCN`

### Cabecera

| Campo en la vista           | Columna SIDIGE                  | Regla / catálogo                                                                    |
| --------------------------- | ------------------------------- | ----------------------------------------------------------------------------------- |
| N.° de OC                   | NUMDOC                          | _auto_ AAMM-NNNN                                                                    |
| Fecha de registro           | FECDOC                          | por defecto hoy                                                                     |
| Proveedor                   | CODANE, NOMANE, IDEANE          | OBL · anexo tipo PRO (494 proveedores)                                              |
| Condición de pago           | XCONPAG                         | etiqueta "Cond.Pago*" · catálogo CONPAG (contado, crédito, FC030, A50Y50, cheques…) |
| Fecha de entrega            | FECENT                          | OBL                                                                                 |
| Tipo de movimiento          | XTIPMOV                         | OBL · por defecto 01                                                                |
| Responsable                 | CODRES                          | anexo RES                                                                           |
| Solicitante                 | CODVEN                          | anexo                                                                               |
| Moneda / tipo de cambio     | XTIPMON / TIPCAM                | catálogo XTIPMON                                                                    |
| Centro de costo / beneficio | CENCOS / CENCOS2                |                                                                                     |
| Referencia / proyecto       | REFINT                          |                                                                                     |
| Glosa                       | GLOSA                           |                                                                                     |
| % de retención              | CANTOT01                        |                                                                                     |
| Requerimiento de origen     | TIPTR1 = 'RQ', NUMRF1           |                                                                                     |
| Subtotal, IGV, total, saldo | SUBTOT, TOTIMP1, TOTDOC, SALDOC | _auto_                                                                              |
| (Tipo doc. APK)             | TipDocApk                       | OBL en CAMPOS · pendiente de averiguar qué es                                       |

### Detalle (por ítem)

| Campo en la vista      | Columna SIDIGE                 | Regla                                  |
| ---------------------- | ------------------------------ | -------------------------------------- |
| Ítem del RQ            | TIPDOC_P='RQ', NUM_P, NUMITE_P | enlace línea a línea con el RQ         |
| Artículo / descripción | CODART / DESART                | del RQ                                 |
| Cantidad               | CANTOT                         | ≤ saldo del RQ (si es más, es demasía) |
| Precio unitario        | PRECOS / PREVTA                |                                        |
| IGV                    | IMP001                         | 18.00                                  |
| Almacén / destino      | CODSUBALM / TIPDESADQ          |                                        |
| Centro de beneficio    | CENCOS2                        |                                        |

## 3. Estados (tabla EVENTO, INROPRIN)

- RQ: RQEM emisión → RQSAC aprobación jefatura (también RQSAC1 gerencia, RQACJL jefe logística, RQACGG gerencia general) → RQCO cotizado → RQCOM comprado → RQIN ingresado → RQFC facturado · RQRCH rechazado · RQAN anulado · RQRQX cierre.
- OCN: OCNEM → OCNSAC1 (N1) → OCNSAC2 (N2) → OCNSAC3 (N3) → OCNSAC4 (N4) → OCNSAC (N5) · OCNRCH rechazado · OCN01SACK estado de entrega · OCNFCA factura adelantada · OCNPG pago · OCNNA no atendido · OCNAN anulado.
- El historial de eventos (quién y cuándo) se escribe en `MOVHIS00`.

## 4. Lo que la vista guarda por su cuenta (el SIDIGE no lo tiene)

Solicitud previa y su liberación, legajo documental (cotización, guía, factura, acta) con enlaces a Drive, observaciones con motivo, demasías con sustento, plan de cuotas visible, avisos. Se enlazan al SIDIGE por N.° de RQ / OC.

## 5. Vía de escritura: el SIDIGE ya tiene módulo web (hallado 06/11/2026)

- El usuario `[usuario de lectura]` NO puede ver el código de procedimientos ni disparadores (VIEW DEFINITION = 0). Sí se ven nombres y parámetros.
- Hay disparadores en MOVCABE1RQ (modificado 27/10/2025), MOVCABE1OCN y MOVDETE1OCN: grabar directo en esas tablas dispara lógica que no podemos ver. **No escribir directo en tablas.**
- `Sp_InsMovHis00(@xTipEve, @DesHis, @MemHis, @CodEmp, @CodDoc, @NumDoc, @FecCrea, @Mod2, @CodAne, @CodUsu, @CodRes)` es como el sistema registra un evento (aprobación, etc.) en el historial.
- `Sp_GetAneAPK` / `Sp_GetArtAPK (@CodEmp, @FecSis, …)`: entregan anexos y artículos modificados desde una fecha a la app móvil (APK). Sirven de modelo para sincronizar catálogos.
- `TipDocApk` (obligatorio en la OC) = "Tipo de documento APK".
- **SIDIGE Web** (OPCIONESWEB, 813 opciones) ya tiene páginas para compras, por ejemplo:
  - DocWeb0003 "Documentos de Requerimientos – Transacciones" → pw_Doc7RS.aspx?Param01=11764
  - GenDocWeb0006 "Generar Orden de Compra Nacional desde Requerimiento" → pw_GenDocIte.aspx?Param01=10599
  - DocWeb0046 / 0055 / 0072 "Documentos de Orden de Compra Nacional"
  - GenDocWeb0008 / 0066 "Generar Nota de Ingreso desde Ord. Compra"
    Conclusión: la escritura oficial ya existe por la web del SIDIGE ([web del proveedor del SIDIGE]). Preguntar a Intuitive si esas páginas usan un servicio o API que INROCOMPRAS pueda llamar.

## 6. Pendientes

1. Confirmar en la base viva ([nube del proveedor del SIDIGE]) que la configuración es la misma que esta copia.
2. Averiguar el campo obligatorio TipDocApk de la OC.
3. Definir con Intuitive la vía de escritura (API o base de datos) y probarla primero en el TEST.
