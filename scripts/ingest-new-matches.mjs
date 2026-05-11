#!/usr/bin/env node
/**
 * ingest-new-matches.mjs
 * ──────────────────────
 * Obtiene TODOS los partidos de la competición consultando la API de la FBIB
 * por cada equipo participante. Detecta los jugados que no están en MongoDB
 * y los ingesta (stats + pbp). También sincroniza la tabla partidos de Neon.
 *
 * Uso:
 *   node scripts/ingest-new-matches.mjs             → ingesta real
 *   node scripts/ingest-new-matches.mjs --dry-run   → muestra sin insertar
 *
 * Programa en Tarea de Windows para que corra diariamente:
 *   node C:\repos\Basket-Analyst\scripts\ingest-new-matches.mjs
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { neon } from '@neondatabase/serverless';
import { MongoClient } from 'mongodb';

// ── Carga .env ────────────────────────────────────────────────────────────────
const __dir   = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dir, '../.env');
for (const line of readFileSync(envPath, 'utf8').split('\n')) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) process.env[m[1].trim()] = m[2].trim();
}

const DRY_RUN        = process.argv.includes('--dry-run');

// Los horarios de la FBIB están en hora local española (CET=UTC+1 / CEST=UTC+2)
function parseFBIBDate(s) {
  if (!s) return null;
  const month = parseInt((s.match(/^\d{4}-(\d{2})/) || [])[1] || '0', 10);
  const offset = (month >= 4 && month <= 10) ? '+02:00' : '+01:00'; // CEST / CET
  return new Date(s.replace(' ', 'T') + offset);
}
const FBIB_BASE      = 'https://msstats.optimalwayconsulting.com/v1/fbib';
const FBIB_ESB       = 'https://esb.optimalwayconsulting.com/fbib/1/jR4rgA5K6Chhh5vyfrxo9wTScdg2NT7K';
const SAC_TEAM_ID    = 9431;
const FBIB_GROUP_ID  = '3899';
const COMPETICION_ID = 1;
const TEMPORADA      = '25-26';

const sql   = neon(process.env.DATABASE_URL);
const mongo = new MongoClient(process.env.MONGODB_URI);
await mongo.connect();
const db = mongo.db('basketAnalyst');

console.log(`\n🏀 Obteniendo partidos de la competición…${DRY_RUN ? ' (DRY RUN)' : ''}\n`);

// ── Helper: llama a la ESB y decodifica base64 ───────────────────────────────
async function fetchESB(path) {
  const r = await fetch(`${FBIB_ESB}/${path}`, { headers: { 'User-Agent': 'HoopStats/1.0' } });
  const raw = await r.text();
  try { return JSON.parse(Buffer.from(raw, 'base64').toString()); }
  catch { return JSON.parse(raw); }
}

async function fetchFbib(endpoint, matchId) {
  const r = await fetch(`${FBIB_BASE}/${endpoint}/${matchId}?currentSeason=true`, {
    headers: { 'User-Agent': 'HoopStats/1.0' }
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

// ── 1. Obtiene todos los partidos de Sa Cabaneta → extrae IDs de equipos ──────
const sacData    = await fetchESB(`Match/getByTeamAllSeason/${SAC_TEAM_ID}`);
const sacMatches = (sacData.messageData || []).filter(m => m.idGroup === FBIB_GROUP_ID);

// Recoge todos los teamIds de la competición (locales y visitantes)
const teamIds = new Set([SAC_TEAM_ID]);
for (const m of sacMatches) {
  if (m.idLocalTeam)   teamIds.add(parseInt(m.idLocalTeam, 10));
  if (m.idVisitorTeam) teamIds.add(parseInt(m.idVisitorTeam, 10));
}
console.log(`🏟️  Equipos detectados en la competición: ${teamIds.size}`);

// ── 2. Obtiene partidos de cada equipo y deduplica ────────────────────────────
const matchMap = new Map(); // universallyid/adGameId → match
for (const teamId of teamIds) {
  const data    = await fetchESB(`Match/getByTeamAllSeason/${teamId}`);
  const matches = (data.messageData || []).filter(m => m.idGroup === FBIB_GROUP_ID);
  for (const m of matches) {
    // Fallback: idMatch es único por partido en la FBIB aunque adGameId sea null
    const key = m.universallyid || (m.adGameId ? `adgame_${m.adGameId}` : `fbib_${m.idMatch}`);
    if (!matchMap.has(key)) matchMap.set(key, m);
  }
}

const allMatches = [...matchMap.values()].sort((a, b) =>
  parseInt(a.numMatchDay || 0) - parseInt(b.numMatchDay || 0)
);
console.log(`📋 Total partidos en la liga: ${allMatches.length}`);

// ── 3. Separa jugados (con stats) de futuros ──────────────────────────────────
const jugados  = allMatches.filter(m => m.universallyid && m.localScore !== null);
const futuros  = allMatches.filter(m => !m.universallyid || m.localScore === null);
console.log(`✅ Jugados con stats: ${jugados.length} | 📅 Pendientes: ${futuros.length}`);

// ── 4. Filtra los que ya están en MongoDB ─────────────────────────────────────
const existentes = await db.collection('stats')
  .find({ matchId: { $in: jugados.map(m => m.universallyid) } })
  .project({ matchId: 1 })
  .toArray();
const existentesSet = new Set(existentes.map(e => e.matchId));
const nuevos = jugados.filter(m => !existentesSet.has(m.universallyid));
console.log(`⬇️  Nuevos por ingestar: ${nuevos.length}\n`);

// ── 5. Mapa de equipos Neon ───────────────────────────────────────────────────
const equiposRows    = await sql('SELECT id, short_name, nombre FROM equipos WHERE short_name IS NOT NULL');
const equipoPorShort = Object.fromEntries(equiposRows.map(e => [e.short_name, e.id]));

// Construye mapa FBIB teamIdExtern → Neon equipo id desde stats ya en MongoDB
const fbibTeamToNeon = {};
const statsDocs = await db.collection('stats')
  .find({}, { projection: { teams: 1 } })
  .toArray();
for (const doc of statsDocs) {
  for (const t of (doc.teams || [])) {
    if (t.teamIdExtern && t.shortName && equipoPorShort[t.shortName]) {
      fbibTeamToNeon[parseInt(t.teamIdExtern, 10)] = equipoPorShort[t.shortName];
    }
  }
}
console.log(`🗺️  Equipos mapeados FBIB→Neon: ${Object.keys(fbibTeamToNeon).length}`);

// ── 6. Ingesta los nuevos partidos ────────────────────────────────────────────
for (const m of nuevos) {
  const jornada = parseInt(m.numMatchDay, 10);
  const matchId = m.universallyid;
  const label   = `J${jornada} ${m.nameLocalTeam} ${m.localScore}-${m.visitorScore} ${m.nameVisitorTeam}`;
  console.log(`── ${label}`);

  if (DRY_RUN) { console.log('  🔸 DRY RUN\n'); continue; }

  // Stats → MongoDB
  let statsData;
  try {
    statsData = await fetchFbib('getJsonWithMatchStats', matchId);
    await db.collection('stats').updateOne(
      { matchId },
      { $set: { matchId, jornada, temporada: TEMPORADA, importedAt: new Date(), ...statsData } },
      { upsert: true }
    );
    console.log('  ✅ Stats → MongoDB');
  } catch (e) { console.error(`  ❌ Stats: ${e.message}`); continue; }

  // PBP → MongoDB
  try {
    const pbpData = await fetchFbib('getJsonWithMatchMoves', matchId);
    const events  = Array.isArray(pbpData) ? pbpData : [];
    await db.collection('pbp').updateOne(
      { matchId },
      { $set: { matchId, jornada, temporada: TEMPORADA, events, importedAt: new Date() } },
      { upsert: true }
    );
    console.log(`  ✅ PBP   → MongoDB (${events.length} eventos)`);
  } catch (e) { console.error(`  ⚠️  PBP: ${e.message}`); }

  // Mapeo de equipos FBIB → Neon usando shortName de las stats
  if (statsData) {
    for (const t of (statsData.teams || [])) {
      if (t.shortName && equipoPorShort[t.shortName] && t.teamIdExtern) {
        fbibTeamToNeon[t.teamIdExtern] = equipoPorShort[t.shortName];
      }
    }
  }

  // Jornada → Neon
  let jornadaRows = await sql(
    'SELECT id FROM jornadas WHERE competicion_id=$1 AND numero=$2',
    [COMPETICION_ID, jornada]
  );
  if (jornadaRows.length === 0) {
    jornadaRows = await sql(
      'INSERT INTO jornadas (competicion_id, numero) VALUES ($1,$2) RETURNING id',
      [COMPETICION_ID, jornada]
    );
    console.log(`  ✅ Jornada ${jornada} creada en Neon`);
  }
  const jornadaId = jornadaRows[0].id;

  // Partido → Neon
  const adGameId = m.adGameId ? String(m.adGameId) : null;
  const existing = adGameId
    ? await sql('SELECT id FROM partidos WHERE match_id_intern=$1', [adGameId])
    : [];

  const localFbibId = parseInt(m.idLocalTeam, 10);
  const visitFbibId = parseInt(m.idVisitorTeam, 10);
  const localNeonId = fbibTeamToNeon[localFbibId] ?? null;
  const visitNeonId = fbibTeamToNeon[visitFbibId] ?? null;

  if (!localNeonId || !visitNeonId) {
    console.warn(`  ⚠️  Equipo sin mapeo Neon (local:${localFbibId}→${localNeonId}, visit:${visitFbibId}→${visitNeonId}) — añade short_name en equipos`);
  } else if (existing.length === 0) {
    await sql(
      `INSERT INTO partidos
         (match_id_intern, match_id_extern, fbib_match_id, jornada_id,
          equipo_local_id, equipo_visit_id, fecha,
          resultado_local, resultado_visit, estado, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'jugado',NOW(),NOW())`,
      [adGameId, m.idMatchCall ? String(m.idMatchCall) : null, matchId,
       jornadaId, localNeonId, visitNeonId,
       parseFBIBDate(m.matchDay),
       parseInt(m.localScore, 10), parseInt(m.visitorScore, 10)]
    );
    console.log(`  ✅ Partido → Neon`);
  } else {
    await sql(
      'UPDATE partidos SET fbib_match_id=$1, resultado_local=$2, resultado_visit=$3, updated_at=NOW() WHERE id=$4',
      [matchId, parseInt(m.localScore,10), parseInt(m.visitorScore,10), existing[0].id]
    );
    console.log(`  ✅ Partido actualizado en Neon`);
  }
  console.log();
}

// ── 7. Sincroniza TODOS los partidos en Neon (jugados + futuros) ──────────────
console.log(`\n📅 Sincronizando ${allMatches.length} partidos en Neon…`);
let insertados = 0, actualizados = 0, sinMapeo = 0;

for (const m of allMatches) {
  // adGameId puede ser null en partidos futuros; usamos idMatch como fallback
  const adGameId    = m.adGameId ? String(m.adGameId) : (m.idMatch ? `fbib_${m.idMatch}` : null);
  const jornada     = parseInt(m.numMatchDay, 10);
  const fecha       = parseFBIBDate(m.matchDay);
  const cancha      = m.nameField ?? null;
  const localFbibId = parseInt(m.idLocalTeam, 10);
  const visitFbibId = parseInt(m.idVisitorTeam, 10);
  const localNeonId = fbibTeamToNeon[localFbibId] ?? null;
  const visitNeonId = fbibTeamToNeon[visitFbibId] ?? null;
  const estaJugado  = m.universallyid && m.localScore !== null;

  if (!adGameId) continue;

  // Asegura que existe la jornada
  let jornadaRows = await sql(
    'SELECT id FROM jornadas WHERE competicion_id=$1 AND numero=$2',
    [COMPETICION_ID, jornada]
  );
  if (jornadaRows.length === 0) {
    jornadaRows = await sql(
      'INSERT INTO jornadas (competicion_id, numero) VALUES ($1,$2) RETURNING id',
      [COMPETICION_ID, jornada]
    );
  }
  const jornadaId = jornadaRows[0].id;

  // Busca por match_id_intern; también intenta por equipo+jornada para evitar duplicados
  // cuando el partido antes tenía adGameId=null (prefijo fbib_) y luego se asigna adGameId real
  let existing = await sql('SELECT id FROM partidos WHERE match_id_intern=$1', [adGameId]);

  if (existing.length > 0) {
    // Actualiza fecha, sede y resultado si ya existe
    await sql(
      `UPDATE partidos SET
         fecha=$1, cancha_nombre=$2,
         fbib_match_id=COALESCE(fbib_match_id, $3),
         resultado_local=COALESCE($4::int, resultado_local),
         resultado_visit=COALESCE($5::int, resultado_visit),
         estado=CASE WHEN $6 THEN 'jugado' ELSE estado END,
         updated_at=NOW()
       WHERE id=$7`,
      [fecha, cancha,
       m.universallyid ?? null,
       estaJugado ? parseInt(m.localScore, 10) : null,
       estaJugado ? parseInt(m.visitorScore, 10) : null,
       estaJugado,
       existing[0].id]
    );
    actualizados++;
  } else {
    // Inserta partido nuevo (jugado o futuro)
    if (!localNeonId || !visitNeonId) {
      sinMapeo++;
      continue;
    }
    await sql(
      `INSERT INTO partidos
         (match_id_intern, match_id_extern, fbib_match_id, jornada_id,
          equipo_local_id, equipo_visit_id, fecha, cancha_nombre,
          resultado_local, resultado_visit, estado, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW(),NOW())`,
      [adGameId,
       m.idMatchCall ? String(m.idMatchCall) : null,
       m.universallyid ?? null,
       jornadaId, localNeonId, visitNeonId,
       fecha, cancha,
       estaJugado ? parseInt(m.localScore, 10) : null,
       estaJugado ? parseInt(m.visitorScore, 10) : null,
       estaJugado ? 'jugado' : 'pendiente']
    );
    insertados++;
  }
}

console.log(`  ✅ Insertados: ${insertados} | Actualizados: ${actualizados}${sinMapeo ? ` | Sin mapeo: ${sinMapeo}` : ''}\n`);

await mongo.close();
console.log('── Fin ──────────────────────────────────────────────');
