-- Migración 005: referencias a MongoDB para blobs JSON grandes
-- Los campos stats_json y pbp_json se mueven a MongoDB Atlas.
-- Neon solo guarda el mongo_id para recuperarlos cuando haga falta.

ALTER TABLE partidos_stats_mobile
  ADD COLUMN IF NOT EXISTS mongo_id TEXT;

ALTER TABLE entreno_5v5
  ADD COLUMN IF NOT EXISTS mongo_id TEXT;

-- Los campos stats_json y pbp_json se mantienen por compatibilidad con datos
-- históricos, pero ya no se escriben desde la app móvil (valor NULL en adelante).
-- Se pueden limpiar más adelante con:
--   UPDATE partidos_stats_mobile SET stats_json = NULL, pbp_json = NULL WHERE mongo_id IS NOT NULL;
--   UPDATE entreno_5v5 SET stats_json = NULL WHERE mongo_id IS NOT NULL;
