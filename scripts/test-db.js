import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// Carga .env manualmente (sin dependencias extra)
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '../.env');
const envContent = readFileSync(envPath, 'utf8');
envContent.split('\n').forEach(line => {
  const [key, ...rest] = line.split('=');
  if (key && rest.length) process.env[key.trim()] = rest.join('=').trim();
});

const sql = neon(process.env.DATABASE_URL);

async function testConnection() {
  console.log('Conectando a Neon...\n');

  try {
    // 1. Versión de PostgreSQL
    const [{ version }] = await sql`SELECT version()`;
    console.log('✓ Conexión exitosa');
    console.log('  PostgreSQL:', version.split(',')[0]);

    // 2. Tablas creadas
    const tablas = await sql`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `;

    if (tablas.length === 0) {
      console.log('\n⚠ No hay tablas. Ejecuta el schema.postgresql.sql en Neon primero.');
    } else {
      console.log(`\n✓ Tablas encontradas (${tablas.length}):`);
      tablas.forEach(t => console.log(`  - ${t.tablename}`));
    }

    // 3. Datos iniciales
    const [{ count: numCategorias }] = await sql`SELECT COUNT(*) FROM categorias`;
    const [{ count: numRoles }]      = await sql`SELECT COUNT(*) FROM roles`;
    console.log(`\n✓ Datos iniciales:`);
    console.log(`  - Categorías: ${numCategorias}`);
    console.log(`  - Roles:      ${numRoles}`);

    console.log('\nTodo listo.');

  } catch (err) {
    console.error('✗ Error:', err.message);
    process.exit(1);
  }
}

testConnection();
