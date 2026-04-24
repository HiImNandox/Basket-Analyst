import { sql } from './lib/db.js';
import { setCors, handleOptions } from './lib/cors.js';

// ─── TABLE ───────────────────────────────────────────────────────────────────
async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS entreno_ejercicios (
      id           SERIAL PRIMARY KEY,
      evento_id    INTEGER NOT NULL,
      evento_fecha DATE,
      tipo         VARCHAR(20) NOT NULL DEFAULT 'ejercicio',
      orden        INTEGER NOT NULL DEFAULT 0,
      titulo       TEXT NOT NULL,
      datos        TEXT NOT NULL DEFAULT '{}',
      created_at   TIMESTAMPTZ DEFAULT NOW()
    )
  `;
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
// sesion_id puede ser "5" (puntual) o "rec_1_2026-04-28" (recurrente)
function parseSesionId(sesionId) {
  const s = String(sesionId);
  if (s.startsWith('rec_')) {
    const parts = s.split('_');
    return { evento_id: parseInt(parts[1]), evento_fecha: parts.slice(2).join('_') };
  }
  return { evento_id: parseInt(s), evento_fecha: null };
}

// ─── HANDLER ─────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;

  try { await ensureTable(); }
  catch (err) { return res.status(500).json({ error: 'DB init: ' + err.message }); }

  // ── GET /api/entrenos?sesion_id=X ─────────────────────────────────────────
  if (req.method === 'GET') {
    const { sesion_id } = req.query;
    if (!sesion_id) return res.status(400).json({ error: 'sesion_id requerido' });
    const { evento_id, evento_fecha } = parseSesionId(sesion_id);
    try {
      const rows = evento_fecha
        ? await sql`SELECT * FROM entreno_ejercicios WHERE evento_id = ${evento_id} AND evento_fecha = ${evento_fecha} ORDER BY orden, created_at`
        : await sql`SELECT * FROM entreno_ejercicios WHERE evento_id = ${evento_id} AND evento_fecha IS NULL ORDER BY orden, created_at`;
      return res.status(200).json(rows.map(r => ({ ...r, datos: JSON.parse(r.datos || '{}') })));
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // ── POST /api/entrenos ────────────────────────────────────────────────────
  if (req.method === 'POST') {
    const { sesion_id, tipo = 'ejercicio', titulo, datos = {} } = req.body || {};
    if (!sesion_id || !titulo) return res.status(400).json({ error: 'sesion_id y titulo requeridos' });
    const { evento_id, evento_fecha } = parseSesionId(sesion_id);
    try {
      const [row] = await sql`
        INSERT INTO entreno_ejercicios (evento_id, evento_fecha, tipo, titulo, datos)
        VALUES (${evento_id}, ${evento_fecha || null}, ${tipo}, ${titulo}, ${JSON.stringify(datos)})
        RETURNING *
      `;
      return res.status(201).json({ ...row, datos: JSON.parse(row.datos || '{}') });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // ── PUT /api/entrenos?id=X ────────────────────────────────────────────────
  if (req.method === 'PUT') {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'id requerido' });
    const { titulo, datos } = req.body || {};
    try {
      if (titulo !== undefined && datos !== undefined) {
        await sql`UPDATE entreno_ejercicios SET titulo = ${titulo}, datos = ${JSON.stringify(datos)} WHERE id = ${parseInt(id)}`;
      } else if (titulo !== undefined) {
        await sql`UPDATE entreno_ejercicios SET titulo = ${titulo} WHERE id = ${parseInt(id)}`;
      } else if (datos !== undefined) {
        await sql`UPDATE entreno_ejercicios SET datos = ${JSON.stringify(datos)} WHERE id = ${parseInt(id)}`;
      }
      return res.status(200).json({ ok: true });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // ── DELETE /api/entrenos?id=X ─────────────────────────────────────────────
  if (req.method === 'DELETE') {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'id requerido' });
    try {
      await sql`DELETE FROM entreno_ejercicios WHERE id = ${parseInt(id)}`;
      return res.status(200).json({ ok: true });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
