/**
 * generate-inserts.js
 * Lee todos los data/J* y genera un seed.sql listo para ejecutar en Neon.
 *
 * Uso:
 *   node scripts/generate-inserts.js > database/seed.sql
 */

import { readdirSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = join(__dirname, '..');
const DATA_DIR  = join(ROOT, 'data');
const SAC_SHORT = 'SAC';

// ─── HELPERS ────────────────────────────────────────────────

function esc(str = '') {
  return str.replace(/'/g, "''");
}

function titleCase(str = '') {
  return str.toLowerCase().split(/\s+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function cleanTeamName(fullName = '') {
  return titleCase(fullName.split('/')[0].trim());
}

// Divide "VICTOR HUGO LASTRA ESTUPIÑAN" → { nombre: "Victor Hugo", apellidos: "Lastra Estupiñan" }
// Heurística: si son ≥3 palabras, la 1ª mitad = nombre, 2ª mitad = apellidos
function splitName(fullName = '') {
  const parts = titleCase(fullName.trim()).split(/\s+/);
  if (parts.length === 1) return { nombre: parts[0], apellidos: '' };
  if (parts.length === 2) return { nombre: parts[0], apellidos: parts[1] };
  const mid = Math.ceil(parts.length / 2);
  return {
    nombre:    parts.slice(0, mid).join(' '),
    apellidos: parts.slice(mid).join(' ')
  };
}

function getScoreByPeriod(scores, numPeriods) {
  const local = [], visit = [];
  let prevL = 0, prevV = 0;
  for (let p = 1; p <= numPeriods; p++) {
    const entries = scores.filter(s => s.period === p);
    const last = entries[entries.length - 1];
    local.push(last ? last.local - prevL : 0);
    visit.push(last ? last.visit - prevV : 0);
    if (last) { prevL = last.local; prevV = last.visit; }
  }
  return { local, visit };
}

// ─── LECTURA DE DATOS ────────────────────────────────────────

const jornadaDirs = readdirSync(DATA_DIR, { withFileTypes: true })
  .filter(d => d.isDirectory() && /^J\d+$/i.test(d.name))
  .sort((a, b) => parseInt(a.name.slice(1)) - parseInt(b.name.slice(1)));

const equiposMap  = {};   // shortName → { shortName, nombre, teamIdExtern }
const jugadoresMap = {};  // actorId   → { actorId, nombre, apellidos, dorsal, shortName }
const partidosList = [];

for (const dir of jornadaDirs) {
  const jNum    = parseInt(dir.name.slice(1));
  const dirPath = join(DATA_DIR, dir.name);
  const files   = readdirSync(dirPath).filter(f => f.endsWith('_stats.json'));

  for (const file of files) {
    const json = JSON.parse(readFileSync(join(dirPath, file), 'utf8'));
    const teams  = json.teams  || [];
    const scores = json.score  || [];
    const final  = scores[scores.length - 1] || { local: 0, visit: 0 };
    const numPeriods = json.periodDurationList?.length || 4;

    const localTeam = teams.find(t => t.teamIdIntern === json.localId) || {};
    const visitTeam = teams.find(t => t.teamIdIntern === json.visitId) || {};

    // Registrar equipos
    for (const team of teams) {
      if (team.shortName && !equiposMap[team.shortName]) {
        equiposMap[team.shortName] = {
          shortName:    team.shortName,
          nombre:       cleanTeamName(team.name || ''),
          teamIdExtern: team.teamIdExtern
        };
      }
    }

    // Registrar jugadores de Sa Cabaneta
    if (json.players) {
      const sacTeamId = teams.find(t => t.shortName === SAC_SHORT)?.teamIdIntern;
      if (sacTeamId) {
        for (const p of json.players) {
          if (p.teamId === sacTeamId && p.actorId && !jugadoresMap[p.actorId]) {
            const { nombre, apellidos } = splitName(p.name || '');
            jugadoresMap[p.actorId] = {
              actorId:   p.actorId,
              nombre,
              apellidos,
              dorsal:    p.dorsal ? parseInt(p.dorsal) : null,
              shortName: SAC_SHORT
            };
          }
        }
      }
    }

    // Registrar partido
    const fecha = new Date(json.time);
    partidosList.push({
      jornada:        jNum,
      matchIdIntern:  String(json.idMatchIntern),
      matchIdExtern:  String(json.idMatchExtern),
      fecha:          isNaN(fecha) ? null : fecha.toISOString(),
      localShort:     localTeam.shortName || '???',
      visitShort:     visitTeam.shortName || '???',
      resultadoLocal: final.local,
      resultadoVisit: final.visit,
      estado:         'jugado'
    });
  }
}

// ─── GENERACIÓN SQL ──────────────────────────────────────────

const lines = [];

lines.push(`-- ============================================================`);
lines.push(`-- BASKET ANALYTIC - Seed de datos`);
lines.push(`-- Generado el ${new Date().toLocaleDateString('es-ES')}`);
lines.push(`-- ============================================================`);
lines.push(``);
lines.push(`BEGIN;`);
lines.push(``);

// 1. Competición
lines.push(`-- ------------------------------------------------------------`);
lines.push(`-- 1. COMPETICIÓN`);
lines.push(`-- ------------------------------------------------------------`);
lines.push(`INSERT INTO competiciones (fbib_id, nombre, categoria_id, temporada) VALUES`);
lines.push(`  (3899, 'Primera Autonómica Masculina', 1, '2025-2026')`);
lines.push(`ON CONFLICT (fbib_id) DO NOTHING;`);
lines.push(``);

// 2. Equipos
const equiposList = Object.values(equiposMap);
lines.push(`-- ------------------------------------------------------------`);
lines.push(`-- 2. EQUIPOS (${equiposList.length} equipos)`);
lines.push(`-- ------------------------------------------------------------`);
lines.push(`INSERT INTO equipos (nombre, temporada) VALUES`);
lines.push(equiposList.map(e => `  ('${esc(e.nombre)}', '2025-2026')`).join(',\n'));
lines.push(`ON CONFLICT DO NOTHING;`);
lines.push(``);

// 3. Jornadas
const numJornadas = jornadaDirs.length;
lines.push(`-- ------------------------------------------------------------`);
lines.push(`-- 3. JORNADAS (${numJornadas} jornadas)`);
lines.push(`-- ------------------------------------------------------------`);
lines.push(`INSERT INTO jornadas (competicion_id, numero) VALUES`);
lines.push(
  Array.from({ length: numJornadas }, (_, i) =>
    `  ((SELECT id FROM competiciones WHERE fbib_id = 3899), ${i + 1})`
  ).join(',\n')
);
lines.push(`ON CONFLICT (competicion_id, numero) DO NOTHING;`);
lines.push(``);

// 4 & 5. Personas y Jugadores
const jugadoresList = Object.values(jugadoresMap);
lines.push(`-- ------------------------------------------------------------`);
lines.push(`-- 4. PERSONAS + JUGADORES`);
lines.push(`-- Los JSON de esta temporada no incluyen datos de jugadores.`);
lines.push(`-- Añádelos manualmente desde el panel de administración`);
lines.push(`-- o con el siguiente bloque como plantilla:`);
lines.push(`-- ------------------------------------------------------------`);
lines.push(`/*`);
lines.push(`INSERT INTO personas (equipo_id, nombre, apellidos) VALUES`);
lines.push(`  ((SELECT id FROM equipos WHERE nombre LIKE '%Sa Cabaneta%' LIMIT 1), 'Nombre', 'Apellidos'),`);
lines.push(`  ((SELECT id FROM equipos WHERE nombre LIKE '%Sa Cabaneta%' LIMIT 1), 'Nombre', 'Apellidos');`);
lines.push(``);
lines.push(`INSERT INTO jugadores (persona_id, equipo_id, dorsal)`);
lines.push(`  SELECT p.id,`);
lines.push(`         (SELECT id FROM equipos WHERE nombre LIKE '%Sa Cabaneta%' LIMIT 1),`);
lines.push(`         0  -- dorsal`);
lines.push(`  FROM personas p WHERE p.nombre = 'Nombre' AND p.apellidos = 'Apellidos';`);
lines.push(`*/`);
lines.push(``);

// 6. Partidos
lines.push(`-- ------------------------------------------------------------`);
lines.push(`-- 6. PARTIDOS (${partidosList.length} partidos)`);
lines.push(`-- ------------------------------------------------------------`);
for (const p of partidosList) {
  const fechaVal = p.fecha ? `'${p.fecha}'` : 'NULL';
  lines.push(`INSERT INTO partidos`);
  lines.push(`  (match_id_intern, match_id_extern, jornada_id, equipo_local_id, equipo_visit_id, fecha, resultado_local, resultado_visit, estado)`);
  lines.push(`VALUES (`);
  lines.push(`  '${esc(p.matchIdIntern)}', '${esc(p.matchIdExtern)}',`);
  lines.push(`  (SELECT j.id FROM jornadas j JOIN competiciones c ON c.id = j.competicion_id`);
  lines.push(`   WHERE c.fbib_id = 3899 AND j.numero = ${p.jornada}),`);
  lines.push(`  (SELECT id FROM equipos WHERE nombre LIKE '%${esc(equiposMap[p.localShort]?.nombre?.split(' ')[0] || p.localShort)}%' AND temporada = '2025-2026' LIMIT 1),`);
  lines.push(`  (SELECT id FROM equipos WHERE nombre LIKE '%${esc(equiposMap[p.visitShort]?.nombre?.split(' ')[0] || p.visitShort)}%' AND temporada = '2025-2026' LIMIT 1),`);
  lines.push(`  ${fechaVal}, ${p.resultadoLocal}, ${p.resultadoVisit}, '${p.estado}'`);
  lines.push(`) ON CONFLICT (match_id_intern) DO NOTHING;`);
}
lines.push(``);
lines.push(`COMMIT;`);
lines.push(``);
lines.push(`-- Resumen`);
lines.push(`SELECT 'competiciones' AS tabla, COUNT(*) FROM competiciones`);
lines.push(`UNION ALL SELECT 'equipos',  COUNT(*) FROM equipos`);
lines.push(`UNION ALL SELECT 'jornadas', COUNT(*) FROM jornadas`);
lines.push(`UNION ALL SELECT 'personas', COUNT(*) FROM personas`);
lines.push(`UNION ALL SELECT 'jugadores',COUNT(*) FROM jugadores`);
lines.push(`UNION ALL SELECT 'partidos', COUNT(*) FROM partidos;`);

// ─── SALIDA ──────────────────────────────────────────────────

const sql = lines.join('\n');
process.stdout.write(sql);
