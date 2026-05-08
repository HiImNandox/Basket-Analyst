import { sql } from '../lib/db.js';
import { setCors, handleOptions } from '../lib/cors.js';

// GET /api/mobile/partidos
//   Devuelve los partidos de Sa Cabaneta agrupados por jornada.
//   Cada partido indica si ya tiene stats manuales asociadas (tiene_stats).
//   La app usa este listado para que el usuario elija el partido antes
//   de empezar a registrar estadísticas.
//
// PATCH /api/mobile/partidos
//   Body: { mobile_uuid, partido_id }
//   Vincula un registro de partidos_stats_mobile (ya guardado) con el
//   partido oficial correcto. Útil para registros guardados sin partido_id.

const SAC_EQUIPO_ID = 5;

export default async function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;

  // ── GET ─────────────────────────────────────────────────────────────────────
  if (req.method === 'GET') {
    try {
      const rows = await sql`
        SELECT
          p.id,
          p.match_id_intern,
          p.fecha,
          p.resultado_local,
          p.resultado_visit,
          p.estado,
          j.numero          AS jornada,
          el.id             AS equipo_local_id,
          el.nombre         AS equipo_local,
          ev.id             AS equipo_visit_id,
          ev.nombre         AS equipo_visit,
          psm.id            AS stats_mobile_id,
          psm.mobile_uuid   AS stats_mobile_uuid
        FROM partidos p
        JOIN jornadas j  ON j.id  = p.jornada_id
        JOIN equipos  el ON el.id = p.equipo_local_id
        JOIN equipos  ev ON ev.id = p.equipo_visit_id
        LEFT JOIN partidos_stats_mobile psm ON psm.partido_id = p.id
        WHERE p.equipo_local_id = ${SAC_EQUIPO_ID}
           OR p.equipo_visit_id = ${SAC_EQUIPO_ID}
        ORDER BY j.numero ASC, p.fecha ASC
      `;

      // Agrupar por jornada
      const jornadasMap = {};
      for (const r of rows) {
        const j = r.jornada;
        if (!jornadasMap[j]) jornadasMap[j] = { jornada: j, partidos: [] };
        jornadasMap[j].partidos.push({
          id:              r.id,
          match_id_intern: r.match_id_intern,
          fecha:           r.fecha,
          resultado_local: r.resultado_local,
          resultado_visit: r.resultado_visit,
          estado:          r.estado,
          equipo_local_id: r.equipo_local_id,
          equipo_local:    r.equipo_local,
          equipo_visit_id: r.equipo_visit_id,
          equipo_visit:    r.equipo_visit,
          es_local:        r.equipo_local_id === SAC_EQUIPO_ID,
          tiene_stats:     r.stats_mobile_id !== null,
          stats_mobile_uuid: r.stats_mobile_uuid ?? null,
        });
      }

      const jornadas = Object.values(jornadasMap);
      return res.status(200).json({ jornadas, total: rows.length });

    } catch (err) {
      console.error('[mobile/partidos GET]', err);
      return res.status(500).json({ error: err.message });
    }
  }

  // ── PATCH ────────────────────────────────────────────────────────────────────
  // Vincula un stats_mobile ya guardado con un partido oficial
  if (req.method === 'PATCH') {
    const { mobile_uuid, partido_id } = req.body ?? {};

    if (!mobile_uuid || !partido_id) {
      return res.status(400).json({ error: 'mobile_uuid y partido_id son obligatorios' });
    }

    try {
      const rows = await sql`
        UPDATE partidos_stats_mobile
        SET partido_id = ${partido_id}, updated_at = NOW()
        WHERE mobile_uuid = ${mobile_uuid}
        RETURNING id, mobile_uuid, partido_id, updated_at
      `;

      if (rows.length === 0) {
        return res.status(404).json({ error: 'No se encontró el registro con ese mobile_uuid' });
      }

      return res.status(200).json(rows[0]);
    } catch (err) {
      console.error('[mobile/partidos PATCH]', err);
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
