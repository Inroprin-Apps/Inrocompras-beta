# 05 · Plan de compras y «Generar OC» (lo que reemplaza los Sheets)

## Problema actual

- El plan de compras de cada proyecto vive en varios Sheets (el «Plan de compras v2» de Ciro Alegría tiene cientos de líneas).
- La orden se arma copiando a la hoja «Base de datos OC NAC».
- El AppSheet solo se usa para el desglose.

Resultado: saldos que nadie ve, órdenes con el proyecto equivocado y PDFs que no coinciden con los datos.

## Solución

**La línea del plan = el ítem del requerimiento** (`requerimiento_items`). No hay una tabla aparte que sincronizar.

### Pantalla «Plan de compras» (por proyecto)

Una fila por ítem, con estas columnas:

- código del cliente, SKU del SIDIGE, descripción, cantidad, **saldo** (`saldo_item`);
- validación técnica (marca y modelo), canal (nacional o importación), fecha meta;
- semáforo, OC (números), estatus de la OC y pagado sí/no.

Filtros: por estado (por comprar, con OC, pagado), canal, semáforo y validación pendiente. Los accesorios incluidos (`incluido_en`) se muestran bajo su equipo y no se compran aparte.

**Reglas del plan** (de `referencia/diseno_v9_por_proyecto.md`; parámetros en `config`):

| Regla                 | Cálculo                                                                                      |
| --------------------- | -------------------------------------------------------------------------------------------- |
| Fecha límite de la OC | fecha meta − plazo de entrega − (importación: 5 días de desaduanaje + 10 de contingencia)    |
| Semáforo              | Vencida si pasó la fecha límite sin OC; ámbar si faltan 7 días o menos (`dias_alerta_plan`)  |
| Orden de atención     | Criticidad y después días a la fecha límite                                                  |
| Criticidad por plazo  | > 120 días: fuera de plazo; ≥ 100: muy crítico; ≥ 60: crítico; ≥ 30: normal; menos: sencillo |
| Bloqueos para comprar | Requerimiento no emitido · sin validación técnica · ítem anulado                             |
| Requerimiento quieto  | Con saldo y sin movimiento en 3 días → aparece en «Te toca» de Compras                       |

Las reglas de fecha y semáforo se calculan en una vista SQL (`v_plan_compras`, por crear en el Hito 3) o en el servidor. No se guardan.

### «Generar OC» (el carrito)

1. En el plan, el comprador marca líneas con saldo, del mismo canal.
2. La app propone agruparlas por proveedor si ya hay cotizaciones leídas que coincidan.
3. El formulario pide proveedor, moneda y forma de pago, y precio y cantidad por línea. Por defecto, la cantidad es el saldo y el precio el de la cotización leída.
4. `ac_oc_crear(...)` valida en la base: saldo, proveedor extranjero si es importación, requerimiento emitido. Crea el **Borrador**.
5. Sube la cotización (Drive + lectura) y pulsa «Emitir»: la numeración por serie la reserva la base.
6. Si se necesita más que el saldo, se agrega una **demasía** con motivo, y la decide la GOP.

### Carga inicial de los planes existentes

Para los proyectos en curso, el administrador (o Planeamiento) importa el Excel del plan como una **solicitud de proyecto con carga masiva** (`carga_items` + `ac_carga_procesar`). Se libera y se emite el requerimiento. Las columnas del Excel se mapean a: tipo, código del cliente, descripción, detalle, unidad, cantidad, plazo de adquisición, canal y presupuesto unitario.
