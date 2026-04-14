import { sql } from './lib/db.js';
import { setCors, handleOptions } from './lib/cors.js';

// GET /api/clasificacion
// Query params:
//   ?competicion_id=1  (requerido)
//
// Sistema de puntos baloncesto español:
//   Victoria = 2 puntos | Derrota = 1 punto

export default async function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { competicion_id } = req.query;

  if (!competicion_id) {
    return res.status(400).json({ error: 'competicion_id es obligatorio' });
  }

  try {
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

        -- Victoria = 2pts, Derrota = 1pt
        COUNT(p.id) FILTER (
          WHERE (p.equipo_local_id = e.id AND p.resultado_local > p.resultado_visit)
             OR (p.equipo_visit_id = e.id AND p.resultado_visit > p.resultado_local)
        ) * 2
        + COUNT(p.id) FILTER (
          WHERE (p.equipo_local_id = e.id AND p.resultado_local < p.resultado_visit)
             OR (p.equipo_visit_id = e.id AND p.resultado_visit < p.resultado_local)
        )                                                     AS puntos,

        -- Media de puntos a favor
        ROUND(AVG(
          CASE
            WHEN p.equipo_local_id = e.id THEN p.resultado_local
            ELSE p.resultado_visit
          END
        )::numeric, 1)                                        AS pts_favor,

        -- Media de puntos en contra
        ROUND(AVG(
          CASE
            WHEN p.equipo_local_id = e.id THEN p.resultado_visit
            ELSE p.resultado_local
          END
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
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
