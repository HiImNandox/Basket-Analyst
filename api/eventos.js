import { sql } from './lib/db.js';
import { setCors, handleOptions } from './lib/cors.js';

// ─── INIT TABLES ─────────────────────────────────────────────────────────────
async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS eventos (
      id           SERIAL PRIMARY KEY,
      tipo         VARCHAR(50) NOT NULL DEFAULT 'entrenamiento',
      titulo       TEXT NOT NULL,
      hora         VARCHAR(10),
      hora_fin     VARCHAR(10),
      lugar        TEXT,
      notas        TEXT,
      equipo_id    INTEGER,
      fecha        DATE,
      recurrente   BOOLEAN NOT NULL DEFAULT false,
      dias_semana  TEXT,
      fecha_inicio DATE,
      fecha_fin    DATE,
      created_at   TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  // Columna hora_fin en tablas previas sin ella
  await sql`ALTER TABLE eventos ADD COLUMN IF NOT EXISTS hora_fin VARCHAR(10)`;

  await sql`
    CREATE TABLE IF NOT EXISTS eventos_excepciones (
      id           SERIAL PRIMARY KEY,
      evento_id    INTEGER REFERENCES eventos(id) ON DELETE CASCADE,
      fecha        DATE NOT NULL,
      cancelado    BOOLEAN NOT NULL DEFAULT true,
      hora_inicio  VARCHAR(10),
      hora_fin     VARCHAR(10),
      notas        TEXT,
      created_at   TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(evento_id, fecha)
    )
  `;
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function toDateStr(val) {
  if (!val) return null;
  if (typeof val === 'string') return val.split('T')[0];
  if (val instanceof Date)     return val.toISOString().split('T')[0];
  return String(val).split('T')[0];
}

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
    const dow = cur.getDay() === 0 ? 7 : cur.getDay(); // 1=Lun…7=Dom
    if (dias.includes(dow)) {
      const dateStr = cur.toISOString().split('T')[0];
      resultado.push({
        id:            `rec_${ev.id}_${dateStr}`,
        recurrente_id: ev.id,
        tipo:          ev.tipo,
        titulo:        ev.titulo,
        hora:          ev.hora,
        hora_fin:      ev.hora_fin,
        lugar:         ev.lugar,
        notas:         ev.notas,
        fecha:         dateStr,
        recurrente:    true,
        cancelado:     false,
        dias_semana:   dias,
        fecha_inicio:  toDateStr(ev.fecha_inicio),
        fecha_fin:     toDateStr(ev.fecha_fin),
      });
    }
    cur.setDate(cur.getDate() + 1);
  }
  return resultado;
}

// ─── HANDLER ────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;

  try { await ensureTable(); }
  catch (err) { return res.status(500).json({ error: 'DB init: ' + err.message }); }

  const accion = req.query.accion || null;

  // ══════════════════════════════════════════════════════════════════
  // GET /api/eventos
  // ══════════════════════════════════════════════════════════════════
  if (req.method === 'GET') {
    const { equipo_id: eqRaw, desde, hasta } = req.query;
    // Sanear equipo_id: solo usar si es un número válido
    const equipo_id = eqRaw && /^\d+$/.test(eqRaw) ? parseInt(eqRaw) : null;
    try {
      // Devuelve eventos del equipo Y los que no tienen equipo asignado (equipo_id IS NULL)
      const rows = equipo_id
        ? await sql`SELECT * FROM eventos WHERE equipo_id = ${equipo_id} OR equipo_id IS NULL ORDER BY created_at`
        : await sql`SELECT * FROM eventos ORDER BY created_at`;

      // Expandir todos los eventos (puntual + recurrentes)
      const result = [];
      for (const ev of rows) {
        if (!ev.recurrente) {
          const fecha = toDateStr(ev.fecha);
          if (desde && fecha && fecha < desde) continue;
          if (hasta && fecha && fecha > hasta) continue;
          result.push({
            id: ev.id, tipo: ev.tipo, titulo: ev.titulo,
            hora: ev.hora, hora_fin: ev.hora_fin,
            lugar: ev.lugar, notas: ev.notas, fecha,
            recurrente: false, cancelado: false,
          });
        } else {
          result.push(...expandirRecurrente(ev, desde, hasta));
        }
      }

      // Aplicar excepciones a las ocurrencias recurrentes
      // Nota: se evita ANY($array) porque neon HTTP no lo soporta bien.
      // En su lugar se hacen queries individuales por evento_id.
      const recIds = rows.filter(r => r.recurrente).map(r => r.id);
      if (recIds.length > 0) {
        const excArrays = await Promise.all(recIds.map(rid => {
          if (desde && hasta)
            return sql`SELECT * FROM eventos_excepciones WHERE evento_id = ${rid} AND fecha >= ${desde} AND fecha <= ${hasta}`;
          if (desde)
            return sql`SELECT * FROM eventos_excepciones WHERE evento_id = ${rid} AND fecha >= ${desde}`;
          if (hasta)
            return sql`SELECT * FROM eventos_excepciones WHERE evento_id = ${rid} AND fecha <= ${hasta}`;
          return sql`SELECT * FROM eventos_excepciones WHERE evento_id = ${rid}`;
        }));
        const excs = excArrays.flat();

        const excMap = {};
        for (const ex of excs) excMap[`${ex.evento_id}_${toDateStr(ex.fecha)}`] = ex;

        for (const occ of result) {
          if (!occ.recurrente) continue;
          const ex = excMap[`${occ.recurrente_id}_${occ.fecha}`];
          if (!ex) continue;
          occ.cancelado       = ex.cancelado;
          occ.notas_exc       = ex.notas || null;
          if (ex.hora_inicio) occ.hora     = ex.hora_inicio;
          if (ex.hora_fin)    occ.hora_fin = ex.hora_fin;
        }
      }

      console.log(`[eventos GET] equipo_id=${equipo_id} desde=${desde} hasta=${hasta} rows=${rows.length} expanded=${result.length}`);
      return res.status(200).json(result);
    } catch (err) {
      console.error('[eventos GET] Error:', err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  // ══════════════════════════════════════════════════════════════════
  // POST /api/eventos                 → crear evento
  // POST /api/eventos?accion=excepcion → crear/actualizar excepción
  // ══════════════════════════════════════════════════════════════════
  if (req.method === 'POST') {

    // ── Excepción (cancelar / modificar una ocurrencia) ────────────
    if (accion === 'excepcion') {
      const { evento_id, fecha, cancelado = true, hora_inicio, hora_fin, notas } = req.body || {};
      if (!evento_id || !fecha) return res.status(400).json({ error: 'evento_id y fecha son obligatorios' });
      try {
        await sql`
          INSERT INTO eventos_excepciones (evento_id, fecha, cancelado, hora_inicio, hora_fin, notas)
          VALUES (${evento_id}, ${fecha}, ${cancelado}, ${hora_inicio || null}, ${hora_fin || null}, ${notas || null})
          ON CONFLICT (evento_id, fecha) DO UPDATE SET
            cancelado   = EXCLUDED.cancelado,
            hora_inicio = EXCLUDED.hora_inicio,
            hora_fin    = EXCLUDED.hora_fin,
            notas       = EXCLUDED.notas
        `;
        return res.status(200).json({ ok: true });
      } catch (err) {
        return res.status(500).json({ error: err.message });
      }
    }

    // ── Crear evento (puntual o recurrente) ────────────────────────
    const {
      tipo = 'entrenamiento', titulo, hora, hora_fin,
      lugar, notas, equipo_id,
      fecha, recurrente = false, dias_semana, fecha_inicio, fecha_fin,
    } = req.body || {};

    if (!titulo) return res.status(400).json({ error: '"titulo" es obligatorio' });

    const diasStr = recurrente && Array.isArray(dias_semana) && dias_semana.length
      ? JSON.stringify(dias_semana) : null;

    try {
      const [row] = await sql`
        INSERT INTO eventos
          (tipo, titulo, hora, hora_fin, lugar, notas, equipo_id,
           fecha, recurrente, dias_semana, fecha_inicio, fecha_fin)
        VALUES (
          ${tipo}, ${titulo},
          ${hora      || null}, ${hora_fin  || null},
          ${lugar     || null}, ${notas     || null}, ${equipo_id || null},
          ${!recurrente && fecha        ? fecha        : null},
          ${!!recurrente},
          ${diasStr},
          ${recurrente && fecha_inicio  ? fecha_inicio : null},
          ${recurrente && fecha_fin     ? fecha_fin    : null}
        )
        RETURNING *
      `;
      return res.status(201).json(row);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // ══════════════════════════════════════════════════════════════════
  // DELETE /api/eventos?id=X                         → eliminar evento
  // DELETE /api/eventos?accion=excepcion&evento_id=X&fecha=Y → restaurar sesión
  // ══════════════════════════════════════════════════════════════════
  if (req.method === 'DELETE') {

    // ── Restaurar sesión (eliminar excepción) ──────────────────────
    if (accion === 'excepcion') {
      const { evento_id, fecha } = req.query;
      if (!evento_id || !fecha) return res.status(400).json({ error: 'evento_id y fecha son obligatorios' });
      try {
        await sql`DELETE FROM eventos_excepciones WHERE evento_id = ${evento_id} AND fecha = ${fecha}`;
        return res.status(200).json({ ok: true });
      } catch (err) {
        return res.status(500).json({ error: err.message });
      }
    }

    // ── Eliminar evento completo ───────────────────────────────────
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: '"id" es obligatorio' });

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
