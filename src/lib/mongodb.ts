import { MongoClient, type Db } from 'mongodb';

const globalForMongo = globalThis as typeof globalThis & {
  mongoClientPromise?: Promise<MongoClient>;
};

let clientPromise = globalForMongo.mongoClientPromise;

export async function getDatabase(): Promise<Db> {
  const uri = process.env.MONGODB_URI ?? process.env.MONGO_URI;
  if (!uri) throw new Error('MONGODB_URI is not configured. Add it to .env.local.');

  if (!clientPromise) {
    clientPromise = new MongoClient(uri, { appName: 'sautika' }).connect();
    if (process.env.NODE_ENV !== 'production') globalForMongo.mongoClientPromise = clientPromise;
  }

  const client = await clientPromise;
  return client.db('sautika');
}
