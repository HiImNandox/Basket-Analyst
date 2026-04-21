-- ============================================================
-- Migración 002: Añadir Jornada 9 (1 partido) y Jornada 10 (3 partidos)
-- Ejecutar en la consola SQL de Neon
-- ============================================================

-- Primero comprueba qué competicion_id tienes:
-- SELECT id, nombre, temporada FROM competiciones;
-- Si solo hay una, el script la usará automáticamente con MIN(id).

-- ─── JORNADAS ───────────────────────────────────────────────
INSERT INTO jornadas (competicion_id, numero, fecha_inicio, fecha_fin)
VALUES
  ((SELECT MIN(id) FROM competiciones), 9,  '2026-04-16', '2026-04-16'),
  ((SELECT MIN(id) FROM competiciones), 10, '2026-04-17', '2026-04-19')
ON CONFLICT (competicion_id, numero) DO NOTHING;

-- ─── PARTIDOS ────────────────────────────────────────────────
-- J9: SAC 76 - CBN 56  (16 Apr 2026)
INSERT INTO partidos (
  match_id_intern, match_id_extern,
  jornada_id,
  equipo_local_id, equipo_visit_id,
  fecha, resultado_local, resultado_visit, estado
)
VALUES (
  '28621', NULL,
  (SELECT j.id FROM jornadas j JOIN competiciones c ON c.id = j.competicion_id
   WHERE j.numero = 9 ORDER BY c.id LIMIT 1),
  (SELECT id FROM equipos WHERE short_name = 'SAC'),
  (SELECT id FROM equipos WHERE short_name = 'CBN'),
  '2026-04-16 23:00:00', 76, 56, 'jugado'
)
ON CONFLICT (match_id_intern) DO NOTHING;

-- J10: CON 58 - RES 67  (17 Apr 2026)
INSERT INTO partidos (
  match_id_intern, match_id_extern,
  jornada_id,
  equipo_local_id, equipo_visit_id,
  fecha, resultado_local, resultado_visit, estado
)
VALUES (
  '28660', NULL,
  (SELECT j.id FROM jornadas j JOIN competiciones c ON c.id = j.competicion_id
   WHERE j.numero = 10 ORDER BY c.id LIMIT 1),
  (SELECT id FROM equipos WHERE short_name = 'CON'),
  (SELECT id FROM equipos WHERE short_name = 'RES'),
  '2026-04-17 23:30:00', 58, 67, 'jugado'
)
ON CONFLICT (match_id_intern) DO NOTHING;

-- J10: CLU 66 - SAC 63  (19 Apr 2026)
INSERT INTO partidos (
  match_id_intern, match_id_extern,
  jornada_id,
  equipo_local_id, equipo_visit_id,
  fecha, resultado_local, resultado_visit, estado
)
VALUES (
  '28828', NULL,
  (SELECT j.id FROM jornadas j JOIN competiciones c ON c.id = j.competicion_id
   WHERE j.numero = 10 ORDER BY c.id LIMIT 1),
  (SELECT id FROM equipos WHERE short_name = 'CLU'),
  (SELECT id FROM equipos WHERE short_name = 'SAC'),
  '2026-04-19 14:45:00', 66, 63, 'jugado'
)
ON CONFLICT (match_id_intern) DO NOTHING;

-- J10: SCD 72 - CBN 68  (19 Apr 2026)
INSERT INTO partidos (
  match_id_intern, match_id_extern,
  jornada_id,
  equipo_local_id, equipo_visit_id,
  fecha, resultado_local, resultado_visit, estado
)
VALUES (
  '28862', NULL,
  (SELECT j.id FROM jornadas j JOIN competiciones c ON c.id = j.competicion_id
   WHERE j.numero = 10 ORDER BY c.id LIMIT 1),
  (SELECT id FROM equipos WHERE short_name = 'SCD'),
  (SELECT id FROM equipos WHERE short_name = 'CBN'),
  '2026-04-19 22:00:00', 72, 68, 'jugado'
)
ON CONFLICT (match_id_intern) DO NOTHING;

-- ─── VERIFICACIÓN ────────────────────────────────────────────
SELECT j.numero, p.fecha,
       el.nombre AS local, p.resultado_local,
       ev.nombre AS visit, p.resultado_visit,
       p.estado
FROM partidos p
JOIN jornadas j  ON j.id = p.jornada_id
JOIN equipos  el ON el.id = p.equipo_local_id
JOIN equipos  ev ON ev.id = p.equipo_visit_id
WHERE j.numero IN (9, 10)
ORDER BY j.numero, p.fecha;
