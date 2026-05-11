import { sql } from '../lib/db.js';
import { setCors, handleOptions } from '../lib/cors.js';

// GET /api/mobile/partidos
//   Devuelve los partidos de Sa Cabaneta agrupados por jornada.
//   ?formato=calendario → lista plana ordenada por fecha (fusionado de mobile/calendario.js)
//   ?equipo_id=5        → (solo en formato calendario) filtra por equipo
//   Cada partido indica si ya tiene stats manuales (tiene_stats).
//
// PATCH /api/mobile/partidos
//   Body: { mobile_uuid, partido_id }
//   Vincula un registro de partidos_stats_mobile con el partido oficial.

const SAC_EQUIPO_ID = 5;

export default async function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;

  // ── GET ─────────────────────────────────────────────────────────────────────
  if (req.method === 'GET') {
    const formato   = req.query.formato ?? 'jornadas';
    const equipo_id = parseInt(req.query.equipo_id ?? SAC_EQUIPO_ID);

    try {
      const rows = await sql`
        SELECT
          p.id,
          p.match_id_intern,
          p.fbib_match_id,
          p.cancha_nombre,
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
        WHERE p.equipo_local_id = ${equipo_id}
           OR p.equipo_visit_id = ${equipo_id}
        ORDER BY j.numero ASC, p.fecha ASC
      `;

      const mapped = rows.map(r => ({
        id:               r.id,
        match_id_intern:  r.match_id_intern,
        fbib_match_id:    r.fbib_match_id ?? null,
        fecha:            r.fecha,
        cancha_nombre:    r.cancha_nombre ?? null,
        resultado_local:  r.resultado_local,
        resultado_visit:  r.resultado_visit,
        estado:           r.estado,
        jornada:          r.jornada,
        equipo_local_id:  r.equipo_local_id,
        equipo_local:     r.equipo_local,
        equipo_visit_id:  r.equipo_visit_id,
        equipo_visit:     r.equipo_visit,
        es_local:         r.equipo_local_id === equipo_id,
        tiene_stats:      r.stats_mobile_id !== null,
        stats_mobile_uuid: r.stats_mobile_uuid ?? null,
      }));

      // Formato calendario: lista plana ordenada por fecha
      if (formato === 'calendario') {
        return res.status(200).json(mapped);
      }

      // Formato por jornadas (por defecto)
      const jornadasMap = {};
      for (const p of mapped) {
        if (!jornadasMap[p.jornada]) jornadasMap[p.jornada] = { jornada: p.jornada, partidos: [] };
        jornadasMap[p.jornada].partidos.push(p);
      }
      return res.status(200).json({ jornadas: Object.values(jornadasMap), total: mapped.length });

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
