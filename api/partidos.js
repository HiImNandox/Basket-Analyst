import { sql } from './lib/db.js';
import { setCors, handleOptions } from './lib/cors.js';

// GET /api/partidos
// Query params opcionales:
//   ?jornada_id=1
//   ?equipo_id=1     → partidos donde participa ese equipo
//   ?estado=jugado   → pendiente | jugado | aplazado

export default async function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { jornada_id, equipo_id, estado } = req.query;

    // Construcción dinámica de filtros
    const partidos = await sql`
      SELECT
        p.id,
        p.match_id_intern,
        p.match_id_extern,
        p.fecha,
        p.cancha_nombre,
        p.google_place_id,
        p.resultado_local,
        p.resultado_visit,
        p.estado,
        j.numero                AS jornada_numero,
        el.id                   AS local_id,
        el.nombre               AS local_nombre,
        ev.id                   AS visit_id,
        ev.nombre               AS visit_nombre
      FROM partidos p
      JOIN jornadas j  ON j.id = p.jornada_id
      JOIN equipos el  ON el.id = p.equipo_local_id
      JOIN equipos ev  ON ev.id = p.equipo_visit_id
      WHERE
        (${jornada_id ?? null}::int IS NULL OR p.jornada_id = ${jornada_id ?? null}::int)
        AND (${equipo_id ?? null}::int IS NULL
             OR p.equipo_local_id = ${equipo_id ?? null}::int
             OR p.equipo_visit_id = ${equipo_id ?? null}::int)
        AND (${estado ?? null}::text IS NULL OR p.estado = ${estado ?? null}::text)
      ORDER BY p.fecha ASC NULLS LAST, j.numero ASC
    `;

    return res.status(200).json(partidos);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
