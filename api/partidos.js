import { sql } from './lib/db.js';
import { setCors, handleOptions } from './lib/cors.js';

// GET /api/partidos
//   ?jornada_id=1
//   ?equipo_id=5
//   ?estado=jugado
//
// GET /api/partidos?clasificacion=1&competicion_id=1
//   → clasificación completa de la competición (fusionado de clasificacion.js)

export default async function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    // ── Clasificación ────────────────────────────────────────────────────────
    if (req.query.clasificacion) {
      const { competicion_id } = req.query;
      if (!competicion_id) {
        return res.status(400).json({ error: 'competicion_id es obligatorio' });
      }

      const clasificacion = await sql`
        SELECT
          e.id,
          e.nombre,
          COUNT(p.id)                                           AS pj,
          COUNT(p.id) FILTER (
            WHERE (p.equipo_local_id = e.id AND p.resultado_local > p.resultado_visit)
               OR (p.equipo_visit_id = e.id AND p.resultado_visit > p.resultado_local)
          )                                                     AS victorias,
          COUNT(p.id) FILTER (
            WHERE (p.equipo_local_id = e.id AND p.resultado_local < p.resultado_visit)
               OR (p.equipo_visit_id = e.id AND p.resultado_visit < p.resultado_local)
          )                                                     AS derrotas,
          COUNT(p.id) FILTER (
            WHERE (p.equipo_local_id = e.id AND p.resultado_local > p.resultado_visit)
               OR (p.equipo_visit_id = e.id AND p.resultado_visit > p.resultado_local)
          ) * 2
          + COUNT(p.id) FILTER (
            WHERE (p.equipo_local_id = e.id AND p.resultado_local < p.resultado_visit)
               OR (p.equipo_visit_id = e.id AND p.resultado_visit < p.resultado_local)
          )                                                     AS puntos,
          ROUND(AVG(
            CASE WHEN p.equipo_local_id = e.id THEN p.resultado_local ELSE p.resultado_visit END
          )::numeric, 1)                                        AS pts_favor,
          ROUND(AVG(
            CASE WHEN p.equipo_local_id = e.id THEN p.resultado_visit ELSE p.resultado_local END
          )::numeric, 1)                                        AS pts_contra
        FROM equipos e
        JOIN partidos p ON (p.equipo_local_id = e.id OR p.equipo_visit_id = e.id)
        JOIN jornadas j ON j.id = p.jornada_id
        WHERE j.competicion_id = ${competicion_id}
          AND p.estado = 'jugado'
        GROUP BY e.id, e.nombre
        ORDER BY puntos DESC, victorias DESC, pts_favor DESC
      `;
      return res.status(200).json(clasificacion);
    }

    // ── Listado de partidos ──────────────────────────────────────────────────
    const { jornada_id, equipo_id, estado } = req.query;

    const partidos = await sql`
      SELECT
        p.id,
        p.match_id_intern,
        p.match_id_extern,
        p.fbib_match_id,
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
