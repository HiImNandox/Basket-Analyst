import { getMongo } from './lib/mongo.js';
import { setCors, handleOptions } from './lib/cors.js';

// GET /api/pbp?matchId=69c6fb6ee6ffd90001e21de6
//   → devuelve el array de eventos directamente (igual que el JSON original)
//
// GET /api/pbp?matchId=xxx&raw=1
//   → devuelve el documento completo (con jornada, temporada, importedAt)
export default async function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  if (!req.query.matchId) {
    return res.status(400).json({ error: 'Parámetro matchId requerido' });
  }

  try {
    const db  = await getMongo();
    const col = db.collection('pbp');

    const doc = await col.findOne(
      { matchId: req.query.matchId },
      { projection: { _id: 0 } }
    );

    if (!doc) return res.status(404).json({ error: 'PBP no encontrado para este partido' });

    // Por defecto devolvemos solo el array de eventos (compatibilidad con partido.html)
    if (req.query.raw === '1') {
      return res.status(200).json(doc);
    }
    return res.status(200).json(doc.events ?? []);

  } catch (err) {
    console.error('[api/pbp]', err);
    return res.status(500).json({ error: err.message });
  }
}
