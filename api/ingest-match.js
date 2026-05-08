import { getMongo } from './lib/mongo.js';
import { setCors, handleOptions } from './lib/cors.js';

// POST /api/ingest-match
// Body JSON: { matchId, jornada, temporada?, currentSeason? }
//
// Llama a la API de la FBIB, obtiene stats + pbp del partido
// y los guarda (upsert) en MongoDB.
// Idempotente: se puede re-ejecutar sin duplicar datos.
//
// Ejemplo:
//   fetch('/api/ingest-match', {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify({ matchId: '69e1442703837a00011202c1', jornada: 9 })
//   })

const FBIB_BASE = 'https://msstats.optimalwayconsulting.com/v1/fbib';
const DEFAULT_TEMPORADA = '25-26';

async function fetchFbib(endpoint, matchId, currentSeason) {
  const url = `${FBIB_BASE}/${endpoint}/${matchId}?currentSeason=${currentSeason}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'HoopStats/1.0' } });
  if (!res.ok) throw new Error(`FBIB ${endpoint} → HTTP ${res.status}`);
  return res.json();
}

export default async function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const {
    matchId,
    jornada,
    temporada     = DEFAULT_TEMPORADA,
    currentSeason = 'true',
  } = req.body || {};

  if (!matchId || !jornada) {
    return res.status(400).json({ error: 'matchId y jornada son obligatorios' });
  }

  const jNum = parseInt(jornada, 10);
  if (isNaN(jNum) || jNum < 1) {
    return res.status(400).json({ error: 'jornada debe ser un número ≥ 1' });
  }

  const db     = await getMongo();
  const result = { matchId, jornada: jNum, temporada, stats: null, pbp: null };

  // ── Stats ──────────────────────────────────────────────────────────────────
  try {
    const statsData = await fetchFbib('getJsonWithMatchStats', matchId, currentSeason);
    await db.collection('stats').updateOne(
      { matchId },
      { $set: { matchId, jornada: jNum, temporada, importedAt: new Date(), ...statsData } },
      { upsert: true }
    );
    result.stats = 'ok';
  } catch (e) {
    console.error('[ingest-match] stats error:', e.message);
    result.stats = `error: ${e.message}`;
  }

  // ── PBP ───────────────────────────────────────────────────────────────────
  try {
    const pbpData = await fetchFbib('getJsonWithMatchMoves', matchId, currentSeason);
    const events  = Array.isArray(pbpData) ? pbpData : [];
    await db.collection('pbp').updateOne(
      { matchId },
      { $set: { matchId, jornada: jNum, temporada, events, importedAt: new Date() } },
      { upsert: true }
    );
    result.pbp = `ok (${events.length} eventos)`;
  } catch (e) {
    console.error('[ingest-match] pbp error:', e.message);
    result.pbp = `error: ${e.message}`;
  }

  const allOk = result.stats === 'ok' && result.pbp?.startsWith('ok');
  return res.status(allOk ? 200 : 207).json(result);
}
