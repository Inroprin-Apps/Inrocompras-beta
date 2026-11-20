// Corre todas las pruebas de reglas (supabase/tests/*.test.mjs) y falla si alguna falla. `pnpm test:db`.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = path.dirname(fileURLToPath(import.meta.url));
let fallas = 0;
for (const f of fs.readdirSync(aqui).filter((f) => f.endsWith('.test.mjs')).sort()) {
    const r = spawnSync(process.execPath, [path.join(aqui, f)], { encoding: 'utf8' });
    const ultima = (r.stdout.trim().split('\n').at(-1) ?? '').trim();
    console.log(`${r.status === 0 ? '✓' : '✗'} ${f}: ${ultima}`);
    if (r.status !== 0) {
        fallas++;
        console.log(r.stdout.split('\n').filter((l) => l.includes('✗') || l.includes('ERROR')).join('\n'), r.stderr);
    }
}
process.exit(fallas ? 1 : 0);
