import { MongoClient, type Db } from 'mongodb';

const globalForMongo = globalThis as typeof globalThis & {
  mongoClientPromise?: Promise<MongoClient>;
};

let clientPromise = globalForMongo.mongoClientPromise;

export async function getMongoClient(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI ?? process.env.MONGO_URI;
  if (!uri) throw new Error('MONGODB_URI is not configured. Add it to .env.local.');

  if (!clientPromise) {
    clientPromise = new MongoClient(uri, {
      appName: 'sautika',
      serverSelectionTimeoutMS: 5000,  // Fail fast — 5s instead of 30s default
      connectTimeoutMS: 5000,
      socketTimeoutMS: 8000,
    }).connect();
    if (process.env.NODE_ENV !== 'production') globalForMongo.mongoClientPromise = clientPromise;
  }

  return clientPromise;
}

export async function getDatabase(): Promise<Db> {
  const client = await getMongoClient();
  return client.db('sautika');
}
