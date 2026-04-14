-- ============================================================
-- BASKET ANALYTIC - Schema de Base de Datos (PostgreSQL)
-- ============================================================

-- ------------------------------------------------------------
-- 1. CATEGORIAS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categorias (
    id     SERIAL PRIMARY KEY,
    nombre TEXT NOT NULL UNIQUE
);

-- ------------------------------------------------------------
-- 2. ROLES
-- Reutilizable para staff y jugadores
-- tipo: 'staff' | 'jugador' | 'general'
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS roles (
    id     SERIAL PRIMARY KEY,
    nombre TEXT NOT NULL UNIQUE,
    tipo   TEXT NOT NULL CHECK (tipo IN ('staff', 'jugador', 'general'))
);

-- ------------------------------------------------------------
-- 3. COMPETICIONES
-- fbib_id: ID externo de fbib.es (ej: 3899)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS competiciones (
    id           SERIAL PRIMARY KEY,
    fbib_id      INTEGER UNIQUE,
    nombre       TEXT NOT NULL,
    categoria_id INTEGER REFERENCES categorias(id) ON DELETE SET NULL,
    temporada    TEXT NOT NULL
);

-- ------------------------------------------------------------
-- 4. EQUIPOS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS equipos (
    id        SERIAL PRIMARY KEY,
    nombre    TEXT NOT NULL,
    temporada TEXT NOT NULL
);

-- ------------------------------------------------------------
-- 5. PERSONAS
-- Tabla base compartida por jugadores, staff y usuarios
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS personas (
    id               SERIAL PRIMARY KEY,
    equipo_id        INTEGER REFERENCES equipos(id) ON DELETE SET NULL,
    nombre           TEXT NOT NULL,
    apellidos        TEXT NOT NULL,
    fecha_nacimiento DATE,
    email            TEXT UNIQUE
);

-- ------------------------------------------------------------
-- 6. JUGADORES
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS jugadores (
    id         SERIAL PRIMARY KEY,
    persona_id INTEGER NOT NULL UNIQUE REFERENCES personas(id) ON DELETE CASCADE,
    equipo_id  INTEGER NOT NULL REFERENCES equipos(id) ON DELETE CASCADE,
    dorsal     INTEGER,
    rol_id     INTEGER REFERENCES roles(id) ON DELETE SET NULL
);

-- ------------------------------------------------------------
-- 7. STAFF TECNICO
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS staff_tecnico (
    id         SERIAL PRIMARY KEY,
    persona_id INTEGER NOT NULL UNIQUE REFERENCES personas(id) ON DELETE CASCADE,
    equipo_id  INTEGER NOT NULL REFERENCES equipos(id) ON DELETE CASCADE,
    rol_id     INTEGER NOT NULL REFERENCES roles(id) ON DELETE RESTRICT
);

-- ------------------------------------------------------------
-- 8. USUARIOS
-- rol: 'admin' | 'editor' | 'viewer'
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios (
    id            SERIAL PRIMARY KEY,
    persona_id    INTEGER UNIQUE REFERENCES personas(id) ON DELETE SET NULL,
    username      TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    rol           TEXT NOT NULL DEFAULT 'viewer' CHECK (rol IN ('admin', 'editor', 'viewer')),
    activo        BOOLEAN NOT NULL DEFAULT TRUE
);

-- ------------------------------------------------------------
-- 9. JORNADAS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS jornadas (
    id             SERIAL PRIMARY KEY,
    competicion_id INTEGER NOT NULL REFERENCES competiciones(id) ON DELETE CASCADE,
    numero         INTEGER NOT NULL,
    fecha_inicio   DATE,
    fecha_fin      DATE,
    UNIQUE (competicion_id, numero)
);

-- ------------------------------------------------------------
-- 10. PARTIDOS
-- match_id_intern / match_id_extern: IDs del JSON de fbib.es
-- google_place_id: para integración futura con Google Maps
-- estado: pendiente | jugado | aplazado
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS partidos (
    id              SERIAL PRIMARY KEY,
    match_id_intern TEXT UNIQUE,
    match_id_extern TEXT,
    jornada_id      INTEGER NOT NULL REFERENCES jornadas(id) ON DELETE CASCADE,
    equipo_local_id INTEGER NOT NULL REFERENCES equipos(id) ON DELETE RESTRICT,
    equipo_visit_id INTEGER NOT NULL REFERENCES equipos(id) ON DELETE RESTRICT,
    fecha           TIMESTAMP,
    google_place_id TEXT,
    cancha_nombre   TEXT,
    resultado_local INTEGER,
    resultado_visit INTEGER,
    estado          TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'jugado', 'aplazado')),
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW(),
    CHECK (equipo_local_id != equipo_visit_id)
);

-- Actualiza updated_at automáticamente al modificar un partido
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER partidos_updated_at
    BEFORE UPDATE ON partidos
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ============================================================
-- DATOS INICIALES
-- ============================================================

-- Categorías base
INSERT INTO categorias (nombre) VALUES
    ('Senior Masculino'),
    ('Senior Femenino'),
    ('Junior Masculino'),
    ('Junior Femenino'),
    ('Cadete Masculino'),
    ('Cadete Femenino')
ON CONFLICT (nombre) DO NOTHING;

-- Roles de staff
INSERT INTO roles (nombre, tipo) VALUES
    ('Entrenador Principal', 'staff'),
    ('Entrenador Ayudante',  'staff'),
    ('Delegado',             'staff'),
    ('Fisioterapeuta',       'staff'),
    ('Preparador Físico',    'staff')
ON CONFLICT (nombre) DO NOTHING;

-- Roles de jugador (para uso futuro)
INSERT INTO roles (nombre, tipo) VALUES
    ('Base',      'jugador'),
    ('Escolta',   'jugador'),
    ('Alero',     'jugador'),
    ('Ala-Pívot', 'jugador'),
    ('Pívot',     'jugador')
ON CONFLICT (nombre) DO NOTHING;
