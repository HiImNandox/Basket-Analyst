import { sql } from '../lib/db.js';
import { setCors, handleOptions } from '../lib/cors.js';

// POST /api/mobile/5v5  → guarda un partido 5v5 de entrenamiento
// Body: { evento_id, evento_fecha, numero_partido, quinteto_local[], quinteto_visit[],
//         puntos_local, puntos_visit, stats_json }
//
// GET /api/mobile/5v5?evento_id=X&evento_fecha=YYYY-MM-DD

export default async function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;

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
      const rows = await sql`
        INSERT INTO entreno_5v5
          (evento_id, evento_fecha, numero_partido,
           quinteto_local, quinteto_visit,
           puntos_local, puntos_visit, stats_json)
        VALUES (
          ${evento_id},
          ${evento_fecha},
          ${numero_partido},
          ${quinteto_local ?? []}::integer[],
          ${quinteto_visit ?? []}::integer[],
          ${puntos_local},
          ${puntos_visit},
          ${JSON.stringify(stats_json ?? {})}::jsonb
        )
        ON CONFLICT (evento_id, evento_fecha, numero_partido) DO UPDATE SET
          quinteto_local = EXCLUDED.quinteto_local,
          quinteto_visit = EXCLUDED.quinteto_visit,
          puntos_local   = EXCLUDED.puntos_local,
          puntos_visit   = EXCLUDED.puntos_visit,
          stats_json     = EXCLUDED.stats_json
        RETURNING id, evento_id, numero_partido
      `;
      return res.status(200).json(rows[0]);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'GET') {
    const { evento_id, evento_fecha } = req.query;
    if (!evento_id) {
      return res.status(400).json({ error: 'evento_id es obligatorio' });
    }
    try {
      const rows = await sql`
        SELECT *
        FROM entreno_5v5
        WHERE evento_id = ${evento_id}
          AND (${evento_fecha ?? null}::date IS NULL OR evento_fecha = ${evento_fecha ?? null}::date)
        ORDER BY numero_partido ASC
      `;
      return res.status(200).json(rows);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
