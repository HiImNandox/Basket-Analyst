#!/usr/bin/env node
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { neon } from '@neondatabase/serverless';

const __dir = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dir, '../.env');
for (const line of readFileSync(envPath, 'utf8').split('\n')) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) process.env[m[1].trim()] = m[2].trim();
}

const sql = neon(process.env.DATABASE_URL);

// 1. Todos los partidos con jornada
const rows = await sql`
  SELECT
    p.id, p.estado, p.fbib_match_id, p.fecha, p.cancha_nombre,
    j.numero AS jornada,
    el.nombre AS local_nombre, el.short_name AS local_short,
    ev.nombre AS visit_nombre, ev.short_name AS visit_short,
    p.resultado_local, p.resultado_visit
  FROM partidos p
  JOIN jornadas j  ON j.id  = p.jornada_id
  JOIN equipos  el ON el.id = p.equipo_local_id
  JOIN equipos  ev ON ev.id = p.equipo_visit_id
  ORDER BY j.numero ASC, p.fecha ASC
`;

console.log(`\n📋 Total partidos en Neon: ${rows.length}`);
console.log(`\n${'J'.padEnd(4)} ${'Estado'.padEnd(10)} ${'Local'.padEnd(20)} ${'Visit'.padEnd(20)} ${'Res'.padEnd(8)} fbib_match_id`);
console.log('─'.repeat(100));
for (const r of rows) {
  const res = r.resultado_local != null ? `${r.resultado_local}-${r.resultado_visit}` : '—';
  console.log(
    `J${String(r.jornada).padEnd(3)} ` +
    `${r.estado.padEnd(10)} ` +
    `${(r.local_short||'?').padEnd(6)} ${r.local_nombre.slice(0,13).padEnd(14)} ` +
    `${(r.visit_short||'?').padEnd(6)} ${r.visit_nombre.slice(0,13).padEnd(14)} ` +
    `${res.padEnd(8)} ` +
    `${r.fbib_match_id || '(null)'}`
  );
}

// 2. Prueba del query exacto de matches.js con array vacío
console.log('\n─── Test query pendientes (array vacío) ───');
const pendientes1 = await sql`
  SELECT p.id, j.numero AS jornada, p.estado
  FROM partidos p
  JOIN jornadas j ON j.id = p.jornada_id
  WHERE p.estado = 'pendiente'
  ORDER BY j.numero ASC
`;
console.log(`Pendientes: ${pendientes1.length}`);
for (const r of pendientes1) console.log(`  J${r.jornada} id=${r.id}`);

// 3. Prueba con array de matchIds simulado
const fakeIds = ['abc123', 'def456'];
console.log('\n─── Test query con != ALL(array) ───');
try {
  const pendientes2 = await sql`
    SELECT p.id, j.numero AS jornada
    FROM partidos p
    JOIN jornadas j ON j.id = p.jornada_id
    WHERE p.estado = 'pendiente'
      AND (p.fbib_match_id IS NULL OR p.fbib_match_id != ALL(${fakeIds}))
    ORDER BY j.numero ASC
  `;
  console.log(`OK — ${pendientes2.length} resultados`);
} catch (e) {
  console.error(`ERROR: ${e.message}`);
}
