-- ============================================================
-- Migración 001: añade columna short_name a equipos
-- short_name = abreviatura FBIB (3 letras, ej: SAC, CLU, CBP…)
-- Ejecutar UNA SOLA VEZ en la consola SQL de Neon.
-- ============================================================

-- 1. Añadir la columna (idempotente)
ALTER TABLE equipos
  ADD COLUMN IF NOT EXISTS short_name TEXT;

-- 2. Restricción única (idempotente)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'equipos_short_name_key'
  ) THEN
    ALTER TABLE equipos ADD CONSTRAINT equipos_short_name_key UNIQUE (short_name);
  END IF;
END $$;

-- ============================================================
-- 3. Asigna las abreviaturas FBIB a tus equipos.
--    Ajusta cada WHERE según el nombre EXACTO que tengas en la BD.
--    Para ver los nombres actuales: SELECT id, nombre FROM equipos ORDER BY nombre;
-- ============================================================

UPDATE equipos SET short_name = 'SAC' WHERE nombre ILIKE '%cabaneta%'    AND temporada = '2025-2026';
UPDATE equipos SET short_name = 'CLU' WHERE nombre ILIKE '%pla%'          AND temporada = '2025-2026';
UPDATE equipos SET short_name = 'CBP' WHERE nombre ILIKE '%porto cristo%' AND temporada = '2025-2026';
UPDATE equipos SET short_name = 'RES' WHERE nombre ILIKE '%tres palas%'   AND temporada = '2025-2026';
UPDATE equipos SET short_name = 'SCD' WHERE nombre ILIKE '%hispania%'     AND temporada = '2025-2026';
UPDATE equipos SET short_name = 'CON' WHERE nombre ILIKE '%mariana%'      AND temporada = '2025-2026';
UPDATE equipos SET short_name = 'CBN' WHERE nombre ILIKE '%nord%'         AND temporada = '2025-2026';

-- ============================================================
-- 4. Comprobación: deberían salir 7 filas con short_name != NULL
-- ============================================================
SELECT id, nombre, short_name FROM equipos WHERE temporada = '2025-2026' ORDER BY short_name;
