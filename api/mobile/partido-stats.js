import { sql } from '../lib/db.js';
import { setCors, handleOptions } from '../lib/cors.js';

// POST /api/mobile/partido-stats  → guarda/actualiza stats de un partido móvil
// GET  /api/mobile/partido-stats?partido_id=X  → devuelve stats de ese partido

export default async function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;

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
      const rows = await sql`
        INSERT INTO partidos_stats_mobile
          (mobile_uuid, partido_id, equipo_local_id, equipo_visit_id,
           fecha, resultado_local, resultado_visit,
           cuartos_local, cuartos_visit, stats_json, pbp_json, temporada, updated_at)
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
          ${JSON.stringify(stats_json ?? {})}::jsonb,
          ${JSON.stringify(pbp_json ?? [])}::jsonb,
          ${temporada ?? null},
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
          stats_json       = EXCLUDED.stats_json,
          pbp_json         = EXCLUDED.pbp_json,
          temporada        = EXCLUDED.temporada,
          updated_at       = NOW()
        RETURNING id, mobile_uuid, updated_at
      `;
      return res.status(200).json(rows[0]);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'GET') {
    const { partido_id, mobile_uuid } = req.query;
    try {
      const rows = await sql`
        SELECT psm.*,
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
      return res.status(200).json(rows);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
