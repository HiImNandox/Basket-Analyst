import { MongoClient } from 'mongodb';

if (!process.env.MONGODB_URI) {
  throw new Error('MONGODB_URI no está definida en las variables de entorno');
}

// Caché de conexión — en Vercel serverless las funciones se reutilizan entre
// invocaciones calientes, así que reutilizamos el cliente en lugar de
// abrir una conexión nueva en cada request.
let cached = global._mongo;
if (!cached) {
  cached = global._mongo = { client: null, promise: null };
}

export async function getMongo() {
  if (cached.client) {
    return cached.client.db('basketAnalyst');
  }
  if (!cached.promise) {
    cached.promise = new MongoClient(process.env.MONGODB_URI).connect();
  }
  cached.client = await cached.promise;
  return cached.client.db('basketAnalyst');
}
