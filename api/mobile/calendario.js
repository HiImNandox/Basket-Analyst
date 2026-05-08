import { sql } from '../lib/db.js';
import { setCors, handleOptions } from '../lib/cors.js';

// GET /api/mobile/calendario?equipo_id=5
// Devuelve todos los partidos de liga de un equipo con resultado de federación
// e indicación de si ya hay estadísticas móviles vinculadas.

export default async function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;

  if (req.method !== 'GET') return res.status(405).json({ error: 'Método no permitido' });

  const equipo_id = parseInt(req.query.equipo_id ?? '5');
  if (isNaN(equipo_id)) return res.status(400).json({ error: 'equipo_id inválido' });

  try {
    const rows = await sql`
      SELECT
        p.id,
        p.match_id_intern,
        p.jornada_id,
        p.equipo_local_id,
        p.equipo_visit_id,
        p.fecha,
        p.cancha_nombre,
        p.resultado_local,
        p.resultado_visit,
        p.estado,
        el.nombre             AS local_nombre,
        ev.nombre             AS visitante_nombre,
        psm.id                AS stats_neon_id,
        psm.mongo_id          AS stats_mongo_id,
        psm.mobile_uuid       AS stats_mobile_uuid
      FROM partidos p
      LEFT JOIN equipos el ON el.id = p.equipo_local_id
      LEFT JOIN equipos ev ON ev.id = p.equipo_visit_id
      LEFT JOIN partidos_stats_mobile psm ON psm.partido_id = p.id
      WHERE p.equipo_local_id = ${equipo_id}
         OR p.equipo_visit_id = ${equipo_id}
      ORDER BY p.fecha ASC
    `;

    return res.status(200).json(rows);
  } catch (err) {
    console.error('[mobile/calendario GET]', err);
    return res.status(500).json({ error: err.message });
  }
}
