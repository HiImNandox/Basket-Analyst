import { sql } from './lib/db.js';
import { setCors, handleOptions } from './lib/cors.js';

// ─── INIT TABLE ─────────────────────────────────────────────────────────────
async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS eventos (
      id           SERIAL PRIMARY KEY,
      tipo         VARCHAR(50) NOT NULL DEFAULT 'entrenamiento',
      titulo       TEXT NOT NULL,
      hora         VARCHAR(10),
      lugar        TEXT,
      notas        TEXT,
      equipo_id    INTEGER,

      -- Evento puntual
      fecha        DATE,

      -- Evento recurrente
      recurrente   BOOLEAN NOT NULL DEFAULT false,
      dias_semana  TEXT,        -- JSON: "[1,4]" (1=Lun … 7=Dom)
      fecha_inicio DATE,
      fecha_fin    DATE,

      created_at   TIMESTAMPTZ DEFAULT NOW()
    )
  `;
}

// ─── HELPER: expandir recurrente en fechas individuales ─────────────────────
function expandirRecurrente(ev, desdeStr, hastaStr) {
  const resultado = [];
  const dias = JSON.parse(ev.dias_semana || '[]');
  if (!dias.length || !ev.fecha_inicio || !ev.fecha_fin) return resultado;

  const evStart = new Date(ev.fecha_inicio);
  const evEnd   = new Date(ev.fecha_fin);
  const desde   = desdeStr ? new Date(desdeStr) : evStart;
  const hasta   = hastaStr ? new Date(hastaStr) : evEnd;

  const start = new Date(Math.max(evStart, desde));
  const end   = new Date(Math.min(evEnd,   hasta));

  let cur = new Date(start);
  while (cur <= end) {
    const dow = cur.getDay() === 0 ? 7 : cur.getDay(); // 1=Lun … 7=Dom
    if (dias.includes(dow)) {
      const dateStr = cur.toISOString().split('T')[0];
      resultado.push({
        id:            `rec_${ev.id}_${dateStr}`,
        recurrente_id: ev.id,
        tipo:          ev.tipo,
        titulo:        ev.titulo,
        hora:          ev.hora,
        lugar:         ev.lugar,
        notas:         ev.notas,
        fecha:         dateStr,
        recurrente:    true,
        dias_semana:   dias,
        fecha_inicio:  toDateStr(ev.fecha_inicio),
        fecha_fin:     toDateStr(ev.fecha_fin),
      });
    }
    cur.setDate(cur.getDate() + 1);
  }
  return resultado;
}

function toDateStr(val) {
  if (!val) return null;
  if (typeof val === 'string') return val.split('T')[0];
  if (val instanceof Date)     return val.toISOString().split('T')[0];
  return String(val).split('T')[0];
}

// ─── HANDLER ────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;

  try { await ensureTable(); }
  catch (err) { return res.status(500).json({ error: 'DB init: ' + err.message }); }

  // ── GET /api/eventos ──────────────────────────────────────────────────────
  if (req.method === 'GET') {
    const { equipo_id, desde, hasta } = req.query;
    try {
      const rows = equipo_id
        ? await sql`SELECT * FROM eventos WHERE equipo_id = ${equipo_id} ORDER BY created_at`
        : await sql`SELECT * FROM eventos ORDER BY created_at`;

      const result = [];
      for (const ev of rows) {
        if (!ev.recurrente) {
          const fecha = toDateStr(ev.fecha);
          if (desde && fecha && fecha < desde) continue;
          if (hasta && fecha && fecha > hasta) continue;
          result.push({
            id:         ev.id,
            tipo:       ev.tipo,
            titulo:     ev.titulo,
            hora:       ev.hora,
            lugar:      ev.lugar,
            notas:      ev.notas,
            fecha,
            recurrente: false,
          });
        } else {
          result.push(...expandirRecurrente(ev, desde, hasta));
        }
      }
      return res.status(200).json(result);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // ── POST /api/eventos ─────────────────────────────────────────────────────
  if (req.method === 'POST') {
    const {
      tipo        = 'entrenamiento',
      titulo,
      hora,
      lugar,
      notas,
      equipo_id,
      fecha,
      recurrente  = false,
      dias_semana,
      fecha_inicio,
      fecha_fin,
    } = req.body || {};

    if (!titulo) return res.status(400).json({ error: '"titulo" es obligatorio' });

    const diasStr = recurrente && Array.isArray(dias_semana) && dias_semana.length
      ? JSON.stringify(dias_semana)
      : null;

    try {
      const [row] = await sql`
        INSERT INTO eventos
          (tipo, titulo, hora, lugar, notas, equipo_id,
           fecha, recurrente, dias_semana, fecha_inicio, fecha_fin)
        VALUES (
          ${tipo},
          ${titulo},
          ${hora         || null},
          ${lugar        || null},
          ${notas        || null},
          ${equipo_id    || null},
          ${!recurrente && fecha       ? fecha       : null},
          ${!!recurrente},
          ${diasStr},
          ${recurrente   && fecha_inicio ? fecha_inicio : null},
          ${recurrente   && fecha_fin    ? fecha_fin    : null}
        )
        RETURNING *
      `;
      return res.status(201).json(row);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // ── DELETE /api/eventos?id=X ──────────────────────────────────────────────
  if (req.method === 'DELETE') {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: '"id" es obligatorio' });

    // "rec_123_2026-04-01" → id real = 123
    const actualId = String(id).startsWith('rec_')
      ? parseInt(String(id).split('_')[1])
      : parseInt(id);

    try {
      await sql`DELETE FROM eventos WHERE id = ${actualId}`;
      return res.status(200).json({ ok: true });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
