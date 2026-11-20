# 09 · Criterios de aceptación

Cada criterio se prueba con usuarios de roles distintos. Los marcados con ✔ ya están cubiertos a nivel de base por `supabase/tests/flujo.test.mjs`; falta probarlos en la UI.

## 0. Acceso
- [ ] Solo se entra con «Iniciar sesión con Google» y la cuenta de la empresa; no hay formulario de correo y contraseña.
- [ ] Una cuenta de otro dominio no entra (lo bloquean Google con `hd` y la base).
- [ ] Una persona nueva entra sin área ni roles: no ve órdenes ni precios y no tiene acciones.
- [ ] Solo el administrador cambia áreas y roles, y queda en el historial.

## A. Solicitudes y requerimientos
- [✔] El solicitante crea, edita y emite. Sin sustento, sin ítems o con filas de carga en error, no se emite, y el mensaje dice qué falta.
- [✔] La carga Excel marca las filas con error («La fecha de Plazo_Adquisicion ya pasó», etc.) y deja descartarlas.
- [✔] Solo los aprobadores de la etapa (o el jefe) liberan o rechazan. Al liberar nace el requerimiento con todos los ítems.
- [✔] Solo el área emisora emite u observa el requerimiento; al observar, la solicitud vuelve al solicitante.
- [✔] Solo Técnica valida ítems (marca y modelo).
- [ ] Rehacer una solicitud rechazada copia la cabecera y los ítems.

## B. Proveedores y documentos
- [✔] El RUC se valida por módulo 11.
- [✔] Solo Finanzas evalúa; solo Contabilidad verifica la retención.
- [ ] Al subir una cotización, el archivo aparece en Drive, en la subcarpeta 002 de la OC, en menos de 1 minuto.
- [ ] La lectura propone RUC, moneda y total; la persona confirma o corrige; sin confirmación no se guarda nada.
- [ ] Sin llave de Gemini (o sin cuota), la lectura gratuita sigue funcionando y avisa.

## C. Plan y orden
- [✔] No se puede pedir más que el saldo (eso es demasía); el saldo se recupera si la OC se anula.
- [✔] Una importación lleva proveedor extranjero y «Sin IGV»; una compra nacional no lleva proveedor extranjero.
- [✔] No se emite sin cotización (salvo tarjeta), sin validación técnica, sin % de adelanto o sin días de crédito.
- [✔] La numeración es por serie y sin huecos: `INROPRIN-NAC-2026-0001`.
- [✔] Compras no cambia el estatus con un UPDATE directo.
- [ ] El plan muestra saldo, semáforo y estado de cada línea; el carrito arma la OC con las líneas elegidas.
- [ ] El PDF interno y el del proveedor salen con los mismos datos; el de importación, en inglés.

## D. Aprobación
- [✔] Sin VB de CG, ninguna gerencia aprueba.
- [✔] Menos de S/ 5,000: basta una firma (GOP). S/ 5,000 o más, «No presupuestado» o «Excede»: GOP y GAF.
- [✔] CG observa → «Observado por Ppto» → Compras corrige y reenvía → vuelve a CG con «Subsanado».
- [✔] La GOP aprueba con o sin la demasía; la GAF no aprueba si hay demasía en la ruta única.
- [✔] Aparece en «Te toca» de quien debe firmar.
- [ ] La GOP aprueba desde el celular en 3 toques.
- [ ] El cuadro de aprobaciones se exporta con las columnas exactas.

## E. Legajo y pagos
- [✔] No se envía la OC si Finanzas no aprobó al proveedor.
- [✔] Al subir la factura con el monto de la cuota, la cuota pasa sola a «Solicitado» y la OC a «Pago pendiente».
- [✔] Se aplica la retención del 3 % (nacional, proveedor no agente ni buen contribuyente, > S/ 700).
- [✔] Solo Finanzas programa y marca pagado (con N° de operación). Al pagar todo, la OC queda «OC pagada».
- [✔] Adelanto: 2 cuotas (pct % + saldo contra el hito).
- [✔] Modificar subiendo el monto: revisión +1 y vuelve a aprobación con las firmas limpias.
- [✔] La anulación la pide Compras y la decide la jefatura del canal que corresponde.
- [ ] El correo al proveedor llega con el PDF adjunto y el comprador en copia.

## F. Desaduanaje
- [✔] No avanza sin el checklist; para numerar pide el N° de DAM.
- [✔] El TC se congela al numerar la DAM.
- [✔] El costeo cierra con versión y FI; con el costeo cerrado no entran gastos; solo la jefatura de importaciones reabre (con motivo); el siguiente cierre es la versión 2.

## G. Transversal
- [✔] Cada cambio de estado deja historial (quién, cuándo, de, a, motivo).
- [ ] Toda lista tiene estados de carga, vacío y error.
- [ ] Los textos son de tú, sin exclamaciones; los errores dicen qué hacer.
