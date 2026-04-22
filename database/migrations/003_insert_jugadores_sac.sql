-- ============================================================
-- Migración 003: Insertar jugadores de Sa Cabaneta A
-- Ejecutar en la consola SQL de Neon
-- ============================================================

-- Usamos un bloque con CTE para obtener el equipo_id de SAC
-- y evitar hardcodear IDs

DO $$
DECLARE
  sac_id INTEGER;
BEGIN
  SELECT id INTO sac_id FROM equipos WHERE short_name = 'SAC';

  -- ─── INSERTAR PERSONAS ───────────────────────────────────
  INSERT INTO personas (equipo_id, nombre, apellidos) VALUES
    (sac_id, 'Victor Hugo',  'Lastra Estupiñan'),
    (sac_id, 'Alejandro',    'Pons Mayans'),
    (sac_id, 'Juan Jose',    'Perello Plaza'),
    (sac_id, 'Biel',         'Rossinyol Costa'),
    (sac_id, 'Pau',          'Vicens Mascaró'),
    (sac_id, 'Miguel',       'Bou Languil'),
    (sac_id, 'Enric',        'Ruiz Ferretjans'),
    (sac_id, 'Samuel',       'Garcia Loza'),
    (sac_id, 'Kian',         'Kohler'),
    (sac_id, 'Joel',         'Montes Puerta'),
    (sac_id, 'Antoni',       'Pedrajas Cabrer'),
    (sac_id, 'Tomas',        'Gual Amengual'),
    (sac_id, 'Miquel',       'Marti Hinojosa'),
    (sac_id, 'Antoni',       'Sanchez Juan'),
    (sac_id, 'J.P.',         'P.'),
    (sac_id, 'Gaspar',       'Thomas Riera'),
    (sac_id, 'Jose',         'Font Molina')
  ON CONFLICT DO NOTHING;

  -- ─── INSERTAR JUGADORES (con dorsal) ─────────────────────
  INSERT INTO jugadores (persona_id, equipo_id, dorsal)
  SELECT p.id, sac_id, v.dorsal
  FROM (VALUES
    ('Victor Hugo',  'Lastra Estupiñan',  2),
    ('Alejandro',    'Pons Mayans',        4),
    ('Juan Jose',    'Perello Plaza',      5),
    ('Biel',         'Rossinyol Costa',    8),
    ('Pau',          'Vicens Mascaró',    12),
    ('Miguel',       'Bou Languil',       13),
    ('Enric',        'Ruiz Ferretjans',   17),
    ('Samuel',       'Garcia Loza',       21),
    ('Kian',         'Kohler',            28),
    ('Joel',         'Montes Puerta',     30),
    ('Antoni',       'Pedrajas Cabrer',   33),
    ('Tomas',        'Gual Amengual',     34),
    ('Miquel',       'Marti Hinojosa',    35),
    ('Antoni',       'Sanchez Juan',      77),
    ('J.P.',         'P.',                79),
    ('Gaspar',       'Thomas Riera',      81),
    ('Jose',         'Font Molina',       83)
  ) AS v(nombre, apellidos, dorsal)
  JOIN personas p ON p.nombre = v.nombre AND p.apellidos = v.apellidos AND p.equipo_id = sac_id
  ON CONFLICT (persona_id) DO NOTHING;

END $$;

-- ─── VERIFICACIÓN ─────────────────────────────────────────
SELECT j.dorsal, p.nombre, p.apellidos
FROM jugadores j
JOIN personas p ON p.id = j.persona_id
JOIN equipos e ON e.id = j.equipo_id
WHERE e.short_name = 'SAC'
ORDER BY j.dorsal;
