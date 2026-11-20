# 10 · Decisiones abiertas

Cada una tiene un **valor por defecto ya implementado**, para que la construcción no se detenga. Se cambia en `config` o con una migración pequeña.

| # | Pregunta | Por defecto (implementado) | Quién decide |
|---|---|---|---|
| D-01 | ¿Qué área emite los requerimientos que nacen de solicitudes? | Planeamiento (`config.area_emisora_rq`) | Jefatura de Compras + PCP |
| D-02 | ¿La validación técnica bloquea la emisión de la OC? | Sí (`exigir_validacion_tecnica`) | Jefatura de Compras |
| D-03 | Contrato con InroPay (endpoint, campos, firma) | El de `07_INTEGRACIONES.md §4`; sin endpoint, Finanzas usa los botones | Analista de Finanzas (InroPay) |
| D-04 | Correo: ¿Gmail API con delegación o relay SMTP? ¿Qué cuenta remitente? | `CORREO_MODO=registro` hasta que TI defina | TI |
| D-05 | Las 2 columnas que faltan para llegar a las 37 del cuadro | Las 35 del AppSheet, en su orden | Compras (con la hoja real) |
| D-06 | Reparto de gastos «por Producto» | Según la cantidad de unidades; «por Valor», según EXW en soles | Importaciones + Contabilidad |
| D-07 | Gemini: ¿plan gratuito o de pago en producción? | Gratuito (piloto). Riesgo: el plan gratuito puede usar el contenido para mejorar los productos de Google | Gerencia / TI |
| D-08 | Penalidades de importación: ¿quién las aplica y cuándo? (0.5 %/día, tope 10 %) | Solo se registran en la OC y salen en el PDF; no se calculan | Comex (Geydi) |
| D-09 | ¿Quién cierra la OC (OC cerrada)? | Compras, Finanzas o Contabilidad, con factura en el legajo | Contabilidad |
| D-10 | Retención: ¿el umbral de S/ 700 es por comprobante o por cuota? | Por comprobante (factura); si no hay, por cuota | Contabilidad |
| D-11 | Cambio de año: ¿las RQ y OC abiertas conservan su número? | Conservan su número (la serie es por año de emisión) | Contabilidad |
| D-12 | Los 43 conceptos de OC y la lista de proveedores a migrar | Se cargan en el Hito 8 desde las hojas del AppSheet | Compras |
| D-13 | ¿Revocar una aprobación cuando ya hay cuotas en Plan? | Sí: las cuotas en Plan se anulan. Con cuotas solicitadas, no | Gerencia |
