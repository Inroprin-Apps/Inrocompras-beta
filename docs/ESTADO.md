# Estado del trabajo (20/11/2026)

## Publicado (https://inrocompras.vercel.app, rama `claude/tender-fermi-5v7m3z`)
Todos los hitos de la app (1–6) construidos, probados en el navegador con cada rol (Supabase local) e integrados:
- Base: login Google, menú por perfil, Te toca, campana, Equipo, Proyectos, documentos, configuración.
- Hito 1: solicitudes (Excel), requerimientos, anulaciones, validaciones técnicas, seguimiento.
- Hito 2: proveedores; integraciones del servidor (cola, Drive, correo, lector de PDF, PDF de la OC, InroPay).
- Hito 3: órdenes, plan de compras, carrito Generar OC.
- Hitos 4–5: pagos, cuadro de aprobaciones (Excel/CSV), aprobar desde el celular.
- Hito 6: desaduanaje y costeo.
- Supabase (proyecto xbbfirkajdglkcabbohs): migraciones 0001–0062 aplicadas. `pnpm check` en verde (tipos, fronteras,
  104 pruebas de dominio, 333 verificaciones de reglas).

## Falta para producción
- Variables en Vercel: `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, `APP_URL` (sin ellas la cola no corre).
- Credenciales de integraciones: Google Drive (cuenta de servicio + unidad compartida), correo (D-04), Gemini (D-07), InroPay (D-03).
- Vercel Hobby: cron diario y uso no comercial; para producción conviene Pro.
- Decisiones abiertas: D-05 (2 columnas del cuadro), columna «Comentarios compras», criterio de VB/Checks del cuadro,
  presupuesto unitario legible por lectura directa (la app lo oculta).
- Hito 7 (piloto con datos reales) y Hito 8 (migración de catálogos y OC abiertas).

## Cómo retomar
1. `pnpm install` y `bash scripts/local/levantar.sh` (Supabase local con 14 personas de prueba; ver `scripts/local/README.md`).
2. `pnpm check`.
3. Agentes: `docs/AGENTES.md`; 2 a la vez en la misma copia, cada uno con su `NEXT_DIST_DIR` y puerto; guardar en git cada 20 min.
