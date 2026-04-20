import { sql } from './lib/db.js';
import { setCors, handleOptions } from './lib/cors.js';

// GET /api/equipos
// Query params opcionales:
//   ?temporada=2025-2026

export default async function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { temporada } = req.query;

    const equipos = temporada
      ? await sql`
          SELECT e.id, e.nombre, e.temporada, e.short_name,
                 COUNT(j.id) AS num_jugadores
          FROM equipos e
          LEFT JOIN jugadores j ON j.equipo_id = e.id
          WHERE e.temporada = ${temporada}
          GROUP BY e.id
          ORDER BY e.nombre
        `
      : await sql`
          SELECT e.id, e.nombre, e.temporada, e.short_name,
                 COUNT(j.id) AS num_jugadores
          FROM equipos e
          LEFT JOIN jugadores j ON j.equipo_id = e.id
          GROUP BY e.id
          ORDER BY e.temporada DESC, e.nombre
        `;

    return res.status(200).json(equipos);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
