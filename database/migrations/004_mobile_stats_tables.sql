-- Migración 004: tablas para estadísticas desde la app móvil
-- Ejecutar una sola vez en Neon PostgreSQL

-- ─── Estadísticas de partido registradas desde el móvil ──────────────────────
CREATE TABLE IF NOT EXISTS partidos_stats_mobile (
  id               SERIAL PRIMARY KEY,
  mobile_uuid      TEXT NOT NULL UNIQUE,          -- UUID generado en el móvil
  partido_id       INTEGER REFERENCES partidos(id) ON DELETE SET NULL,
  equipo_local_id  INTEGER REFERENCES equipos(id) ON DELETE SET NULL,
  equipo_visit_id  INTEGER REFERENCES equipos(id) ON DELETE SET NULL,
  fecha            TIMESTAMPTZ,
  resultado_local  INTEGER DEFAULT 0,
  resultado_visit  INTEGER DEFAULT 0,
  cuartos_local    JSONB DEFAULT '[]',            -- [q1,q2,q3,q4,ot...]
  cuartos_visit    JSONB DEFAULT '[]',
  stats_json       JSONB DEFAULT '{}',            -- stats por jugador {playerId: {...}}
  pbp_json         JSONB DEFAULT '[]',            -- play-by-play events array
  temporada        TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_psm_partido_id     ON partidos_stats_mobile(partido_id);
CREATE INDEX IF NOT EXISTS idx_psm_equipo_local   ON partidos_stats_mobile(equipo_local_id);
CREATE INDEX IF NOT EXISTS idx_psm_equipo_visit   ON partidos_stats_mobile(equipo_visit_id);
CREATE INDEX IF NOT EXISTS idx_psm_fecha          ON partidos_stats_mobile(fecha DESC);

-- ─── Asistencia a entrenamientos ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS entreno_asistencia (
  id           SERIAL PRIMARY KEY,
  evento_id    INTEGER NOT NULL REFERENCES eventos(id) ON DELETE CASCADE,
  evento_fecha DATE NOT NULL,
  jugador_id   INTEGER NOT NULL REFERENCES jugadores(id) ON DELETE CASCADE,
  presente     BOOLEAN NOT NULL DEFAULT TRUE,
  nota         TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (evento_id, evento_fecha, jugador_id)
);

CREATE INDEX IF NOT EXISTS idx_ea_evento_id   ON entreno_asistencia(evento_id);
CREATE INDEX IF NOT EXISTS idx_ea_jugador_id  ON entreno_asistencia(jugador_id);

-- ─── Partidos 5v5 de entrenamiento ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS entreno_5v5 (
  id               SERIAL PRIMARY KEY,
  evento_id        INTEGER NOT NULL REFERENCES eventos(id) ON DELETE CASCADE,
  evento_fecha     DATE NOT NULL,
  numero_partido   SMALLINT NOT NULL DEFAULT 1,
  quinteto_local   INTEGER[] NOT NULL DEFAULT '{}',   -- array de jugador_id
  quinteto_visit   INTEGER[] NOT NULL DEFAULT '{}',
  puntos_local     SMALLINT DEFAULT 0,
  puntos_visit     SMALLINT DEFAULT 0,
  stats_json       JSONB DEFAULT '{}',
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (evento_id, evento_fecha, numero_partido)
);

CREATE INDEX IF NOT EXISTS idx_e5_evento_id ON entreno_5v5(evento_id);
