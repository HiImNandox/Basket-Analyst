import { setCors, handleOptions } from './lib/cors.js';
import { getMongo } from './lib/mongo.js';

// ─── idMove FBIB ──────────────────────────────────────────────────────────────
const ID = {
  FT_MADE:  92,   // Cistella de 1
  T2_MADE:  93,   // Cistella de 2
  T3_MADE:  94,   // Cistella de 3
  FT_MISS:  96,   // Intent fallat de 1
  T2_MISS:  97,   // Intent fallat de 2
  T3_MISS:  98,   // Intent fallat de 3
  DUNK:    100,   // Esmaixada (= bandeja/mate, cuenta como T2)
};

function pct(m, a) {
  return a > 0 ? Math.round(m / a * 1000) / 10 : null;
}

export default async function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método no permitido' });

  const team = (req.query.team || '').toUpperCase().trim();
  if (!team) return res.status(400).json({ error: 'Parámetro ?team= requerido' });

  try {
    const db = await getMongo();

    // Busca todos los partidos donde el equipo participó
    const statsDocs = await db.collection('stats')
      .find({ 'teams.shortName': team })
      .project({ matchId: 1, teams: 1 })
      .toArray();

    if (!statsDocs.length) {
      return res.status(200).json({
        team, gamesPlayed: 0,
        t2m: 0, t2a: 0, t2pct: null,
        t3m: 0, t3a: 0, t3pct: null,
        ftm: 0, fta: 0, ftpct: null,
      });
    }

    // Mapa matchId → FBIB teamId interno del equipo pedido
    const matchTeamId = {};
    for (const doc of statsDocs) {
      const t = (doc.teams || []).find(t => t.shortName === team);
      if (t?.teamIdExtern) {
        matchTeamId[doc.matchId] = parseInt(t.teamIdExtern, 10);
      }
    }

    const matchIds = Object.keys(matchTeamId);
    const pbpDocs  = await db.collection('pbp')
      .find({ matchId: { $in: matchIds } })
      .project({ matchId: 1, events: 1 })
      .toArray();

    let t2m = 0, t2a = 0, t3m = 0, t3a = 0, ftm = 0, fta = 0;

    for (const pbp of pbpDocs) {
      const fbibId = matchTeamId[pbp.matchId];
      if (!fbibId) continue;

      for (const e of (pbp.events || [])) {
        if (e.idTeam !== fbibId) continue;
        switch (e.idMove) {
          case ID.T2_MADE: t2m++; t2a++; break;
          case ID.DUNK:    t2m++; t2a++; break;
          case ID.T2_MISS: t2a++;        break;
          case ID.T3_MADE: t3m++; t3a++; break;
          case ID.T3_MISS: t3a++;        break;
          case ID.FT_MADE: ftm++; fta++; break;
          case ID.FT_MISS: fta++;        break;
        }
      }
    }

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({
      team,
      gamesPlayed: pbpDocs.length,
      t2m, t2a, t2pct: pct(t2m, t2a),
      t3m, t3a, t3pct: pct(t3m, t3a),
      ftm, fta, ftpct: pct(ftm, fta),
    });

  } catch (err) {
    console.error('[api/pbp-shots]', err);
    return res.status(500).json({ error: err.message });
  }
}
