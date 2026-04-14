import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { setCors, handleOptions } from './lib/cors.js';

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

function parseMatch(json, jornada) {
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

  // Valoración media del equipo Sa Cabaneta en este partido
  let sacValoracion = null;
  if (esCabaneta && json.players) {
    const sacTeamId  = esCasa ? json.localId : json.visitId;
    const sacPlayers = json.players.filter(p => p.teamId === sacTeamId && p.data);
    if (sacPlayers.length > 0) {
      sacValoracion = sacPlayers.reduce((s, p) => s + (p.data.valoration || 0), 0);
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
      nombre:    cleanName(localTeam.name),
      shortName: localTeam.shortName || '???',
      puntos:    final.local
    },
    visit: {
      id:        json.visitId,
      nombre:    cleanName(visitTeam.name),
      shortName: visitTeam.shortName || '???',
      puntos:    final.visit
    },
    cuartos,
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
      const t = p[side];
      if (!equipos[t.id]) {
        equipos[t.id] = {
          id: t.id, nombre: t.nombre, shortName: t.shortName,
          esSac: t.shortName === SAC_SHORT,
          pj: 0, v: 0, d: 0, pf: 0, pc: 0
        };
      }
      const eq  = equipos[t.id];
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
    const dataDir = join(process.cwd(), 'data');

    const jornadaDirs = readdirSync(dataDir, { withFileTypes: true })
      .filter(d => d.isDirectory() && /^J\d+$/i.test(d.name))
      .sort((a, b) => parseInt(a.name.slice(1)) - parseInt(b.name.slice(1)));

    const partidos = [];

    for (const dir of jornadaDirs) {
      const jNum    = parseInt(dir.name.slice(1));
      const dirPath = join(dataDir, dir.name);
      const files   = readdirSync(dirPath).filter(f => f.endsWith('_stats.json'));

      for (const file of files) {
        const raw  = readFileSync(join(dirPath, file), 'utf8');
        const json = JSON.parse(raw);
        partidos.push(parseMatch(json, jNum));
      }
    }

    // Ordena por fecha
    partidos.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

    const clasificacion = calcularClasificacion(partidos);

    // Datos específicos de Sa Cabaneta
    const sacPartidos   = partidos.filter(p => p.esCabaneta).sort((a, b) => a.jornada - b.jornada);
    const victorias     = sacPartidos.filter(p => p.resultado === 'V').length;
    const derrotas      = sacPartidos.filter(p => p.resultado === 'D').length;
    const posicion      = clasificacion.findIndex(e => e.esSac) + 1;
    const ultimoPartido = sacPartidos[sacPartidos.length - 1] || null;
    const racha         = sacPartidos.slice(-5).map(p => p.resultado);
    const ultimaJornada = ultimoPartido?.jornada || 0;

    const avgFavor  = sacPartidos.length > 0
      ? Math.round((sacPartidos.reduce((s, p) => s + (p.sacPuntos   || 0), 0) / sacPartidos.length) * 10) / 10
      : 0;
    const avgContra = sacPartidos.length > 0
      ? Math.round((sacPartidos.reduce((s, p) => s + (p.rivalPuntos || 0), 0) / sacPartidos.length) * 10) / 10
      : 0;
    const avgPir    = sacPartidos.filter(p => p.sacValoracion !== null).length > 0
      ? Math.round(
          sacPartidos.filter(p => p.sacValoracion !== null)
            .reduce((s, p) => s + p.sacValoracion, 0)
          / sacPartidos.filter(p => p.sacValoracion !== null).length
          * 10
        ) / 10
      : null;

    // Cache 1 hora (los datos se actualizan al subir nuevos JSON)
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');

    return res.status(200).json({
      partidos,
      clasificacion,
      totalJornadas: jornadaDirs.length,
      sac: {
        posicion,
        victorias,
        derrotas,
        avgFavor,
        avgContra,
        avgPir,
        racha,
        ultimaJornada,
        ultimoPartido
      }
    });

  } catch (err) {
    console.error('[api/matches]', err);
    return res.status(500).json({ error: err.message });
  }
}
