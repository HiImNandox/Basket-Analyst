import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { neon } from '@neondatabase/serverless';

const __dir = dirname(fileURLToPath(import.meta.url));
for (const l of readFileSync(resolve(__dir,'../.env'),'utf8').split('\n')) {
  const m=l.match(/^([^#=]+)=(.*)/); if(m) process.env[m[1].trim()]=m[2].trim();
}
const sql = neon(process.env.DATABASE_URL);
const rows = await sql`
  SELECT p.fecha, el.short_name AS loc, ev.short_name AS vis, j.numero AS j
  FROM partidos p
  JOIN jornadas j ON j.id=p.jornada_id
  JOIN equipos el ON el.id=p.equipo_local_id
  JOIN equipos ev ON ev.id=p.equipo_visit_id
  WHERE p.estado='pendiente' ORDER BY j.numero, p.fecha`;
for (const r of rows) {
  const d = new Date(r.fecha);
  console.log(`J${r.j} ${r.loc} vs ${r.vis} → UTC:${d.toISOString()} → España: ${d.toLocaleString('es-ES',{timeZone:'Europe/Madrid'})}`);
}
