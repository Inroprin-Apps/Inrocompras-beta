# Supabase local de pruebas

`bash scripts/local/levantar.sh` levanta Postgres (imagen de Supabase), PostgREST y Storage en Docker, aplica
`supabase/migrations` + `seed.sql` + `scripts/local/demo.sql` (14 personas inventadas, una por área/rol, 2 proyectos y 3
proveedores) y arranca `proxy.mjs` en `http://127.0.0.1:54321`, que imita las rutas de Supabase.

No usa Google ni el servicio de auth: las sesiones son JWT firmados con una clave local **pública** (`proxy.mjs`).
Solo sirve en esta máquina; la app real usa Supabase y Google.

La suite del repo (`tests/e2e`, Playwright) usa estas mismas sesiones: `pnpm build && pnpm test:e2e`.

Para un guion suelto en el navegador:

```js
import { como } from './scripts/local/e2e-helper.mjs';
const { pagina, errores, cerrar } = await como('compras'); // admin, solicitante, gerente, pcp, tecnica, compras,
await pagina.goto('http://localhost:3000/ordenes'); // importaciones, cg, gop, gaf, finanzas, contabilidad,
// ...                                                       // jefecompras, jefeimp
await cerrar();
```

Para correr SQL como superusuario: `docker exec -i ic-db psql -U postgres -d postgres`.
