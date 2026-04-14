import { sql } from './lib/db.js';
import { setCors, handleOptions } from './lib/cors.js';

// GET /api/jugadores
// Query params opcionales:
//   ?equipo_id=1

export default async function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { equipo_id } = req.query;

    const jugadores = equipo_id
      ? await sql`
          SELECT
            j.id,
            j.dorsal,
            p.nombre,
            p.apellidos,
            p.fecha_nacimiento,
            e.nombre AS equipo
          FROM jugadores j
          JOIN personas p ON p.id = j.persona_id
          JOIN equipos e ON e.id = j.equipo_id
          WHERE j.equipo_id = ${equipo_id}
          ORDER BY j.dorsal ASC NULLS LAST, p.apellidos ASC
        `
      : await sql`
          SELECT
            j.id,
            j.dorsal,
            p.nombre,
            p.apellidos,
            p.fecha_nacimiento,
            e.nombre AS equipo,
            e.id AS equipo_id
          FROM jugadores j
          JOIN personas p ON p.id = j.persona_id
          JOIN equipos e ON e.id = j.equipo_id
          ORDER BY e.nombre, j.dorsal ASC NULLS LAST
        `;

    return res.status(200).json(jugadores);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
