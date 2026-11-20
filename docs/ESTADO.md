# Estado del trabajo (20/11/2026)

## Hecho y probado (en la rama `claude/tender-fermi-5v7m3z`)
- Base hexagonal como INROCONTA, panel de acciones, ficha, documentos, Te toca, campana, Equipo, Proyectos.
- Hito 1: solicitudes (con Excel), requerimientos, anulaciones, validaciones técnicas, seguimiento. Migración 0010.
- Hito 3: órdenes (ficha completa), plan de compras, carrito «Generar OC». Migración 0030.
- 0060: huecos del Hito 1 cerrados. `pnpm test:db` corre todas las suites de reglas.

## A medias (guardado como WIP; revisar antes de dar por bueno)
- Hito 2: proveedores, integraciones del servidor (cola, Drive, correo, lector, PDF, InroPay), configuración, Equipo al patrón. Migraciones 0020–0022.
- Hitos 4–5: pagos, cuadro de aprobaciones (exportable), aprobar desde el celular. Migraciones 0040+.

## Falta
- Terminar y revisar Hito 2 y Hitos 4–5 (mismas instrucciones: `docs/AGENTES.md` + el encargo de cada hito).
- Hito 6: desaduanaje y costeo (rango de migraciones 0050–0059).
- Aplicar a Supabase (proyecto xbbfirkajdglkcabbohs) las migraciones 0010, 0020+, 0030, 0040+, 0050+, 0060 — hoy solo tiene 0001–0008 y seed.
- Publicar en Vercel (se publica solo al subir a la rama) y probar con cuentas reales.
- Decidir: presupuesto unitario visible para todos por lectura directa (la app lo oculta).

## Cómo retomar
1. `pnpm install` y `bash scripts/local/levantar.sh` (Supabase local con personas de prueba; ver `scripts/local/README.md`).
2. `pnpm check` (tipos, fronteras, dominio y reglas).
3. Los agentes trabajan en la misma copia, 2 a la vez, cada uno con su `NEXT_DIST_DIR` y su puerto; guardar en git cada 20 min.
