import { getMongo } from '../api/lib/mongo.js';

try {
  const db = await getMongo();
  const collections = await db.listCollections().toArray();
  console.log('✅ Conexión MongoDB OK — base de datos: basketAnalyst');
  console.log('Colecciones:', collections.length > 0 ? collections.map(c => c.name) : '(vacía, es normal)');

  // Prueba de escritura y lectura
  const testCol = db.collection('_test');
  await testCol.insertOne({ test: true, ts: new Date() });
  const doc = await testCol.findOne({ test: true });
  await testCol.deleteMany({ test: true });
  console.log('✅ Escritura/lectura OK:', doc ? 'documento creado y leído' : 'ERROR');

  process.exit(0);
} catch (err) {
  console.error('❌ Error de conexión:', err.message);
  process.exit(1);
}
