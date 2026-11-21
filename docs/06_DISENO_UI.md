# 06 · Diseño y UX

## Base: la guía UI de INROPRIN (`diseno/ui-guia/`)

Es el sitio Next.js que documenta las apps internas (marca Roland Print). Se copian:

- `src/app/globals.css`: los tokens (color por rol con `color-mix(in oklab)`, escala tipográfica, radios, sombras).
- `src/ui/*`: Button, Card, Field, FilterPill, Pager, SelectMenu, Tabs, Toaster, DropZone, DateField, FloatingPanel, Sidebar, Tooltip, Marca (rombos), etc.
- Las reglas de `diseno/ui-guia/CLAUDE.md`: pintar con roles (`bg-primary`, `text-ink-2`, `border-line`), nunca hex; tipografía solo con la escala (`text-display` 24 · `title` 21 · `subtitle` 17 · `heading` 15 · `body` 14 · `ui` 13 · `small` 12 · `caption` 11); radios con nombre (`rounded-inner` 7 · `control` 9 · `card` 12).
- Montserrat 400/500/600.

**Pendientes de la guía** que esta app tendrá que resolver (y devolver a la guía): modo oscuro, modal o diálogo, menú desplegable.

## Patrones del prototipo v3 (`referencia/prototipo_v3/`)

Ábrelo en el navegador: es un solo HTML y funciona sin servidor.

1. **«Te toca»** es la pantalla de inicio. Agrupa por paso lo que le toca a la persona (`te_toca()`) y marca en rojo lo que lleva más de 3 días esperando. Algunos pasos se pueden hacer en bloque (validar varias, aprobar varias).
2. **Ficha lateral:** al tocar una fila se abre un panel a la derecha. Arriba va el hilo de fases con rombos. En el recuadro azul, «lo que te toca»: los botones salen de `acciones_disponibles()`, **un solo principal** y el resto secundarios. Abajo, el detalle, los documentos y el historial.
3. **Un botón principal por pantalla o paso.** Las acciones peligrosas (rechazar, anular, revocar) piden confirmación y motivo.
4. **Deshacer:** después de una acción, el aviso ofrece deshacer cuando la función inversa existe (por ejemplo, reenviar ↔ observar). Si no existe, el aviso dice a quién le toca ahora.
5. **Listas con cinco estados:** cargando, vacío (con qué hacer), error (con reintentar), parcial y completo.
6. **Precios ocultos** para quien no los ve: la UI usa `seguimiento_items()`, sin montos.
7. **Texto:** de tú, sin exclamaciones, verbos concretos («Emitir y enviar a aprobación», no «Procesar»). Los errores dicen qué hacer, y la base ya los devuelve así.
8. **Celular:** el aprobador (GOP, GAF, CG) debe poder aprobar desde el teléfono: lista, ficha y botón.
9. **Sesión:** si se cae internet, el borrador de un formulario no se pierde. Se guarda en `localStorage` y se recupera al volver.

## Pantallas mínimas del tramo

Te toca · Proyectos (lista y página con pestañas: Plan · Órdenes · Solicitudes · Embarques · Historial) · Solicitudes (con carga Excel) · Requerimientos · Validaciones técnicas · Generar OC (carrito) · Orden (ficha: líneas, documentos, cuotas, aprobaciones, historial) · Cuadro de aprobaciones (exportable) · Pagos (Finanzas) · Proveedores · Desaduanaje · Equipo (administrador: áreas y roles) · Configuración.

Las capturas del prototipo v3 están en `diseno/capturas/`.
