#!/usr/bin/env node
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { neon } from '@neondatabase/serverless';

const __dir   = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dir, '../.env');
for (const line of readFileSync(envPath, 'utf8').split('\n')) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) process.env[m[1].trim()] = m[2].trim();
}

const FBIB_ESB    = 'https://esb.optimalwayconsulting.com/fbib/1/jR4rgA5K6Chhh5vyfrxo9wTScdg2NT7K';
const SAC_TEAM_ID = 9431;
const FBIB_GROUP  = '3899';
const sql         = neon(process.env.DATABASE_URL);

async function fetchESB(path) {
  const r = await fetch(`${FBIB_ESB}/${path}`, { headers: { 'User-Agent': 'HoopStats/1.0' } });
  const raw = await r.text();
  try { return JSON.parse(Buffer.from(raw, 'base64').toString()); }
  catch { return JSON.parse(raw); }
}

// 1. Recoge todos los partidos de la liga
const sacData    = await fetchESB(`Match/getByTeamAllSeason/${SAC_TEAM_ID}`);
const sacMatches = (sacData.messageData || []).filter(m => m.idGroup === FBIB_GROUP);
const teamIds = new Set([SAC_TEAM_ID]);
for (const m of sacMatches) {
  if (m.idLocalTeam)   teamIds.add(parseInt(m.idLocalTeam, 10));
  if (m.idVisitorTeam) teamIds.add(parseInt(m.idVisitorTeam, 10));
}

const matchMap = new Map();
for (const teamId of teamIds) {
  const data    = await fetchESB(`Match/getByTeamAllSeason/${teamId}`);
  const matches = (data.messageData || []).filter(m => m.idGroup === FBIB_GROUP);
  for (const m of matches) {
    const key = m.universallyid || m.adGameId || `${m.idLocalTeam}_${m.idVisitorTeam}_${m.numMatchDay}`;
    if (!matchMap.has(key)) matchMap.set(key, m);
  }
}

const allMatches = [...matchMap.values()].sort((a, b) =>
  parseInt(a.numMatchDay || 0) - parseInt(b.numMatchDay || 0)
);

const futuros = allMatches.filter(m => !m.universallyid || m.localScore === null);
console.log(`\n📅 Partidos pendientes en FBIB: ${futuros.length}`);
for (const m of futuros) {
  console.log(`  J${m.numMatchDay} | adGameId=${m.adGameId} | universallyid=${m.universallyid}`);
  console.log(`    Local: ${m.nameLocalTeam} (id=${m.idLocalTeam})`);
  console.log(`    Visit: ${m.nameVisitorTeam} (id=${m.idVisitorTeam})`);
  console.log(`    Fecha: ${m.matchDay || '—'} | Cancha: ${m.nameField || '—'}`);
  console.log(`    localScore=${m.localScore} visitorScore=${m.visitorScore}`);
  console.log('    Raw keys:', Object.keys(m).join(', '));
}

// 2. Muestra qué jornadas hay en Neon
const jRows = await sql`SELECT numero FROM jornadas ORDER BY numero`;
console.log(`\nJornadas en Neon: ${jRows.map(r => r.numero).join(', ')}`);

// 3. Equipos mapeados
const equiposRows = await sql`SELECT id, short_name, nombre FROM equipos WHERE short_name IS NOT NULL`;
console.log('\nEquipos en Neon:');
for (const e of equiposRows) console.log(`  id=${e.id} short=${e.short_name} ${e.nombre}`);
