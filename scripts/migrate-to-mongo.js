/**
 * migrate-to-mongo.js
 * Migra todos los archivos de /data a MongoDB Atlas.
 *
 * Colecciones:
 *   - stats  → un documento por archivo *_stats.json  (metadatos + datos del partido)
 *   - pbp    → un documento por archivo *_pbp.json    (metadatos + array events[])
 *
 * Uso:
 *   node --experimental-vm-modules scripts/migrate-to-mongo.js
 *   (o con --env-file si tienes Node 20+)
 */

import { MongoClient } from 'mongodb';
import { readFileSync, readdirSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Cargar .env ────────────────────────────────────────────────────────────────
const envPath = resolve(__dirname, '../.env');
readFileSync(envPath, 'utf8').split('\n').forEach(line => {
  const [key, ...rest] = line.split('=');
  if (key?.trim() && rest.length) process.env[key.trim()] = rest.join('=').trim();
});

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error('❌  MONGODB_URI no definida'); process.exit(1); }

const DATA_DIR  = resolve(__dirname, '../data');
const TEMPORADA = '25-26';   // ajusta si la temporada cambia

// ── Helpers ────────────────────────────────────────────────────────────────────
function parseJornada(folderName) {
  return parseInt(folderName.replace('J', ''), 10);   // "J3" → 3
}

function parseMatchId(filename) {
  return filename.replace(/_pbp\.json|_stats\.json/, '');
}

// ── Main ───────────────────────────────────────────────────────────────────────
async function main() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db('basketAnalyst');

  const colStats = db.collection('stats');
  const colPbp   = db.collection('pbp');

  // Índices únicos para evitar duplicados en re-ejecuciones
  await colStats.createIndex({ matchId: 1 }, { unique: true });
  await colPbp.createIndex(  { matchId: 1 }, { unique: true });

  let totalStats = 0, totalPbp = 0, skipped = 0;

  const jornadas = readdirSync(DATA_DIR).filter(f => f.startsWith('J')).sort((a,b) => parseJornada(a) - parseJornada(b));

  for (const jornadaDir of jornadas) {
    const jornada = parseJornada(jornadaDir);
    const jornadaPath = join(DATA_DIR, jornadaDir);
    const files = readdirSync(jornadaPath).filter(f => f.endsWith('.json'));

    console.log(`\n📂  ${jornadaDir}  (${files.length} archivos)`);

    for (const file of files) {
      const matchId = parseMatchId(file);
      const isPbp   = file.endsWith('_pbp.json');
      const filePath = join(jornadaPath, file);

      let raw;
      try {
        raw = JSON.parse(readFileSync(filePath, 'utf8'));
      } catch (e) {
        console.error(`  ⚠  Error leyendo ${file}:`, e.message);
        continue;
      }

      try {
        if (isPbp) {
          // PBP: el JSON raíz es un array de eventos
          await colPbp.insertOne({
            matchId,
            jornada,
            temporada: TEMPORADA,
            events: Array.isArray(raw) ? raw : [raw],
            importedAt: new Date(),
          });
          console.log(`  ✓  pbp    ${matchId}  (${Array.isArray(raw) ? raw.length : 1} eventos)`);
          totalPbp++;
        } else {
          // STATS: objeto con datos del partido
          await colStats.insertOne({
            matchId,
            jornada,
            temporada: TEMPORADA,
            importedAt: new Date(),
            ...raw,
          });
          console.log(`  ✓  stats  ${matchId}`);
          totalStats++;
        }
      } catch (e) {
        if (e.code === 11000) {
          // Duplicate key — ya existe, saltamos
          console.log(`  ↩  ya existe  ${file}`);
          skipped++;
        } else {
          console.error(`  ✗  Error insertando ${file}:`, e.message);
        }
      }
    }
  }

  await client.close();

  console.log('\n──────────────────────────────────────────');
  console.log(`✅  Migración completada`);
  console.log(`   stats insertados : ${totalStats}`);
  console.log(`   pbp insertados   : ${totalPbp}`);
  console.log(`   ya existían      : ${skipped}`);
  console.log('──────────────────────────────────────────');
}

main().catch(err => {
  console.error('❌  Error fatal:', err);
  process.exit(1);
});
