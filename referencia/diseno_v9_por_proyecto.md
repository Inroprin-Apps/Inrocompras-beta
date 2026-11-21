# INROCOMPRAS v9: rediseño por proyecto (18/11/2026)

## 1. El cambio de fondo

Hasta la v8, la app giraba en torno a la **orden**. En la reunión del 18/11 quedó claro que Compras trabaja **por proyecto**. Hoy lo hace con el «Plan de compras v2» de Ciro Alegría: cientos de líneas, cada una con su criticidad, su fecha límite y su presupuesto. La orden es solo un paso dentro de la vida de cada línea.

La unidad de trabajo pasa a ser la **línea del plan de compras** (ítem o accesorio) dentro de un **proyecto**. La orden agrupa líneas.

## 2. Arquitectura de pantallas (de lo general a lo particular)

1. **Inicio («Mi día»)**: lo siguiente que conviene hacer según el rol, calculado con las reglas del punto 3, más las tarjetas de los proyectos activos.
2. **Proyectos**: lista con avance, ítems vencidos, presupuesto y fecha meta.
3. **Proyecto** (la cabina), con 5 pestañas:
   - **Resumen**: avance por canal y por criticidad, ritmo semanal frente a la meta y alertas.
   - **Plan de compras**: cada línea con su semáforo, validación técnica, requerimiento, saldo y orden.
   - **Por comprar**: el «carrito» de líneas listas, agrupado por proveedor, con lo que está bloqueado y por qué.
   - **Órdenes**: las del proyecto.
   - **Presupuesto**: base, proyectado y ejecutado, con las alertas del plan.
4. **Validaciones**: bandeja de Técnica (TICS) para las fichas, y de Finanzas para la evaluación del proveedor.
5. **Consulta de productos**: visor de solo lectura para PCP, Almacén y otras áreas. Muestra qué es, si se compró, en qué orden, si está pagado y cuándo llega.
6. Los módulos de la v8 siguen igual (Órdenes, Aprobaciones, Embarques y aduana, Legajo, Pagos), ahora enlazados desde el proyecto.

## 3. Reglas heurísticas (la app decide por el usuario lo que se puede calcular)

| Regla                   | Qué hace                                                                                                                                                                                  | Fuente                                    |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| Criticidad por plazo    | Más de 120 días de entrega: fuera de plazo; 100 o más: muy crítico; 60 o más: crítico; 30 o más: normal; menos: sencillo                                                                  | Configuración del plan                    |
| Fecha límite de la OC   | Fecha meta en almacén − plazo de entrega − (en importación: 5 días de desaduanaje + 10 de contingencia)                                                                                   | Plan v2                                   |
| Semáforo                | Vencida si pasó la fecha límite sin OC; ámbar si vence en 7 días o menos                                                                                                                  | Plan v2 (días de aviso: 7)                |
| Orden de atención       | Primero por criticidad y después por días a la fecha límite                                                                                                                               | —                                         |
| Bloqueos para comprar   | No se puede pedir la OC si falta alguno de estos: requerimiento en el SIDIGE (lo emite PCP), validación técnica (TICS) o canal definido. Los accesorios «incluidos» no se compran aparte. | Reunión 18/11                             |
| Proveedor evaluado      | No se envía la OC si Finanzas no evaluó al proveedor (lo negocia e investiga)                                                                                                             | Respuesta de Tomás, 18/11                 |
| Presupuesto             | Si lo proyectado supera en 10 % al presupuesto base, la orden pide sustento y avisa a Control de Gestión                                                                                  | Hoja ALERTAS del plan                     |
| Agrupar                 | Sugiere juntar en una sola OC las líneas listas del mismo proveedor y canal                                                                                                               | —                                         |
| Llegada a tiempo        | Fecha estimada = hoy + plazo (+ tránsito 45/7/5 días según la vía + desaduanaje y contingencia en importación). Avisa si llega después de la meta.                                        | Plan v2                                   |
| Saldo del requerimiento | Cantidad pedida − cantidad en órdenes; más de lo pedido es demasía y pide motivo                                                                                                          | Reunión 18/11, AppSheet                   |
| Requerimiento quieto    | Si un requerimiento tiene saldo y nadie lo toca en 3 días, aparece en la bandeja                                                                                                          | Idea de Heidi, 18/11                      |
| Penalidad               | 0.5 % por día con tope de 10 %, editable en cada PO                                                                                                                                       | Reglas de Geanfranco (decisión del 18/11) |

## 4. Cómo se adaptan los campos (se muestra solo lo que aplica)

| Si…                                      | Aparece                                                                                                                    | Se oculta                   |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| Canal importado                          | Incoterm, proveedor extranjero (SWIFT, IBAN), hito del saldo, términos en inglés, cargos del proveedor (packing, shipping) | IGV, detracción y retención |
| Canal nacional                           | IGV, retención y detracción calculadas                                                                                     | Incoterm, SWIFT             |
| Forma de pago con adelanto               | % de adelanto y hito del saldo (contra BL, contra aprobación de fotos y video, contra entrega)                             | —                           |
| Crédito, letra o cheque diferido         | Días de crédito                                                                                                            | % de adelanto               |
| El proveedor no está evaluado            | Aviso y botón «Pedir evaluación a Finanzas»; la orden no se envía                                                          | —                           |
| Cantidad mayor al saldo                  | Motivo de la demasía (la decide la GOP)                                                                                    | —                           |
| Proyectado mayor que la base (+10 %)     | Sustento para Control de Gestión                                                                                           | —                           |
| El rol no ve precios (Técnica, Consulta) | Solo código, descripción, marca, cantidad, estado y fechas                                                                 | Montos                      |

**Valores por defecto** (para escribir menos):

- empresa y lugar de entrega, del proyecto;
- moneda, del proveedor (USD si es extranjero);
- plazo de entrega, el mayor de las líneas elegidas;
- precio, el proyectado o, si no hay, el base convertido a la moneda;
- términos, de la plantilla del canal.

## 5. Decisiones que se aplican (18/11)

- **Nota de crédito:** Compras o Comex modifica la orden y rehace el PDF, como pide hoy Finanzas. La versión anterior queda anulada en el legajo. Más adelante se evaluará un flujo más transaccional.
- **Penalidad:** las reglas de Geanfranco (0.5 % por día, tope de 10 %), editables.
- **Evaluación financiera:** la hace Finanzas, que negocia e investiga al proveedor.
- **TICS:** es el área técnica. Valida la ficha de cada ítem.
- **«OC subida a SUNAT»** era un error de la transcripción. Lo que existe es la factura encontrada en SUNAT, que INROCONTA extrae todos los días.
- **La orden se crea en INROCOMPRAS**, nunca en Excel. El PDF en español y el PDF en inglés salen de los mismos datos, así que no se puede repetir el error de un proyecto equivocado.
