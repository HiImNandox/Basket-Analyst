import { setCors, handleOptions } from './lib/cors.js';
import { getMongo } from './lib/mongo.js';
import { sql } from './lib/db.js';

const SAC_EQUIPO_ID = 5;

const SAC_SHORT = 'SAC';

// Extrae el marcador por cuarto a partir del array acumulativo de score
function scoreByPeriod(scores, numPeriods) {
  const local = [], visit = [];
  let prevLocal = 0, prevVisit = 0;
  for (let p = 1; p <= numPeriods; p++) {
    const entries = scores.filter(s => s.period === p);
    const last    = entries[entries.length - 1];
    if (last) {
      local.push(last.local - prevLocal);
      visit.push(last.visit - prevVisit);
      prevLocal = last.local;
      prevVisit = last.visit;
    } else {
      local.push(0);
      visit.push(0);
    }
  }
  return { local, visit };
}

// Capitaliza: "SA CABANETA A FONTANERIA..." → "Sa Cabaneta A"
function cleanName(fullName = '') {
  const main = fullName.split('/')[0].trim().toLowerCase();
  const words = main.split(/\s+/).filter(Boolean);
  const titled = words.map(w => w.charAt(0).toUpperCase() + w.slice(1));
  // Limita a 3 palabras para evitar nombres de patrocinador
  return titled.slice(0, 3).join(' ');
}

// "VICTOR HUGO LASTRA" → "Victor Hugo Lastra"
function cleanPlayerName(fullName = '') {
  return fullName.trim().toLowerCase().split(/\s+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// Extrae estadísticas individuales de cada equipo (están en teams[i].players, NO en json.players)
function extractPlayers(teams) {
  const result = {};
  for (const team of teams) {
    if (!team.players?.length || !team.shortName) continue;
    result[team.shortName] = team.players
      .filter(p => p.gamePlayed)
      .map(p => {
        const d = p.data || {};
        return {
          actorId: p.actorId,
          name:    cleanPlayerName(p.name),
          dorsal:  p.dorsal || '?',
          min:     p.timePlayed || 0,
          pts:     d.score || 0,
          reb:     (d.offensiveRebound || 0) + (d.defensiveRebound || 0),
          ast:     d.assists  || 0,
          stl:     d.steals   || 0,
          blk:     d.block    || 0,
          to:      d.lost     || 0,
          pf:      d.personal || 0,
          t1:      `${d.shotsOfOneSuccessful   || 0}/${d.shotsOfOneAttempted   || 0}`,
          t2:      `${d.shotsOfTwoSuccessful   || 0}/${d.shotsOfTwoAttempted   || 0}`,
          t3:      `${d.shotsOfThreeSuccessful || 0}/${d.shotsOfThreeAttempted || 0}`,
          pm:      p.inOut || 0,
          pir:     d.valoration || 0,
        };
      })
      .sort((a, b) => b.pts - a.pts);
  }
  return result;
}

// Devuelve el nombre oficial desde la BD; si no está mapeado, usa cleanName()
function teamName(shortName, rawName, dbNameMap) {
  return dbNameMap[shortName] || cleanName(rawName);
}

function parseMatch(json, jornada, dbNameMap = {}) {
  const teams  = json.teams  || [];
  const scores = json.score  || [];
  const final  = scores[scores.length - 1] || { local: 0, visit: 0 };
  const numPeriods = json.periodDurationList?.length || 4;
  const cuartos    = scoreByPeriod(scores, numPeriods);

  const localTeam = teams.find(t => t.teamIdIntern === json.localId)  || {};
  const visitTeam = teams.find(t => t.teamIdIntern === json.visitId)  || {};

  const esCasa     = localTeam.shortName === SAC_SHORT;
  const esVisita   = visitTeam.shortName === SAC_SHORT;
  const esCabaneta = esCasa || esVisita;

  const sacPuntos    = esCasa ? final.local  : esVisita ? final.visit : null;
  const rivalPuntos  = esCasa ? final.visit  : esVisita ? final.local : null;
  const resultado    = sacPuntos !== null
    ? (sacPuntos > rivalPuntos ? 'V' : 'D')
    : null;

  // Estadísticas individuales por equipo (shortName → array de jugadores)
  const players = extractPlayers(teams);

  // Valoración total del equipo Sa Cabaneta en este partido (desde teams[i].players)
  let sacValoracion = null;
  if (esCabaneta) {
    const sacShort   = esCasa ? localTeam.shortName : visitTeam.shortName;
    const sacPlayers = players[sacShort] || [];
    if (sacPlayers.length > 0) {
      sacValoracion = sacPlayers.reduce((s, p) => s + p.pir, 0);
    }
  }

  const fechaRaw = new Date(json.time);

  return {
    jornada,
    matchIdIntern: json.idMatchIntern,
    matchIdExtern: json.idMatchExtern,
    fecha:         isNaN(fechaRaw) ? null : fechaRaw.toISOString(),
    local: {
      id:        json.localId,
      nombre:    teamName(localTeam.shortName, localTeam.name, dbNameMap),
      shortName: localTeam.shortName || '???',
      puntos:    final.local
    },
    visit: {
      id:        json.visitId,
      nombre:    teamName(visitTeam.shortName, visitTeam.name, dbNameMap),
      shortName: visitTeam.shortName || '???',
      puntos:    final.visit
    },
    cuartos,
    players,      // { shortName: [{ name, pts, reb, ast, t1, t2, t3, pm, pir, ... }] }
    esCabaneta,
    esCasa,
    esVisita,
    sacPuntos,
    rivalPuntos,
    resultado,
    sacValoracion
  };
}

function calcularClasificacion(partidos) {
  const equipos = {};

  for (const p of partidos) {
    for (const [side, opp] of [['local', 'visit'], ['visit', 'local']]) {
      const t   = p[side];
      const key = t.shortName; // shortName es estable entre partidos; t.id varía por partido
      if (!equipos[key]) {
        equipos[key] = {
          shortName: t.shortName, nombre: t.nombre,
          esSac: t.shortName === SAC_SHORT,
          pj: 0, v: 0, d: 0, pf: 0, pc: 0
        };
      }
      const eq  = equipos[key];
      const pts = p[side].puntos, opts = p[opp].puntos;
      eq.pj++;
      eq.pf += pts;
      eq.pc += opts;
      pts > opts ? eq.v++ : eq.d++;
    }
  }

  return Object.values(equipos)
    .map(e => ({
      ...e,
      puntos:    e.v * 2 + e.d,
      avgFavor:  e.pj > 0 ? Math.round((e.pf / e.pj) * 10) / 10 : 0,
      avgContra: e.pj > 0 ? Math.round((e.pc / e.pj) * 10) / 10 : 0
    }))
    .sort((a, b) => b.puntos - a.puntos || b.v - a.v || b.avgFavor - a.avgFavor);
}

export default async function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método no permitido' });

  try {
    // Carga nombres oficiales de la BD (short_name → nombre)
    let dbNameMap = {};
    try {
      const rows = await sql`
        SELECT short_name, nombre
        FROM   equipos
        WHERE  short_name IS NOT NULL
      `;
      for (const row of rows) dbNameMap[row.short_name] = row.nombre;
    } catch (_) {
      // fallback silencioso: se usará cleanName()
    }

    // Lee todos los stats desde MongoDB en lugar de los archivos locales
    const db       = await getMongo();
    const statsDocs = await db.collection('stats')
      .find({}, { projection: { _id: 0 } })
      .sort({ jornada: 1 })
      .toArray();

    const partidos = [];
    const jornadasVistas = new Set();

    for (const doc of statsDocs) {
      const jNum = doc.jornada;
      jornadasVistas.add(jNum);
      const p      = parseMatch(doc, jNum, dbNameMap);
      p.fileId     = doc.matchId;          // e.g. "69e1442703837a00011202c1"
      p.jornadaDir = 'J' + jNum;           // e.g. "J9"
      partidos.push(p);
    }

    // ── Partidos pendientes desde Neon ──────────────────────────────────────
    try {
      const matchIdsEnMongo = new Set(statsDocs.map(d => d.matchId));
      const pendientes = await sql`
        SELECT
          p.id, p.fbib_match_id, p.fecha, p.cancha_nombre,
          j.numero          AS jornada,
          el.nombre         AS local_nombre, el.short_name AS local_short,
          ev.nombre         AS visit_nombre, ev.short_name AS visit_short
        FROM partidos p
        JOIN jornadas j  ON j.id  = p.jornada_id
        JOIN equipos  el ON el.id = p.equipo_local_id
        JOIN equipos  ev ON ev.id = p.equipo_visit_id
        WHERE p.estado = 'pendiente'
          AND (p.fbib_match_id IS NULL OR p.fbib_match_id != ALL(${[...matchIdsEnMongo]}))
        ORDER BY j.numero ASC, p.fecha ASC
      `;

      for (const p of pendientes) {
        const esCasa   = p.local_short === SAC_SHORT;
        const esVisita = p.visit_short === SAC_SHORT;
        partidos.push({
          jornada:       p.jornada,
          fecha:         p.fecha ? new Date(p.fecha).toISOString() : null,
          local:         { nombre: dbNameMap[p.local_short] || p.local_nombre, shortName: p.local_short || '???', puntos: null },
          visit:         { nombre: dbNameMap[p.visit_short] || p.visit_nombre, shortName: p.visit_short || '???', puntos: null },
          cuartos:       { local: [], visit: [] },
          esCabaneta:    esCasa || esVisita,
          esCasa,
          esVisita,
          sacPuntos:     null,
          rivalPuntos:   null,
          resultado:     null,
          sacValoracion: null,
          cancha:        p.cancha_nombre || null,
          isPendiente:   true,
          fileId:        null,
          jornadaDir:    'J' + p.jornada,
        });
      }
    } catch (_) { /* fallback silencioso */ }

    // Ordena por fecha
    partidos.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

    const clasificacion = calcularClasificacion(partidos.filter(p => !p.isPendiente));

    // Datos específicos de Sa Cabaneta
    const sacPartidos    = partidos.filter(p => p.esCabaneta).sort((a, b) => a.jornada - b.jornada);
    const sacJugados     = sacPartidos.filter(p => !p.isPendiente);
    const proximoPartido = sacPartidos.find(p => p.isPendiente) || null;
    const victorias      = sacJugados.filter(p => p.resultado === 'V').length;
    const derrotas       = sacJugados.filter(p => p.resultado === 'D').length;
    const posicion       = clasificacion.findIndex(e => e.esSac) + 1;
    const ultimoPartido  = sacJugados[sacJugados.length - 1] || null;
    const racha          = sacJugados.slice(-5).map(p => p.resultado);
    const ultimaJornada  = ultimoPartido?.jornada || 0;

    const avgFavor  = sacJugados.length > 0
      ? Math.round((sacJugados.reduce((s, p) => s + (p.sacPuntos   || 0), 0) / sacJugados.length) * 10) / 10
      : 0;
    const avgContra = sacJugados.length > 0
      ? Math.round((sacJugados.reduce((s, p) => s + (p.rivalPuntos || 0), 0) / sacJugados.length) * 10) / 10
      : 0;
    const avgPir    = sacJugados.filter(p => p.sacValoracion !== null).length > 0
      ? Math.round(
          sacJugados.filter(p => p.sacValoracion !== null)
            .reduce((s, p) => s + p.sacValoracion, 0)
          / sacJugados.filter(p => p.sacValoracion !== null).length
          * 10
        ) / 10
      : null;

    // Sin caché edge — los datos cambian al ingestar partidos
    res.setHeader('Cache-Control', 'no-store');

    return res.status(200).json({
      partidos,
      clasificacion,
      totalJornadas: jornadasVistas.size,
      sac: {
        posicion,
        victorias,
        derrotas,
        avgFavor,
        avgContra,
        avgPir,
        racha,
        ultimaJornada,
        ultimoPartido,
        proximoPartido
      }
    });

  } catch (err) {
    console.error('[api/matches]', err);
    return res.status(500).json({ error: err.message });
  }
}
