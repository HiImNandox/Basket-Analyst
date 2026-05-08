import { sql } from '../lib/db.js';
import { getMongo } from '../lib/mongo.js';
import { setCors, handleOptions } from '../lib/cors.js';

// POST /api/mobile/partido-stats  → guarda/actualiza stats de un partido móvil
//   metadata relacional → Neon
//   stats_json + pbp_json → MongoDB (collection: match_stats)
//
// GET /api/mobile/partido-stats?mobile_uuid=X[&include_stats=true]
//   Sin include_stats: solo metadata de Neon
//   Con include_stats=true: también devuelve stats_json y pbp_json de MongoDB

export default async function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;

  // ── POST ────────────────────────────────────────────────────────────────────
  if (req.method === 'POST') {
    const {
      mobile_uuid,
      partido_id,
      equipo_local_id,
      equipo_visit_id,
      fecha,
      resultado_local,
      resultado_visit,
      cuartos_local,
      cuartos_visit,
      stats_json,
      pbp_json,
      temporada,
    } = req.body ?? {};

    if (!mobile_uuid) {
      return res.status(400).json({ error: 'mobile_uuid es obligatorio' });
    }

    try {
      // 1. Guardar blobs JSON en MongoDB
      const db = await getMongo();
      const mongoResult = await db.collection('match_stats').findOneAndUpdate(
        { mobile_uuid },
        {
          $set: {
            mobile_uuid,
            stats_json: stats_json ?? {},
            pbp_json: pbp_json ?? [],
            updated_at: new Date(),
          },
          $setOnInsert: { created_at: new Date() },
        },
        { upsert: true, returnDocument: 'after' }
      );
      const mongoId = mongoResult._id.toString();

      // 2. Guardar metadata en Neon (sin los blobs)
      const rows = await sql`
        INSERT INTO partidos_stats_mobile
          (mobile_uuid, partido_id, equipo_local_id, equipo_visit_id,
           fecha, resultado_local, resultado_visit,
           cuartos_local, cuartos_visit, temporada, mongo_id, updated_at)
        VALUES (
          ${mobile_uuid},
          ${partido_id ?? null},
          ${equipo_local_id ?? null},
          ${equipo_visit_id ?? null},
          ${fecha ?? null},
          ${resultado_local ?? 0},
          ${resultado_visit ?? 0},
          ${JSON.stringify(cuartos_local ?? [])}::jsonb,
          ${JSON.stringify(cuartos_visit ?? [])}::jsonb,
          ${temporada ?? null},
          ${mongoId},
          NOW()
        )
        ON CONFLICT (mobile_uuid) DO UPDATE SET
          partido_id       = EXCLUDED.partido_id,
          equipo_local_id  = EXCLUDED.equipo_local_id,
          equipo_visit_id  = EXCLUDED.equipo_visit_id,
          fecha            = EXCLUDED.fecha,
          resultado_local  = EXCLUDED.resultado_local,
          resultado_visit  = EXCLUDED.resultado_visit,
          cuartos_local    = EXCLUDED.cuartos_local,
          cuartos_visit    = EXCLUDED.cuartos_visit,
          temporada        = EXCLUDED.temporada,
          mongo_id         = EXCLUDED.mongo_id,
          updated_at       = NOW()
        RETURNING id, mobile_uuid, mongo_id, updated_at
      `;

      return res.status(200).json({ ...rows[0], mongo_id: mongoId });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // ── GET ─────────────────────────────────────────────────────────────────────
  if (req.method === 'GET') {
    const { partido_id, mobile_uuid, include_stats } = req.query;

    try {
      const rows = await sql`
        SELECT psm.id, psm.mobile_uuid, psm.partido_id,
               psm.equipo_local_id, psm.equipo_visit_id,
               psm.fecha, psm.resultado_local, psm.resultado_visit,
               psm.cuartos_local, psm.cuartos_visit,
               psm.temporada, psm.mongo_id, psm.updated_at,
               el.nombre AS equipo_local_nombre,
               ev.nombre AS equipo_visit_nombre
        FROM partidos_stats_mobile psm
        LEFT JOIN equipos el ON el.id = psm.equipo_local_id
        LEFT JOIN equipos ev ON ev.id = psm.equipo_visit_id
        WHERE
          (${partido_id ?? null}::int IS NULL OR psm.partido_id = ${partido_id ?? null}::int)
          AND (${mobile_uuid ?? null}::text IS NULL OR psm.mobile_uuid = ${mobile_uuid ?? null}::text)
        ORDER BY psm.fecha DESC NULLS LAST
        LIMIT 100
      `;

      // Si piden los stats completos, enriquece con los datos de MongoDB
      if (include_stats === 'true' && rows.length > 0) {
        const db = await getMongo();
        const uuids = rows.map(r => r.mobile_uuid);
        const mongoDocs = await db.collection('match_stats')
          .find({ mobile_uuid: { $in: uuids } })
          .toArray();
        const mongoMap = Object.fromEntries(mongoDocs.map(d => [d.mobile_uuid, d]));

        const enriched = rows.map(r => ({
          ...r,
          stats_json: mongoMap[r.mobile_uuid]?.stats_json ?? null,
          pbp_json:   mongoMap[r.mobile_uuid]?.pbp_json   ?? null,
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
