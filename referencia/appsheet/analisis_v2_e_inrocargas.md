# Análisis: AppSheet v2 de Geanfranco + INROCARGAS → INROCOMPRAS (17/11/2026)

**Fuentes**

- `D:\Downloads\Application Documentation v2.pdf`: app «prueba más importaciones», 5531 páginas, generada el 17/11. Tiene 138 tablas, 120 vistas y 281 acciones. Es la copia nueva del AppSheet.
- La línea de base es `Application Documentation.pdf` («app compras - Roberto», 05/11): 114 tablas, 100 vistas y 241 acciones.
- INROCARGAS: el Apps Script y el HTML que Tomás pegó en el chat, más el Excel `INROCARGAS_base_importaciones (1).xlsx`. Tiene 283 OC, 305 embarques, 333 productos y 22 agentes.
- La comparación se hizo por máquina, registro por registro: tablas, columnas con fórmulas y condiciones, acciones, vistas, slices, formatos y bots. Las salidas están en `appsheet_v2\`:
  - `DIFF.md`;
  - `nuevas_tablas_v2.txt`;
  - `cambios_columnas_v2.txt`;
  - `demasias_v2.txt`;
  - `v1.json` y `v2.json`.
- El documento del AppSheet **no trae la lógica de los bots** (eventos, condiciones y pasos). Solo trae sus tablas de proceso. Lo que se dice aquí de los bots se deduce de esas tablas y de sus salidas; hay que confirmarlo con Geanfranco.

---

## 1. Qué cambió del AppSheet v1 al v2

### 1.1 Lo grande: módulo de Desaduanaje y costeo de importación (8 tablas nuevas)

| Tabla                 | Para qué sirve                                                                                                                                                                                                                                                                                                                                                                                                                       |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Desaduanajes`        | Un desaduanaje por embarque. Lleva su número (`N_Des`), una `OC_Duena`, el número romano (I, II…), Tipo (Marítimo, Aéreo o Courier), Alcance (Total o Parcial), Agente (texto libre), BL o AWB, número de DAM y moneda de la DAM (USD o EUR), y los TC de USD, EUR y GBP.                                                                                                                                                            |
| `Des_Documentos`      | Archivos del desaduanaje: factura comercial, packing list, BL o AWB, certificado de origen, póliza de seguro, permiso de MTC o DIGESA, DAM y otro. Cada uno con `Link_Drive` y `Estado_Archivo`, porque un bot lo archiva en Drive.                                                                                                                                                                                                  |
| `Des_Docs`            | Tabla puente con el webhook: correlativo (serie y número), carpeta de Drive creada para el desaduanaje y mensaje de respuesta.                                                                                                                                                                                                                                                                                                       |
| `Des_Gastos`          | Gastos del desaduanaje. Cada uno lleva concepto, si entra al costo, emisor, RUC (11 dígitos), tipo de comprobante (factura, NC, ND, liquidación SUNAT/DAM, recibo u otro), moneda, monto sin IGV, TC de costeo, monto en soles, **`OC_Hija_Ref`** (la OC del servicio que originó el gasto) y el archivo.                                                                                                                            |
| `Des_Productos`       | Productos del desaduanaje con **`OC_Ref` y `Linea_Ref` propios**. Por eso un desaduanaje puede traer líneas de **varias OC**. Cada producto lleva:<ul><li>marca de muestra y proyecto;</li><li>cantidad, moneda, precio EXW y ad valorem en USD;</li><li>EXW en soles, % de reparto, gastos en soles y ad valorem en soles;</li><li>costo total y costo unitario en soles;</li><li>**`Cant_Recibida`** e **`Incidencia`**.</li></ul> |
| `Des_Costeo_Hist`     | Historial **versionado** del costeo cerrado: versión, fecha, quién cerró, motivo, OC, proyecto, producto, cantidad, EXW unitario, FI y costo unitario.                                                                                                                                                                                                                                                                               |
| `TC_Costeo`           | Tipo de cambio de costeo por moneda, con `Vigente_Desde`.                                                                                                                                                                                                                                                                                                                                                                            |
| `Conceptos_Gasto_Imp` | Catálogo de gastos de importación. Cada concepto dice si **entra al costo** y cómo se **reparte**: por «Producto» o por «Valor».                                                                                                                                                                                                                                                                                                     |

**Ciclo de estados del desaduanaje**, con una acción de un toque y su fecha en cada paso:

`Borrador` → **Documentos completos** → **DAM numerada** → **Llegada** → **Levante** → **En almacén** → `Costeo cerrado`

| Acción               | Se puede usar cuando…                              | Qué hace                                        |
| -------------------- | -------------------------------------------------- | ----------------------------------------------- |
| Documentos completos | el estado es Borrador y el checklist está completo | Pasa a Documentos completos.                    |
| Registrar DAM        | el estado es Documentos completos                  | Pide el número de DAM y la fecha de numeración. |
| Registrar llegada    | el estado es DAM numerada                          | Pide la fecha y confirma.                       |
| Registrar levante    | el estado es Llegada                               | Pide la fecha y confirma.                       |
| Ingreso a almacén    | el estado es Levante                               | Pide la fecha y confirma.                       |

- **Checklist documental:** un documento cuenta si se marcó el check o si se subió el archivo.
  - Siempre se piden factura comercial, BL o AWB, certificado de origen y seguro.
  - El permiso se pide solo si `Requiere_Permiso` está marcado.
  - Los checks solo se editan en Borrador.
  - El resultado se ve como «✅ Completos» o como «❌ Falta: …».
- **Nueva acción en la OC:** «Nuevo desaduanaje». Aparece cuando la OC es de importación y está «Aprobada para compra», y el usuario es de Compras o Importaciones.
- **El cierre del costeo** guarda Versión, Cerrado_Por, Fecha_Cierre y **Motivo_Reapertura**. Esto **es la respuesta de Geanfranco al caso C-02**, el costo que llega después del cierre: el costeo se reabre con motivo y genera una versión nueva en el historial.
- **Bots nuevos:**
  - «Desaduanaje – Crear»: llama a un webhook que asigna el correlativo y crea la carpeta en Drive.
  - «Desaduanaje – Archivar documento»: llama a un webhook que mueve el archivo a la carpeta y devuelve el link y el estado.

### 1.2 Cambios en la OC

- Campos nuevos de importación, editables solo en Borrador:
  - `Incoterm`: EXW, FOB, CIF, FCA, CFR, DAP o DDP;
  - `Referencia_Prov`;
  - **`Plazo_Reposicion_Dias`** (15 por defecto);
  - **`Penalidad_Pct_Dia`** (0.5 % por defecto);
  - **`Penalidad_Tope_Pct`** (10 % por defecto).
- `OC_Padre` y `Des_Ref` son vínculos de texto. La OC hija es la de un servicio de importación (flete, agente, almacén) colgada de la OC del bien.
- `Tipo_Impuesto`: se agrega «Sin IGV», que es el valor por defecto en importación. Una importación no puede llevar IGV, y el campo se reinicia si cambia la procedencia.
- Si la OC es de importación, el proveedor tiene que ser **extranjero**; si es nacional, no puede serlo.
- El campo Proveedor pasa a ser una fórmula a partir de `Proveedor_Ref`. El RUC del proveedor se reinicia en Borrador.
- El «Cuadro General» ahora se agrupa por Procedencia, luego Proyecto y luego Fecha. La aprobación GOP pide confirmación con el número de OC, la moneda y el monto.

### 1.3 Proveedores extranjeros

Hay un campo nuevo, `ORIGEN` (Nacional o Extranjero). Según su valor:

- **Si es extranjero**, aparecen:
  - país;
  - nombre de la cuenta;
  - SWIFT, IBAN y ABA o código de sucursal;
  - banco intermediario y su SWIFT;
  - dirección y ciudad del banco;
  - `FORMA_PAGO_EXT` (transferencia o plataforma).
- **Si es extranjero**, se ocultan CCI, cuenta de detracción, agente de retención, buen contribuyente y la verificación contable. La retención queda en «No aplica».

### 1.4 Documentos de la OC

Se agregan tipos de documento: Proforma (PI), Factura comercial, Packing list, Ficha técnica, Validación técnica, Carta de compatibilidad y SWIFT. PI, factura comercial, packing list y SWIFT **solo se aceptan en OC de importación**.

### 1.5 Pagos

- El monto del pago ahora se valida contra `[OC].[Saldo]`, y el neto no puede pasar el saldo.
- El mensaje de error muestra el saldo por programar cuando el pago es de tipo «Saldo».
- ⚠ `Factura_Subida` cambió su valor inicial a `TRUE`; antes era «tiene factura vinculada». Así, el sustento por falta de factura deja de pedirse por defecto. **Hay que preguntar si es intencional.**

### 1.6 Otros bots nuevos

| Bot                                  | Qué hace (deducido de su tabla de proceso)                                                                            |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| OC – Nueva                           | Avisa cuando se crea una OC.                                                                                          |
| Legajo quitado – Revertor            | Devuelve la OC a «Legajo incompleto» si se quita un documento.                                                        |
| Quitar observación                   | Devuelve la OC a su estado anterior cuando se levanta una observación.                                                |
| Nuevo proyecto                       | Guarda la solicitud.                                                                                                  |
| data Req=Items y Estampar OC en Item | Reciben los datos de la OC y estampan el número de OC/OS en cada ítem del requerimiento, para medir el avance del RQ. |

### 1.7 Lo que no cambió

Demasías, aprobaciones, observaciones de Finanzas, cuotas y retención ya estaban en el v1 y siguen igual.

- **Ojo con el caso C-01:** en el AppSheet, la demasía la decide solo la **GOP**: «Aprobar sin demasía», o aprobar o rechazar por línea. **No hay paso de Costos**, aunque en la reunión del 12/11 se dijo «primero Costos, luego Rodrigo». Hay que confirmar cuál vale.

---

## 2. Foto del ingreso con guía: qué hay y qué no

**En el AppSheet v2 no hay ninguna columna de foto** (tipo Image, Photo o Signature) para el ingreso a almacén. Lo único relacionado es:

- `Documentos_OC.Archivo`, de tipo File, con el tipo de documento «Guía de remisión». Es una subida de archivo, no una captura con la cámara.
- La acción «Ingreso a almacén» del desaduanaje, que guarda solo la fecha.
- `Des_Productos.Cant_Recibida` e `Incidencia`: la cantidad recibida por línea importada y lo que pasó.
- `Items.FECHA RECEPCIÓN` y `ESTADO RECEPCIÓN`: texto que viene de «Datos». Parece que llega desde fuera, probablemente del Kardex.

Si Geanfranco pensó una ruta con foto, no está en esta copia. Puede estar en su PDF de flujo o en su chat. **Propuesta para el diseño de INROCOMPRAS (pantalla «Por ingresar»)**, para que no se escape:

1. Almacén abre la OC o el embarque en el celular y toma la **foto de la guía firmada y sellada**. Opcionalmente, toma fotos de la mercadería o de los bultos.
2. Registra la **cantidad recibida por ítem** y una **incidencia** si la hay: faltante, daño o diferencia de modelo.
3. Al guardar:
   - se crea el documento «Guía de remisión» en el legajo de la OC, con la foto;
   - en importación, se marca «En almacén» con su fecha;
   - si hay diferencias, se avisa a Compras.
4. Más adelante, el archivo pasa a Drive por nuestro lado (etapa posterior: lo que el SIDIGE no cubra lo cubre nuestra app).

---

## 3. Lo que el mockup v7 de INROCOMPRAS todavía no tiene

| #   | Función del AppSheet v2                                                                                                        | En el mockup v7                                                                          | Acción                                                                                                 |
| --- | ------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| 1   | Desaduanaje con su ciclo de 7 estados y una acción por paso                                                                    | No existe; Embarques solo muestra naviera, BL, DAM, ETA, canal y levante                 | **Construir** (ver §4)                                                                                 |
| 2   | Checklist documental de importación (más permiso MTC o DIGESA si aplica)                                                       | No                                                                                       | Construir                                                                                              |
| 3   | Gastos de importación con catálogo «entra al costo» y reparto por producto o por valor, TC de costeo y OC hija                 | Parcial: la vista Gastos de importación lee el XML y reparte por FOB o en partes iguales | Ampliar: usar el catálogo de conceptos, permitir NC y ND y liquidación SUNAT/DAM, y amarrar la OC hija |
| 4   | Costeo por producto: EXW, ad valorem, % de reparto, costo unitario en soles y FI                                               | No                                                                                       | Construir                                                                                              |
| 5   | Cierre de costeo **versionado** con reapertura y motivo                                                                        | No                                                                                       | Construir (cierra C-02 junto con la regla contable del mes)                                            |
| 6   | Desaduanaje con productos de **varias OC**                                                                                     | No                                                                                       | Construir: embarque N:M con OC                                                                         |
| 7   | Incoterm, plazo de reposición y penalidades en la OC de importación                                                            | Incoterm sí; lo demás no                                                                 | Agregar al formulario de la OC                                                                         |
| 8   | Proveedor extranjero con datos bancarios internacionales                                                                       | SWIFT e IBAN mencionados, sin ficha                                                      | Agregar a la ficha del proveedor                                                                       |
| 9   | «Sin IGV» y validación de procedencia contra el origen del proveedor                                                           | No                                                                                       | Agregar la regla                                                                                       |
| 10  | Tipos de documento de importación (PI, factura comercial, packing, SWIFT, ficha y validación técnica, carta de compatibilidad) | Parcial                                                                                  | Completar la lista de tipos                                                                            |
| 11  | Demasía por línea: sustento de exceso, + Demasía, aprobar o rechazar por línea, aprobar sin demasía                            | Muy parcial                                                                              | Construir (C-01)                                                                                       |
| 12  | Estampar la OC en el ítem del RQ (avance del RQ)                                                                               | Avance del RQ sí                                                                         | Verificar que se muestre la OC por ítem                                                                |
| 13  | Revertir a «Legajo incompleto» si se quita un documento                                                                        | No                                                                                       | Agregar la regla                                                                                       |
| 14  | Carpeta de Drive y correlativo creados por webhook                                                                             | No; está en «Carpetas de Drive reales»                                                   | Etapa posterior (nuestra app)                                                                          |
| 15  | Foto de la guía al ingresar                                                                                                    | No (tampoco está en el AppSheet)                                                         | Diseñar (§2)                                                                                           |

Los pendientes que ya estaban listados siguen en `CONTINUAR_AQUI.md`: anulación y cierre de ítems de RQ, caja chica, NC y ND, cuentas bancarias, notificaciones y el repaso de las acciones del PDF.

---

## 4. Cruce INROCARGAS ↔ AppSheet v2 (Desaduanajes) ↔ INROCOMPRAS

### 4.1 Qué cubre cada uno

- **INROCARGAS es el seguimiento logístico del embarque**, el día a día de Comex:
  - responsable y estado logístico;
  - tiempo de producción, origen, incoterm, modalidad, puerto, FCL o LCL y número de contenedores;
  - agente de carga con su referencia, naviera, nave, BL o AWB y cut off;
  - ETD, ATD, ETA y ATA, y los días de desaduanaje;
  - documentos enviados al agente y agente de aduanas con su referencia;
  - DAM, observaciones y costeo (Pendiente, Costeado o Muestra);
  - productos por embarque, alertas de llegada y el historial.
- **El Desaduanaje de Geanfranco es la parte aduanera y de costo:** documentos, DAM, levante, gastos, reparto, costeo versionado y cantidad recibida.

Se tocan en muchos campos, pero **casi no se pisan en propósito**. Son dos mitades de la misma entidad.

| Concepto                       | INROCARGAS                                                                                                      | AppSheet v2                                                                                    | Propuesta INROCOMPRAS                                                                                                                                                                                                                                                                 |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unidad                         | Embarque I, II… por OC (`ID_EMB = ID_OC                                                                         | romano`)                                                                                       | Desaduanaje con `Romano` y `OC_Duena`                                                                                                                                                                                                                                                 | **Una sola entidad «Embarque»** con su número romano por OC dueña |
| OC por embarque                | 1 OC (la consolidación se detecta por referencia compartida)                                                    | OC dueña + productos de otras OC (`Des_Productos.OC_Ref`)                                      | **N:M**: un embarque trae líneas de varias OC; la referencia compartida pasa a ser un vínculo real                                                                                                                                                                                    |
| Modalidad                      | Marítimo, Aéreo, Courier, Terrestre, Pasajero                                                                   | Marítimo, Aéreo, Courier                                                                       | Unir las listas: 5 valores                                                                                                                                                                                                                                                            |
| Incoterm                       | 9 valores (incluye CPT y CIP)                                                                                   | 7 en la OC                                                                                     | Unir: 9 valores                                                                                                                                                                                                                                                                       |
| Agente                         | Biblioteca AGENTES con rol (carga o aduanas), razón social, RUC, alias y detección de parecidos                 | `Agente`, texto libre                                                                          | **Biblioteca de INROCARGAS**, amarrada al maestro de proveedores (en el SIDIGE el agente es un proveedor con RUC)                                                                                                                                                                     |
| Fechas                         | Cut off, ETD, ATD, ETA, ATA, días de desaduanaje; fecha en planta aproximada y real (calculadas)                | Embarque, llegada estimada, numeración, llegada, levante, almacén                              | Unir: ETD/ATD ≈ Fecha_Embarque; ETA ≈ Llegada_Est; ATA ≈ Llegada; se agregan numeración, levante y almacén                                                                                                                                                                            |
| Estado                         | Logístico: pendiente de aprobación, producción, espera de zarpe, tránsito, aduana, Planta PP, Almacén Magdalena | Aduanero: Borrador, docs completos, DAM numerada, llegada, levante, en almacén, costeo cerrado | **Una línea de estados**: Producción → Espera de zarpe → En tránsito → Docs completos → DAM numerada → Llegada → Levante → En almacén (Planta PP o Magdalena) → Costeo cerrado. Los de aduana avanzan con las acciones de Geanfranco. El destino (PP o Magdalena) es un campo aparte. |
| Documentos                     | Solo «docs enviados al agente», Sí o No                                                                         | Checklist con archivos                                                                         | Checklist de Geanfranco + el hito «enviados al agente de aduanas» de INROCARGAS, que apaga la alerta roja                                                                                                                                                                             |
| Productos                      | Texto libre + cantidad                                                                                          | Línea de OC con EXW, costo y cantidad recibida                                                 | Línea de OC real; INROCARGAS usaba texto porque el cuadro no traía ítems                                                                                                                                                                                                              |
| Costeo                         | Pendiente, Costeado o Muestra                                                                                   | Costeo versionado + `Es_Muestra` por línea                                                     | El de Geanfranco; «Muestra» sale de la línea                                                                                                                                                                                                                                          |
| Origen de la OC                | Lee el cuadro de aprobaciones (import desde la hoja)                                                            | Es la misma app                                                                                | **Se elimina el import**: el embarque nace de la OC aprobada de importación. El cuadro es una salida de INROCOMPRAS.                                                                                                                                                                  |
| Historial, choques y presencia | Sí: historial por campo, unión de cambios, «X está viendo esta OC»                                              | No                                                                                             | Lo traemos: es buena práctica y el equipo ya la usa                                                                                                                                                                                                                                   |
| Alertas                        | Llega en N días sin docs al agente, ETA vencida sin ATA, por costear, sin seguimiento, sin responsable          | No                                                                                             | Las traemos a la bandeja de Comex                                                                                                                                                                                                                                                     |
| Responsable de embarque        | Geydi, Gianfranco, Josué, Sebastián o Comex (por asignar)                                                       | No (`Creado_Por`)                                                                              | Lo traemos, con asignación                                                                                                                                                                                                                                                            |
| Migración de STATUS 2026       | POR UBICAR, «Revisar migración»                                                                                 | —                                                                                              | Solo en la transición; las 305 filas se migran con su `ID_OC`                                                                                                                                                                                                                         |

### 4.2 Conclusión

INROCARGAS no se duplica con INROCOMPRAS: **se convierte en su módulo «Embarques y desaduanaje»**. Entra la mitad logística de INROCARGAS (su pantalla, alertas, biblioteca de agentes, historial y vistas NEW STATUS). Entra la mitad aduanera y de costo de Geanfranco (checklist, DAM, levante, gastos, reparto y costeo versionado). Las dos cuelgan de la OC por `ID_OC`, sin leer el cuadro.

La clave `ID_OC = EMPRESA|OC|PROVEEDOR` de INROCARGAS se mantiene en la migración. En el SIDIGE esa clave corresponde a CODDOC + NUMDOC; eso se valida en el cruce con el SIDIGE.

---

## 5. Preguntas para Geanfranco (por documento; está de vacaciones)

1. **Demasías:** ¿aprueba primero Costos y después la GOP, como se dijo el 12/11, o solo la GOP, como está hoy en el AppSheet?
2. **Foto de ingreso con guía:** ¿la tenía pensada? ¿Dónde? ¿Le sirve la propuesta del §2?
3. ¿Un desaduanaje puede traer productos de varias OC con proveedores distintos, o solo líneas de la misma OC dueña?
4. ¿`OC_Padre` y `OC_Hija_Ref` implican que cada gasto de importación (flete, agente, almacén) tiene **su propia OC de servicio**? ¿Siempre, o puede haber gastos sin OC?
5. **Reparto «Producto» y «Valor»:** ¿«Producto» significa en partes iguales por línea o por cantidad? ¿«Valor» es por EXW o por FOB?
6. **FI** (factor de importación): ¿se calcula como costo total entre EXW?
7. Penalidad de 0.5 % por día con tope de 10 % y plazo de reposición de 15 días: ¿quién la aplica y en qué momento? ¿Se descuenta del pago al proveedor extranjero?
8. Moneda de la DAM: solo USD o EUR, pero existe TC en GBP y hay productos en GBP. ¿Falta GBP en la DAM?
9. **Posible error:** en `Des_Gastos`, el valor inicial de `Monto_Sin_IGV` es la fórmula del TC, y `TC_Costeo` no tiene fórmula. ¿Debería ser al revés?
10. **Posible error:** `Pagos.Factura_Subida` ahora nace en TRUE, y con eso el sustento por falta de factura deja de pedirse. ¿Es intencional?
11. Estados logísticos de Comex (producción, espera de zarpe, tránsito) frente a los estados aduaneros: ¿está de acuerdo con la línea única del §4.1?

## 6. Siguientes pasos

1. Registrar los casos nuevos en `CASUISTICAS.md` (hecho: C-07 a C-12).
2. Mockup v8 con el módulo «Embarques y desaduanaje» unificado (§4) y el resto de la tabla del §3. Antes, **leer la versión publicada**, porque Geanfranco es editor.
3. Mandarle a Geanfranco las preguntas del §5 por documento.
4. Después, el cruce de tablas con el SIDIGE (OCE, DAM y costeo) y el handoff a Roberto.
5. Etapa posterior: archivos a Drive y correlativos por nuestro lado donde el SIDIGE no llegue.
