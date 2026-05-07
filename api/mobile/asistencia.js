import { sql } from '../lib/db.js';
import { setCors, handleOptions } from '../lib/cors.js';

// POST /api/mobile/asistencia  → guarda lista de asistencia de un entrenamiento
// Body: { evento_id, evento_fecha, asistencia: [{jugador_id, presente, nota}] }
//
// GET /api/mobile/asistencia?evento_id=X&evento_fecha=YYYY-MM-DD

export default async function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;

  if (req.method === 'POST') {
    const { evento_id, evento_fecha, asistencia } = req.body ?? {};

    if (!evento_id || !evento_fecha || !Array.isArray(asistencia)) {
      return res.status(400).json({ error: 'evento_id, evento_fecha y asistencia[] son obligatorios' });
    }

    try {
      let inserted = 0;
      for (const a of asistencia) {
        await sql`
          INSERT INTO entreno_asistencia (evento_id, evento_fecha, jugador_id, presente, nota)
          VALUES (${evento_id}, ${evento_fecha}, ${a.jugador_id}, ${a.presente ?? true}, ${a.nota ?? null})
          ON CONFLICT (evento_id, evento_fecha, jugador_id) DO UPDATE SET
            presente = EXCLUDED.presente,
            nota     = EXCLUDED.nota
        `;
        inserted++;
      }
      return res.status(200).json({ ok: true, updated: inserted });
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
        SELECT ea.*, p.nombre, p.apellidos, j.dorsal
        FROM entreno_asistencia ea
        JOIN jugadores j ON j.id = ea.jugador_id
        JOIN personas p  ON p.id = j.persona_id
        WHERE ea.evento_id = ${evento_id}
          AND (${evento_fecha ?? null}::date IS NULL OR ea.evento_fecha = ${evento_fecha ?? null}::date)
        ORDER BY j.dorsal ASC
      `;
      return res.status(200).json(rows);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
