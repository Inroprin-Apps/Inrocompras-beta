# INROCOMPRAS · Paquete de arranque (tramo AppSheet)

Este paquete es para el chat de Claude (o la persona) que va a **construir de verdad** INROCOMPRAS en Supabase + Vercel + GitHub.

**Qué se construye:** el tramo que hoy cubre el AppSheet de Geanfranco (solicitud → requerimiento → orden → aprobación → legajo → pagos → desaduanaje y costeo), **bien formulado**, con sus reglas de roles intactas, más lo que se acordó después:

- el plan de compras por proyecto **dentro de la app**, sin Sheets;
- la orden **creada en la app**, nunca desde un Sheet;
- validación técnica por ítem, evaluación financiera del proveedor y demasías que decide la GOP;
- integraciones reales: Google Drive, correo de Google Workspace, lectura de PDF (gratis por texto, y con Gemini cuando haga falta) y la conexión con InroPay;
- las correcciones a los huecos de seguridad del AppSheet.

**Qué NO se construye todavía:** el recorrido completo de la v3: licitaciones, ficha de proyecto, presupuesto de Costos, kick-off e INROCARGAS completo. Tampoco se escribe al SIDIGE: eso lo hace la integración de Roberto en otra etapa.

## Cómo empezar (para el chat que construye)

1. Lee, en este orden: `CLAUDE.md` → `docs/01_ALCANCE.md` → `docs/02_ROLES_Y_PERMISOS.md` → `docs/03_ESTADOS.md` → `docs/08_PLAN_DE_TRABAJO.md`.
2. **La base de datos ya está hecha y probada.** Está en `supabase/migrations/0001…0004` y `supabase/seed.sql`. Las reglas viven en la base: una función por acción, con la misma condición del AppSheet, más la seguridad por filas (RLS). Comprueba que funciona:
   ```bash
   npm i @electric-sql/pglite && node supabase/tests/flujo.test.mjs     # 57 verificaciones
   ```
3. **Las integraciones ya tienen código base** en `ejemplos/integraciones/`, compilado con TypeScript estricto:
   - Drive, correo, lector de PDF con Gemini, PDF de la orden, cola de trabajos y webhook de InroPay.
   - El lector gratuito se probó con un PDF real.
4. **El diseño** sale de `diseno/ui-guia/`, la guía UI de INROPRIN (Next.js + Tailwind v4, con tokens y componentes listos para copiar). El prototipo v3 (`referencia/prototipo_v3/`) muestra cómo se usa: la bandeja «Te toca», la ficha lateral, un botón principal por paso y los textos de tú.
5. Construye por hitos (`docs/08`) y valida cada uno con los criterios de `docs/09`.

## Prompt sugerido para el otro chat

> Vas a construir INROCOMPRAS con Next.js 16 (App Router) + Supabase + Vercel, en un repo de GitHub. Antes de escribir código, lee `README.md`, `CLAUDE.md` y `docs/` completos de este paquete. La base de datos (`supabase/migrations`) ya contiene las reglas de negocio y de roles. No las dupliques en el front: la UI pregunta a `acciones_disponibles()` y llama a las funciones `ac_*`. Empieza por el Hito 0 de `docs/08_PLAN_DE_TRABAJO.md` y no avances de hito sin pasar sus criterios de `docs/09`. Usa la guía de diseño de `diseno/ui-guia` (tokens y componentes) y respeta sus reglas de redacción. Pregúntame solo lo que esté en `docs/10_DECISIONES_ABIERTAS.md` y bloquee el hito en curso.

## Contenido

| Carpeta | Qué hay |
|---|---|
| `CLAUDE.md` | Reglas del repositorio: stack, convenciones, seguridad, qué no hacer |
| `docs/` | Alcance, roles, estados, modelo de datos, plan de compras, diseño, integraciones, plan de trabajo, criterios de aceptación, decisiones abiertas y mejoras sobre el AppSheet |
| `supabase/` | Migraciones (esquema, seguridad, acciones, piezas de Supabase), catálogos y la prueba del flujo |
| `ejemplos/integraciones/` | Código TypeScript: Drive, correo, lector de PDF, PDF de la OC, cola, rutas |
| `diseno/` | Guía UI de INROPRIN (código fuente) y la hoja de estilos del prototipo v3 |
| `referencia/` | AppSheet v2 extraído por máquina (tablas, columnas, fórmulas, acciones, vistas), reglas de Listas, casuísticas, mapa de campos del SIDIGE, prototipo v3 y diagrama BPMN |

## Lo que se verificó antes de entregar

- **SQL:** las 4 migraciones corren en Postgres 17 (PGlite). La prueba recorre el flujo completo con 13 personas de áreas y roles distintos, y pasan las 57 verificaciones. Incluye los intentos de saltarse reglas: actualizar un estado directo, aprobar sin rol, ver precios sin permiso, pagar desde Compras, etc.
- **Integraciones:** compilan con `tsc --strict`. El lector gratuito de cotizaciones se probó con un PDF generado: devolvió el RUC del proveedor (descartó el de INROPRIN), la moneda, el subtotal, el IGV y el total. Sin llave de Gemini no falla: avisa y deja que la persona complete los datos.
- **No probado (necesita las cuentas reales):** Drive, el envío de correo, Gemini con llave, `0004_supabase.sql` en un proyecto Supabase real y el webhook de InroPay.
