import { sql } from '../lib/db.js';
import { getMongo } from '../lib/mongo.js';
import { setCors, handleOptions } from '../lib/cors.js';

// POST /api/mobile/5v5  → guarda un partido 5v5 de entrenamiento
//   estructura (quintetos, puntos) → Neon
//   stats_json → MongoDB (collection: training_stats)
//
// GET /api/mobile/5v5?evento_id=X[&evento_fecha=YYYY-MM-DD][&include_stats=true]

export default async function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;

  // ── POST ────────────────────────────────────────────────────────────────────
  if (req.method === 'POST') {
    const {
      evento_id, evento_fecha, numero_partido = 1,
      quinteto_local, quinteto_visit,
      puntos_local = 0, puntos_visit = 0,
      stats_json,
    } = req.body ?? {};

    if (!evento_id || !evento_fecha) {
      return res.status(400).json({ error: 'evento_id y evento_fecha son obligatorios' });
    }

    try {
      // 1. Guardar stats_json en MongoDB
      const db = await getMongo();
      const mongoResult = await db.collection('training_stats').findOneAndUpdate(
        { evento_id, evento_fecha, numero_partido },
        {
          $set: {
            evento_id,
            evento_fecha,
            numero_partido,
            stats_json: stats_json ?? {},
            updated_at: new Date(),
          },
          $setOnInsert: { created_at: new Date() },
        },
        { upsert: true, returnDocument: 'after' }
      );
      const mongoId = mongoResult._id.toString();

      // 2. Guardar estructura en Neon (sin stats_json)
      const rows = await sql`
        INSERT INTO entreno_5v5
          (evento_id, evento_fecha, numero_partido,
           quinteto_local, quinteto_visit,
           puntos_local, puntos_visit, mongo_id)
        VALUES (
          ${evento_id},
          ${evento_fecha},
          ${numero_partido},
          ${quinteto_local ?? []}::integer[],
          ${quinteto_visit ?? []}::integer[],
          ${puntos_local},
          ${puntos_visit},
          ${mongoId}
        )
        ON CONFLICT (evento_id, evento_fecha, numero_partido) DO UPDATE SET
          quinteto_local = EXCLUDED.quinteto_local,
          quinteto_visit = EXCLUDED.quinteto_visit,
          puntos_local   = EXCLUDED.puntos_local,
          puntos_visit   = EXCLUDED.puntos_visit,
          mongo_id       = EXCLUDED.mongo_id
        RETURNING id, evento_id, numero_partido, mongo_id
      `;

      return res.status(200).json(rows[0]);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // ── GET ─────────────────────────────────────────────────────────────────────
  if (req.method === 'GET') {
    const { evento_id, evento_fecha, include_stats } = req.query;

    if (!evento_id) {
      return res.status(400).json({ error: 'evento_id es obligatorio' });
    }

    try {
      const rows = await sql`
        SELECT id, evento_id, evento_fecha, numero_partido,
               quinteto_local, quinteto_visit,
               puntos_local, puntos_visit, mongo_id
        FROM entreno_5v5
        WHERE evento_id = ${evento_id}
          AND (${evento_fecha ?? null}::date IS NULL OR evento_fecha = ${evento_fecha ?? null}::date)
        ORDER BY numero_partido ASC
      `;

      if (include_stats === 'true' && rows.length > 0) {
        const db = await getMongo();
        const mongoIds = rows.map(r => r.mongo_id).filter(Boolean);
        const { ObjectId } = await import('mongodb');
        const mongoDocs = await db.collection('training_stats')
          .find({ _id: { $in: mongoIds.map(id => new ObjectId(id)) } })
          .toArray();
        const mongoMap = Object.fromEntries(mongoDocs.map(d => [d._id.toString(), d]));

        const enriched = rows.map(r => ({
          ...r,
          stats_json: mongoMap[r.mongo_id]?.stats_json ?? null,
        }));
        return res.status(200).json(enriched);
      }

      return res.status(200).json(rows);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
