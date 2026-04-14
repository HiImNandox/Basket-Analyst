-- ============================================================
-- BASKET ANALYTIC - Schema de Base de Datos (SQLite)
-- ============================================================
-- SQLite no activa las foreign keys por defecto.
-- Ejecutar este PRAGMA al abrir la conexión siempre.
PRAGMA foreign_keys = ON;

-- ------------------------------------------------------------
-- 1. CATEGORIAS
-- Tipos de competición: Senior Masculino, Junior, Cadete...
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categorias (
    id     INTEGER PRIMARY KEY,
    nombre TEXT NOT NULL UNIQUE
);

-- ------------------------------------------------------------
-- 2. ROLES
-- Roles reutilizables para staff y jugadores
-- tipo: "staff" | "jugador" | "general"
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS roles (
    id     INTEGER PRIMARY KEY,
    nombre TEXT NOT NULL UNIQUE,
    tipo   TEXT NOT NULL CHECK (tipo IN ('staff', 'jugador', 'general'))
);

-- ------------------------------------------------------------
-- 3. COMPETICIONES
-- fbib_id: ID externo de fbib.es (ej: 3899)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS competiciones (
    id           INTEGER PRIMARY KEY,
    fbib_id      INTEGER UNIQUE,
    nombre       TEXT NOT NULL,
    categoria_id INTEGER REFERENCES categorias(id) ON DELETE SET NULL,
    temporada    TEXT NOT NULL
);

-- ------------------------------------------------------------
-- 4. EQUIPOS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS equipos (
    id        INTEGER PRIMARY KEY,
    nombre    TEXT NOT NULL,
    temporada TEXT NOT NULL
);

-- ------------------------------------------------------------
-- 5. PERSONAS
-- Tabla base compartida por jugadores, staff y usuarios
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS personas (
    id               INTEGER PRIMARY KEY,
    equipo_id        INTEGER REFERENCES equipos(id) ON DELETE SET NULL,
    nombre           TEXT NOT NULL,
    apellidos        TEXT NOT NULL,
    fecha_nacimiento TEXT,   -- SQLite no tiene tipo DATE nativo, se guarda como TEXT (ISO 8601: YYYY-MM-DD)
    email            TEXT UNIQUE
);

-- ------------------------------------------------------------
-- 6. JUGADORES
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS jugadores (
    id         INTEGER PRIMARY KEY,
    persona_id INTEGER NOT NULL UNIQUE REFERENCES personas(id) ON DELETE CASCADE,
    equipo_id  INTEGER NOT NULL REFERENCES equipos(id) ON DELETE CASCADE,
    dorsal     INTEGER,
    rol_id     INTEGER REFERENCES roles(id) ON DELETE SET NULL  -- nullable, para uso futuro
);

-- ------------------------------------------------------------
-- 7. STAFF TECNICO
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS staff_tecnico (
    id         INTEGER PRIMARY KEY,
    persona_id INTEGER NOT NULL UNIQUE REFERENCES personas(id) ON DELETE CASCADE,
    equipo_id  INTEGER NOT NULL REFERENCES equipos(id) ON DELETE CASCADE,
    rol_id     INTEGER NOT NULL REFERENCES roles(id) ON DELETE RESTRICT
);

-- ------------------------------------------------------------
-- 8. USUARIOS
-- rol: "admin" | "editor" | "viewer"
-- activo: 1 = activo, 0 = desactivado
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios (
    id            INTEGER PRIMARY KEY,
    persona_id    INTEGER UNIQUE REFERENCES personas(id) ON DELETE SET NULL,
    username      TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    rol           TEXT NOT NULL DEFAULT 'viewer' CHECK (rol IN ('admin', 'editor', 'viewer')),
    activo        INTEGER NOT NULL DEFAULT 1 CHECK (activo IN (0, 1))
);

-- ------------------------------------------------------------
-- 9. JORNADAS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS jornadas (
    id             INTEGER PRIMARY KEY,
    competicion_id INTEGER NOT NULL REFERENCES competiciones(id) ON DELETE CASCADE,
    numero         INTEGER NOT NULL,
    fecha_inicio   TEXT,   -- ISO 8601: YYYY-MM-DD
    fecha_fin      TEXT,   -- ISO 8601: YYYY-MM-DD
    UNIQUE (competicion_id, numero)
);

-- ------------------------------------------------------------
-- 10. PARTIDOS
-- match_id_intern / match_id_extern: IDs del JSON de fbib.es
-- google_place_id: para integración futura con Google Maps
-- estado: pendiente | jugado | aplazado
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS partidos (
    id              INTEGER PRIMARY KEY,
    match_id_intern TEXT UNIQUE,
    match_id_extern TEXT,
    jornada_id      INTEGER NOT NULL REFERENCES jornadas(id) ON DELETE CASCADE,
    equipo_local_id INTEGER NOT NULL REFERENCES equipos(id) ON DELETE RESTRICT,
    equipo_visit_id INTEGER NOT NULL REFERENCES equipos(id) ON DELETE RESTRICT,
    fecha           TEXT,   -- ISO 8601: YYYY-MM-DD HH:MM:SS
    google_place_id TEXT,
    cancha_nombre   TEXT,
    resultado_local INTEGER,
    resultado_visit INTEGER,
    estado          TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'jugado', 'aplazado')),
    CHECK (equipo_local_id != equipo_visit_id)
);


-- ============================================================
-- DATOS INICIALES
-- ============================================================

-- Categorías base
INSERT OR IGNORE INTO categorias (nombre) VALUES
    ('Senior Masculino'),
    ('Senior Femenino'),
    ('Junior Masculino'),
    ('Junior Femenino'),
    ('Cadete Masculino'),
    ('Cadete Femenino');

-- Roles de staff
INSERT OR IGNORE INTO roles (nombre, tipo) VALUES
    ('Entrenador Principal', 'staff'),
    ('Entrenador Ayudante',  'staff'),
    ('Delegado',             'staff'),
    ('Fisioterapeuta',       'staff'),
    ('Preparador Físico',    'staff');

-- Roles de jugador (para uso futuro)
INSERT OR IGNORE INTO roles (nombre, tipo) VALUES
    ('Base',      'jugador'),
    ('Escolta',   'jugador'),
    ('Alero',     'jugador'),
    ('Ala-Pívot', 'jugador'),
    ('Pívot',     'jugador');
