import { getMongo } from './lib/mongo.js';
import { setCors, handleOptions } from './lib/cors.js';

// GET /api/stats?matchId=69c6fb6ee6ffd90001e21de6
// GET /api/stats?jornada=8               → todos los stats de esa jornada
// GET /api/stats?jornada=8&temporada=25-26
export default async function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const db  = await getMongo();
    const col = db.collection('stats');

    const { matchId, jornada, temporada } = req.query;

    // ── Búsqueda por matchId (único) ────────────────────────────────────────
    if (matchId) {
      const doc = await col.findOne(
        { matchId },
        { projection: { _id: 0 } }      // el cliente no necesita el _id de Mongo
      );
      if (!doc) return res.status(404).json({ error: 'Partido no encontrado' });
      return res.status(200).json(doc);
    }

    // ── Listado filtrado ────────────────────────────────────────────────────
    const filter = {};
    if (jornada)   filter.jornada   = parseInt(jornada, 10);
    if (temporada) filter.temporada = temporada;

    const docs = await col
      .find(filter, { projection: { _id: 0 } })
      .sort({ jornada: 1 })
      .toArray();

    return res.status(200).json(docs);

  } catch (err) {
    console.error('[api/stats]', err);
    return res.status(500).json({ error: err.message });
  }
}
