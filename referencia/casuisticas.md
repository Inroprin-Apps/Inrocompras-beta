# INROCOMPRAS: registro de casuísticas

Este registro sirve para que ningún caso se pierda. Cada caso queda con su origen y su estado. Antes de salir a producción, cada uno debe estar en el prototipo y en la corrida de pruebas integrales de Roberto.

Estados: **En prototipo** · **Por construir** · **Por definir** (falta una regla de negocio).

Las reglas que ya vienen del AppSheet están en `REGLAS_AppSheet_desde_Listas.md`. La comparación entre AppSheet, SIDIGE e INROCOMPRAS está en `AUDITORIA_AppSheet_SIDIGE_INROCOMPRAS.md`. Aquí se anotan los casos nuevos o los que cambian.

---

## Reunión del 12/11/2026

Asistentes: Camila García Rosell, Roberto Chávez, Geanfranco Zeppilli y Tomás.

### C-01 · Demasías: nuevo flujo en el AppSheet de Geanfranco — En prototipo (v8)

- **Decisión 17/11 (Tomás):** se aplica la regla del AppSheet, donde decide solo la GOP. El paso previo de Costos queda en espera.
- **Antes:** se mandaba un correo, Rodrigo aprobaba y se subía al legajo.
- **Ahora**, en cada ítem de la OC se pregunta «¿Considera demasía?».
  - **No:** la orden sigue su flujo normal.
  - **Sí:** se ingresa la cantidad de demasía y la OC entra en una ruta de aprobación distinta. Primero aprueba **Costos** y después **Rodrigo**.
- Rodrigo tiene dos opciones:
  - **Aprobar sin demasías:** el sistema borra la línea de demasía y la OC sale como la original.
  - **Aprobar con demasías:** la OC sale con **dos líneas**, una con lo del RQ y otra con la demasía aprobada.
- Rodrigo es la **GOP** (confirmado por Tomás el 12/11). Coincide con la auditoría («aprobación GOP»); lo nuevo es que antes aprueba Costos.
- Origen: Heidi le hizo ver el caso a Geanfranco.

### C-02 · Costo que llega después de cerrar el costeo de importación — Por definir (Contabilidad + Importaciones)

- **Ejemplo:** una multa u otro costo que llega después de que Importaciones cerró el costeo (desaduanaje, transporte, almacenaje) y ya se lo entregó a Contabilidad.
- **Regla preliminar de Contabilidad:**
  - si llega **dentro del mes**, se reabre el costeo y se suma;
  - si llega **fuera del mes**, ya no entra al costeo y pasa como gasto aparte.
- Aun como gasto aparte, debe quedar **ligado a la OC o al ítem** afectado, según su naturaleza.
- **Falta definir:** si se puede reabrir un costeo cerrado y cómo se contabiliza fuera del mes.
- Antes no se registraba y pasaba directo como gasto. Geanfranco pidió que este caso lo vea el lado contable, o sea Tomás.

### C-03 · Servicio cuyo resultado es un producto — Por construir

- **Ejemplo:** la impresión de banners y otros casos de pedagogía.
- **Regla:** toda impresión se compra como **servicio**. Contabilidad, sin embargo, quiere que Almacén la ingrese al **Kardex**, y un servicio no entra al Kardex.
- **Solución manual de hoy:** el RQ lleva el SKU del servicio y, en el detalle, el SKU del producto, para que Michel lo ingrese a su Kardex.
- **En el SIDIGE ya existe** (Roberto lo usa en la maquila para clientes): la OC lleva varios ítems en el detalle.
  - El **ítem de servicio** es el objeto de costo.
  - Los **ítems de producto** son los bienes que se mueven entre almacenes.
- **En el prototipo:** la OC de servicio debe poder llevar ítems de producto resultantes, que alimenten «Por ingresar» y el Kardex. Debe migrar igual al SIDIGE.

### C-04 · Pagos: comunicación en ambos sentidos con la herramienta de pagos — Por construir (va el 1 de enero)

- **De Compras a pagos:** la OC entrega los datos para generar el pago.
- **De pagos a Compras:** vuelve el estado (pagado, observado) para actualizar el estatus de la OC y avisar al proveedor.
- Es la app de pagos de **Franco**, analista de Finanzas, que la desarrolló él mismo. Franco no es Geanfranco.
- Es parte del alcance del 1 de enero.

### C-05 · Ingreso de mercadería — Puede ir después del 1 de enero

- Mientras tanto se usa el Kardex de Michel o el SIDIGE.

### C-06 · Importaciones: la parte más compleja — Por definir (Geanfranco y Heidi)

- La emisión de la OC es igual que en Compras nacionales.
- Lo complejo:
  - el desaduanaje;
  - el costeo;
  - asignar un gasto a varias OC;
  - el estatus del embarque.
- Heidi y su equipo ya vieron el AppSheet. Geanfranco pide que piensen en «todas las posibilidades, aunque sea una en un millón».

---

## AppSheet v2 e INROCARGAS (17/11/2026)

Análisis completo en `ANALISIS_AppSheet_v2_e_INROCARGAS.md`.

### C-07 · Desaduanaje con ciclo de estados y checklist documental — En prototipo (v8)

- Borrador → Documentos completos → DAM numerada → Llegada → Levante → En almacén → Costeo cerrado. Cada paso tiene una acción con su fecha.
- Checklist: factura comercial, BL o AWB, certificado de origen, seguro y, si aplica, permiso de MTC o DIGESA. Un documento cuenta con el check o con el archivo subido.

### C-08 · Gastos de importación con catálogo, reparto y OC hija — Por construir

- Cada concepto dice si entra al costo y si se reparte por producto o por valor. Se usa un TC de costeo con vigencia.
- Los comprobantes pueden ser factura, NC, ND, liquidación SUNAT/DAM o recibo.
- Cada gasto se amarra a su OC hija de servicio (`OC_Hija_Ref`, `OC_Padre`).

### C-09 · Costeo versionado con reapertura — En prototipo (v8) (responde en parte a C-02)

- Al cerrar el costeo se guarda una versión en el historial: quién, cuándo, EXW unitario, FI y costo unitario por producto.
- La reapertura pide motivo. Falta la regla contable de dentro y fuera del mes (C-02).

### C-10 · Embarque con líneas de varias OC — En prototipo (v8.1; confirmado por Geanfranco el 17/11)

- En el AppSheet, `Des_Productos` tiene su propio `OC_Ref`. En INROCARGAS, la consolidación se ve por referencia compartida del agente.

### C-11 · OC de importación: incoterm, plazo de reposición, penalidades, «Sin IGV» y proveedor extranjero — En prototipo (v8)

- Valores por defecto: 15 días de reposición, penalidad de 0.5 % por día y tope de 10 %.
- La procedencia exige un proveedor del origen que corresponda. El proveedor extranjero lleva SWIFT, IBAN, ABA y banco intermediario.

### C-12 · Foto de la guía al ingreso a almacén — En prototipo (v8) (no está en el AppSheet)

- Almacén toma la foto de la guía firmada y registra la cantidad recibida por ítem y las incidencias.
- Al guardar, se crea la guía en el legajo y se marca «En almacén».

### C-13 · INROCARGAS pasa a ser el módulo «Embarques» de INROCOMPRAS — En prototipo (v8)

- Es el seguimiento logístico: responsables, ETD/ETA/ATA, agentes con biblioteca y RUC, alertas e historial.
- Deja de leer el cuadro de aprobaciones: nace de la OC aprobada.
- Se migran las 305 filas de embarques con su `ID_OC`.

---

## Pendientes de fuentes que alimentan este registro

- **Correo de Roberto del 28/10/2026, «Pruebas integrales de la app de compras»:** es la lista de pruebas para no dejar casos fuera. Hay que conseguirlo y cruzarlo con este registro.
- **PDF de Geanfranco:** el flujo completo con casuísticas, variables, idas y vueltas e importaciones, más una copia nueva del AppSheet. Lo mandará hasta el domingo 15/11.
- **Reunión de cierre** de Geanfranco con Heidi, el viernes. La agenda Geanfranco.
- **Pendiente desde antes:** repasar las 241 acciones y las 87 automatizaciones del PDF del AppSheet.

---

## Respuestas de Geanfranco (17/11/2026, por WhatsApp) y costeo real

Fuente: `D:\Downloads\COSTEO FINAL OC 2608-0006 2608-0002.xlsx`. Tiene tres formatos: EURO, DÓLAR y COURIER. La hoja COURIER es un envío DHL con productos de las órdenes 2608-0002 y 2608-0006.

1. **Varias órdenes en un desaduanaje:** se puede, aunque sean de distintos proveedores, e incluso parcial. → C-10 queda **definido** y está en prototipo.
2. **OC de los gastos:** todo gasto de desaduanaje lleva su OC, salvo el de una muestra. → El prototipo muestra la «OC de servicio» de cada comprobante y una alerta «Gasto sin OC».
3. **Reparto:** siempre por valor del producto. Las muestras no se costean. En el Excel:
   - factor = EXW del producto ÷ EXW total;
   - cada gasto × factor, sin importar el concepto.
4. **FI:** (costo del producto + gastos de importación) ÷ costo del producto.
   - En el Excel: FI = (EXW en S/ + gastos en S/) ÷ EXW en S/.
   - Costo unitario = EXW unitario × FI.
   - El TC se fija por costeo (USD 3.88, EUR 4.081).
5. **Reposición:** primero el reclamo; recién con el reclamo se pide la reposición al proveedor. → En el prototipo: «Registrar reclamo y pedir reposición», con vencimiento a los 15 días. **Sigue sin definir** cómo se aplica la penalidad del 0.5 % por día.
6. **GBP:** hay pocos productos en libras, pero existen. → Se agrega el TC en GBP al costeo.
7. **Errores de Des_Gastos y Pagos:** en lugar de responder, mandó el Excel de costeo. Las preguntas 7 y 8 (posibles errores del AppSheet) **siguen abiertas**.
8. **Foto de la guía:** no respondió. Se mantiene la propuesta del prototipo.
9. **Estados:** Tiempo de producción → ETA y ETD → Status → Documentos completos → N° de DAM → Canal de control → Costeo cerrado. → Aplicado tal cual en el prototipo (7 pasos).
   - El ingreso a almacén con foto va aparte, a cargo de Almacén. Se habilita después del canal de control (levante).
   - **Por confirmar:** si el costeo puede cerrarse antes de que Almacén registre el ingreso. Hoy el prototipo lo permite con un aviso.

### C-14 · El requerimiento nace en el SIDIGE (PCP) y el generador de SKU de Roberto — Validado en INROPLAS (17/11/2026)

- **INROPLAS, base [servidor real], solo lectura:**
  - 360 RQ en 2026, emitidos sobre todo por Andrea Manchego (195) y Denver Mendoza (113). Falta confirmar que son de PCP.
  - Ciclo completo en el SIDIGE: RQFC facturado 247, RQCOM comprado 45, RQIN ingresado 27, RQSAC aprobado por jefatura 26, RQAN anulado 15.
  - El 94 % de las líneas de OCN de 2026 (748 de 795, en 302 OC) apuntan a una línea de RQ (TIPDOC_P = 'RQ').
- **INROPRIN:** en la copia de [servidor real] solo hay 34 RQ (2024–2025) y ninguno de 2026. La base viva está en la nube del proveedor, sin acceso de lectura. **No se puede validar todavía.**
- **Generador de SKU** (módulo m02 de la app de Roberto, [servidor de apps]):
  1. Se pide el artículo (almacén, clase, cliente, unidad y descripción) y queda en `DB_CENTRAL.PreRegArt` con estado 1 más un correo.
  2. El administrador lo revisa y llama a `{base}.dbo.sp_CrearArticulo`, el procedimiento oficial del SIDIGE, que devuelve el código generado.
  3. La solicitud queda en estado 2 con su código.
  - Hay 749 solicitudes, todas para **INROPLAS** (711 creadas y 38 en estado 3). Para INROPRIN no se ha usado; el código ya acepta la base de destino como parámetro.
- **Conclusión:** INROCOMPRAS **no emite** el RQ ni crea SKU. Lee el RQ del SIDIGE (`MOVCABE1RQ` / `MOVDETE1RQ`, línea por línea) y desde ahí genera la OC. Con eso desaparece el Excel que hoy manda PCP, que duplica lo que ya cargó en el SIDIGE.
- **Pendiente:**
  - Confirmar con Roberto que INROPRIN también emitirá los RQ en el SIDIGE y usará el generador.
  - Conseguir acceso de lectura a la base viva de INROPRIN.
  - Decidir si la «Solicitud» del AppSheet sigue existiendo o si el área le pide directamente a PCP.

---

## Reunión con Compras del 18/11/2026 (audio transcrito) + Plan de compras de Ciro Alegría + Formato de PO de Geydi

Transcripción automática en `Reunion_compras_18-11-2026_transcripcion.txt`; tiene errores de reconocimiento, así que cada punto debe confirmarse antes de construirlo.

**Confirmado en la reunión**

- **Requerimientos en el SIDIGE:** Gerencia (Liliana, con respaldo de Rubio y Roberto) ya le indicó a PCP que use el SIDIGE para los requerimientos, en las dos empresas. Inroplas ya trabaja así: requerimiento en el SIDIGE → SKU → orden de compra.
- **INROCARGAS** vivirá dentro de INROCOMPRAS.
- **PDF de la orden:** sale del formato estándar del SIDIGE (Roberto).
- **Permisos:** Compras nacionales no ve aduana ni embarques.
- **Uso real del AppSheet de Geanfranco:** hoy solo se usa para el **desglose** (técnica valida los accesorios con Compras y luego el cliente). La creación de órdenes en el AppSheet no está en uso (avance de 60–70 %, previsto para 2027). **Hoy la orden se hace en un Excel** (el formato de PO de Geydi).

**Casos nuevos**

- **C-15 · Saldo del requerimiento por ítem.** Una orden puede tomar 90 de los 100 ítems de un requerimiento. Hay que ver qué falta comprar (el AppSheet lo mostraba). Se propuso un «carrito» de ítems pendientes y una alerta de requerimiento abandonado (por ejemplo, 3 o 4 días sin acción; idea de Heidi).
- **C-16 · Validación técnica por ítem.** En Inroprin es obligatoria: sin ella no aprueba nadie, ni Finanzas. Técnica registra marca y modelo, y las consultas con el proveedor van y vuelven hasta quedar validado. En el plan aparece como «Enviado a TICS» y «Fecha de validación de ficha».
  - Si el producto está descontinuado, vuelve a PCP, que lo emite de nuevo con **otro código**. La línea vieja queda archivada, así que hace falta historial del reemplazo.
- **C-17 · Plan de compras por proyecto.** Lo arma la hoja «Plan de compras v2» de Ciro Alegría:
  - criticidad según el plazo, fecha límite de la OC, semana programada y meta semanal;
  - presupuesto base frente a lo proyectado y lo ejecutado;
  - desembolso programado frente al real;
  - desglose de accesorios desde el AppSheet;
  - alertas de carga A1 a A9.
  - Falta decidir si el plan vive en la app o sigue en Sheets; el equipo está acostumbrado a Sheets. Tomás intentará llevarlo a la app, porque además da el centro de costo.
- **C-18 · Visor de consulta por proyecto y producto, solo lectura.** Para PCP, Almacén, técnica y otras áreas: código, nombre, cantidad, OC, estado (aprobada o pagada), cuándo llega, marca y modelo, y legajo. Busca bajar las consultas del tipo «¿ya lo compraste?» o «¿cuándo llega?».
- **C-19 · Nota de crédito que obliga a modificar la orden.** Si se devuelve un producto, Finanzas pide ajustar la OC (por ejemplo, de 2,000 a 1,200) y rehacer el PDF. El legajo debe guardar la versión anulada y la vigente. Es poco frecuente (alrededor del 0.1 %). Compras opina que no debería modificarse; queda por definir con Finanzas y Contabilidad.
- **C-20 · Términos del contrato de la PO.** Vienen del formato de PO de Geydi, que tiene versión interna y versión en inglés para el proveedor:
  - garantía, especificaciones al 100 %, y fotos y video antes de liberar la carga;
  - **pago del 60 % contra la aprobación de las fotos** (no contra el BL);
  - **penalidad del 0.1 % por día**, con resolución del contrato si el atraso pasa de 30 días (el AppSheet usa 0.5 %);
  - cargos de _packing_ y _shipping_ como líneas de la PO.
  - La plantilla mostró el proyecto «CHINA CIVIL PAQ 02» en la versión del proveedor, que es un dato que quedó de otra orden: es un riesgo del Excel manual.
- **C-21 · Empresas, monedas y formas de pago.**
  - 6 empresas en el formato de Geydi (INROMEMOS maneja 20).
  - Monedas: PEN, USD, EUR, GBP, MXN, CLP y BRL.
  - Formas de pago además de las 7 del AppSheet: cheque diferido, neteo, 100 % antes del embarque, entre otras.
- **C-22 · Tres códigos por ítem:** código del cliente o proyecto (EQU-…, COMPL-…), código SIDIGE (ME00…) y la descripción del proveedor.
- **C-23 · Robot del legajo.** Todos los días revisa la carpeta de cada orden y avisa qué falta. Se puede reutilizar «Carpetas de OC» de INROCONTA.
- **C-24 · Costeo en beta.** Al principio el costeo automático sale como reporte Excel para que Comex lo revise. Gerencia quiere ver el costo de importación valorizado.
- **C-25 · Seguimiento de envíos (después).** Seguimiento automático por número de guía de courier (Olva, DHL…). No aplica a todos los proveedores.

**Dudas nuevas**

- ¿Qué es «OC subida a SUNAT» (alerta A9 del plan)?
- ¿Quién hace la «validación financiera» que aparece antes de la OC en el seguimiento de nacionales, y es distinta de la de Control de Gestión?
- ¿Quién es «TICS»?
- ¿Qué penalidad vale: 0.1 % (PO) o 0.5 % (AppSheet)?
- ¿El plan de compras va en la app o en Sheets?

## C-26 Compra por error (v10, 18/11/2026)

Hipotéticos cubiertos:

1. Detectado antes de recibir → modificar o anular la orden (flujo existente).
2. Recibido y se devuelve → "Esperando nota de crédito"; al llegar la NC, Compras registra N° y monto, la orden pasa a versión nueva (la anterior queda anulada en el legajo) y el caso se cierra.
3. Se queda pero no sirve al proyecto → pasa a stock u otro proyecto; su costo sale del proyecto.
4. No se puede devolver ni usar → pérdida asumida por el proyecto (queda en el costo).
5. Recompra: la línea recupera saldo; nueva orden con el mismo SKU (o línea de reemplazo con SKU nuevo vía PCP si es otro modelo). Una línea puede tener varias órdenes.
   Pendiente de confirmar: si la NC que baja el monto requiere reaprobación (hoy no).

## Comex (respuestas de Geanfranco, 19/11/2026) — en el BPMN v8

- Muestras antes de ganar: Compras con su proceso normal (nacional o importado), CC de evaluación; costo de adquisición. Fase 0.
- DAM consolidada: varias OC y proveedores, misma empresa siempre; la carpeta vive en la DAM (no mover a la OC de mayor valor).
- Agente de aduanas: OC global estimada + N facturas enlazadas; alerta si se excede; cierre de saldo. Seguro de tabla no se registra.
- Tributos SUNAT: propuesta sin OC, desde la liquidación de la DAM (por confirmar con Importaciones).
- Reparto: ad valorem por serie de la DAM; resto por valor (cant × precio OC × TC), muestras INCLUIDAS (decisión del usuario). Si una muestra lleva mucho gasto, el cálculo está por línea/cantidad: corregir.
- FI = (EXW S/ + gastos de costo S/) / EXW S/; sin IGV, IPM, percepción, comisiones ni dif. de cambio.
- GBP en Moneda_DAM; CG debe cargar TC de costeo GBP; bloquear si falta TC.
- TC de costeo: se congela al numerar la DAM (decidido; informar a Geydi).
- Estados: carga y trámite como dos estados en paralelo; usar códigos para bot/script.
- Penalidades (0.5 %/día, tope 10 %, reposición 15 días): PENDIENTE con Geydi, Importaciones y Finanzas.
