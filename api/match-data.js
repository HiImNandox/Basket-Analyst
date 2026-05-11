import { getMongo } from './lib/mongo.js';
import { setCors, handleOptions } from './lib/cors.js';

// Fusión de api/stats.js + api/pbp.js en un solo endpoint
//
// GET /api/match-data?matchId=xxx            → stats del partido (objeto)
// GET /api/match-data?matchId=xxx&type=pbp   → array de eventos PBP
// GET /api/match-data?matchId=xxx&type=stats → igual que sin type
// GET /api/match-data?matchId=xxx&raw=1      → doc PBP completo (con metadata)
//
// Listados:
// GET /api/match-data?jornada=8              → todos los stats de esa jornada
// GET /api/match-data?jornada=8&temporada=25-26

export default async function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const db  = await getMongo();
    const { matchId, jornada, temporada, type, raw } = req.query;
    const isPbp = type === 'pbp';

    // ── Por matchId ─────────────────────────────────────────────────────────
    if (matchId) {
      const col = db.collection(isPbp ? 'pbp' : 'stats');
      const doc = await col.findOne({ matchId }, { projection: { _id: 0 } });
      if (!doc) return res.status(404).json({ error: 'Partido no encontrado' });

      if (isPbp) {
        return res.status(200).json(raw === '1' ? doc : (doc.events ?? []));
      }
      return res.status(200).json(doc);
    }

    // ── Listado filtrado (solo stats) ────────────────────────────────────────
    const filter = {};
    if (jornada)   filter.jornada   = parseInt(jornada, 10);
    if (temporada) filter.temporada = temporada;

    const docs = await db.collection('stats')
      .find(filter, { projection: { _id: 0 } })
      .sort({ jornada: 1 })
      .toArray();

    return res.status(200).json(docs);

  } catch (err) {
    console.error('[api/match-data]', err);
    return res.status(500).json({ error: err.message });
  }
}
