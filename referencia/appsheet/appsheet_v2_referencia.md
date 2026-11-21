# Referencia del AppSheet v2 de Geanfranco (extraída por máquina)

Fuente: `Application Documentation v2.pdf` (17/11/2026), app «prueba más importaciones».
El texto viene de un PDF: algunas palabras traen un espacio partido (p. ej. «Bas eType»). Las fórmulas son AppSheet tal cual.
Se redactaron URLs, correos e ids largos. Los bots NO traen su lógica en la documentación.

## Tabla `Listas` · ALL_CHANGES

### Columnas

- **\_RowNumber** [Number] · solo lectura · CLAVE
- **Estatus Compra** [Text]
- **Procedencia** [Text]
- **Unidad de negocio** [Text]
- **Moneda original** [Text]
- **Forma de pago** [Text]
- **Tipo de aprobación** [Text]
- **Aprobación (estado)** [Text]
- **Condición** [Text]
- **Tipo_Pago** [Text]
- **Criterio observación finanzas** [Text]
- **Aprobación Ppto** [Text]
- **Conceptos** [Text]

### Acciones

- **Delete** (DELETE_RECORD)
- **Edit** (EDIT_RECORD)
- **Add** (ADD_RECORD)

## Tabla `OC` · ADDS_AND_UPDATES

### Columnas

- **\_RowNumber** [Number] · solo lectura
- **VB C. GESTION** [Yes/No] · Show_If: =IN([_MiArea], LIST("Control de Gestión
- **OC** [Text] · fórmula =LOOKUP([_THISROW].[ID_OC], "OC_Docs", "ID_OC", "N_OC") Read-Only No Hidden No Label No Formula version 0
- **Estatus Compra** [Enum] · inicial ="Borrador"
- **Comprador** [Text] · inicial =LOOKUP(USEREMAIL(), "Usuarios", "Email", "Nombre") · Editable_If: = [Estatus Compra] = "Borrador
- **N° Requerimiento** [EnumList] · fórmula =SELECT(Requerimientos[N° RC], IN([ID_Req], [_THISROW]. [Reqs_Lista])) Read-Only No Hidden No Label No Formula version 0
- **Procedencia** [Enum] · enum ["Nacional","Importación"]
- **Unidad de negocio** [Enum] · enum ["Inroprin","Inroplas","CONSORCIO INROPRIN - PUCP"]
- **Fecha** [Date] · inicial TODAY() · Editable_If: =CONTE XT("ViewType") <> "Form
- **Proveedor** [Text] · fórmula =[Proveedor_Ref].[RAZON SOCIAL] Read-Only No Hidden No Label No Formula version 0 · Show_If: =CONTEXT("ViewType") <> "Form
- **Proyecto** [Enum] · fórmula =ANY(SELECT(Base de datos OC NAC[PROYECTO], [OC_Ref] = [_THISROW].[ID_OC])) Read-Only No Hidden No Label No Formula version 0
- **Concepto** [Enum]
- **Link de la carpeta OC** [Url] · fórmula =LOOKUP([_THISROW].[ID_OC], "OC_Docs", "ID_OC", "Link_Carpeta") Read-Only No Hidden No Label No Formula version 0 · Editable_If: =[_MiArea] = "Compras
- **Monto** [Decimal] · fórmula =([_Subtotal] - [Descuento]) * IF([Tipo_Impuesto] = "IGV", 1.18, 1) Read-Only No Hidden No Label No Formula version 0
- **Moneda original** [Enum] · enum ["PEN","USD","EUR","GBP"]
- **Monto en Soles** [Decimal] · fórmula =[Monto] * LOOKUP([Moneda original], "Tipo_Cambio", "Moneda", "Tasa_a_Soles") Read-Only No Hidden No Label No Formula version 0
- **Tipo de aprobación** [Enum] · enum ["Aprobación Única","Aprobación Conjunta","Pre Aprobado","Aprobado"] · fórmula =IFS( ISBLANK([Monto en Soles]), "", [Aprobación Ppto] = "Pre Aprobado", "Pre Aprobado", IN([Aprobación Ppto], LIST("No presupuestado", "Excede Presupuesto")), "Aprobación Conjunta", TRUE, ANY(SELECT(Reglas_Aprobacion[Ruta], AND( OR([Tipo_Compra] = "Todos", [Tipo_Compra] = [_THISROW]. [_Tipo_Compra]), [_THISROW].[Monto en Soles] >= [Monto_Desde], OR(ISBLANK([Monto_Hasta]), [_THISROW]. [Monto en So
- **Forma de pago** [Enum] · enum ["Contado","Crédito","Adelanto","Tarjeta de crédito","Caja chica","Contra Entrega","Letra"]
- **% adelanto** [Percent] · inicial 0 · Show_If: =[Forma de pago] = "Adelanto · Editable_If: =[_MiArea] = "Compras
- **Días de crédito** [Number] · Show_If: = [Forma de pago] = "Crédito · Editable_If: = [_MiArea] = "Compras
- **Condición** [Enum] · enum ["Normal","Urgente"]
- **Aprobación Ppto** [Enum] · enum ["Adm","No presupuestado","Excede Presupuesto","Preinversion","Presupuestado","Observado","Anula r OC","Pre Aprobado","Subsanado"]
- **Aprobación GOP** [Enum] · enum ["Pendiente","Aprobado","Rechazado","Observado"]
- **Aprobación GAF** [Enum] · enum ["Pendiente","Aprobado","Rechazado","Observado"]
- **Check Aprobació** [Yes/No] · Show_If: =IN([_MiArea], LIST("Control de Gestión
- **Check Control Gestión** [Yes/No] · Show_If: =IN([_MiArea], LIST("Control de Gestión
- **Estado de Aprobación3** [Text] · fórmula =IFS( OR([Aprobación Ppto]="Observado", [Aprobación GOP]="Observado", [Aprobación GAF]="Observado"), CONCATENATE("Observado por ", TRIM(CONCATENATE( IF([Aprobación Ppto]="Observado","Ppto ",""), IF([Aprobación GOP]="Observado","GOP ",""), IF([Aprobación GAF]="Observado","GAF ","") )) ), OR([Aprobación Ppto]="Anular OC", [Aprobación GOP]="Rechazado", [Aprobación GAF]="Rechazado"), "Rechazado", [Apr · Show_If: =ISNOTBLANK([Estado de Aprobación3])
- **Observación finanzas** [Enum] · enum ["Observado","Subsanado"]
- **Criterio de observación finanzas** [Text] · Editable_If: =[_MiArea] = "Finanzas
- **LEGAJO PARA PAGO** [Yes/No]
- **OC CERRADA** [Yes/No] · Show_If: =[_MiArea] = "Compras · Editable_If: =[_MiArea] = "Compras
- **Cuadro de pagos** [Text]
- **Comentarios compras** [Text] · Editable_If: = [_MiArea] = "Compras
- **UBICACIÓN** [Text]
- **SUSTENTO DEL EXCESO PARA LA BD** [Text]
- **Concatenado** [Text]
- **ID_OC** [Text] · inicial =UNIQUEID() · solo lectura · CLAVE
- **Marca_Temporal** [DateTime] · inicial NOW()
- **RUC_Proveedor** [Text] · inicial =[Proveedor_Ref].[RUC] · Editable_If: = [_MiArea] = "Compras · Reset_If: =[Estatus Compra] = "Borrador
- **Fecha_Aprobacion** [Date]
- **Fecha_Legajo** [Date]
- **Fecha_Observacion** [Date]
- **Fecha_Subsanacion** [Date]
- **Observacion_Levantada** [Yes/No] · Show_If: =[_MiArea] = "Finanzas · Editable_If: =[_MiArea] = "Finanzas
- **Es_Credito** [Yes/No] · Editable_If: =[_MiArea] = "Compras
- **Fecha_Limite_Factura** [Date] · Editable_If: = [_MiArea] = "Compras
- **Tipo_Pago** [Enum]
- **Fecha_Pago_Adelanto** [Date]
- **Monto_Adelanto** [Decimal]
- **Fecha_Pago_Saldo** [Date]
- **Monto_Saldo** [Decimal]
- **Fecha_Pago_Total** [Date]
- **Modificada_Tras_Aprobada** [Yes/No]
- **Fecha_Ultima_Modificacion** [DateTime]
- **Registrado_Por** [Text] · inicial =USEREMAIL() · solo lectura
- **Estado_Previo_Obs** [Text]
- **Proveedor_Ref** [Ref] · ref→Base de datos Proveedores
- **Prov_Direccion** [Text] · inicial =[Proveedor_Ref].[DIRECCIÓN] · Reset_If: =[Estatus Compra] = "Borrador
- **Prov_Contacto** [Text] · inicial =[Proveedor_Ref].[CONTACTO] · Reset_If: =[Estatus Compra] = "Borrador
- **Prov_Telefono** [Text] · inicial =[Proveedor_Ref].[TELEFONO] · Reset_If: =[Estatus Compra] = "Borrador
- **Prov_Correo** [Text] · inicial =[Proveedor_Ref].[CORREO] · Reset_If: =[Estatus Compra] = "Borrador
- **Prov_Banco** [Text] · fórmula =IFS( [Moneda original]=[Proveedor_Ref].[MONEDA], [Proveedor_Ref].[BANCO], [Moneda original]=[Proveedor_Ref]. [MONEDA 2], [Proveedor_Ref].[BANCO 2] ) Read-Only No Hidden No Label No Formula version 0 · inicial =[Proveedor_Ref].[BANCO]
- **Prov_Moneda_Cta** [Text] · inicial =[Proveedor_Ref].[MONEDA] · Reset_If: =[Estatus Compra] = "Borrador
- **Prov_NumCta** [Text] · fórmula =IFS( [Moneda original]=[Proveedor_Ref].[MONEDA], [Proveedor_Ref].[NÚMERO DE CTA], [Moneda original]= [Proveedor_Ref].[MONEDA 2], [Proveedor_Ref].[NÚMERO DE CTA 2] ) Read-Only No Hidden No Label No Formula version 0 · inicial =[Proveedor_Ref].[NÚMERO DE CTA] · Reset_If: =[Estatus Compra] = "Borrador
- **Prov_CCI** [Text] · fórmula =IFS( [Moneda original]=[Proveedor_Ref].[MONEDA], [Proveedor_Ref].[CCI], [Moneda original]=[Proveedor_Ref]. [MONEDA 2], [Proveedor_Ref].[CCI 2] ) Read-Only No Hidden No Label No Formula version 0 · inicial =[Proveedor_Ref].[CCI] · Reset_If: =[Estatus Compra] = "Borrador
- **Prov_CtaDetraccion** [Text] · inicial =[Proveedor_Ref].[CTA DETRACCIÓN] · Reset_If: =[Estatus Compra] = "Borrador
- **Prov_CondicionComercial** [Text] · inicial =[Proveedor_Ref].[CONDICION COMERCIAL] · Reset_If: =[Estatus Compra] = "Borrador
- **Tipo_Documento** [Enum]
- **Tipo_Impuesto** [Enum] · enum ["IGV","IR","Exonerado","Sin IGV"] · inicial =IF([Procedencia] = "Importación", "Sin IGV", "IGV")
- **Correlativo_OC** [Number] · solo lectura
- **Req_Ref** [Ref] · ref→Requerimientos
- **Fecha_Limite_Pago** [Date] · inicial =TODAY() + [Días de crédito] · Show_If: =AND([LEGAJO PARA PAGO]=TRUE, IN([Forma de pago], LIST("Crédito · Required_If: =AND([LEGAJO PARA PAGO]=TRUE, IN([Forma de pago], LIST("Crédito
- **Entrega_Total** [Yes/No] · inicial =TRUE · Show_If: =AND([LEGAJO PARA PAGO]=TRUE, IN([Forma de pago], LIST("Contra Entrega · Required_If: =AND([LEGAJO PARA PAGO]=TRUE, IN([Forma de pago], LIST("Contra Entrega
- **Monto_a_Registrar** [Decimal] · Show_If: =AND([LEGAJO PARA PAGO]=TRUE, IN([Forma de pago], LIST("Contra Entrega · Required_If: =AND([LEGAJO PARA PAGO]=TRUE, IN([Forma de pago], LIST("Contra Entrega
- **Reqs_Lista** [EnumList] · ref→Requerimientos
- **Lugar de entrega** [Enum] · enum ["Jirón Cusco 365 - Magdalena del Mar","Av. Copacabana Mz. K Lote 137 Urb. Leoncio Prado Puente Piedra","Según Coordinación"]
- **Descuento** [Decimal] · inicial =0
- **PDF_Interna_TS** [DateTime]
- **PDF_Proveedor_TS** [DateTime]
- **Fecha_Emision** [DateTime]
- **Emitido_Por** [Email]
- **CG_Por** [Email]
- **CG_Fecha** [DateTime]
- **GOP_Por** [Email]
- **GOP_Fecha** [DateTime]
- **GAF_Por** [Email]
- **GAF_Fecha** [DateTime]
- **Motivo_Aprob** [Text]
- **Anul_Motivo** [Text] · Show_If: =ISNOTBLANK([Anul_Motivo])
- **Anul_Solicitada_Por** [Text] · Show_If: =ISNOTBLANK([_THIS])
- **Anul_Fecha_Sol** [DateTime]
- **Anul_Aprobada_Por** [Text] · Show_If: =ISNOTBLANK([_THIS])
- **Anul_Fecha_Apr** [DateTime]
- **Estado_Previo_Anul** [Text]
- **Revision** [Number] · inicial =0
- **Mod_Motivo** [LongText]
- **Mod_Por** [Email]
- **Mod_Fecha** [DateTime]
- **Monto_Antes_Mod** [Decimal]
- **Moneda_Antes_Mod** [Text]
- **FormaPago_Antes_Mod** [Text]
- **Estado_Previo_Mod** [Text]
- **Correo_Envio** [Email] · Show_If: =CONT EXT("ViewType") <> "Form
- **Envio_Solicitado** [DateTime]
- **Fecha_Envio_Prov** [DateTime]
- **Enviado_A** [Text] · Show_If: =CONTEXT("ViewType") <> "Form
- **OC_Padre** [Text]
- **Des_Ref** [Text]
- **Incoterm** [Enum] · enum ["EXW","FOB","CIF","FCA","CFR","DAP","DDP"]
- **Plazo_Reposicion_Dias** [Number] · inicial =15 · Show_If: = [Procedencia] = "Importación · Editable_If: =[Estatus Compra] = "Borrador
- **Penalidad_Pct_Dia** [Decimal] · inicial =0.5 · Show_If: =[Procedencia] = "Importación · Editable_If: =[Estatus Compra] = "Borrador
- **Penalidad_Tope_Pct** [Decimal] · inicial =10 · Show_If: =[Procedencia] = "Importación · Editable_If: =[Estatus Compra] = "Borrador
- **Referencia_Prov** [Text] · Show_If: =[Procedencia] = "Importación · Editable_If: =[Estatus Compra] = "Borrador
- **\_MiArea** [Text] · fórmula =LOOKUP(USEREMAIL(), "Usuarios", "Email", "Área") Read-Only Yes Hidden No Label No Formula version 0 · solo lectura
- **Related Pagos** [List] · ref→Pagos · fórmula =SELECT(Pagos[ID_Pago], AND([OC Ref] = [_THISROW].[ID_OC], [Estado_Pago] <> "Anulado")) Read-Only Yes Hidden No Label No Formula version 0 · Show_If: = [Estatus Compra] <> "Borrador · solo lectura
- **\_Etiqueta_OC** [Text] · fórmula =CONCATENATE([OC], " - ", IF(ISBLANK([Proveedor]), "?", [Proveedor]), " - ", IF(ISBLANK([Proyecto]), "?", [Proyecto]), " - ", IF(ISBLANK([Unidad de negocio]), "?", [Unidad de negocio])) Read-Only Yes Hidden No Label Yes Formula version 0 · solo lectura
- **Total_Pagado** [Decimal] · fórmula =SUM(SELECT(Pagos[Monto_Pago], AND([OC Ref] = [_THISROW].[ID_OC], [Estado_Pago] = "Pagado"))) Read-Only Yes Hidden No Label No Formula version 0 · Show_If: =NOT(IN([Estatus Compra], LIST("Borrador · solo lectura
- **Saldo** [Decimal] · fórmula =[Monto] - [Total_Pagado] Read-Only Yes Hidden No Label No Formula version 0 · Show_If: =NOT(IN([Estatus Compra], LIST("Borrador · solo lectura
- **Related Base de datos OC NACs** [List] · ref→Base de datos OC NAC · fórmula =REF_ROWS("Base de datos OC NAC", "OC_Ref") Read-Only Yes Hidden No Label No Formula version 0 · solo lectura
- **\_Subtotal** [Decimal] · fórmula =SUM(SELECT(Base de datos OC NAC[COSTO TOTAL], [OC_Ref]=[_THISROW].[ID_OC])) Read-Only Yes Hidden No Label No Formula version 0 · solo lectura
- **Monto_Programado** [Decimal] · fórmula =SUM(SELECT(Pagos[Monto_Pago], AND([OC Ref] = [_THISROW].[ID_OC], IN([Estado_Pago], LIST("Solicitado","Programado","Pagado"))))) Read-Only Yes Hidden No Label No Formula version 0 · solo lectura
- **Saldo_por_Programar** [Decimal] · fórmula =[Monto] - [Monto_Programado] Read-Only Yes Hidden No Label No Formula version 0 · solo lectura
- **Semaforo_Programacion** [Text] · fórmula =IFS( [Monto_Programado]=0, " 🔴 Sin programar", [Saldo_por_Programar]<=0, " 🟢 Programada", TRUE, " 🟡 Parcial" ) Read-Only Yes Hidden No Label No Formula version 0 · Show_If: =NOT(IN([Estatus Compra], LIST("Borrador · solo lectura
- **\_Pagos_Sin_Factura** [Number] · fórmula =COUNT(SELECT(Pagos[ID_Pago], AND([OC Ref] = [_THISROW]. [ID_OC], [Estado_Pago] = "Pagado", NOT([Factura_Subida])))) Read-Only Yes Hidden No Label No Formula version 0 · solo lectura
- **\_Alerta_Factura** [Text] · fórmula =IFS( IN([Estatus Compra], LIST("Borrador","Pendiente de aprobación","Anulada","Anulación solicitada","En modificación")), "", STARTSWITH([Estatus Compra], "Observado"), "", COUNT(SELECT([Related Pagos][ID_Pago], [Estado_Pago] = "Pagado")) = 0, "", [_Pagos_Sin_Factura] > 0, CONCATENATE(" ⚠ ", [_Pagos_Sin_Factura], " pago(s) sin factura"), TRUE, " ✓ Facturas completas" ) Read-Only Yes Hidden No Lab · Show_If: =NOT(IN([Estatus Compra], LIST("Borrador · solo lectura
- **\_Empresa** [Ref] · ref→Empresas · fórmula =[Unidad de negocio] Read-Only Yes Hidden No Label No Formula version 0 · solo lectura
- **\_Total_OC** [Decimal] · fórmula =(SUM([Related Base de datos OC NACs][COSTO TOTAL]) - [Descuento]) * 1.18 Read-Only Yes Hidden No Label No Formula version 0 · solo lectura
- **\_Estado_Carpeta** [Text] · fórmula =LOOKUP([_THISROW].[ID_OC], "OC_Docs", "ID_OC", "Mensaje") Read-Only Yes Hidden No Label No Formula version 0 · Show_If: =ISNOTBLANK([_Estado_Carpeta]) · solo lectura
- **\_Tipo_Compra** [Text] · fórmula =IF([Procedencia] = "Importación", "Importación", LOOKUP( LOOKUP(ANY([Reqs_Lista]), "Requerimientos", "ID_Req", "Solicitud_Ref"), "Solicitudes", "ID_Solicitud", "Tipo_Solicitud")) Read-Only Yes Hidden No Label No Formula version 0 · solo lectura
- **\_MisRoles** [EnumList] · fórmula =SELECT(Aprobadores_OC[Rol], AND(LOWER([Email]) = LOWER(USEREMAIL()), [Activo])) Read-Only Yes Hidden No Label No Formula version 0 · solo lectura
- **\_Etapa** [Text] · fórmula =IFS( [Estatus Compra] <> "Pendiente de aprobación", "", OR(ISBLANK([CG_Por]), [Aprobación Ppto] = "Subsanado"), "CG", TRUE, "GERENCIA" ) Read-Only Yes Hidden No Label No Formula version 0 · solo lectura
- **\_PDF_Interna** [Url] · fórmula =LOOKUP([_THISROW].[ID_OC], "OC_Docs", "ID_OC", "PDF_Interna") Read-Only Yes Hidden No Label No Formula version 0 · solo lectura
- **\_PDF_Proveedor** [Url] · fórmula =LOOKUP([_THISROW].[ID_OC], "OC_Docs", "ID_OC", "PDF_Proveedor") Read-Only Yes Hidden No Label No Formula version 0 · solo lectura
- **\_Rol_Jefe** [Text] · fórmula =IF([Procedencia] = "Importación", "JEFE_COMPRAS_I", "JEFE_COMPRAS_N") Read-Only Yes Hidden No Label No Formula version 0 · solo lectura
- **\_Requiere_Reaprob** [Yes/No] · fórmula =OR([Monto] > [Monto_Antes_Mod], [Moneda original] <> [Moneda_Antes_Mod], [Forma de pago] <> [FormaPago_Antes_Mod]) Read-Only Yes Hidden No Label No Formula version 0 · solo lectura
- **Related Documentos_OCs** [List] · ref→Documentos_OC · solo lectura
- **\_Falta_Para_Emitir** [Text] · fórmula =IF([Estatus Compra] <> "Borrador", "", IFS( COUNT([Related Base de datos OC NACs]) = 0, " ⚠ Agrega al menos una línea", [Monto] <= 0, " ⚠ Pulsa Editar → Save para calcular el monto", AND(NOT(CONTAINS([Forma de pago], "Tarjeta")), COUNT(FILTER("Documentos_OC", AND([OC_Ref] = [_THISROW].[ID_OC], [Tipo_Doc] = "Cotización"))) = 0), " ⚠ Sube la cotización en Documentos", TRUE, " ✅ Lista para emitir" ) · Show_If: =[Estatus Compra] = "Borrador · solo lectura
- **\_EC_Titulo** [Show] · fórmula ="Estado de cuenta" Read-Only Yes Hidden No Label No Formula version 0 · solo lectura
- **\_EC_Facturado** [Decimal] · fórmula =SUM(SELECT(Documentos_OC[Monto_Doc], AND([OC_Ref] = [_THISROW].[ID_OC], [Tipo_Doc] = "Factura"))) - SUM(SELECT(Documentos_OC[Monto_Doc], AND([OC_Ref] = [_THISROW].[ID_OC], [Tipo_Doc] = "Nota de crédito"))) Read-Only Yes Hidden No Label No Formula version 0 · solo lectura
- **\_EC_Por_Facturar** [Decimal] · fórmula =[Monto] - [_EC_Facturado] Read-Only Yes Hidden No Label No Formula version 0 · solo lectura
- **\_EC_En_Proceso** [Decimal] · fórmula =SUM(SELECT(Pagos[Monto_Pago], AND([OC Ref] = [_THISROW].[ID_OC], IN([Estado_Pago], LIST("Solicitado", "Observado Finanzas", "Programado"))))) Read-Only Yes Hidden No Label No Formula version 0 · solo lectura
- **\_EC_Pagado** [Decimal] · fórmula =SUM(SELECT(Pagos[Monto_Pago], AND([OC Ref] = [_THISROW].[ID_OC], [Estado_Pago] = "Pagado"))) Read-Only Yes Hidden No Label No Formula version 0 · solo lectura
- **\_EC_Saldo** [Decimal] · fórmula =[Monto] - [_EC_Pagado] Read-Only Yes Hidden No Label No Formula version 0 · solo lectura
- **\_EC_Proxima** [Text] · fórmula =IF( ISBLANK(ANY(SELECT(Pagos[ID_Pago], AND([OC Ref] = [_THISROW].[ID_OC], [Estado_Pago] = "Plan")))), "—", CONCATENATE( LOOKUP(ANY(ORDERBY(SELECT(Pagos[ID_Pago], AND([OC Ref] = [_THISROW].[ID_OC], [Estado_Pago] = "Plan")), [N_Cuota])), "Pagos", "ID_Pago", "Tipo_Pago"), " · ", TEXT(LOOKUP(ANY(ORDERBY(SELECT(Pagos[ID_Pago], AND([OC Ref] = [_THISROW].[ID_OC], [Estado_Pago] = "Plan")), [N_Cuota])), " · solo lectura
- **\_Demasia_Pend** [Yes/No] · fórmula =COUNT(SELECT(Base de datos OC NAC[ID_Linea], AND([OC_Ref] = [_THISROW].[ID_OC], [Es_Demasia], [Demasia_Estado] = "Pendiente"))) > 0 Read-Only Yes Hidden Yes Label No Formula version 0 · solo lectura
- **\_Demasia_Aviso** [Text] · fórmula =CONCATENATE(" ⚠ Incluye demasía por ", TEXT(SUM(SELECT(Base de datos OC NAC[COSTO TOTAL], AND([OC_Ref] = [_THISROW].[ID_OC], [Es_Demasia], [Demasia_Estado] = "Pendiente")))), " – ", SUBSTITUTE(TEXT(SELECT(Base de datos OC NAC[Motivo_Demasia], AND([OC_Ref] = [_THISROW].[ID_OC], [Es_Demasia], [Demasia_Estado] = "Pendiente"))), " , ", " / ")) Read-Only Yes Hidden No Label No Formula version 0 · Show_If: = [_Demasia_Pend] · solo lectura
- **\_Aviso_Sync** [Text] · fórmula =IF( AND(ISNOTBLANK([OC]), COUNT([Related Pagos]) = 0, [Forma de pago] <> "Caja chica"), " ⏳ Generando cuotas y PDF… sincroniza en 1–2 minutos", "" ) Read-Only Yes Hidden No Label No Formula version 0 · Show_If: =ISNOTBLANK([_Aviso_Sync]) · solo lectura
- **Related Des_Gastos** [List] · ref→Des_Gastos · solo lectura
- **Related Des_Productos** [List] · ref→Des_Productos · solo lectura
- **Related Desaduanajes** [List] · ref→Desaduanajes · Show_If: =CONT AINS(LOWER([Procedencia]), "import") · solo lectura

### Acciones

- **Edit** (EDIT_RECORD Only if this condition is true =FALSE) — si: `=FALSE`
- **Open Url (Link de la carpeta OC)** (NAVIGATE_URL) — si: `NOT(ISBLANK([Link de la carpeta OC]))`
- **Add** (ADD_RECORD)
- **New step Action - 1** (SET_COLUMN_VALUE) — si: `true` — pone: Estatus Compra==IF([LEGAJO PARA PAGO]=TRUE,\n IFS([Forma de pago]=\"Adelanto\",\"Adelanto pendiente\",\n [Forma de pago]=\"Crédito\",\"Crédito\",\n [Forma de pago]=\"Credito l; Fecha_Aprobacion==IF(IS BLANK([Fecha_Aprobacion]),TODAY(), [Fecha_Aprobacion])
- **Action for Cambiar estado a legajo completo** (SET_COLUMN_VALUE) — si: `true` — pone: Estatus Compra==IFS(\n [Forma de pago]=\"Adelanto\", \"Adelanto pendiente\",\n [Forma de pago]=\"Crédito\", \"Crédito\",\n [Forma de pago]=\"Credito letra\", \"Credito letra\"
- **Observar OC** (SET_COLUMN_VALUE) — si: `=AND([_MiArea] = "Finanzas", IN([Estatus Compra], LIST("Pago pendiente", "Adelanto pendiente", "Crédito", "Legajo incompleto")))` — pone: Estado_Previo_Obs== [Estatus Compra]; Estatus Compra==\"Observado Por Finanzas\"; Observación finanzas==\"Observado\"; Criterio de observación finanzas==[_INPUT].[MotivoObs]; Fecha_Observacion==TO DAY()
- **Subsanar OC** (SET_COLUMN_VALUE) — si: `=AND([_MiArea] = "Finanzas", [Estatus Compra] = "Observado Por Finanzas")` — pone: Estatus Compra==[Estado_Previo_Obs]; Observación finanzas==\"Subsanado\"; Fecha_Subsanacion==TO DAY()
- **Action for Regresar al estado anterior a la obs** (SET_COLUMN_VALUE) — si: `true` — pone: Estatus Compra==[Estado_Previo_Obs]; Observación finanzas==\"Subsanado\"; Fecha_Subsanacion==TO DAY()
- **\_ActualizarEstadoPago** (SET_COLUMN_VALUE) — si: `true` — pone: Estatus Compra==IFS(\n OR(\n [Estado de Aprobación3] <> \"Aprobado para Compra\",\n IN([Estatus Compra], LIST(\"Anulada\",\"Anulación solicitada\",\"En modificación\")),\n STA; LEGAJO PARA PAGO==OR([LEGAJO PARA PAGO], COUNT(SELECT([Related Pagos][ID_Pago], IN([Estado_Pago], LIST(\"Solicitado\",\"Programado\",\"Pagado\")))) > 0)
- **View Ref (Proveedor_Ref)** (NAVIGATE_APP) — si: `NOT(ISBLANK([Proveedor_Ref]))`
- **View Ref (Req_Ref)** (NAVIGATE_APP) — si: `NOT(ISBLANK([Req_Ref]))`
- **Crear pago automático** (ADD_RECORD_TO Only if this condition is true =FALSE) — si: `=FALSE` — pone: OC Ref==[ID_OC]; Estado_Pago==\"Solicita do\"; Comentario==\"Generado automático al completar legajo\"; Monto_Pago==IFS(\n [Forma de pago]=\"Adelanto\", [Monto]*[% adelanto],\n AND(IN([Forma de pago], LIST(\"Contra Entrega\",\"Crédito\",\"Letra\")), [Entrega_Total]=FALSE), [; Tipo_Pago==IFS(\n [Forma de pago]=\"Adelanto\", \"Adelanto\",\n AND(IN([Forma de pago], LIST(\"Contra Entrega\",\"Crédito\",\"Letra\")), [Entrega_Total]=FALSE), \"Pago pa; Fecha_Limite_Pago==IFS (IN([Forma de pago], LIST(\"Crédito\",\"Letra\")), [Fecha_Limite_Pago], TRUE, TODAY())
- **Crear Pago Action - 1** (REF_ACTION Only if this condition is true true) — si: `true`
- **Solicitar Pago** (NAVIGATE_APP) — si: `=FALSE`
- **Action for Volver a Legajo Incompleto** (SET_COLUMN_VALUE) — si: `true` — pone: Estatus Compra==\"Legajo incompleto\"; Fecha_Legajo==\"\"
- **Action for Volver al estado anterior** (SET_COLUMN_VALUE) — si: `true` — pone: Estatus Compra==\"Pendiente de aprobación\"; Fecha_Aprobacion==\"\"
- **Action for Estatus** (SET_COLUMN_VALUE) — si: `true` — pone: Estatus Compra==IFS(\n STARTSWITH([Estado de Aprobación3],\"Observado por\"), [Estado de Aprobación3],\n [Estado de Aprobación3]=\"Aprobado para Compra\",\n IF([LEGAJO PARA PA; Fecha_Aprobacion==IF([E stado de Aprobación3]=\"Aprobado para Compra\", TODAY(), \"\")
- **New step Action - 2** (REF_ACTION Only if this condition is true true) — si: `true`
- **View Ref (\_Empresa)** (NAVIGATE_APP) — si: `NOT(ISBLANK([_Empresa]))`
- **Imprimir OC - Interna** (SET_COLUMN_VALUE) — si: `=AND( [Estatus Compra] <> "Borrador", IN([_MiArea], LIST("Compras","Importaciones")) )` — pone: PDF_Interna_TS==NOW()
- **Imprimir OC - Prov** (SET_COLUMN_VALUE) — si: `=AND( [Estado de Aprobación3] = "Aprobado para Compra", NOT(IN([Estatus Compra], LIST("Anulada","Anulación solicitada","En modificación"))), IN([_MiArea], LIST("Compras","Importaciones")) )` — pone: PDF_Proveedor_TS==NO W()
- **\_Recalcular OC** (SET_COLUMN_VALUE) — si: `true`
- **Emitir OC** (SET_COLUMN_VALUE) — si: `=AND( [Estatus Compra] = "Borrador", COUNT([Related Base de datos OC NACs]) > 0, [Monto] > 0, IN([_MiArea], LIST("Compras","Importaciones")), OR( CONTAINS([Forma de pago], "Tarjeta"), COUNT(FILTER("Documentos_OC", AND([OC_Ref] = [_THISROW].[ID_OC], [Tipo_Doc] = "Cotización"))) > 0 ) )` — pone: Estatus Compra==\"Pendiente de aprobación\"; Fecha_Emision==NOW(); Emitido_Por==USEREMAI L(); PDF_Interna_TS==NOW()
- **Compose Email (Emitido_Por)** (EMAIL) — si: `NOT(ISBLANK([Emitido_Por]))`
- **Compose Email (CG_Por)** (EMAIL) — si: `NOT(ISBLANK([CG_Por]))`
- **Compose Email (GOP_Por)** (EMAIL) — si: `NOT(ISBLANK([GOP_Por]))`
- **Compose Email (GAF_Por)** (EMAIL) — si: `NOT(ISBLANK([GAF_Por]))`
- **Validar presupuesto** (SET_COLUMN_VALUE) — si: `=AND( [_Etapa] = "CG", IN("CONTROL_GESTION", [_MisRoles]), ISNOTBLANK([Aprobación Ppto]), NOT(IN([Aprobación Ppto], LIST("Observado", "Anular OC", "Subsanado"))) )` — pone: CG_Por==USEREMAIL(); CG_Fecha==NOW()
- **Open Url (\_PDF_Interna)** (NAVIGATE_URL) — si: `NOT(ISBLANK([_PDF_Interna]))`
- **\_Aprobar_GOP_Base** (SET_COLUMN_VALUE) — si: `=AND([_Etapa] = "GERENCIA", IN("GOP", [_MisRoles]), [Aprobación GOP] <> "Aprobado", [Estado de Aprobación3] = "Falta Aprobación")` — pone: Aprobación GOP==\"Aprobado\"; GOP_Por==USEREMAIL() ; GOP_Fecha==NOW() — confirma: « CONCATENATE(»
- **Aprobar GAF** (SET_COLUMN_VALUE) — si: `=AND( [_Etapa] = "GERENCIA", IN("GAF", [_MisRoles]), [Aprobación GAF] <> "Aprobado", [Estado de Aprobación3] = "Falta Aprobación" , NOT(AND([_Demasia_Pend], [Tipo de aprobación] = "Aprobación Única")) )` — pone: Aprobación GAF==\"Aprobado\"; GAF_Por==USEREMAIL(); GAF_Fecha==NOW()
- **Open Url (\_PDF_Proveedor)** (NAVIGATE_URL) — si: `NOT(ISBLANK([_PDF_Proveedor]))`
- **Solicitar anulación (Comprador)** (SET_COLUMN_VALUE) — si: `=AND( IN([_MiArea], LIST("Compras","Importaciones")), NOT(IN([Estatus Compra], LIST("Borrador","Anulada","Anulación solicitada","En modificación","Saldo pendiente","Oc Pagada"))), OR(ISBLANK([Total_Pagado]), [Total_Pagado] = 0) )` — pone: Estado_Previo_Anul== [Estatus Compra]; Estatus Compra==\"Anulación solicitada\"; Anul_Motivo==[_INPUT]. [Motivo]; Anul_Solicitada_Por==US EREMAIL(); Anul_Fecha_Sol==NOW()
- **Aprobar anulación (jefe de Compras)** (SET_COLUMN_VALUE) — si: `=AND([Estatus Compra] = "Anulación solicitada", IN([_Rol_Jefe], [_MisRoles]))` — pone: Estatus Compra==\"Anulada\"; Anul_Aprobada_Por==US EREMAIL(); Anul_Fecha_Apr==NOW()
- **Rechazar anulación (Jefe de compras)** (SET_COLUMN_VALUE) — si: `=AND([Estatus Compra] = "Anulación solicitada", IN([_Rol_Jefe], [_MisRoles]))` — pone: Estatus Compra==[Estado_Previo_Anul]; Anul_Aprobada_Por==US EREMAIL(); Anul_Fecha_Apr==NOW()
- **Observar OC (aprobación)** (SET_COLUMN_VALUE) — si: `=AND( [_Etapa] = "GERENCIA", OR(IN("GOP", [_MisRoles]), IN("GAF", [_MisRoles])), NOT(STARTSWITH([Estado de Aprobación3], "Observado")) )` — pone: Aprobación Ppto==IF([_Etapa] = \"CG\", \"Observado\", [Aprobación Ppto]); Aprobación GOP==IF(AND([_Etapa] = \"GERENCIA\", IN(\"GOP\", [_MisRoles]), [Aprobación GOP] <> \"Aprobado\"), \"Observado\", [Aprobación GOP]); Aprobación GAF==IF(AND([_Etapa] = \"GERENCIA\", IN(\"GAF\", [_MisRoles]), [Aprobación GAF] <> \"Aprobado\", NOT(AND(IN(\"GOP\", [_MisRoles]), [Aprobación GOP] <> \"Aprobado\"); Motivo_Aprob==[_INPUT]. [Motivo]
- **Rechazar OC (aprobacion)** (SET_COLUMN_VALUE) — si: `=AND( [_Etapa] = "GERENCIA", OR(IN("GOP", [_MisRoles]), IN("GAF", [_MisRoles])), NOT(STARTSWITH([Estado de Aprobación3], "Observado")) )` — pone: Aprobación Ppto==IF([_Etapa] = \"CG\", \"Anular OC\", [Aprobación Ppto]); Aprobación GOP==IF(AND([_Etapa] = \"GERENCIA\", IN(\"GOP\", [_MisRoles])), \"Rechazado\", [Aprobación GOP]); Aprobación GAF==IF(AND([_Etapa] = \"GERENCIA\", IN(\"GAF\", [_MisRoles]), NOT(IN(\"GOP\", [_MisRoles]))), \"Rechazado\", [Aprobación GAF]); Estatus Compra==\"Anulada\"; Motivo_Aprob==[_INPUT]. [Motivo]
- **Reenviar a aprobación (comprador)** (SET_COLUMN_VALUE) — si: `=AND( IN([_MiArea], LIST("Compras", "Importaciones")), STARTSWITH([Estado de Aprobación3], "Observado") )` — pone: Aprobación Ppto==IF([Aprobación Ppto] = \"Observado\", \"Subsanado\", [Aprobación Ppto]); Aprobación GOP==IF([Aprobación GOP] = \"Observado\", \"\", [Aprobación GOP]); Aprobación GAF==IF([Aprobación GAF] = \"Observado\", \"\", [Aprobación GAF]); Estatus Compra==\"Pendiente de aprobación\"
- **Modificar OC** (SET_COLUMN_VALUE) — si: `=AND( IN([_MiArea], LIST("Compras", "Importaciones")), [Estado de Aprobación3] = "Aprobado para Compra", NOT(IN([Estatus Compra], LIST("En modificación", "Anulada", "Anulación solicitada", "Oc Pagada"))) )` — pone: Estado_Previo_Mod== [Estatus Compra]; Monto_Antes_Mod== [Monto]; Moneda_Antes_Mod== [Moneda original]; FormaPago_Antes_Mod= =[Forma de pago]; Mod_Motivo==[_INPUT]. [Motivo]; Mod_Por==USEREMAIL() ; Mod_Fecha==NOW(); Estatus Compra==\"En modificación\"
- **Confirmar modificación** (SET_COLUMN_VALUE) — si: `=AND([Estatus Compra] = "En modificación", IN([_MiArea], LIST("Compras", "Importaciones")))` — pone: Revision==[Revision] + 1; Aprobación Ppto==IF([_Requiere_Reaprob], \"\", [Aprobación Ppto]); Aprobación GOP==IF([_Requiere_Reaprob], \"\", [Aprobación GOP]); Aprobación GAF==IF([_Requiere_Reaprob], \"\", [Aprobación GOP]); CG_Por==IF([_Requiere_R eaprob], \"\", [CG_Por]); GOP_Por==IF([_Requiere_ Reaprob], \"\", [GOP_Por]); GAF_Por==IF([_Requiere_ Reaprob], \"\", [GAF_Por]); Estatus Compra==IF([_Requiere_Reaprob], \"Pendiente de aprobación\", [Estado_Previo_Mod]); PDF_Interna_TS==NOW() ; PDF_Proveedor_TS==IF([ _Requiere_Reaprob], [PDF_Proveedor_TS], NOW())
- **Compose Email (Mod_Por)** (EMAIL) — si: `NOT(ISBLANK([Mod_Por]))`
- **Revocar aprobación** (SET_COLUMN_VALUE) — si: `=AND( [Estado de Aprobación3] = "Aprobado para Compra", NOT(IN([Estatus Compra], LIST("Anulada","Anulación solicitada","En modificación","Saldo pendiente","Oc Pagada"))), COUNT([Related Pagos]) = 0, COUNT(INTERSECT([_MisRoles], LIST("CONTROL_GESTION","GOP","GAF"))) > 0 )` — pone: Aprobación Ppto==IF(IN(\"CONTROL_GESTION\", [_MisRoles]),\"Observado\",[Aprobación Ppto]); Aprobación GOP==IF(AND(NOT(IN(\"CONTROL_GESTI ON\",[_MisRoles])),IN(\"GOP\", [_MisRoles])),\"Observado\",\"\"); Aprobación GAF==IF(AND(NOT(IN(\"CONTROL_GESTI ON\",[_MisRoles])),NOT(IN(\"GOP\",[_MisRoles])),IN(\"GAF\", [_MisRoles])),\"Observado\",\"\"); GOP_Por==\"\"; GOP_Fecha==\"\"; GAF_Por==\"\"; GAF_Fecha==\"\"; Motivo_Aprob==[_INPUT]. [Motivo]
- **Observar presupuesto (CG)** (SET_COLUMN_VALUE) — si: `=AND([_Etapa] = "CG", IN("CONTROL_GESTION", [_MisRoles]))` — pone: Aprobación Ppto==\"Observado\"; CG_Por==USEREMAIL(); CG_Fecha==NOW(); Motivo_Aprob==[_INPUT]. [Motivo]
- **Anular OC (Gerencia)** (SET_COLUMN_VALUE) — si: `=AND( NOT(IN([Estatus Compra], LIST("Borrador","Anulada","Anulación solicitada","Saldo pendiente","Oc Pagada"))), OR(ISBLANK([Total_Pagado]), [Total_Pagado] = 0), COUNT(INTERSECT([_MisRoles], LIST("GOP","GAF"))) > 0 )` — pone: Estado_Previo_Anul== [Estatus Compra]; Estatus Compra==\"Anulada\"; Anul_Motivo==[_INPUT]. [Motivo]; Anul_Solicitada_Por==US EREMAIL(); Anul_Fecha_Apr==NOW() ; Anul_Aprobada_Por==US EREMAIL(); Anul_Fecha_Sol==NOW()
- **Editar OC** (EDIT_RECORD Only if this condition is true =AND( IN([_MiArea) — si: `=AND( IN([_MiArea], LIST("Compras","Importaciones")), OR( IN([Estatus Compra], LIST("Borrador","En modificación")), STARTSWITH([Estatus Compra], "Observado"), AND( [Estatus Compra] = "Pendiente de aprobación", ISBLANK([CG_Por]), ISBLANK([GOP_Por]), ISBLANK([GAF_Por]) ) ) )`
- **Borrar borrador** (SET_COLUMN_VALUE) — si: `=[Estatus Compra] = "Borrador"` — pone: Estatus Compra==\"Anulada\"; Anul_Motivo==\"Borrador descartado por \" & USEREMAIL()
- **Agregar línea** (NAVIGATE_APP) — si: `=AND( IN([_MiArea], LIST("Compras","Importaciones")), OR( IN([Estatus Compra], LIST("Borrador","En modificación")), STARTSWITH([Estatus Compra], "Observado"), AND([Estatus Compra] = "Pendiente de aprobación", ISBLANK([CG_Por]), ISBLANK([GOP_Por]), ISBLANK([GAF_Por])) ) )`
- **Legajo completo** (SET_COLUMN_VALUE) — si: `=FALSE` — pone: LEGAJO PARA PAGO==TRUE
- **Action for Actualizar Estado** (REF_ACTION Only if this condition is true true) — si: `true`
- **Action for Envio correo** (SET_COLUMN_VALUE) — si: `true` — pone: Correo_Envio==IF(ISBLA NK([Correo_Envio]), LOOKUP([Proveedor], \"Base de datos Proveedores\", \"RAZON SOCIAL\", \"CORREO\"), [Correo_Envio])
- **Enviar al proveedor** (SET_COLUMN_VALUE) — si: `=AND([Estado de Aprobación3] = "Aprobado para Compra", IN([_MiArea], LIST("Compras","Importaciones")), NOT(IN([Estatus Compra], LIST("Anulada","Anulación solicitada"))))` — pone: Correo_Envio==[_INPUT]. [Correo]; Envio_Solicitado==NOW()
- **Compose Email (Correo_Envio)** (EMAIL) — si: `NOT(ISBLANK([Correo_Envio]))`
- **\_Aprobar_Demasias_OC** (REF_ACTION Only if this condition is true true) — si: `true`
- **Aprobar GOP** (COMPOSITE Only if this condition is true =AND([_Etapa] = "GE) — si: `=AND([_Etapa] = "GERENCIA", IN("GOP", [_MisRoles]), [Aprobación GOP] <> "Aprobado", [Estado de Aprobación3] = "Falta Aprobación")` — ejecuta: _Aprobar_Demasias_OC, _Aprobar_GOP_Base — confirma: « »
- **\_Rechazar_Demasias_OC** (REF_ACTION Only if this condition is true true) — si: `true`
- **Aprobar sin demasía** (COMPOSITE Only if this condition is true =AND([_Etapa] = "GE) — si: `=AND([_Etapa] = "GERENCIA", IN("GOP", [_MisRoles]), [Aprobación GOP] <> "Aprobado", [Estado de Aprobación3] = "Falta Aprobación", [_Demasia_Pend])` — ejecuta: _Rechazar_Demasias_OC, _Aprobar_GOP_Base — confirma: «= »
- **Nuevo desaduanaje** (NAVIGATE_APP) — si: `=AND( CONTAINS(LOWER([Procedencia]), "import"), [Estado de Aprobación3] = "Aprobado para Compra", IN(LOOKUP(USEREMAIL(), "Usuarios", "Email", "Área"), LIST("Compras", "Importaciones")) )`

## Tabla `Tipo_Cambio` · ALL_CHANGES

### Columnas

- **\_RowNumber** [Number] · solo lectura
- **Moneda** [Text] · CLAVE
- **Tasa_a_Soles** [Decimal]

### Acciones

- **Delete** (DELETE_RECORD)
- **Edit** (EDIT_RECORD)
- **Add** (ADD_RECORD)

## Tabla `Usuarios` · ALL_CHANGES

### Columnas

- **\_RowNumber** [Number] · solo lectura
- **Email** [Email] · CLAVE
- **Nombre** [Text]
- **Área** [Text]
- **Jefe** [Email]

### Acciones

- **Delete** (DELETE_RECORD)
- **Edit** (EDIT_RECORD)
- **Compose Email (Email)** (EMAIL) — si: `NOT(ISBLANK([Email]))`
- **Add** (ADD_RECORD)
- **Compose Email (Jefe)** (EMAIL) — si: `NOT(ISBLANK([Jefe]))`

## Tabla `Conceptos_Pagos` · ALL_CHANGES

### Columnas

- **\_RowNumber** [Number] · solo lectura
- **Tipo_Pago** [Text] · CLAVE
- **Related Pagos** [List] · ref→Pagos · solo lectura

### Acciones

- **Delete** (DELETE_RECORD)
- **Edit** (EDIT_RECORD)
- **Add** (ADD_RECORD)

## Tabla `Pagos` · ADDS_AND_UPDATES

### Columnas

- **\_RowNumber** [Number] · solo lectura
- **ID_Pago** [Text] · inicial ="P" & UNIQUEID() · solo lectura · CLAVE
- **OC Ref** [Ref] · ref→OC
- **Monto_Pago** [Decimal] · Valid_If: =AND([_THIS] > 0, [_THIS] <= [OC Ref]. [Saldo]) · Editable_If: =[_MiArea] = "Finanzas
- **Fecha_Pago** [DateTime]
- **Tipo_Pago** [Ref] · ref→Conceptos_Pagos
- **Comentario** [Text] · Editable_If: = [_MiArea] = "Finanzas
- **Registrado_Por** [Text] · inicial =USEREMAIL() · solo lectura
- **Marca_temporal** [DateTime] · inicial =NOW() · solo lectura
- **OC_Numero** [Text] · inicial =[OC Ref].[OC]
- **OC_Proveedor** [Text] · inicial =[OC Ref].[Proveedor]
- **OC_Proyecto** [Text] · inicial =[OC Ref].[Proyecto]
- **OC_Unidad** [Text] · inicial =[OC Ref].[Unidad de negocio]
- **Estado_Pago** [Enum] · enum ["Plan","Solicitado","Programado","Pagado","Observado Finanzas","Anulado"] · inicial ="Solicitado"
- **Fecha_Limite_Pago** [Date] · Show_If: =IN([OC Ref].[Forma de pago], LIST("Crédito · Required_If: =IN([OC Ref].[Forma de pago], LIST("Crédito
- **Factura_Subida** [Yes/No] · inicial =TRUE
- **Sustento_Falta_Factura** [LongText] · Show_If: =[Factura_Subida] <> TRUE · Editable_If: =IN ([_MiArea], LIST("Compras · Required_If: =ISBLANK([Factura_Ref])
- **Fecha_Factura** [Date] · Show_If: =[Factura_Subida] = TRUE · Editable_If: =IN([_MiArea], LIST("Compras
- **N_Cuota** [Number]
- **Hito** [Text]
- **Porcentaje** [Percent]
- **Dias_Credito** [Number]
- **Es_Letra** [Yes/No]
- **Fecha_Programada** [Date]
- **N_Operacion** [Text]
- **Factura_Ref** [Ref] · ref→Documentos_OC
- **Voucher_Ref** [Ref] · ref→Documentos_OC
- **Aprobado_Fin_Por** [Email]
- **Fecha_Aprob_Fin** [DateTime]
- **Motivo_Obs_Fin** [LongText]
- **Ejecutado_Por** [Email]
- **Aplica_Retencion** [Yes/No]
- **Monto_Retencion** [Decimal]
- **Neto_Referencial** [Decimal]
- **\_Moneda_Ref** [Text] · fórmula =[OC Ref].[Moneda original] Read-Only Yes Hidden No Label No Formula version 0 · solo lectura
- **\_Monto_OC** [Decimal] · fórmula =[OC Ref].[Monto] Read-Only Yes Hidden No Label No Formula version 0 · solo lectura
- **\_Saldo_OC** [Decimal] · fórmula =[OC Ref].[Saldo] Read-Only Yes Hidden No Label No Formula version 0 · solo lectura
- **\_Alerta_Saldo** [Text] · fórmula =IF([Monto_Pago] > [_Saldo_OC], " ⚠ _ESTE PAGO SUPERA EL SALDO PENDIENTE (" & [\_Saldo_OC] & "). Verifica antes de guardar._", "") Read-Only Yes Hidden No Label No Formula version 0 · Show_If: =[Monto_Pago] > [_Saldo_OC] · solo lectura
- **\_MiArea** [Text] · fórmula =LOOKUP(USEREMAIL(), "Usuarios", "Email", "Área") Read-Only Yes Hidden No Label No Formula version 0 · solo lectura
- **Es_Credito** [Text] · fórmula =IF(IN([OC Ref].[Forma de pago], LIST("Crédito","Letra")), "SÍ", "") Read-Only Yes Hidden No Label No Formula version 0 · solo lectura
- **Semaforo_Vencimiento** [Text] · fórmula =IFS( [Estado_Pago]="Pagado", "", ISBLANK([Fecha_Limite_Pago]), "", [Fecha_Limite_Pago] < TODAY(), " ⚫ Vencido", [Fecha_Limite_Pago] <= TODAY()+7, " 🔴 Urgente", [Fecha_Limite_Pago] <= TODAY()+15, " 🟠 Pronto", [Fecha_Limite_Pago] <= TODAY()+30, " 🟡 Atención", TRUE, " 🟢 Holgado" ) Read-Only Yes Hidden No Label No Formula version 0 · solo lectura
- **\_Facturas_Libres** [List] · ref→Documentos_OC · fórmula =SELECT(Documentos_OC[ID_Doc], AND( [OC_Ref] = [_THISROW].[OC Ref], [Tipo_Doc] = "Factura", NOT(IN([ID_Doc], SELECT(Pagos[Factura_Ref], AND([Estado_Pago] <> "Anulado", [ID_Pago] <> [_THISROW].[ID_Pago])))) )) Read-Only Yes Hidden Yes Label No Formula version 0 · solo lectura
- **\_Retencion** [Decimal] · fórmula =IF( AND( ISNOTBLANK([Factura_Ref]), [Factura_Ref]. [Monto_Doc] > 700, [_Prov].[Es_Agente_Retencion] <> TRUE, [_Prov].[Es_Buen_Contribuyente] <> TRUE ), ROUND([Monto_Pago] * 3) / 100.0, 0 ) Read-Only Yes Hidden No Label No Formula version 0 · solo lectura
- **\_Neto** [Decimal] · fórmula =[Monto_Pago] - [_Retencion] Read-Only Yes Hidden No Label No Formula version 0 · Valid_If: =AND([_THIS] > 0, [_THIS] <= [OC Ref]. [Saldo]) · solo lectura
- **\_Alerta_Retencion** [Text] · fórmula =IFS( ISBLANK([_Prov]), " ⚠ Proveedor no encontrado", [_Prov]. [Verificado_Contab] <> TRUE, " ⚠ Proveedor sin verificar", [_Retencion] > 0, "Retener 3%", TRUE, "Sin retención" ) Read-Only Yes Hidden No Label No Formula version 0 · solo lectura
- **\_Prov** [Ref] · ref→Base de datos Proveedores · fórmula =ANY(SELECT(Base de datos Proveedores[RUC], [RAZON SOCIAL] = [_THISROW].[OC Ref].[Proveedor])) Read-Only Yes Hidden No Label No Formula version 0 · solo lectura

### Acciones

- **Edit** (EDIT_RECORD Only if this condition is true =FALSE) — si: `=FALSE`
- **Add** (ADD_RECORD Only if this condition is true =IN("FINANZAS", SE) — si: `=IN("FINANZAS", SELECT(Aprobadores_OC[Rol], AND(LOWER([Email]) = LOWER(USEREMAIL()), [Activo])))`
- **View Ref (OC Ref)** (NAVIGATE_APP) — si: `NOT(ISBLANK([OC Ref]))`
- **View Ref (Tipo_Pago)** (NAVIGATE_APP) — si: `NOT(ISBLANK([Tipo_Pago]))`
- **Actualizar OC Action - 1** (REF_ACTION Only if this condition is true true) — si: `true`
- **Programar pago** (SET_COLUMN_VALUE) — si: `=AND([Estado_Pago]="Solicitado", [_MiArea]="Finanzas", [Monto_Pago] > 0)` — pone: Estado_Pago==\"Progra mado\"
- **Pagado** (SET_COLUMN_VALUE) — si: `=[Estado_Pago]="Programado"` — pone: Estado_Pago==\"Pagado \"; Fecha_Pago==NOW()
- **\_Sincronizar_Estado_Pago** (SET_COLUMN_VALUE) — si: `true` — pone: Estado_Pago==IFS(\n AND(\n [OC Ref].[Estatus Compra] = \"Anulada\",\n IN([Estado_Pago], LIST(\"Plan\",\"Solicitado\",\"Observado Finanzas\",\"Programado\"))\n ), \"Anulado\
- **View Ref (Factura_Ref)** (NAVIGATE_APP) — si: `NOT(ISBLANK([Factura_Ref]))`
- **View Ref (Voucher_Ref)** (NAVIGATE_APP) — si: `NOT(ISBLANK([Voucher_Ref]))`
- **Compose Email (Aprobado_Fin_Por)** (EMAIL) — si: `NOT(ISBLANK([Aprobado_Fin_Por]))`
- **Compose Email (Ejecutado_Por)** (EMAIL) — si: `NOT(ISBLANK([Ejecutado_Por]))`
- **\_Marcar_Solicitado** (SET_COLUMN_VALUE) — si: `true` — pone: Estado_Pago==\"Solicita do\"; Factura_Subida==ISNOTB LANK([Factura_Ref]); Fecha_Factura== [Factura_Ref].[Fecha_Doc]; Fecha_Limite_Pago==IF(\ n AND(ISNOTBLANK([Factura_Ref].[Fecha_Doc]), [Dias_Credito] > 0),\n [Factura_Ref].[Fecha_Doc] + [Dias_Credito],\n [Fecha_Limite_Pago]\n)
- **Solicitar pago 2** (NAVIGATE_APP) — si: `=AND( [Estado_Pago] = "Plan", [OC Ref].[Estado de Aprobación3] = "Aprobado para Compra", IN([_MiArea], LIST("Compras","Importaciones")) )`
- **New step Action - 5** (ADD_RECORD_TO Only if this condition is true true) — si: `true` — pone: OC Ref==[OC Ref]; Monto_Pago== [_THISROW_BEFORE].[Monto_Pago] - [_THISROW_AFTER]. [Monto_Pago]; Tipo_Pago==\"Saldo\"; Estado_Pago==\"Plan\"; Hito==[Hito]; N_Cuota==[N_Cuota] + 0.1; Dias_Credito== [Dias_Credito]; Es_Letra==[Es_Letra]; Comentario==\"Remanen te de la cuota \" & [N_Cuota]
- **\_Vincular_Factura** (SET_COLUMN_VALUE) — si: `true` — pone: Factura_Ref==IF(\n ISNOTBLANK(ANY(SELECT(Documentos_OC[ID_Doc], AND(IN([ID_Doc], [_THISROW].[_Facturas_Libres]), ABS([Monto_Doc] - [_THISROW].[Monto_Pago]) < 1)))),\n ANY(S; Factura_Subida==ISNOTB LANK(ANY([_Facturas_Libres]))
- **\_Solicitar_Auto** (SET_COLUMN_VALUE) — si: `true` — pone: Estado_Pago==\"Solicita do\"; Factura_Ref==IF(\n ISNOTBLANK(ANY(SELECT(Documentos_OC[ID_Doc], AND(IN([ID_Doc], [_THISROW].[_Facturas_Libres]), ABS([Monto_Doc] - [_THISROW].[Monto_Pago]) < 1)))),\n ANY(S; Factura_Subida==ISNOTB LANK(ANY([_Facturas_Libres])); Comentario==\"Solicitado automáticamente al subir factura\"
- **\_Fechas_Factura** (SET_COLUMN_VALUE) — si: `true` — pone: Fecha_Factura== [Factura_Ref].[Fecha_Doc]; Fecha_Limite_Pago==IF(\ n AND(ISNOTBLANK([Factura_Ref].[Fecha_Doc]), [Dias_Credito] > 0),\n [Factura_Ref].[Fecha_Doc] + [Dias_Credito],\n [Fecha_Limite_Pago]\n)
- **View Ref (\_Prov)** (NAVIGATE_APP) — si: `NOT(ISBLANK([_Prov]))`

## Tabla `Items` · UPDATES_ONLY

### Columnas

- **\_RowNumber** [Number] · solo lectura
- **ID_Req** [Ref] · ref→Requerimientos
- **FECHA/ HR EMISIÓN** [Date] · inicial TODAY()
- **RAZON SOCIAL** [Text] · Valid_If: =Empresas[Unidad de negocio] · Show_If: =[ID_Req]. [Estado_Req] <> "En Proceso
- **N° RC** [Text] · Show_If: =[ID_Req].[Estado_Req] <> "En Proceso
- **AREA EMISORA** [Enum] · enum ["Administración","Planeamiento","Logística"]
- **EMISOR** [Text] · Show_If: =[ID_Req].[Estado_Req] <> "En Proceso
- **SOLICITANTE** [Text] · Editable_If: =FALSE
- **TIPO COMPRA** [Text] · Show_If: =[ID_Req].[Estado_Req] <> "En Proceso
- **ORDEN DE PEDIDO** [Text] · Editable_If: =FALSE
- **MOTIVO O PROYECTO** [Text] · Editable_If: =FALSE
- **CONCEPTO** [Text] · Valid_If: =Conceptos_Item[Con cepto]
- **N° ITEM** [Number] · Editable_If: =FALSE
- **CÓDIGO CLIENTE** [Text] · Editable_If: =FALSE
- **DESCRIPCIÓN CLIENTE** [Text] · Editable_If: =FALSE
- **CÓDIGO SIDIGE** [Text]
- **DESCRIPCIÓN SIDIGE** [Text]
- **UNIDAD MEDIDA** [Text] · Editable_If: =FALSE
- **CANTIDAD REQUERIDA** [Number] · Editable_If: =FALSE
- **ESPECIFICACION TECNICA** [Url] · Editable_If: =FALSE
- **DETALLE** [LongText] · Editable_If: =FALSE
- **FECHA SOLICITADO** [Date] · inicial TODAY() · Editable_If: =FALSE
- **DESTINO** [Enum] · enum ["Magdalena","Puente Piedra","Proveedor"]
- **DIRECCIÓN** [Text] · Show_If: =[ID_Req].[Estado_Req] <> "En Proceso
- **RECEPTOR** [Text] · Show_If: =[ID_Req].[Estado_Req] <> "En Proceso
- **ESTADO DE VISUALIZACIÓN** [Text]
- **COMPRADOR** [Text] · Show_If: =AND(\n CONTEXT("ViewType") <> "Form
- **N° OC** [Text] · Show_If: =AND(\n CONTEXT("ViewType") <> "Form
- **CANTIDAD COMPRADA** [Number] · Show_If: =AND (\n CONTEXT("ViewType") <> "Form
- **PROVEEDOR** [Text] · Show_If: =AND(\n CONTEXT("ViewType") <> "Form
- **LINK DE OC** [Text] · Show_If: =AND(\n CONTEXT("ViewType") <> "Form
- **ESTADO APROBACIÓN** [Text] · Show_If: =AND(\n CONTEXT("ViewType") <> "Form
- **FECHA APROBACIÓN** [Text] · Show_If: =AND(\n CONTEXT("ViewType") <> "Form
- **ESTADO DE PAGO** [Text] · Show_If: =AND(\n CONTEXT("ViewType") <> "Form
- **ESTADO DE COMPRA** [Text] · Show_If: =AND(\n CONTEXT("ViewType") <> "Form
- **FECHA ENTREGA TENTATIVA** [Text] · Show_If: =AND(\n CONTEXT("ViewType") <> "Form
- **CONCATENADO 1** [Text] · Show_If: =AND(\n CONTEXT("ViewType") <> "Form
- **FECHA RECEPCIÓN** [Text] · Show_If: =AND(\n CONTEXT("ViewType") <> "Form
- **ESTADO RECEPCIÓN** [Text] · Show_If: =AND(\n CONTEXT("ViewType") <> "Form
- **CONCATENADO** [Text]
- **Solicitud_Item_Ref** [Ref] · ref→Solicitud_Items
- **ID_Item** [Text] · Show_If: =CONTEXT("ViewType") <> "Form · CLAVE
- **Referencia_Link** [Url] · Editable_If: =FALSE
- **Motivo_Deshabilitado** [Text]
- **Deshabilitado_Por** [Text]
- **Fecha_Deshabilitado** [Text]
- **Anulacion_Ref** [Text]
- **Concepto_Sugerido** [Text]
- **\_ID_Item** [Text] · fórmula =CONCATENATE([ID_Req], "-", [N° ITEM]) Read-Only Yes Hidden No Label No Formula version 0 · Show_If: =FALSE · solo lectura
- **Descripción** [Text] · fórmula =IF(ISNOTBLANK([DESCRIPCIÓN CLIENTE]),[DESCRIPCIÓN CLIENTE],[DESCRIPCIÓN SIDIGE]) Read-Only Yes Hidden Yes Label No Formula version 0 · solo lectura
- **Estatus_Item** [Text] · fórmula =IFS( [ESTADO DE VISUALIZACIÓN] = "Deshabilitado", " ⛔ ", OR([CANTIDAD COMPRADA] >= [CANTIDAD REQUERIDA], ISNOTBLANK([Related Caja_Chicas])), " 🟢 ", [CANTIDAD COMPRADA] > 0, " 🟡 ", TRUE, " 🔴 " ) Read-Only Yes Hidden No Label No Formula version 0 · Show_If: =AND(\n CONTEXT("ViewType") <> "Form · solo lectura
- **Related Caja_Chicas** [List] · ref→Caja_Chica · solo lectura
- **\_Es_CajaChica** [Yes/No] · fórmula =IN([_ID_Item], Caja_Chica[Item_Ref]) Read-Only Yes Hidden Yes Label No Formula version 0 · solo lectura
- **\_OC_Mostrar** [Text] · fórmula =IF( [_Es_CajaChica], "Caja Chica", IF(AND(ISNOTBLANK([N° OC]), NOT(IN([N° OC], LIST("-","0","#N/A")))), [N° OC], "") ) Read-Only Yes Hidden No Label No Formula version 0 · Show_If: =AND(\n CONTEXT("ViewType") <> "Form · solo lectura
- **\_Comprador_Final** [Enum] · fórmula =IF( [_Es_CajaChica], LOOKUP([_ID_Item], "Caja_Chica", "Item_Ref", "Comprador"), [COMPRADOR] ) Read-Only Yes Hidden No Label No Formula version 0 · solo lectura
- **Related Base de datos OC NACs** [List] · ref→Base de datos OC NAC · solo lectura
- **\_Etiqueta_Item** [Text] · fórmula =CONCATENATE([ID_Req].[N° RC], " · It. ", [N° ITEM], " · ", [descripción]) Read-Only Yes Hidden No Label Yes Formula version 0 · Show_If: =FALSE · solo lectura
- **Estado del Item** [Text] · fórmula =IFS( [ESTADO DE VISUALIZACIÓN] = "Deshabilitado", " ⛔ Deshabilitado", COUNT([_OC_Activas]) > 0, LOOKUP(INDEX([_OC_Activas], 1), "OC", "ID_OC", "Estatus Compra"), ISNOTBLANK([N° OC]), [ESTADO DE COMPRA], TRUE, " ⚪ Sin OC" ) Read-Only Yes Hidden No Label No Formula version 0 · Show_If: =CONTEXT("ViewType") <> "Form · solo lectura
- **\_Concepto_OK** [Yes/No] · fórmula =OR(ISNOTBLANK([CONCEPTO]), ISNOTBLANK([Concepto_Sugerido]), ISNOTBLANK([ID_Req]. [Concepto_General])) Read-Only Yes Hidden No Label No Formula version 0 · solo lectura
- **\_Orden_Concepto** [Number] · fórmula =IF([_Concepto_OK], 1, 0) Read-Only Yes Hidden No Label No Formula version 0 · solo lectura
- **\_Concepto_Previsto** [Text] · fórmula =IFS( ISNOTBLANK([CONCEPTO]), [CONCEPTO], ISNOTBLANK([ID_Req].[Concepto_General]), IF(AND(ISNOTBLANK([ID_Req].[Concepto_Secundario]), FIND(".", [CÓDIGO CLIENTE]) > 1), [ID_Req]. [Concepto_Secundario], [ID_Req].[Concepto_General]), TRUE, [Concepto_Sugerido] ) Read-Only Yes Hidden No Label No Formula version 0 · Valid_If: =Conceptos_Item[Con cepto] · solo lectura
- **\_Cant_OC** [Decimal] · fórmula =SUM(SELECT(Base de datos OC NAC[Cant_Cubre_Req], AND( [Item_Req_Ref] = [_THISROW].[ID_Item], [OC_Ref].[Estatus Compra] <> "Anulada" ))) Read-Only Yes Hidden No Label No Formula version 0 · solo lectura
- **\_Cant_Pendiente** [Decimal] · fórmula =[CANTIDAD REQUERIDA] - [_Cant_OC] Read-Only Yes Hidden No Label No Formula version 0 · solo lectura
- **\_Avance** [Text] · fórmula =IFS( [ESTADO DE VISUALIZACIÓN] = "Deshabilitado", "", ISNOTBLANK([Related Caja_Chicas]), " 🟢 Caja chica", [CANTIDAD COMPRADA] >= [CANTIDAD REQUERIDA], " 🟢 Atendido · " & [CANTIDAD COMPRADA] & "/" & [CANTIDAD REQUERIDA], [CANTIDAD COMPRADA] > 0, " 🟡 Parcial · " & [CANTIDAD COMPRADA] & "/" & [CANTIDAD REQUERIDA], TRUE, " 🔴 Pendiente" ) Read-Only Yes Hidden No Label No Formula version 0 · solo lectura
- **\_OC_Activas** [List] · ref→OC · fórmula =SELECT(Base de datos OC NAC[OC_Ref], AND( [Item_Req_Ref] = [_THISROW].[ID_Item], [OC_Ref].[Estatus Compra] <> "Anulada" )) Read-Only Yes Hidden No Label No Formula version 0 · solo lectura

### Acciones

- **View Ref (ID_Req)** (NAVIGATE_APP) — si: `NOT(ISBLANK([ID_Req]))`
- **Marcar Caja Chica** (NAVIGATE_APP) — si: `=AND( [ID_Req].[Estado_Req] = "Emitido", LOOKUP(USEREMAIL(), "Usuarios", "Email", "Área") = "Compras", NOT(IN([_ID_Item], Caja_Chica[Item_Ref])), OR(ISBLANK([N° OC]), IN([N° OC], LIST("-", "0", "#N/A"))) )`
- **Desmarcar Caja Chica** (REF_ACTION Only if this condition is true =IN([_ID_Item], Ca) — si: `=IN([_ID_Item], Caja_Chica[Item_Ref])`
- **Edit** (EDIT_RECORD Only if this condition is true =AND([ID_Req].[Es) — si: `=AND([ID_Req].[Estado_Req] = "En Proceso", LOOKUP(USEREMAIL(), "Usuarios", "Email", "Área") = [ID_Req]. [AREA EMISORA])`
- **View Ref (Solicitud_Item_Ref)** (NAVIGATE_APP) — si: `NOT(ISBLANK([Solicitud_Item_Ref]))`
- **Sincronizar con Req** (SET_COLUMN_VALUE) — si: `true` — pone: RAZON SOCIAL==[ID_Req].[RAZON SOCIAL]; N° RC==[ID_Req].[N° RC]; TIPO COMPRA==IF([ID_Req].[TIPO COMPRA]=\"Nacional/Importaciones\", [TIPO COMPRA], [ID_Req].[TIPO COMPRA]); MOTIVO O PROYECTO==[ID_Req].[MOTIVO O PROYECTO]; AREA EMISORA==[ID_Req].[AREA EMISORA]; SOLICITANTE==[ID_Req]. [Solicitud_Ref].[Solicitante]; EMISOR==[ID_Req]. [EMISOR]
- **Recibir datos de OC** (SET_COLUMN_VALUE) — si: `true` — pone: N° OC==ANY([Related Base de datos OC NACs][N° OC/OS]); PROVEEDOR==ANY([Rela ted Base de datos OC NACs][RAZON SOCIAL]); COMPRADOR==ANY([Rel ated Base de datos OC NACs][ELABORADO]); CANTIDAD COMPRADA==SUM([Related Base de datos OC NACs][CANTIDAD]); LINK DE OC==LOOKUP(ANY([Related Base de datos OC NACs][OC_Ref]), \"OC\", \"ID_OC\", \"Link de la carpeta OC\")
- **Open Url (Referencia_Link)** (NAVIGATE_URL) — si: `NOT(ISBLANK([Referencia_Link]))`
- **Open Url (ESPECIFICACION TECNICA)** (NAVIGATE_URL) — si: `NOT(ISBLANK([ESPECIFICACION TECNICA]))`

## Tabla `Requerimientos` · UPDATES_ONLY

### Columnas

- **\_RowNumber** [Number] · solo lectura
- **ID_Req** [Text] · inicial UNIQUEID() · CLAVE
- **RAZON SOCIAL** [Text] · Valid_If: =Empresas[Unidad de negocio]
- **N° RC** [Text] · Show_If: =CONTEXT("ViewType") <> "Form · Editable_If: =ISBLANK([N° RC])
- **FECHA** [Date] · inicial TODAY() · Editable_If: =FALSE
- **AREA EMISORA** [Enum] · enum ["Administración","Planeamiento","Logística"]
- **TIPO COMPRA** [Enum] · enum ["Nacional","Importaciones","Nac/Imp"]
- **MOTIVO O PROYECTO** [Enum]
- **Total_Items** [Number] · fórmula =COUNT(SELECT(Items[ID_Item], [ID_Req] = [_THISROW]. [ID_Req])) Read-Only No Hidden No Label No Formula version 0
- **Items_Con_OC** [Number]
- **Estado_Req** [Enum] · enum ["En Proceso","Emitido","Observado","Anulado"] · inicial ="En Proceso"
- **Origen** [Text] · inicial ="Proyecto" · Editable_If: =ISBLA NK([Origen])
- **Solicitud_Ref** [Ref] · ref→Solicitudes
- **Emisor** [Text] · Editable_If: =ISBLA NK([EMISOR])
- **Motivo_Observacion** [Text]
- **Observado_Por** [Email]
- **DESTINO** [Enum] · enum ["Magdalena","Puente Piedra","Proveedor"]
- **DIRECCIÓN** [Text] · inicial =IFS( [DESTINO] = "Magdalena", "Jr. Cusco 343 - Magdalena del Mar", [DESTINO] = "Puente Piedra", "Av. Copacabana Mz. K Lote 137 Urb. Leoncio Prado - Puente Piedra", TRUE, "" )
- **RECEPTOR** [Text]
- **PDF_Req** [Text]
- **Concepto_General** [Enum]
- **Concepto_Secundario** [Enum]
- **Related Items** [List] · ref→Items · solo lectura
- **Estatus_General** [Enum] · enum [" 🔴 Pendiente"," 🟡 Parcial"," 🟢 Atendido"] · fórmula =IFS( [Estado_Req]="Anulado", " ⛔ Anulado", COUNT(SELECT(Anulaciones[ID_Anulacion], AND([ID_Req]= [_THISROW].[ID_Req], [Estado]="Aprobada")))>0, " ⏳ Procesando anulación", [_Anulacion_Pendiente], " 🟠 Anulación en trámite", [Estado_Req]="En Proceso", " ⚪ En Proceso", [_Items_Atendidos]=0, " 🔴 Pendiente", [_Items_Atendidos]>=COUNT(SELECT(Items[ID_Item], AND([ID_Req]=[_THISROW].[ID_Req], [ESTADO DE V · solo lectura
- **\_Items_Atendidos** [Number] · fórmula =COUNT( SELECT(Items[_ID_Item], AND( [ID_Req] = [_THISROW].[ID_Req], [Estatus_Item] = " 🟢 ", [ESTADO DE VISUALIZACIÓN] <> "Deshabilitado" ) ) ) Read-Only Yes Hidden Yes Label No Formula version 0 · solo lectura
- **\_Etiqueta_Req** [Text] · fórmula =CONCATENATE( IF(ISBLANK([N° RC]), [Solicitud_Ref]. [N_Solicitud], [N° RC]), IF(ISBLANK([RAZON SOCIAL]), "", " · " & [RAZON SOCIAL]), " · ", [MOTIVO O PROYECTO], IF(ISBLANK([Solicitud_Ref].[Etapa_Ref]), "", " · " & [Solicitud_Ref]. [Etapa_Ref].[Nombre_Etapa]) ) Read-Only Yes Hidden Yes Label No Formula version 0 · solo lectura
- **Related OCs** [List] · ref→OC · solo lectura
- **N_RC_Num** [Number] · fórmula =IF(ISBLANK([N° RC]), 0, NUMBER(RIGHT([N° RC], 4))) Read-Only Yes Hidden Yes Label No Formula version 0 · solo lectura
- **Solicitante** [Text] · fórmula =[Solicitud_Ref].[Solicitante] Read-Only Yes Hidden No Label No Formula version 0 · solo lectura
- **Etapa** [Text] · fórmula =[Solicitud_Ref].[Etapa_Ref].[Nombre_Etapa] Read-Only Yes Hidden No Label No Formula version 0 · solo lectura
- **\_Aviso_Emitir** [Text] · fórmula =IF( AND( ISBLANK([Concepto_General]), COUNT(SELECT(Items[ID_Item], AND([ID_Req] = [_THISROW]. [ID_Req], ISBLANK([CONCEPTO])))) > 0 ), " ⚠ Elige un Concepto general o completa el concepto de " & COUNT(SELECT(Items[ID_Item], AND([ID_Req] = [_THISROW]. [ID_Req], ISBLANK([CONCEPTO])))) & " ítems", "" ) Read-Only Yes Hidden No Label No Formula version 0 · Show_If: =ISNOTBLANK([_Aviso_Emitir]) · solo lectura
- **\_Items** [List] · ref→Items_En_Proceso · fórmula =FILTER("Items_En_Proceso", [ID_Req] = [_THISROW].[ID_Req]) Read-Only Yes Hidden No Label No Formula version 0 · solo lectura
- **\_Anulacion_Pendiente** [Yes/No] · fórmula =COUNT(SELECT(Anulaciones[ID_Anulacion], AND([ID_Req] = [_THISROW].[ID_Req], IN([Estado], LIST("Pendiente", "Aprobada"))))) > 0 Read-Only Yes Hidden Yes Label No Formula version 0 · solo lectura
- **Related Anulaciones** [List] · ref→Anulaciones · solo lectura
- **\_Items_Seg** [List] · ref→Items_Seguimiento · fórmula =FILTER("Items_Seguimiento", [ID_Req] = [_THISROW].[ID_Req]) Read-Only Yes Hidden No Label No Formula version 0 · solo lectura
- **\_Anulaciones** [List] · ref→Anulaciones_RO · fórmula =FILTER("Anulaciones_RO", [ID_Req] = [_THISROW].[ID_Req]) Read-Only Yes Hidden No Label No Formula version 0 · solo lectura

### Acciones

- **Edit** (EDIT_RECORD Only if this condition is true =AND( [Estado_Req) — si: `=AND( [Estado_Req] = "En Proceso", LOOKUP(USEREMAIL(), "Usuarios", "Email", "Área") = [AREA EMISORA] )`
- **View Ref (Solicitud_Ref)** (NAVIGATE_APP) — si: `NOT(ISBLANK([Solicitud_Ref]))`
- **Emitir Requerimiento** (SET_COLUMN_VALUE) — si: `=AND( [Estado_Req] = "En Proceso", ISBLANK([N° RC]), LOOKUP(USEREMAIL(), "Usuarios", "Email", "Área") = [AREA EMISORA], ISNOTBLANK([RAZON SOCIAL]), ISNOTBLANK([TIPO COMPRA]), ISNOTBLANK([DESTINO]), COUNT(SELECT(Items[ID_Item], [ID_Req] = [_THISROW]. [ID_Req])) > 0, OR( ISNOTBLANK([Concepto_General]), COUNT(SELECT(Items[ID_Item], AND([ID_Req] = [_THISROW]. [ID_Req], ISBLANK([CONCEPTO])))) = 0 ), NOT([_Anulacion_Pendiente]) )` — pone: Estado_Req==\"Emitido\ "; Emisor==LOOKUP(USERE MAIL(), \"Usuarios\", \"Email\", \"Nombre\")
- **New step Action - 4** (REF_ACTION Only if this condition is true true) — si: `true`
- **➕ Nuevo Requerimiento (Proyecto)** (NAVIGATE_APP Only if this condition is true =IN( LOOKUP(USER) — si: `=IN( LOOKUP(USEREMAIL(), "Usuarios", "Email", "Área"), LIST("Comercial", "Control de Gestión") )`
- **Observar solicitud 2** (SET_COLUMN_VALUE) — si: `=AND([Estado_Req] = "En Proceso", LOOKUP(USEREMAIL(), "Usuarios", "Email", "Área") = [AREA EMISORA])` — pone: Estado_Req==\"Observa do\"; Motivo_Observacion== [_INPUT].[Motivo]; Observado_Por==USERE MAIL()
- **Compose Email (Observado_Por)** (EMAIL) — si: `NOT(ISBLANK([Observado_Por]))`
- **Observar Action - 1** (REF_ACTION Only if this condition is true true) — si: `true`
- **Marcar observada (sistema) 2** (SET_COLUMN_VALUE) — si: `true` — pone: Estado_Req==\"Observa do\"; Motivo_Observacion== [Solicitud_Ref].[Motivo_Observacion]; Observado_Por== [Solicitud_Ref]. [Observado_Por]
- **Marcar anulado** (SET_COLUMN_VALUE) — si: `true` — pone: Estado_Req==\"Anulado\ "
- **Ver PDF Req** (NAVIGATE_URL) — si: `=ISNOTBLANK([PDF_Req])`
- **Solicitar anulación** (NAVIGATE_APP) — si: `=AND( IN([Estado_Req], LIST("En Proceso", "Emitido")), NOT([_Anulacion_Pendiente]), OR( LOOKUP(USEREMAIL(), "Usuarios", "Email", "Área") = [AREA EMISORA], TRIM(LOWER(USEREMAIL())) = TRIM(LOWER([Solicitud_Ref]. [Email_Solicitante])) ) )`
- **Solicitar rehabilitación** (NAVIGATE_APP) — si: `=AND( IN([Estado_Req], LIST("En Proceso", "Emitido")), NOT([_Anulacion_Pendiente]), COUNT(SELECT(Items[ID_Item], AND([ID_Req] = [_THISROW].[ID_Req], [ESTADO DE VISUALIZACIÓN] = "Deshabilitado"))) > 0, OR( LOOKUP(USEREMAIL(), "Usuarios", "Email", "Área") = [AREA EMISORA], TRIM(LOWER(USEREMAIL())) = TRIM(LOWER([Solicitud_Ref].[Email_Solicitante])) ) )`

## Tabla `Caja_Chica` · ALL_CHANGES

### Columnas

- **\_RowNumber** [Number] · solo lectura
- **ID_CC** [Text] · inicial UNIQUEID() · CLAVE
- **Item_Ref** [Ref] · ref→Items · Show_If: =CONTEXT("ViewType") <> "Form
- **Comentario** [Text]
- **Registrado_Por** [Text] · inicial =useremail() · solo lectura
- **Fecha** [DateTime] · inicial =NOW() · solo lectura
- **Comprador** [Enum] · inicial =LOOKUP(USEREMAIL(),"Usuarios","Email","Nombre")
- **Proveedor** [Text]
- **Monto** [Text]
- **Moneda** [Enum] · inicial ="PEN"

### Acciones

- **Delete** (DELETE_RECORD)
- **Edit** (EDIT_RECORD)
- **Add** (ADD_RECORD)
- **View Ref (Item_Ref)** (NAVIGATE_APP) — si: `NOT(ISBLANK([Item_Ref]))`

## Tabla `Base de datos OC NAC` · ADDS_AND_UPDATES

### Columnas

- **\_RowNumber** [Number] · solo lectura
- **FECHA** [Date] · fórmula =[OC_Ref].[Fecha] Read-Only No Hidden No Label Yes Formula version 0
- **MES** [Text]
- **EMPRESA** [Text] · fórmula =[OC_Ref].[Unidad de negocio] Read-Only No Hidden No Label No Formula version 0
- **TIPO DE DOCUMENTO** [Text] · fórmula =[OC_Ref].[Tipo_Documento] Read-Only No Hidden No Label No Formula version 0
- **N° OC/OS** [Text] · fórmula =[OC_Ref].[OC] Read-Only No Hidden No Label No Formula version 0
- **N° REQUERIMIENTO** [Text] · fórmula =[Item_Req_Ref].[ID_Req].[N° RC] Read-Only No Hidden No Label No Formula version 0
- **RUC** [Text] · inicial =[OC_Ref].[RUC_Proveedor] · solo lectura
- **RAZON SOCIAL** [Text] · inicial =[OC_Ref].[PROVEEDOR] · solo lectura
- **DIRECCION** [Text] · inicial =[OC_Ref].[Prov_Direccion] · solo lectura
- **CONTACTO** [Text] · inicial =[OC_Ref].[Prov_Contacto] · solo lectura
- **TELEFONO** [Text] · inicial =[OC_Ref].[Prov_Telefono] · solo lectura
- **CORREO** [Text] · inicial =[OC_Ref].[Prov_Correo] · solo lectura
- **PROYECTO** [Text] · fórmula =[Item_Req_Ref].[ID_Req].[MOTIVO O PROYECTO] Read-Only No Hidden No Label No Formula version 0
- **ITEM** [Text] · inicial =[Item_Req_Ref].[N° ITEM]
- **CONCEPTO** [Enum] · fórmula =[OC_Ref].[Concepto] Read-Only No Hidden No Label No Formula version 0
- **CODIGO PROYECTO** [Text] · fórmula =[Item_Req_Ref].[CÓDIGO CLIENTE] Read-Only No Hidden No Label No Formula version 0
- **CODIGO PCP** [Text] · inicial =[Item_Req_Ref].[CÓDIGO SIDIGE] · solo lectura
- **UNIDAD DE MEDIDA** [Enum] · enum ["Unidad","Caja","Paquete","Rollo","Metro","cm","Kit","Set","Juego","P ar","Millar","Bolsa","Galon","Litros","ml","Gramos","Kilogramos","Me tro cubico"] · inicial =[Item_Req_Ref].[UNIDAD MEDIDA]
- **CANTIDAD** [Decimal] · inicial =[Item_Req_Ref].[_Cant_Pendiente] · Valid_If: =OR([_THIS] > 0, [Demasia_Estado] = "Rechazada")
- **COSTO UNITARIO** [Decimal] · Valid_If: =[_THIS] > 0
- **COSTO TOTAL** [Decimal] · fórmula =[CANTIDAD]*[COSTO UNITARIO] Read-Only No Hidden No Label No Formula version 0
- **MONEDA** [Text] · fórmula =[OC_Ref].[Moneda original] Read-Only No Hidden No Label No Formula version 0 · inicial =[OC_Ref].[Moneda original]
- **TC** [Decimal]
- **COSTO UNIT (SOLES)** [Decimal]
- **COSTO TOTAL (SOLES)** [Decimal]
- **FORMA DE PAGO** [Text] · inicial =[OC_Ref].[Forma de pago] · solo lectura
- **Días o Porcentaje** [Text] · inicial =[OC_Ref].[Días de crédito] · solo lectura
- **LUGAR DE ENTREGA** [Text] · fórmula =[OC_Ref].[Lugar de entrega] Read-Only No Hidden No Label No Formula version 0
- **TIEMPO DE ENTREGA** [Text]
- **SOLICITADO** [Text] · fórmula =[Item_Req_Ref].[SOLICITANTE] Read-Only No Hidden No Label No Formula version 0
- **ELABORADO** [Text] · inicial =[OC_Ref].[Comprador] · solo lectura
- **Registrado_Por** [Text] · inicial =USEREMAIL() · solo lectura
- **ID_Linea** [Text] · inicial =UNIQUEID() · CLAVE
- **OC_Ref** [Ref] · ref→OC
- **Marca_Temporal** [DateTime] · inicial =NOW() · solo lectura
- **Item_Req_Ref** [Ref] · ref→Items · Show_If: =CONTEXT("ViewType") <> "Form
- **Cant_Equiv_Req** [Decimal] · Valid_If: =[_THIS] > 0 · Show_If: =[UNIDAD DE MEDIDA] <> [Item_Req_Ref].[UNIDAD MEDIDA] · Required_If: = [UNIDAD DE MEDIDA] <> [Item_Req_Ref].[UNIDAD MEDIDA]
- **Cant_Cubre_Req** [Decimal] · fórmula =IF([Es_Demasia], 0, MAX(LIST(0.0, MIN(LIST( [_Cant_Req], [Item_Req_Ref].[CANTIDAD REQUERIDA] - SUM(SELECT(Base de datos OC NAC[Cant_Cubre_Req], AND( [Item_Req_Ref] = [_THISROW].[Item_Req_Ref], [ID_Linea] <> [_THISROW]. [ID_Linea], [OC_Ref].[Estatus Compra] <> "Anulada" ))) )))) ) Read-Only No Hidden No Label No Formula version 0
- **Sustento_Exceso** [Text] · Show_If: =AND(NOT([Es_Demasia]),[_Exceso] > 0) · Required_If: =AND(NOT([Es_Demasia]),[_Exceso] > 0)
- **Es_Demasia** [Yes/No] · inicial =FALSE · Show_If: = [Es_Demasia] · Editable_If: =FALSE
- **Motivo_Demasia** [LongText] · Show_If: =[Es_Demasia] · Required_If: = [Es_Demasia]
- **Demasia_Estado** [Enum] · enum ["Pendiente","Aprobada","Rechazada"] · inicial =IF([Es_Demasia], "Pendiente", "")
- **Cant_Demasia_Solicitada** [Number] · Show_If: = [Demasia_Estado] = "Rechazada · Editable_If: =FALSE
- **Demasia_Decidido_Por** [Email] · Show_If: =ISNOT BLANK([_THIS]) · Editable_If: =FALSE
- **\_UM_Req** [Text] · fórmula =[Item_Req_Ref].[UNIDAD MEDIDA] Read-Only Yes Hidden No Label No Formula version 0 · solo lectura
- **\_Cant_Req** [Decimal] · fórmula =IF([UNIDAD DE MEDIDA] = [Item_Req_Ref].[UNIDAD MEDIDA], [CANTIDAD], [Cant_Equiv_Req]) Read-Only Yes Hidden No Label No Formula version 0 · Valid_If: =OR([Es_Demasia],[_THIS] > 0) · solo lectura
- **\_Exceso** [Decimal] · fórmula =[_Cant_Req] - [Cant_Cubre_Req] Read-Only Yes Hidden No Label No Formula version 0 · solo lectura
- **\_Aviso_Exceso** [Text] · fórmula =IF([_Exceso] > 0, " ⚠ Compras " & [_Exceso] & " " & [_UM_Req] & " más de lo pedido. Indica el sustento.", "") Read-Only Yes Hidden No Label No Formula version 0 · Show_If: =AND(NOT([Es_Demasia]),[_Exceso] > 0) · solo lectura
- **Related Des_Productos** [List] · ref→Des_Productos · solo lectura

## Tabla `Base de datos Proveedores` · ALL_CHANGES

### Columnas

- **\_RowNumber** [Number] · solo lectura
- **RUC** [Text] · CLAVE
- **RAZON SOCIAL** [Text]
- **CONDICION COMERCIAL** [Text]
- **TIPO PROVEEDOR** [Enum] · enum ["Cajas - Cartón","Termoformado Blister","Servicios Generales","Mobiliario Acero","Mobiliario Madera","Mobiliario Melamine","Mobliario General","Computo","Herramientas","Materiales construcción","Equipos Laboratorio","Linea Blanca","Equipos electrónicos","Varios","Placas de acero Inoxidable","EPPs","Fundas","Hojalata","Artículos Limpieza","Artículos Oficina","Artículos de Plástico","Artículos Cocina ","Suministros Eléctricos","Impresiones Gráficos","Pilas Baterias","Tecnológico","STRECH FILM","Costura","Transporte","Artículo de cocina","Audiovisual","Medición","Botiquin","Extintores","Menaje de cocina y electro","Fabricación Equipos Cocina","Industria Cocina","Equipos de audio","Ferreteria","Viniles - laminas","ETIQUETAS","Filamentos","Maquinas - Equipos de construccion","Manga Plastico azul","Contenedores basura","Renderización","Equipos de soldadura","Fabricacion de uniformes","Mangueras","Spray Galvanizado","Barretas Dielectricas","Piso spc","Equipos de conectividad","Conexiones eléctricas","Tuberias flexibles","Útiles","Herramienta de carpintería ","Suministros Iluminación","Toner, tintas y cartuchos ","Productos farmaceuticos y médicos","Certificaciones","Calibracion de Equipos","Aceros y Fierros","Alimentos varios (granos)","Pizarra Adhesiva","Plataforma Veritrade 2026 Latam Uno","Recojo residuos","Ducteria Ventilacion Industrial","Plastificado","Materiales de encuadernacion","Alquiler movilidad ","Cajas de agua","Vidrieria","Tableros eléctricos","Aceites Industriales","Tapajuntas","Servicio de identificación PDT - Beneficiario Final 2024","Auditoria","Publicidad","Suministro e instalación de puerta metálica","Semillas","Agujas de máquina bordeadora","Software Generales","Proyector","Transporte - Mecanica","Catering","Rack","Alquiler movilidad Huancavelica","Producción Audiovisual","Placas Vidrio","Soldadura","Antivirus","Kit de Robótica","Neumática","Servicios Profesionales","ESPUMAS DE PU","Subliminacion","Cuero","Mangueras y accesorios","Regatones","Servicio Reparacion motores electricos","GPS","Reparación de Asensores"]
- **CONTACTO** [Text]
- **TELEFONO** [Text]
- **CORREO** [Email]
- **BANCO** [Enum] · enum ["Interbank","Caja Arequipa","BCP","Scotiabank","BBVA","Banco de la Nación","BanBif","Web"]
- **MONEDA** [Enum] · enum ["PEN","USD","EUR","GBP"]
- **NÚMERO DE CTA** [Text]
- **CCI** [Text] · Show_If: =[ORIGEN] <> "Extranjero
- **BANCO 2** [Enum] · enum ["Interbank","Caja Arequipa","BCP","Scotiabank","BBVA","Banco de la Nación","BanBif","Web"]
- **MONEDA 2** [Enum] · enum ["PEN","USD","EUR","GBP"]
- **NÚMERO DE CTA 2** [Text] · Show_If: =[ORIGEN] <> "Extranjero
- **CCI 2** [Text] · Show_If: =[ORIGEN] <> "Extranjero
- **CTA DETRACCIÓN** [Text] · Show_If: =[ORIGEN] <> "Extranjero
- **DIRECCIÓN** [LongText]
- **LINK CUENTAS** [Url]
- **ARCHIVO_CUENTAS** [File]
- **Es_Agente_Retencion** [Yes/No] · inicial =TRUE · Show_If: =[ORIGEN] <> "Extranjero · Editable_If: =OR(NOT([Verifica do_Contab]), IN("CONTABILIDAD
- **Es_Buen_Contribuyente** [Yes/No] · inicial =TRUE · Show_If: =[ORIGEN] <> "Extranjero · Editable_If: =OR(NOT([Verifica do_Contab]), IN("CONTABILIDAD
- **Verificado_Contab** [Yes/No] · inicial =FALSE · Show_If: =AND([ORIGEN] <> "Extranjero
- **Verificado_Por** [Email] · inicial =USEREMAIL() · Show_If: =AND([ ORIGEN] <> "Extranjero
- **Fecha_Verificacion** [DateTime]
- **ORIGEN** [Enum] · enum ["Nacional","Extranjero"] · inicial ="Nacional"
- **PAIS** [Text] · Show_If: =[ORIGEN] = "Extranjero
- **CIUDAD_PAIS** [Text] · Show_If: =[ORIGEN] = "Extranjero
- **FORMA_PAGO_EXT** [Enum] · enum ["Transferencia","Plataforma"]
- **DIRECCION_BANCO** [Text] · Show_If: =[ORIGEN] = "Extranjero
- **CIUDAD_BANCO** [Text] · Show_If: =[ORIGEN] = "Extranjero
- **SWIFT** [Text] · Show_If: =[ORIGEN] = "Extranjero
- **IBAN** [Text] · Show_If: =[ORIGEN] = "Extranjero
- **ABA_BANK_CODE** [Text] · Show_If: =[ORIGEN] = "Extranjero
- **BRANCH_CODE** [Text] · Show_If: =[ORIGEN] = "Extranjero
- **NOMBRE_CUENTA** [Text] · Show_If: =[ORIGEN] = "Extranjero
- **BANCO_INTERMEDIARIO** [Text] · Show_If: =[ORIGEN] = "Extranjero
- **SWIFT_INTERMEDIARIO** [Text] · Show_If: =[ORIGEN] = "Extranjero
- **Related OCs** [List] · ref→OC · solo lectura
- **\_Retencion** [Text] · fórmula =IFS( [ORIGEN] = "Extranjero", "No aplica", [Verificado_Contab] <> TRUE, " ⚠ Por verificar", OR([Es_Agente_Retencion] = TRUE, [Es_Buen_Contribuyente] = TRUE), " ✓ No retener", TRUE, " ✓ Retener 3%" ) Read-Only Yes Hidden No Label No Formula version 0 · solo lectura
- **Related Pagos** [List] · ref→Pagos · solo lectura

## Tabla `Conceptos` · ALL_CHANGES

### Columnas

- **\_RowNumber** [Number] · solo lectura
- **Concepto** [Text] · CLAVE
- **Related Conceptos_Gasto_Imps** [List] · ref→Conceptos_Gasto_Imp · solo lectura

### Acciones

- **Delete** (DELETE_RECORD)
- **Edit** (EDIT_RECORD)
- **Add** (ADD_RECORD)

## Tabla `Empresas` · ALL_CHANGES

### Columnas

- **\_RowNumber** [Number] · solo lectura
- **Unidad de negocio** [Text] · CLAVE
- **Razón Social** [Text]
- **RUC** [Text]
- **Dirección** [Text]
- **Logo** [Image]
- **Carpeta_OC_Raiz** [Url]
- **Carpeta_OC_Raiz_Imp** [Text]
- **Related OCs** [List] · ref→OC · solo lectura
- **Related Proyectos** [List] · ref→Proyectos · solo lectura

### Acciones

- **Delete** (DELETE_RECORD)
- **Edit** (EDIT_RECORD)
- **Add** (ADD_RECORD)
- **Open Url (Carpeta_OC_Raiz)** (NAVIGATE_URL) — si: `NOT(ISBLANK([Carpeta_OC_Raiz]))`

## Tabla `Solicitud_Items` · ALL_CHANGES

### Columnas

- **\_RowNumber** [Number] · solo lectura
- **ID_Item** [Text] · inicial UNIQUEID() · solo lectura · CLAVE
- **Solicitud_Ref** [Ref] · ref→Solicitudes
- **N_Item** [Text] · inicial =COUNT(SELECT(Solicitud_Items[ID_Item], [Solicitud_Ref] = [_THISROW].[Solicitud_Ref])) + 1 · Editable_If: =CONT EXT("ViewType") <> "Form
- **Tipo** [Enum] · enum ["Bienes","Accesorios","Componentes","Servicio","Activos fijos","Muestra","Economato","Insumos","Mantenimiento","Mercad eria"]
- **Codigo_Cliente** [Text] · Required_If: =AND(\n [Solicitud_Ref]. [Tipo_Solicitud] = "Proyecto
- **Descripcion** [Text] · Editable_If: =IN([Sol icitud_Ref].[Estado], LIST("Borrador
- **Unidad_Medida** [Enum] · enum ["Unidad","Caja","Gramos","Set","Kit","Metro","Metro cubico","Galon","Cm","Ml","Litros","Paquete"]
- **Cantidad** [Decimal] · Editable_If: =IN([Solicitud_Ref ].[Estado], LIST("Borrador
- **Ficha_Tecnica** [File]
- **Referencia_Link** [Url]
- **Detalle** [Text] · Editable_If: =IN([Sol icitud_Ref].[Estado], LIST("Borrador
- **Plazo_Adquisicion** [Date] · Editable_If: =IN([Soli citud_Ref].[Estado], LIST("Borrador
- **Estatus_Item** [Text] · solo lectura
- **Related Items** [List] · ref→Items · fórmula =REF_ROWS("Items", "Solicitud_Item_Ref") Read-Only Yes Hidden Yes Label No Formula version 0 · solo lectura
- **\_Estado_Compra** [Text] · fórmula =IF( COUNT(SELECT(Items[ID_Item], [Solicitud_Item_Ref] = [_THISROW].[ID_Item])) = 0, "", ANY(SELECT(Items[Estado del Item], [Solicitud_Item_Ref] = [_THISROW].[ID_Item])) ) Read-Only Yes Hidden No Label No Formula version 0 · Show_If: =ISNOTBLANK([_Estado_Compra]) · solo lectura

### Acciones

- **Delete** (DELETE_RECORD Only if this condition is true =IN([Solicitud_) — si: `=IN([Solicitud_Ref].[Estado], LIST("Borrador", "Observada"))`
- **Edit** (EDIT_RECORD Only if this condition is true =IN([Solicitud_Re) — si: `=IN([Solicitud_Ref].[Estado], LIST("Borrador", "Observada"))`
- **Add** (ADD_RECORD Only if this condition is true =TRUE) — si: `=TRUE`
- **View Ref (Solicitud_Ref)** (NAVIGATE_APP) — si: `NOT(ISBLANK([Solicitud_Ref]))`
- **Open File (Ficha_Tecnica)** (OPEN_FILE) — si: `NOT(ISBLANK([Ficha_Tecnica]))`
- **Open Url (Referencia_Link)** (NAVIGATE_URL) — si: `NOT(ISBLANK([Referencia_Link]))`
- **\_Clonar item al nuevo** (ADD_RECORD_TO Only if this condition is true true) — si: `true` — pone: Solicitud_Ref== [Solicitud_Ref].[Nueva_Solicitud_ID]; Tipo==[Tipo]; Codigo_Cliente== [Codigo_Cliente]; Descripcion== [Descripcion]; Unidad_Medida== [Unidad_Medida]; Cantidad==[Cantidad]; Ficha_Tecnica== [Ficha_Tecnica]; Referencia_Link== [Referencia_Link]; Detalle==[Detalle]; Plazo_Adquisicion== [Plazo_Adquisicion]

## Tabla `Solicitudes` · ALL_CHANGES

### Columnas

- **\_RowNumber** [Number] · solo lectura
- **ID_Solicitud** [Text] · inicial UNIQUEID() · CLAVE
- **N_Solicitud_old** [Text]
- **Fecha_Solicitada** [Date] · inicial =TODAY() · solo lectura
- **Solicitante** [Text] · inicial =LOOKUP(USEREMAIL(), "Usuarios", "Email", "Nombre") · Editable_If: =CONT EXT("ViewType") <> "Form
- **Email_Solicitante** [Email] · inicial =USEREMAIL() · Editable_If: =CONTEXT("ViewType") <> "Form
- **Tipo_Solicitud** [Enum] · enum ["Proyecto","Administrativa","Muestras","Otros"]
- **Jefe_Email** [Email] · inicial =ANY( SELECT( Usuarios[Jefe], LOWER(TRIM([Email])) = LOWER(TRIM([_THISROW].[Email_Solicitante])) ) ) · Editable_If: =CONTEXT("ViewType") <> "Form
- **Estado** [Enum] · enum ["Borrador","Pendiente Liberación","Liberada","En Req","Atendida","Observada","Rechazada","Cancelada"] · inicial ="Borrador"
- **Marca_Temporal** [Text] · inicial =NOW()
- **Estado_Previo_Sol** [Text]
- **Motivo_Observacion** [LongText] · Editable_If: = [_MiArea]="Requerimientos
- **Motivo_Cancelacion** [Text] · Editable_If: =USERE MAIL()=[Jefe_Email]
- **Nueva_Solicitud_ID** [Text]
- **Sustento** [LongText] · Editable_If: =IN([Est ado], LIST("Borrador
- **Nuevo_ID_Req** [Text]
- **Proyecto_Ref** [Ref] · ref→Proyectos · Editable_If: =ISBLANK([ID_Proyecto])
- **Etapa_Ref** [Ref] · ref→Proyecto_Etapas
- **Archivo_Items** [File] · Show_If: =AND(\n IN([ID_Solicitud], Solicitudes[ID_Solicitud]),\n [Estado] = "Borrador"\n)
- **Lote_Actual** [Text] · solo lectura
- **Estado_Carga** [Text] · Show_If: =AND(\n ISNOTBLANK([ID_Solicitud]),\n [Estado_Carga] = "Revision"\n) · Editable_If: =CONTEXT("Vie wType") <> "Form
- **Resumen_Carga** [Text] · Show_If: =AND(\n ISNOTBLANK([ID_Solicitud]),\n [Estado_Carga] = "Revision"\n) · solo lectura
- **Liberado_Por** [Email] · Editable_If: =CONTEXT("ViewType") <> "Form
- **Fecha_Liberacion** [DateTime] · Editable_If: =CONTEXT("ViewT ype") <> "Form
- **Generar_PDF** [Text]
- **PDF_Solicitud_old** [Url]
- **Observado_Por** [Email]
- **Motivo_Rechazo** [Text]
- **Rechazado_Por** [Email]
- **Fecha_Rechazo** [DateTime]
- **Related Solicitud_Items** [List] · ref→Solicitud_Items · solo lectura
- **\_Cantidad_Items** [Number] · fórmula =COUNT([Related Solicitud_Items]) Read-Only Yes Hidden No Label No Formula version 0 · solo lectura
- **\_MiArea** [Text] · fórmula =LOOKUP(USEREMAIL(),"Usuarios","Email","Área") Read-Only Yes Hidden No Label No Formula version 0 · solo lectura
- **Related Requerimientos** [List] · ref→Requerimientos · solo lectura
- **\_Ruta_Archivo** [Text] · fórmula =CONCATENATE([Archivo_Items]) Read-Only Yes Hidden No Label No Formula version 0 · solo lectura
- **Related Carga_items** [List] · ref→Carga_items · solo lectura
- **\_Items_Con_Error** [Number] · fórmula =COUNT(FILTER("Carga_Items", AND([Solicitud_Ref] = [_THISROW].[ID_Solicitud], [Estado_Fila] = "Error", [Lote_ID] = [_THISROW].[Lote_Actual]))) Read-Only Yes Hidden No Label No Formula version 0 · Show_If: =AND (\n ISNOTBLANK([ID_Solicitud]),\n [Estado_Carga] = "Revision"\n) · solo lectura
- **\_Items_Listos** [Number] · fórmula =COUNT( FILTER("Carga_Items", AND( [Solicitud_Ref] = [_THISROW].[ID_Solicitud], IN([Estado_Fila], LIST("Valido", "Advertencia")), [Lote_ID] = [_THISROW].[Lote_Actual] ) ) ) Read-Only Yes Hidden No Label No Formula version 0 · Show_If: =AND (\n ISNOTBLANK([ID_Solicitud]),\n [Estado_Carga] = "Revision"\n) · solo lectura
- **\_Carga_Errores** [List] · ref→Carga_Errores · fórmula =FILTER("Carga_Items", AND( [Solicitud_Ref] = [_THISROW]. [ID_Solicitud], [Estado_Fila] = "Error", [Lote_ID] = [_THISROW]. [Lote_Actual] ) ) Read-Only Yes Hidden No Label No Formula version 0 · solo lectura
- **\_Carga_Listos** [List] · ref→Carga_Listos · fórmula =FILTER("Carga_Items", AND( [Solicitud_Ref] = [_THISROW]. [ID_Solicitud], IN([Estado_Fila], LIST("Valido", "Advertencia")), [Lote_ID] = [_THISROW].[Lote_Actual] ) ) Read-Only Yes Hidden No Label No Formula version 0 · solo lectura
- **\_Aprobadores** [List] · fórmula =IFS( AND([Tipo_Solicitud] = "Proyecto", ISNOTBLANK([Etapa_Ref])), [Etapa_Ref].[Aprobadores], TRUE, LIST([Jefe_Email]) ) Read-Only Yes Hidden No Label No Formula version 0 · solo lectura
- **\_Soy_Aprobador** [Yes/No] · fórmula =IN(USEREMAIL(), [_Aprobadores]) Read-Only Yes Hidden No Label No Formula version 0 · solo lectura
- **\_Proyecto** [Text] · fórmula =[Proyecto_Ref].[Etiqueta_Proyecto] Read-Only Yes Hidden No Label No Formula version 0 · solo lectura
- **\_Etapa** [Text] · fórmula =[Etapa_Ref].[Nombre_Etapa] Read-Only Yes Hidden No Label No Formula version 0 · solo lectura
- **\_Liberado_Por_Nombre** [Text] · fórmula =LOOKUP([Liberado_Por], "Usuarios", "Email", "Nombre") Read-Only Yes Hidden No Label No Formula version 0 · solo lectura
- **\_Quien_soy** [Email] · fórmula =USEREMAIL() Read-Only Yes Hidden Yes Label No Formula version 0 · solo lectura
- **\_Debug** [Text] · fórmula =CONCATENATE( "[", [Etapa_Ref].[Aprobadores], "]", " || user: [", USEREMAIL(), "]", " || etapa: [", [Etapa_Ref], "]" ) Read-Only Yes Hidden Yes Label No Formula version 0 · solo lectura
- **\_Aviso_Carga** [Text] · fórmula =" 💾 Guarda tu solicitud y luego carga tus ítems." Read-Only Yes Hidden No Label No Formula version 0 · Show_If: =NOT(IN([ID_Solicitud], Solicitudes[ID_Solicitud])) · solo lectura
- **\_Requiere_Aprobacion** [Yes/No] · fórmula =OR( COUNT(SELECT(Solicitud_Items[ID_Item], AND([Solicitud_Ref] = [_THISROW].[ID_Solicitud], NOT(IN([ID_Item], Items[Solicitud_Item_Ref]))))) > 0, COUNT(SELECT(Items[ID_Item], AND([ID_Req] = [_THISROW]. [Nuevo_ID_Req], ISNOTBLANK([Solicitud_Item_Ref].[ID_Item]), OR([Solicitud_Item_Ref].[Cantidad] > [CANTIDAD REQUERIDA], [Solicitud_Item_Ref].[Descripcion] <> [DESCRIPCIÓN CLIENTE])))) > 0 ) Read-Onl · solo lectura
- **\_Aviso_Aprobacion** [Text] · fórmula =" ⚠ Agregaste ítems o aumentaste cantidades: al reenviar, la solicitud volverá a aprobación." Read-Only Yes Hidden No Label No Formula version 0 · Show_If: =AND([Estado] = "Observada · solo lectura
- **N_Solicitud** [Text] · fórmula =LOOKUP([_THISROW].[ID_Solicitud], "Solicitud_Docs", "ID_Solicitud", "N_Solicitud") Read-Only Yes Hidden No Label Yes Formula version 0 · solo lectura
- **PDF_Solicitud** [Url] · fórmula =LOOKUP([_THISROW].[ID_Solicitud], "Solicitud_Docs", "ID_Solicitud", "PDF_Solicitud") Read-Only Yes Hidden No Label No Formula version 0 · solo lectura
- **\_Motivo_Cierre** [Text] · fórmula =IFS( [Estado] = "Cancelada", [Motivo_Cancelacion], [Estado] = "Rechazada", [Motivo_Rechazo] ) Read-Only Yes Hidden No Label No Formula version 0 · Show_If: =IN([Estado], LIST("Cancelada · solo lectura

### Acciones

- **Delete** (DELETE_RECORD Only if this condition is true =[Estado] = "Bo) — si: `=[Estado] = "Borrador"`
- **Edit** (EDIT_RECORD Only if this condition is true =IN([Estado], LIS) — si: `=IN([Estado], LIST("Borrador", "Observada"))`
- **Compose Email (Email_Solicitante)** (EMAIL) — si: `NOT(ISBLANK([Email_Solicitante]))`
- **Compose Email (Jefe_Email)** (EMAIL) — si: `NOT(ISBLANK([Jefe_Email]))`
- **Add** (ADD_RECORD)
- **Guardar Action - 1** (ADD_RECORD_TO Only if this condition is true true) — si: `true` — pone: Nombre_Proyecto== [Proyecto_Nuevo_Nombre]
- **Completar y reenviar** (SET_COLUMN_VALUE) — si: `=AND([Estado] = "Observada", USEREMAIL() = [Email_Solicitante])` — pone: Estado==IF([_Requiere_A probacion], \"Pendiente Liberación\", \"En Req\"); Liberado_Por==IF([_Requi ere_Aprobacion], \"\", [Liberado_Por]); Fecha_Liberacion==IF([_R equiere_Aprobacion], \"\", [Fecha_Liberacion])
- **Emitir solicitud** (SET_COLUMN_VALUE) — si: `=AND( [Estado] = "Borrador", COUNT([Related Solicitud_Items]) > 0, ISNOTBLANK([Sustento]), [_Items_Con_Error] = 0, OR( ISBLANK([Etapa_Ref]), COUNT([Etapa_Ref].[Aprobadores]) > 0 ) )` — pone: Estado==\"Pendiente Liberación\"
- **Liberar solicitud** (SET_COLUMN_VALUE) — si: `=AND( [Estado] = "Pendiente Liberación", IN(TRIM(LOWER(USEREMAIL())), [_Aprobadores]) )` — pone: Estado==\"Liberada\"; Liberado_Por==USEREM AIL(); Fecha_Liberacion==NOW ()
- **Rechazar** (SET_COLUMN_VALUE) — si: `=AND( [Estado] = "Pendiente Liberación", IN(TRIM(LOWER(USEREMAIL())), [_Aprobadores]) )` — pone: Estado==\"Rechazada\"; Motivo_Rechazo== [_INPUT].[Motivo]; Rechazado_Por==USERE MAIL(); Fecha_Rechazo==NOW()
- **Cancelar Solicitud** (SET_COLUMN_VALUE) — si: `=AND( IN([Estado], LIST("Borrador", "Pendiente Liberación", "Liberada")), ISBLANK([Nuevo_ID_Req]), TRIM(LOWER(USEREMAIL())) = TRIM(LOWER([Email_Solicitante])) )` — pone: Estado==\"Cancelada\"; Motivo_Cancelacion== [_INPUT]. [Motivo]
- **Generar nueva solicitud** (SET_COLUMN_VALUE) — si: `=AND( IN([Estado], LIST("Rechazada", "Cancelada")), ISBLANK([Nueva_Solicitud_ID]), TRIM(LOWER(USEREMAIL())) = TRIM(LOWER([Email_Solicitante])) )` — pone: Nueva_Solicitud_ID==UN IQUEID()
- **Action for Clonar cabecera** (ADD_RECORD_TO Only if this condition is true true) — si: `true` — pone: ID_Solicitud== [Nueva_Solicitud_ID]; Tipo_Solicitud== [Tipo_Solicitud]; Proyecto_Ref== [Proyecto_Ref]; Jefe_Email== [Jefe_Email]; Etapa_Ref== [Etapa_Ref]; Sustento== [Sustento]; Estado==\"Borrador\"; Email_Solicitante== [Email_Solicitante]; Solicitante== [Solicitante]
- **Clonar items Action - 1** (REF_ACTION Only if this condition is true true) — si: `true`
- **Generar requerimiento** (SET_COLUMN_VALUE) — si: `=[Estado] = "Liberada"` — pone: Nuevo_ID_Req==IF(ISBL ANK([Nuevo_ID_Req]), UNIQUEID(), [Nuevo_ID_Req]); Estado==\"En Req\"
- **View Ref (Etapa_Ref)** (NAVIGATE_APP) — si: `NOT(ISBLANK([Etapa_Ref]))`
- **View Ref (Proyecto_Ref)** (NAVIGATE_APP) — si: `NOT(ISBLANK([Proyecto_Ref]))`
- **Open File (Archivo_Items)** (OPEN_FILE) — si: `NOT(ISBLANK([Archivo_Items]))`
- **4_Procesar listos** (REF_ACTION Only if this condition is true true) — si: `true`
- **5_Cerrar carga** (SET_COLUMN_VALUE) — si: `true` — pone: Estado_Carga==\"Confir mado\"
- **Confirmar carga (masivo)** (SET_COLUMN_VALUE) — si: `=AND([_Items_Listos] > 0, [Estado_Carga] = "Revision")` — pone: Estado_Carga==\"Confir mando\"
- **Compose Email (Liberado_Por)** (EMAIL) — si: `NOT(ISBLANK([Liberado_Por]))`
- **Compose Email (\_Quien_soy)** (EMAIL) — si: `NOT(ISBLANK([_Quien_soy]))`
- **Open Url (PDF_Solicitud)** (NAVIGATE_URL) — si: `NOT(ISBLANK([PDF_Solicitud]))`
- **Compose Email (Observado_Por)** (EMAIL) — si: `NOT(ISBLANK([Observado_Por]))`
- **Devolver de Req** (SET_COLUMN_VALUE) — si: `=AND([Estado] = "En Req", USEREMAIL() = [Email_Solicitante], ANY(SELECT(Requerimientos[Estado_Req], [Solicitud_Ref] = [_THISROW].[ID_Solicitud])) = "En Proceso")` — pone: Estado==\"Observada\"; Motivo_Observacion== [_INPUT].[Motivo]; Observado_Por==USERE MAIL()
- **Marcar observada (sistema)** (SET_COLUMN_VALUE) — si: `true` — pone: Estado==\"Observada\"; Motivo_Observacion==A NY(SELECT(Requerimientos[Motivo_Observacion], [Solicitud_Ref] = [_THISROW].[ID_Solicitud])); Observado_Por==ANY(SE LECT(Requerimientos[Observado_Por], [Solicitud_Ref] = [_THISROW]. [ID_Solicitud]))
- **Action for Marcar Observado** (REF_ACTION Only if this condition is true true) — si: `true`
- **Action for Marcar Anulado** (REF_ACTION Only if this condition is true true) — si: `true`
- **Asignar N° Solicitud** (ADD_RECORD_TO) — si: `=NOT(IN([ID_Solicitud], Solicitud_Docs[ID_Solicitud]))` — pone: ID_Solicitud== [ID_Solicitud]; N_Solicitud==\"SOL-\" & YEAR(TODAY()) & \"-\" & RIGHT(\"0000\" & (MAX(Solicitud_Docs[_Num]) + 1), 4)
- **Action for Asignar N° Solicitud.** (REF_ACTION Only if this condition is true true) — si: `true`
- **Open Url (PDF_Solicitud_old)** (NAVIGATE_URL) — si: `NOT(ISBLANK([PDF_Solicitud_old]))`
- **Limpiar PDF de la solicitud** (REF_ACTION Only if this condition is true true) — si: `true`
- **Completar, reenviar y PDF de la solicitud** (COMPOSITE Only if this condition is true =AND( [Estado] = "O) — si: `=AND( [Estado] = "Observada", TRIM(LOWER(USEREMAIL())) = TRIM(LOWER([Email_Solicitante])) )` — ejecuta: Completar y reenviar, Limpiar PDF de la solicitud
- **Compose Email (Rechazado_Por)** (EMAIL) — si: `NOT(ISBLANK([Rechazado_Por]))`
- **Solicitar anulación del requerimiento** (NAVIGATE_APP) — si: `=AND( [Estado] = "En Req", TRIM(LOWER(USEREMAIL())) = TRIM(LOWER([Email_Solicitante])), ISNOTBLANK([Nuevo_ID_Req]), COUNT(SELECT(Anulaciones[ID_Anulacion], AND([ID_Req] = [_THISROW].[Nuevo_ID_Req], IN([Estado], LIST("Pendiente", "Aprobada"))))) = 0 )`

## Tabla `Proyectos` · ALL_CHANGES

### Columnas

- **\_RowNumber** [Number] · solo lectura
- **Nombre_Proyecto** [Text]
- **Codigo_Proyecto** [Text] · Required_If: =([Estado] = "Ganado")
- **ID_Proyecto** [Text] · inicial =uniqueid() · Editable_If: =ISBLA NK([ID_Proyecto]) · CLAVE
- **Empresa** [Ref] · ref→Empresas
- **Gerente_Email** [Email]
- **Estado** [Enum] · enum ["Estudio de mercado","Ganado","Perdido"]
- **Nombre_Cliente** [Text] · Required_If: =([Estado] = "Ganado")
- **Fecha_Registro** [DateTime] · inicial =NOW() · solo lectura
- **Related Proyecto_Etapas** [List] · ref→Proyecto_Etapas · solo lectura
- **Related Solicitudes** [List] · ref→Solicitudes · fórmula =REF_ROWS("Solicitudes", "Proyecto_Ref") Read-Only Yes Hidden Yes Label No Formula version 0 · solo lectura
- **Etiqueta_Proyecto** [Text] · fórmula =IF(ISBLANK([Codigo_Proyecto]), [Nombre_Proyecto], [Codigo_Proyecto]) Read-Only Yes Hidden No Label Yes Formula version 0 · solo lectura
- **Related Solicitudes By Proyecto_Ref** [List] · ref→Solicitudes · solo lectura

### Acciones

- **Delete** (DELETE_RECORD)
- **Edit** (EDIT_RECORD)
- **Add** (ADD_RECORD)
- **View Ref (Empresa)** (NAVIGATE_APP) — si: `NOT(ISBLANK([Empresa]))`
- **Compose Email (Gerente_Email)** (EMAIL) — si: `NOT(ISBLANK([Gerente_Email]))`
- **Marcar como Ganado** (SET_COLUMN_VALUE) — si: `=[Estado] = "Estudio de mercado"` — pone: Estado==\"Ganado\"
- **Marcar como Perdido** (SET_COLUMN_VALUE) — si: `=[Estado] = "Estudio de mercado"` — pone: Estado==\"Perdido\"
- **Action for Agregar etapa** (ADD_RECORD_TO Only if this condition is true true) — si: `true` — pone: Proyecto_Ref== [ID_Proyecto]; Nombre_Etapa==\"Gener al\"; Aprobadores==LIST([Ger ente_Email]); Orden==1

## Tabla `Proyecto_Etapas` · ALL_CHANGES

### Columnas

- **\_RowNumber** [Number] · solo lectura
- **ID_Etapa** [Text] · inicial UNIQUEID() · CLAVE
- **Proyecto_Ref** [Ref] · ref→Proyectos · Editable_If: =ISBLANK([ID_Proyecto])
- **Nombre_Etapa** [Text]
- **Aprobadores** [EnumList]
- **Orden** [Number] · inicial =COUNT(SELECT(Proyecto_Etapas[ID_Etapa], [Proyecto_Ref] = [_THISROW].[Proyecto_Ref])) + 1
- **Related Solicitudes** [List] · ref→Solicitudes · solo lectura

### Acciones

- **Delete** (DELETE_RECORD)
- **Edit** (EDIT_RECORD)
- **Add** (ADD_RECORD)
- **View Ref (Proyecto_Ref)** (NAVIGATE_APP) — si: `NOT(ISBLANK([Proyecto_Ref]))`

## Tabla `Carga_items` · ALL_CHANGES

### Columnas

- **\_RowNumber** [Number] · solo lectura
- **ID_Carga** [Text] · inicial UNIQUEID() · solo lectura · CLAVE
- **Lote_ID** [Text] · solo lectura
- **Solicitud_Ref** [Ref] · ref→Solicitudes · solo lectura
- **Fila_Excel** [Text] · solo lectura
- **N_Item** [Text]
- **Tipo** [Enum] · enum ["Bienes","Accesorios","Componentes","Servicio","Activos fijos","Muestra","Economato","Insumos","Mantenimiento","Mercad eria"]
- **Codigo_Cliente** [Text]
- **Descripcion** [Text]
- **Detalle** [Text]
- **Unidad_Medida** [Enum] · enum ["Unidad","Caja","Gramos","Set","Kit","Metro","Metro cubico","Galon","Cm","Ml","Litros","Paquete"]
- **Cantidad** [Text] · Valid_If: =NUMBER([Cantidad]) > 0
- **Referencia_Link** [Text]
- **Plazo_Adquisicion** [Text]
- **Estado_Fila** [Text] · Editable_If: =CONT EXT("ViewType") <> "Form
- **Errores** [Text] · solo lectura
- **Advertencias** [Text] · solo lectura
- **Marca_Temporal** [Text] · solo lectura
- **\_Es_Valido** [Yes/No] · fórmula =AND( ISNOTBLANK([N_Item]), ISNOTBLANK([Tipo]), ISNOTBLANK([Descripcion]), ISNOTBLANK([Unidad_Medida]), NUMBER([Cantidad]) > 0, ISNOTBLANK([Plazo_Adquisicion]), ISBLANK( FILTER("Solicitud_Items", AND( [Solicitud_Ref] = [_THISROW].[Solicitud_Ref], [N_Item] = [_THISROW].[N_Item] ) ) ) ) Read-Only Yes Hidden No Label No Formula version 0 · solo lectura

### Acciones

- **Delete** (DELETE_RECORD)
- **Edit** (EDIT_RECORD)
- **Add** (ADD_RECORD)
- **View Ref (Solicitud_Ref)** (NAVIGATE_APP) — si: `NOT(ISBLANK([Solicitud_Ref]))`
- **1_Copiar item** (ADD_RECORD_TO Only if this condition is true true) — si: `true` — pone: Solicitud_Ref== [Solicitud_Ref]; N_Item==[N_Item]; Tipo==[Tipo]; Codigo_Cliente== [Codigo_Cliente]; Descripcion== [Descripcion]; Detalle== [Detalle]; Unidad_Medida== [Unidad_Medida]; Cantidad==NUMBER([Ca ntidad]); Referencia_Link== [Referencia_Link]; Plazo_Adquisicion==DAT E([Plazo_Adquisicion])
- **2_Marcar procesado** (SET_COLUMN_VALUE) — si: `true` — pone: Estado_Fila==\"Procesad o\"
- **3_Copiar y marcar** (COMPOSITE Only if this condition is true true) — si: `true` — ejecuta: 1_Copiar item, 2_Marcar procesado
- **Cargar este item** (COMPOSITE Only if this condition is true =AND([Estado_Fila]) — si: `=AND([Estado_Fila] = "Error", [_Es_Valido])` — ejecuta: 1_Copiar item, 2_Marcar procesado
- **Descartar item** (SET_COLUMN_VALUE) — si: `=[Estado_Fila] = "Error"` — pone: Estado_Fila==\"Descarta do\"

## Tabla `Conceptos_Item` · READ_ONLY

### Columnas

- **\_RowNumber** [Number] · solo lectura
- **Concepto** [Text] · CLAVE

## Tabla `Solicitud_Docs` · ADDS_AND_UPDATES

### Columnas

- **\_RowNumber** [Number] · solo lectura
- **ID_Solicitud** [Text] · inicial UNIQUEID() · CLAVE
- **N_Solicitud** [Text]
- **PDF_Solicitud** [Url]
- **\_Num** [Number] · fórmula =IF(ISBLANK([N_Solicitud]), 0, NUMBER(RIGHT([N_Solicitud], 4))) Read-Only Yes Hidden No Label No Formula version 0 · solo lectura

### Acciones

- **Edit** (EDIT_RECORD)
- **Open Url (PDF_Solicitud)** (NAVIGATE_URL) — si: `NOT(ISBLANK([PDF_Solicitud]))`
- **Add** (ADD_RECORD)
- **Limpiar PDF** (SET_COLUMN_VALUE) — si: `true` — pone: PDF_Solicitud==\"\"

## Tabla `Anulaciones` · ALL_CHANGES

### Columnas

- **\_RowNumber** [Number] · solo lectura
- **ID_Anulacion** [Text] · inicial UNIQUEID() · CLAVE
- **ID_Req** [Ref] · ref→Requerimientos
- **Tipo** [Enum] · enum ["Total","Ítems"]
- **Items** [Text] · Show_If: =[Tipo] = "Ítems · Required_If: =[Tipo] = "Ítems
- **Causa** [Enum] · enum ["Ya no se requiere","Error de emisión","Se vuelve a requerir"]
- **Motivo** [LongText]
- **Solicitado_Por** [Text] · inicial =USEREMAIL() · Show_If: =CONTEXT("ViewType") <> "Form
- **Fecha_Solicitud** [Text] · inicial =NOW() · Show_If: =CONTEXT("ViewType") <> "Form
- **Estado** [Enum] · enum ["Pendiente","Aprobada","Rechazada","Ejecutada","En Compras"] · inicial ="Pendiente"
- **Aprobado_Por** [Text] · Show_If: =AND(CONTEXT("ViewType") <> "Form
- **Fecha_Aprobacion** [Text] · Show_If: =AND(CONTEXT("ViewType") <> "Form
- **Motivo_Rechazo** [Text] · Show_If: =AND(CONTEXT("ViewType") <> "Form
- **Resultado** [Text] · Show_If: =AND(CONTEXT("ViewType") <> "Form
- **Fecha_Ejecucion** [Text] · Show_If: =AND(CONTEXT("ViewType") <> "Form
- **Accion** [Enum] · enum ["Deshabilitar","Rehabilitar"] · inicial ="Deshabilitar"
- **\_Aprobadores** [List] · fórmula =IF( [Causa] = "Error de emisión", LIST(LOOKUP([Solicitado_Por], "Usuarios", "Email", "Jefe")), [ID_Req].[Solicitud_Ref].[_Aprobadores] ) Read-Only Yes Hidden No Label No Formula version 0 · solo lectura
- **\_N_RC** [Text] · fórmula =[ID_Req].[N° RC] Read-Only Yes Hidden No Label No Formula version 0 · solo lectura
- **\_N_Solicitud** [Text] · fórmula =[ID_Req].[Solicitud_Ref].[N_Solicitud] Read-Only Yes Hidden No Label No Formula version 0 · solo lectura
- **\_Proyecto** [Text] · fórmula =[ID_Req].[MOTIVO O PROYECTO] Read-Only Yes Hidden No Label No Formula version 0 · solo lectura
- **\_Items_Afectados** [List] · ref→Items_Anulacion · fórmula =IFS( [Tipo] = "Total", SELECT(Items[ID_Item], [ID_Req] = [_THISROW].[ID_Req]), CONTAINS([Items], "-"), SELECT(Items[ID_Item], AND( [ID_Req] = [_THISROW].[ID_Req], [N° ITEM] >= NUMBER(INDEX(SPLIT([_THISROW].[Items], "-"), 1)), [N° ITEM] <= NUMBER(INDEX(SPLIT([_THISROW].[Items], "- "), 2)))), TRUE, SELECT(Items[ID_Item], AND( [ID_Req] = [_THISROW].[ID_Req], IN(TEXT([N° ITEM]), SPLIT(SUBSTITUTE([_TH · solo lectura

### Acciones

- **Delete** (DELETE_RECORD)
- **Edit** (EDIT_RECORD)
- **Add** (ADD_RECORD)
- **Aprobar Solicitud** (SET_COLUMN_VALUE) — si: `=AND([Estado] = "Pendiente", IN(TRIM(LOWER(USEREMAIL())), [_Aprobadores]))` — pone: Estado==\"Aprobada\"; Aprobado_Por==USEREM AIL(); Fecha_Aprobacion==NO W()
- **Rechazar Solicitud** (SET_COLUMN_VALUE) — si: `true` — pone: Estado==\"Rechazada\"; Motivo_Rechazo== [_INPUT]. [Motivo]
- **View Ref (ID_Req)** (NAVIGATE_APP) — si: `NOT(ISBLANK([ID_Req]))`
- **Ver requerimiento** (NAVIGATE_APP) — si: `true`
- **Ver PDF** (NAVIGATE_URL) — si: `=ISNOTBLANK([ID_Req].[PDF_Req])`

## Tabla `OC_Docs` · ALL_CHANGES

### Columnas

- **\_RowNumber** [Number] · solo lectura
- **ID_OC** [Text] · inicial UNIQUEID() · CLAVE
- **N_OC** [Text]
- **Serie** [Text]
- **Correlativo** [Text]
- **Link_Carpeta** [Text]
- **Carpeta_ID** [Text]
- **Estado** [Text]
- **Mensaje** [Text]
- **Fecha** [Text]
- **PDF_Interna** [Text]
- **PDF_Proveedor** [Text]

### Acciones

- **Delete** (DELETE_RECORD)
- **Edit** (EDIT_RECORD)
- **Add** (ADD_RECORD)

## Tabla `Aprobadores_OC` · ALL_CHANGES

### Columnas

- **\_RowNumber** [Number] · solo lectura
- **ID** [Number] · CLAVE
- **Email** [Email]
- **Nombre** [Text]
- **Rol** [Enum] · enum ["CONTROL_GESTION","GOP","GAF","LIDER_COMPRAS","FINANZ AS","JEFE_COMPRAS_N"]
- **Activo** [Yes/No]

### Acciones

- **Compose Email (Email)** (EMAIL) — si: `NOT(ISBLANK([Email]))`
- **Delete** (DELETE_RECORD)
- **Edit** (EDIT_RECORD)
- **Add** (ADD_RECORD)

## Tabla `Reglas_Aprobacion` · ALL_CHANGES

### Columnas

- **\_RowNumber** [Number] · solo lectura
- **ID** [Number] · CLAVE
- **Tipo_Compra** [Text]
- **Monto_Desde** [Decimal]
- **Monto_Hasta** [Decimal]
- **Ruta** [Text]

### Acciones

- **Delete** (DELETE_RECORD)
- **Edit** (EDIT_RECORD)
- **Add** (ADD_RECORD)

## Tabla `Documentos_OC` · ADDS_AND_UPDATES

### Columnas

- **\_RowNumber** [Number] · solo lectura
- **ID_Doc** [Text] · inicial ="D" & UNIQUEID() · solo lectura · CLAVE
- **OC_Ref** [Ref] · ref→OC
- **Tipo_Doc** [Enum] · enum ["Cotización","Correo de sustento","Factura","Nota de crédito","Guía de remisión","Acta de Conformidad","Valorización","Voucher de pago","Otro","Proforma (PI)","Factura comercial","Packing list","Ficha técnica","Validación técnica","Carta de compatibilidad","SWIFT"]
- **Archivo** [File]
- **Descripcion** [Text]
- **Subido_Por** [Email] · inicial =USEREMAIL() · solo lectura
- **Fecha_Subida** [DateTime] · inicial =NOW() · solo lectura
- **Link_Drive** [Url] · solo lectura
- **Estado_Archivo** [Text] · solo lectura
- **Mensaje** [Text] · solo lectura
- **N_Documento** [Text] · Required_If: =IN([Tipo_Doc], LIST("Factura
- **Monto_Doc** [Decimal] · Show_If: =IN([Tipo_Doc], LIST("Factura · Required_If: =IN([Tipo_Doc], LIST("Factura
- **Fecha_Doc** [Date] · Show_If: =IN([Tipo_Doc], LIST("Factura · Required_If: =IN([Tipo_Doc], LIST("Factura
- **Related Pagos By Factura_Ref** [List] · ref→Pagos · solo lectura
- **Related Pagos By Voucher_Ref** [List] · ref→Pagos · solo lectura
- **\_Etiqueta_Doc** [Text] · fórmula =CONCATENATE( [Tipo_Doc], " ", IF(ISNOTBLANK([N_Documento]), [N_Documento], [Descripcion]), IF(ISNOTBLANK([Monto_Doc]), " · S/ " & TEXT([Monto_Doc]), ""), " · ", TEXT([Fecha_Subida], "DD/MM/YYYY") ) Read-Only Yes Hidden No Label Yes Formula version 0 · solo lectura

### Acciones

- **Edit** (EDIT_RECORD)
- **Add** (ADD_RECORD)
- **View Ref (OC_Ref)** (NAVIGATE_APP) — si: `NOT(ISBLANK([OC_Ref]))`
- **Open File (Archivo)** (OPEN_FILE) — si: `NOT(ISBLANK([Archivo]))`
- **Compose Email (Subido_Por)** (EMAIL) — si: `NOT(ISBLANK([Subido_Por]))`
- **Open Url (Link_Drive)** (NAVIGATE_URL) — si: `NOT(ISBLANK([Link_Drive]))`
- **Action for Vincular Factura** (REF_ACTION Only if this condition is true true) — si: `true`
- **Action for Solicitar** (REF_ACTION Only if this condition is true true) — si: `true`
- **Action for Actualizar Estado de Pago** (REF_ACTION Only if this condition is true true) — si: `true`
- **Fechas de factura Action - 1** (REF_ACTION Only if this condition is true true) — si: `true`

## Tabla `Conceptos_Gasto_Imp` · ALL_CHANGES

### Columnas

- **\_RowNumber** [Number] · solo lectura
- **Concepto** [Ref] · ref→Conceptos · CLAVE
- **Entra_Costo** [Yes/No]
- **Reparto** [Enum] · enum ["Producto","Valor"]
- **Orden** [Number]
- **Activo** [Yes/No]
- **Related Des_Gastos** [List] · ref→Des_Gastos · solo lectura

### Acciones

- **Delete** (DELETE_RECORD)
- **Edit** (EDIT_RECORD)
- **View Ref (Concepto)** (NAVIGATE_APP) — si: `NOT(ISBLANK([Concepto]))`
- **Add** (ADD_RECORD)

## Tabla `Des_Costeo_Hist` · READ_ONLY

### Columnas

- **\_RowNumber** [Number] · solo lectura
- **ID_Hist** [Text] · inicial UNIQUEID() · CLAVE
- **Des_Ref** [Ref] · ref→Desaduanajes
- **Version** [Number]
- **Fecha** [DateTime]
- **Cerrado_Por** [Email]
- **Motivo** [LongText]
- **OC** [Text]
- **Proyecto** [Text]
- **Producto** [Text]
- **Cantidad** [Decimal]
- **EXW_Unit_S** [Decimal]
- **FI** [Decimal]
- **Costo_Unit_S** [Decimal]

### Acciones

- **View Ref (Des_Ref)** (NAVIGATE_APP) — si: `NOT(ISBLANK([Des_Ref]))`
- **Compose Email (Cerrado_Por)** (EMAIL) — si: `NOT(ISBLANK([Cerrado_Por]))`

## Tabla `Des_Gastos` · ALL_CHANGES

### Columnas

- **\_RowNumber** [Number] · solo lectura
- **ID_Gasto** [Text] · inicial UNIQUEID() · CLAVE
- **Des_Ref** [Ref] · ref→Desaduanajes
- **Concepto** [Ref] · ref→Conceptos_Gasto_Imp
- **Entra_Costo** [Yes/No] · inicial =[Concepto].[Entra_Costo] · Reset_If: =TRUE · solo lectura
- **Emisor** [Text]
- **RUC_Emisor** [Text] · Valid_If: =OR(ISBLANK([_THIS]) , LEN([_THIS]) = 11)
- **Tipo_Comprobante** [Enum] · enum ["Factura","Nota de crédito","Nota de débito","Liquidación SUNAT/DAM","Recibido","Otro"] · inicial ="Factura"
- **N_Comprobante** [Text]
- **Fecha_Comprobante** [Date]
- **Moneda** [Enum] · enum ["USD","EUR","PEN"]
- **Monto_Sin_IGV** [Decimal] · inicial =SWITCH([Moneda], "USD", [Des_Ref].[TC_USD], "EUR", [Des_Ref].[TC_EUR], "GBP", [Des_Ref].[TC_GBP], 1) · Reset_If: =TR UE · solo lectura
- **TC_Costeo** [Decimal]
- **Monto_S** [Decimal] · fórmula =[Monto_Sin_IGV] * [TC_Costeo] Read-Only No Hidden No Label No Formula version 0
- **OC_Hija_Ref** [Ref] · ref→OC
- **Archivo** [File]
- **Registrado_Por** [Email]
- **Fecha_Registro** [DateTime] · inicial =NOW() · solo lectura
- **Comentario** [LongText]

### Acciones

- **Delete** (DELETE_RECORD Only if this condition is true =[Des_Ref].[Est) — si: `=[Des_Ref].[Estado] <> "Costeo cerrado"`
- **Edit** (EDIT_RECORD Only if this condition is true =[Des_Ref].[Estad) — si: `=[Des_Ref].[Estado] <> "Costeo cerrado"`
- **View Ref (Concepto)** (NAVIGATE_APP) — si: `NOT(ISBLANK([Concepto]))`
- **View Ref (Des_Ref)** (NAVIGATE_APP) — si: `NOT(ISBLANK([Des_Ref]))`
- **View Ref (OC_Hija_Ref)** (NAVIGATE_APP) — si: `NOT(ISBLANK([OC_Hija_Ref]))`
- **Open File (Archivo)** (OPEN_FILE) — si: `NOT(ISBLANK([Archivo]))`
- **Add** (ADD_RECORD)
- **Compose Email (Registrado_Por)** (EMAIL) — si: `NOT(ISBLANK([Registrado_Por]))`

## Tabla `Des_Productos` · ALL_CHANGES

### Columnas

- **\_RowNumber** [Number] · solo lectura
- **ID_DP** [Text] · inicial UNIQUEID() · CLAVE
- **Des_Ref** [Ref] · ref→Desaduanajes
- **OC_Ref** [Ref] · ref→OC
- **Linea_Ref** [Ref] · ref→Base de datos OC NAC
- **Es_Muestra** [Yes/No]
- **Proyecto** [Text]
- **Descripcion** [Text]
- **Cantidad** [Decimal]
- **Moneda** [Enum] · enum ["USD","EUR","GBP","PEN"]
- **Precio_EXW** [Decimal]
- **Ad_Valorem_USD** [Decimal]
- **EXW_S** [Decimal]
- **Pct_Reparto** [Percent]
- **Gastos_Valor_S** [Decimal]
- **Ad_Valorem_S** [Decimal]
- **Costo_Total_S** [Decimal]
- **Costo_Unit_S** [Decimal]
- **Cant_Recibida** [Decimal]
- **Incidencia** [LongText]
- **Comentario** [LongText]

### Acciones

- **Delete** (DELETE_RECORD)
- **Edit** (EDIT_RECORD)
- **Add** (ADD_RECORD)
- **View Ref (Des_Ref)** (NAVIGATE_APP) — si: `NOT(ISBLANK([Des_Ref]))`
- **View Ref (OC_Ref)** (NAVIGATE_APP) — si: `NOT(ISBLANK([OC_Ref]))`
- **View Ref (Linea_Ref)** (NAVIGATE_APP) — si: `NOT(ISBLANK([Linea_Ref]))`

## Tabla `Desaduanajes` · ALL_CHANGES

### Columnas

- **\_RowNumber** [Number] · solo lectura
- **ID_Des** [Text] · inicial UNIQUEID() · CLAVE
- **N_Des** [Text]
- **Empresa** [Text] · fórmula =[OC_Duena].[Unidad de negocio] Read-Only No Hidden No Label No Formula version 0
- **OC_Duena** [Ref] · ref→OC
- **Romano** [Text]
- **Tipo** [Enum] · enum ["Marítimo","Aéreo","Courier"]
- **Alcance** [Enum] · enum ["Total","Parcial"] · inicial =Total
- **Agente** [Text]
- **BL_AWB** [Text]
- **N_DAM** [Text]
- **Moneda_DAM** [Enum] · enum ["USD","EUR"] · inicial =USD
- **TC_USD** [Text]
- **TC_EUR** [Text]
- **TC_GBP** [Text]
- **Estado** [Enum] · enum ["Borrador","Documentos completos","DAM numerada","Llegada","Levante","En almacén","Costeo cerrado"] · inicial ="Borrador"
- **Chk_Factura** [Yes/No] · Editable_If: =[Estado] = "Borrador
- **Chk_BL** [Yes/No] · Editable_If: =[Estado] = "Borrador
- **Chk_Cert_Origen** [Yes/No] · Editable_If: =[Estado] = "Borrador
- **Chk_Seguro** [Yes/No] · Editable_If: =[Estado] = "Borrador
- **Requiere_Permiso** [Yes/No]
- **Tipo_Permiso** [Text] · Show_If: =[Requiere_Permiso] = TRUE
- **Chk_Permiso** [Yes/No] · Show_If: =[Requiere_Permiso] = TRUE · Editable_If: =[Estado] = "Borrador
- **Fecha_Embarque** [Date]
- **Fecha_Llegada_Est** [Date]
- **Fecha_Numeracion** [Date]
- **Fecha_Llegada** [Date]
- **Fecha_Levante** [Date]
- **Fecha_Almacen** [Date]
- **Link_Carpeta** [Text]
- **Carpeta_ID** [Text]
- **EXW_Total_S** [Number]
- **Gastos_Costo_S** [Text]
- **FI** [Text]
- **Version_Costeo** [Text]
- **Cerrado_Por** [Text]
- **Fecha_Cierre** [Date]
- **Motivo_Reapertura** [Text]
- **Creado_Por** [Text]
- **Fecha_Creacion** [Date]
- **Comentario** [Text]
- **Related Des_Gastos** [List] · ref→Des_Gastos · solo lectura
- **Related Des_Costeo_Hists** [List] · ref→Des_Costeo_Hist · solo lectura
- **Related Des_Productos** [List] · ref→Des_Productos · solo lectura
- **\_N_Des** [Text] · fórmula =LOOKUP([_THISROW].[ID_Des], "Des_Docs", "ID_Des", "N_Des") Read-Only Yes Hidden No Label Yes Formula version 0 · solo lectura
- **\_Romano** [Text] · fórmula =LOOKUP([_THISROW].[ID_Des], "Des_Docs", "ID_Des", "Romano") Read-Only Yes Hidden No Label No Formula version 0 · solo lectura
- **\_Carpeta** [Url] · fórmula =LOOKUP([_THISROW].[ID_Des], "Des_Docs", "ID_Des", "Link_Carpeta") Read-Only Yes Hidden No Label No Formula version 0 · solo lectura
- **Related Des_Documentos** [List] · ref→Des_Documentos · solo lectura
- **\_Doc_Factura** [Yes/No] · fórmula =OR([Chk_Factura] = TRUE, COUNT(SELECT(Des_Documentos[ID_DocDes], AND([Des_Ref] = [_THISROW].[ID_Des], [Tipo_Doc] = "Factura comercial"))) > 0) Read-Only Yes Hidden Yes Label No Formula version 0 · solo lectura
- **\_Doc_BL** [Yes/No] · fórmula =OR([Chk_BL] = TRUE, COUNT(SELECT(Des_Documentos[ID_DocDes], AND([Des_Ref] = [_THISROW].[ID_Des], [Tipo_Doc] = "BL / AWB"))) > 0) Read-Only Yes Hidden Yes Label No Formula version 0 · solo lectura
- **\_Doc_Origen** [Yes/No] · fórmula =OR([Chk_Cert_Origen] = TRUE, COUNT(SELECT(Des_Documentos[ID_DocDes], AND([Des_Ref] = [_THISROW].[ID_Des], [Tipo_Doc] = "Certificado de origen"))) > 0) Read-Only Yes Hidden Yes Label No Formula version 0 · solo lectura
- **\_Doc_Seguro** [Yes/No] · fórmula =OR([Chk_Seguro] = TRUE, COUNT(SELECT(Des_Documentos[ID_DocDes], AND([Des_Ref] = [_THISROW].[ID_Des], [Tipo_Doc] = "Póliza de seguro"))) > 0) Read-Only Yes Hidden Yes Label No Formula version 0 · solo lectura
- **\_Doc_Permiso** [Yes/No] · fórmula =OR([Chk_Permiso] = TRUE, COUNT(SELECT(Des_Documentos[ID_DocDes], AND([Des_Ref] = [_THISROW].[ID_Des], [Tipo_Doc] = "Permiso (MTC / DIGESA)"))) > 0) Read-Only Yes Hidden Yes Label No Formula version 0 · solo lectura
- **\_Docs_Completos** [Yes/No] · fórmula =AND([_Doc_Factura], [_Doc_BL], [_Doc_Origen], [_Doc_Seguro], OR([Requiere_Permiso] <> TRUE, [_Doc_Permiso])) Read-Only Yes Hidden Yes Label No Formula version 0 · solo lectura
- **\_Checklist** [Text] · fórmula =IF([_Docs_Completos], " ✅ Completos", " ❌ Falta: " & SUBSTITUTE(TRIM(CONCATENATE( IF([_Doc_Factura], "", "Factura comercial, "), IF([_Doc_BL], "", "BL / AWB, "), IF([_Doc_Origen], "", "Certificado de origen, "), IF([_Doc_Seguro], "", "Seguro, "), IF(OR([Requiere_Permiso] <> TRUE, [_Doc_Permiso]), "", "Permiso, ") )) & "|", ",|", "")) Read-Only Yes Hidden No Label No Formula version 0 · solo lectura

### Acciones

- **Delete** (DELETE_RECORD)
- **Edit** (EDIT_RECORD)
- **Add** (ADD_RECORD)
- **View Ref (OC_Duena)** (NAVIGATE_APP) — si: `NOT(ISBLANK([OC_Duena]))`
- **Open Url (\_Carpeta)** (NAVIGATE_URL) — si: `NOT(ISBLANK([_Carpeta]))`
- **Documentos completos** (SET_COLUMN_VALUE) — si: `=AND([Estado] = "Borrador", [_Docs_Completos])` — pone: Estado==\"Documentos completos\"
- **Registrar DAM** (SET_COLUMN_VALUE) — si: `=[Estado] = "Documentos completos"` — pone: N_DAM==[_INPUT].[N° DAM]; Fecha_Numeracion== [_INPUT].[Fecha]; Estado==\"DAM numerada\"
- **Registrar llegada** (SET_COLUMN_VALUE) — si: `=[Estado] = "DAM numerada"` — pone: Fecha_Llegada== [_INPUT].[Fecha]; Estado==\"Llegada\" — confirma: «¿R egistrar la llegada de la carga hoy?»
- **Registrar levante** (SET_COLUMN_VALUE) — si: `=[Estado] = "Llegada"` — pone: Fecha_Levante== [_INPUT].[Fecha]; Estado==\"Levante\" — confirma: «¿R egistrar el levante hoy?»
- **Ingreso a almacén** (SET_COLUMN_VALUE) — si: `=[Estado] = "Levante"` — pone: Fecha_Almacen== [_INPUT].[Fecha]; Estado==\"En almacén\" — confirma: «¿R egistrar el ingreso a almacén hoy?»

## Tabla `TC_Costeo` · ALL_CHANGES

### Columnas

- **\_RowNumber** [Number] · solo lectura
- **ID_TC** [Text] · inicial UNIQUEID() · CLAVE
- **Moneda** [Text]
- **TC** [Decimal]
- **Vigente_Desde** [Date] · inicial TODAY()
- **Registrado_Por** [Text]
- **Comentario** [Text]

### Acciones

- **Delete** (DELETE_RECORD)
- **Edit** (EDIT_RECORD)
- **Add** (ADD_RECORD)

## Tabla `Des_Docs` · READ_ONLY

### Columnas

- **\_RowNumber** [Number] · solo lectura
- **ID_Des** [Text] · inicial UNIQUEID() · CLAVE
- **N_Des** [Text]
- **Serie** [Text]
- **Correlativo** [Text]
- **Romano** [Text]
- **OC_Duena** [Text]
- **OC_Carpeta** [Text]
- **Link_Carpeta** [Text]
- **Carpeta_ID** [Text]
- **Estado** [Text]
- **Mensaje** [Text]
- **Fecha** [Text]

## Tabla `Des_Documentos` · ALL_CHANGES

### Columnas

- **\_RowNumber** [Number] · solo lectura
- **ID_DocDes** [Text] · inicial UNIQUEID() · CLAVE
- **Des_Ref** [Ref] · ref→Desaduanajes
- **Tipo_Doc** [Enum] · enum ["Factura comercial","Packing list","BL / AWB","Certificado de origen","Póliza de seguro","Permiso (MTC / DIGESA)","DAM","Otro"]
- **Archivo** [File]
- **Descripcion** [Text]
- **Subido_Por** [Email] · inicial =USEREMAIL()
- **Fecha_Subida** [Date] · inicial =NOW()
- **Link_Drive** [Text] · solo lectura
- **Estado_Archivo** [Text] · solo lectura
- **Mensaje** [Text] · solo lectura

### Acciones

- **Delete** (DELETE_RECORD)
- **Edit** (EDIT_RECORD)
- **Add** (ADD_RECORD)
- **View Ref (Des_Ref)** (NAVIGATE_APP) — si: `NOT(ISBLANK([Des_Ref]))`
- **Open File (Archivo)** (OPEN_FILE) — si: `NOT(ISBLANK([Archivo]))`
- **Compose Email (Subido_Por)** (EMAIL) — si: `NOT(ISBLANK([Subido_Por]))`

## Tabla `Datos` · READ_ONLY

### Columnas

- **\_RowNumber** [Number] · solo lectura
- **FECHA/ HR EMISIÓN** [Date]
- **RAZON SOCIAL** [Text]
- **N° RC** [Text]
- **AREA EMISORA** [Text]
- **EMISOR** [Text]
- **SOLICITANTE** [Text]
- **TIPO COMPRA** [Text]
- **ORDEN DE PEDIDO** [Text]
- **MOTIVO O PROYECTO** [Text]
- **CONCEPTO** [Text]
- **N° ITEM** [Number]
- **CÓDIGO CLIENTE** [Text]
- **DESCRIPCIÓN CLIENTE** [Text]
- **CÓDIGO SIDIGE** [Text]
- **DESCRIPCIÓN SIDIGE** [Text]
- **UNIDAD MEDIDA** [Text]
- **CANTIDAD REQUERIDA** [Number]
- **ESPECIFICACION TECNICA** [Text]
- **DETALLE** [LongText]
- **FECHA SOLICITADO** [Date]
- **DESTINO** [Enum] · enum ["OFICINA 1","PROVEEDOR","OTROS","OFICINA 2","OFICINA 3"]
- **DIRECCIÓN** [Text]
- **RECEPTOR** [Text]
- **ESTADO DE VISUALIZACIÓN** [Text]
- **COMPRADOR** [Text]
- **N° OC** [Text]
- **PROVEEDOR** [Text]
- **LINK DE OC** [Text]
- **ESTADO APROBACIÓN** [Text]
- **FECHA APROBACIÓN** [Text]
- **ESTADO DE PAGO** [Text]
- **ESTADO DE COMPRA** [Text]
- **FECHA ENTREGA TENTATIVA** [Text]
- **CONCATENADO 1** [Text]
- **FECHA RECEPCIÓN** [Text]
- **ESTADO RECEPCIÓN** [Text]
- **CONCATENADO** [Text]
- **\_ID_Item** [Text] · fórmula =CONCATENATE([RAZON SOCIAL], "-", [N° RC], "-", [N° ITEM]) Read-Only Yes Hidden No Label No Formula version 0 · solo lectura · CLAVE

## Acciones de líneas de OC y de proveedores (el PDF las agrupa como «Base»)

- **Edit** — si: `=OR( IN([OC_Ref].[Estatus Compra], LIST("Borrador","En modificación")), STARTSWITH([OC_Ref].[Estatus Compra], "Observado"), AND( [OC_Ref].[Estatus Compra] = "Pendiente de aprobación", ISBLANK([OC_Ref].[CG_Por]), ISBLANK([OC_Ref]. [GOP_Por]), ISBLANK([OC_Ref].[GAF_Por]) ) )`
- **Add** — si: `=CONTEXT("ViewType") = "Form"`
- **View Ref (OC_Ref)** — si: `NOT(ISBLANK([OC_Ref]))`
- **Delete**
- **Edit**
- **Compose Email (CORREO)** — si: `NOT(ISBLANK([CORREO]))`
- **Open Url (LINK CUENTAS)** — si: `NOT(ISBLANK([LINK CUENTAS]))`
- **Add**
- **Open File (ARCHIVO_CUENTAS)** — si: `NOT(ISBLANK([ARCHIVO_CUENTAS]))`
- **View Ref (Item_Req_Ref)** — si: `NOT(ISBLANK([Item_Req_Ref]))`
- **New step Action - 3** — si: `true`
- **Recibir datos de OC Action - 1** — si: `true`
- **Action for Recalcular** — si: `true`
- **Compose Email (Verificado_Por)** — si: `NOT(ISBLANK([Verificado_Por]))`
- **Verificar Retención** — si: `=AND([ORIGEN] <> "Extranjero", [Verificado_Contab] <> TRUE, IN("CONTABILIDAD", SELECT(Aprobadores_OC[Rol], AND(LOWER([Email]) = LOWER(USEREMAIL()), [Activo] = TRUE))) )` — pone: Verificado_Contab==TRU E; Verificado_Por==USERE MAIL(); Fecha_Verificacion==NO W()
- **＋ Demasía** — si: `=AND( NOT([Es_Demasia]), COUNT(SELECT(Base de datos OC NAC[ID_Linea], AND([OC_Ref] = [_THISROW].[OC_Ref], [Item_Req_Ref] = [_THISROW].[Item_Req_Ref], [Es_Demasia]))) = 0, OR(IN([OC_Ref].[Estatus Compra], LIST("Borrador", "En modificación")), STARTSWITH([OC_Ref].[Estatus Compra], "Observado")) )`
- **\_Rechazar_Demasia** — si: `true` — pone: CANTIDAD==0; Demasia_Estado==\"Rec hazada\"; Demasia_Decidido_Por== USEREMAIL()
- **\_Aprobar_Demasia** — si: `true` — pone: Demasia_Estado==\"Apr obada\"; Demasia_Decidido_Por== USEREMAIL()
- **Compose Email (Demasia_Decidido_Por)** — si: `NOT(ISBLANK([Demasia_Decidido_Por]))`

## Slices (filtros de filas)

- **Req_Pendientes** de `Requerimientos` — filtro: `=AND([_Items_Atendidos] = 0, [Estado_Req] <> "En Proceso")` — READ_ONLY
- **Req_Parciales** de `Requerimientos` — filtro: `=AND([_Items_Atendidos]>0, [_Items_Atendidos]<[Total_Items], [Estado_Req] <> "En Proceso")` — READ_ONLY
- **Req_Atendidos** de `Requerimientos` — filtro: `=AND( [_Items_Atendidos] >= [Total_Items], [Estado_Req] <> "En Proceso" )` — READ_ONLY
- **Pagos_Solicitados** de `Pagos` — filtro: `=[Estado_Pago]="Solicitado"` — ADDS_AND_UPDATES
- **Pagos_Programados** de `Pagos` — filtro: `=[Estado_Pago]="Programado"` — ADDS_AND_UPDATES
- **Pagos_Pagados** de `Pagos` — filtro: `=[Estado_Pago]="Pagado"` — ADDS_AND_UPDATES
- **Pagos_Por_Vencer** de `Pagos` — filtro: `=AND([Estado_Pago]<>"Pagado", NOT(ISBLANK([Fecha_Limite_Pago])))` — ADDS_AND_UPDATES
- **OC_En_Pagos** de `OC` — filtro: `=[LEGAJO PARA PAGO]=TRUE` — ADDS_AND_UPDATES
- **Facturas_Pendientes** de `Pagos` — filtro: `=AND( [Factura_Subida] <> TRUE, [Estado_Pago] = "Pagado", DATE([Fecha_Pago]) <= (TODAY() - 1) )` — ADDS_AND_UPDATES
- **Req_En_Proceso** de `Requerimientos` — filtro: `=[Estado_Req] = "En Proceso"` — UPDATES_ONLY
- **Carga_Errores** de `Carga_items` — filtro: `=AND( [Estado_Fila] = "Error", [Lote_ID] = [Solicitud_Ref]. [Lote_Actual] )` — UPDATES_AND_DELETES
- **Carga_Listos** de `Carga_items` — filtro: `=AND( IN([Estado_Fila], LIST("Valido", "Advertencia")), [Lote_ID] = [Solicitud_Ref].[Lote_Actual], ISBLANK( FILTER("Solicitud_Items", AND( [Solicitud_Ref] = [_THISROW].[Solicitud_Ref], [N_Item] = [_THISROW].[N_Item] ) ) ) )` — UPDATES_AND_DELETES
- **Items_En_Proceso** de `Items` — filtro: `=[ID_Req].[Estado_Req] = "En Proceso"` — UPDATES_ONLY
- **Anulaciones_por_aprobar** de `Anulaciones` — filtro: `=AND([Estado] = "Pendiente", IN(TRIM(LOWER(USEREMAIL())), [_Aprobadores]))` — UPDATES_ONLY
- **Items_Anulacion** de `Items` — filtro: `=TRUE` — UPDATES_ONLY
- **Items_Seguimiento** de `Items` — filtro: `=TRUE` — READ_ONLY
- **Anulaciones_RO** de `Anulaciones` — filtro: `=TRUE` — READ_ONLY
- **OC_Emitidas** de `OC` — filtro: `=AND( [Estatus Compra] <> "Borrador", NOT(AND([Estatus Compra] = "Anulada", ISBLANK([Fecha_Emision]))) )` — ADDS_AND_UPDATES
- **OC_Borradores** de `OC` — filtro: `=[Estatus Compra] = "Borrador"` — ADDS_AND_UPDATES
- **Pagos_Vigentes** de `Pagos` — filtro: `=[Estado_Pago] <> "Anulado"` — ADDS_AND_UPDATES

## Vistas (menú)

- **Cuadro General** · table · left most
- **Anulaciones por aprobar** · table · menu View · visible si: `=COUNT(Anulaciones_por_aprobar[ID_Anulacion]) > 0`
- **Generar OC** · form · menu View
- **OC en Borrador - NAC** · table · menu View
- **Pagos - Estatus** · table · menu View
- **Solicitudes** · table · menu View
- **Requerimientos en Proceso** · table · menu View
- **Requerimientos - Estatus** · table · menu View
- **Requerimientos - Seguimiento** · table · menu View
- **Proveedores Nacionales** · deck · menu View
- **Empresas** · table · menu View
- **Proyectos** · table · menu View
- **Anulaciones_Detail** · detail · ref View
- **Anulaciones_Form** · form · ref View
- **Anulaciones_Inline** · table · ref View
- **Anulaciones_por_aprobar_Detail** · detail · ref View
- **Anulaciones_por_aprobar_Form** · form · ref View
- **Aprobadores_OC_Detail** · detail · ref View
- **Aprobadores_OC_Form** · form · ref View
- **Atendidos** · table · ref View
- **Base de datos OC NAC_Inline** · table · ref View
- **Base de datos_Detail** · detail · ref View
- **Base de datos_Detail2** · detail · ref View
- **Base de datos_Form** · form · ref View
- **Base de datos_Form2** · form · ref View
- **Caja_Chica_Detail** · detail · ref View
- **Caja_Chica_Form** · form · ref View
- **Caja_Chica_Inline** · table · ref View
- **Canales_chat_Detail** · detail · ref View
- **Canales_chat_Form** · form · ref View
- **Carga_Errores_Ref** · table · ref View
- **Carga_items_Detail** · detail · ref View
- **Carga_items_Form** · form · ref View
- **Carga_items_Inline** · table · ref View
- **Carga_Listos_Ref** · table · ref View
- **Conceptos_Detail** · detail · ref View
- **Conceptos_Form** · form · ref View
- **Conceptos_Gasto_Imp_Detail** · detail · ref View
- **Conceptos_Gasto_Imp_Form** · form · ref View
- **Conceptos_Gasto_Imp_Inline** · table · ref View
- **Conceptos_Item_Detail** · detail · ref View
- **Conceptos_Pagos_Detail** · detail · ref View
- **Conceptos_Pagos_Form** · form · ref View
- **Datos_Detail** · detail · ref View
- **Des_Costeo_Hist_Detail** · detail · ref View
- **Des_Costeo_Hist_Inline** · table · ref View
- **Des_Docs_Detail** · detail · ref View
- **Des_Documentos_Detail** · detail · ref View
- **Des_Documentos_Form** · form · ref View
- **Des_Documentos_Inline** · table · ref View
- **Des_Gastos_Detail** · detail · ref View
- **Des_Gastos_Form** · form · ref View
- **Des_Gastos_Inline** · table · ref View
- **Des_Productos_Detail** · detail · ref View
- **Des_Productos_Form** · form · ref View
- **Des_Productos_Inline** · table · ref View
- **Desaduanajes_Detail** · detail · ref View
- **Desaduanajes_Form** · form · ref View
- **Desaduanajes_Inline** · table · ref View
- **Documentos_OC_Detail** · detail · ref View
- **Documentos_OC_Form** · form · ref View
- **Documentos_OC_Inline** · table · ref View
- **Empresas_Detail** · detail · ref View
- **Empresas_Form** · form · ref View
- **Items_Anulacion_Inline** · table · ref View
- **Items_Detail** · detail · ref View
- **Items_En_Proceso_Inline** · table · ref View
- **Items_Form** · form · ref View
- **Items_Inline** · table · ref View
- **Items_Seguimiento_Inline** · table · ref View
- **Listas_Detail** · detail · ref View
- **Listas_Form** · form · ref View
- **OC_Borradores_Detail** · detail · ref View
- **OC_Borradores_Form** · form · ref View
- **OC_Detail** · detail · ref View
- **OC_Docs_Detail** · detail · ref View
- **OC_Docs_Form** · form · ref View
- **OC_Emitidas_Detail** · detail · ref View
- **OC_Emitidas_Form** · form · ref View
- **OC_Form** · form · ref View
- **OC_Inline** · table · ref View
- **Pagos_Detail** · detail · ref View
- **Pagos_Form** · form · ref View
- **Pagos_Inline** · table · ref View
- **Pagos_Inline 2** · table · ref View
- **Pagos_Vigentes_Detail** · detail · ref View
- **Pagos_Vigentes_Form** · form · ref View
- **Parciales** · table · ref View
- **Pendientes** · table · ref View
- **Proyecto_Etapas_Detail** · detail · ref View
- **Proyecto_Etapas_Form** · form · ref View
- **Proyecto_Etapas_Inline** · table · ref View
- **Proyectos_Detail** · detail · ref View
- **Proyectos_Form** · form · ref View
- **Proyectos_Inline** · table · ref View
- **Reglas_Aprobacion_Detail** · detail · ref View
- **Reglas_Aprobacion_Form** · form · ref View
- **Req_Atendidos_Detail** · detail · ref View
- **Req_En_Proceso_Detail** · detail · ref View
- **Req_En_Proceso_Form** · form · ref View
- **Req_Parciales_Detail** · detail · ref View
- **Req_Pendientes_Detail** · detail · ref View
- **Requerimientos_Detail** · detail · ref View
- **Requerimientos_Form** · form · ref View
- **Requerimientos_Inline** · table · ref View
- **Solicitud_Docs_Detail** · detail · ref View
- **Solicitud_Docs_Form** · form · ref View
- **Solicitud_Items_Detail** · detail · ref View
- **Solicitud_Items_Form** · form · ref View
- **Solicitud_Items_Inline** · table · ref View
- **Solicitud_Pago_Form** · form · ref View
- **Solicitudes_Detail** · detail · ref View
- **Solicitudes_Form** · form · ref View
- **Solicitudes_Inline** · table · ref View
- **TC_Costeo_Detail** · detail · ref View
- **TC_Costeo_Form** · form · ref View
- **Tipo_Cambio_Detail** · detail · ref View
- **Tipo_Cambio_Form** · form · ref View
- **Usuarios_Detail** · detail · ref View
- **Usuarios_Form** · form · ref View
