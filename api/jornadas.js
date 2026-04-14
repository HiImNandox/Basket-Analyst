import { sql } from './lib/db.js';
import { setCors, handleOptions } from './lib/cors.js';

// GET /api/jornadas
// Query params:
//   ?competicion_id=1  (requerido)

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
    const jornadas = await sql`
      SELECT
        j.id,
        j.numero,
        j.fecha_inicio,
        j.fecha_fin,
        COUNT(p.id)                                        AS total_partidos,
        COUNT(p.id) FILTER (WHERE p.estado = 'jugado')    AS partidos_jugados,
        COUNT(p.id) FILTER (WHERE p.estado = 'pendiente') AS partidos_pendientes
      FROM jornadas j
      LEFT JOIN partidos p ON p.jornada_id = j.id
      WHERE j.competicion_id = ${competicion_id}
      GROUP BY j.id, j.numero, j.fecha_inicio, j.fecha_fin
      ORDER BY j.numero ASC
    `;

    return res.status(200).json(jornadas);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
