import { Db, MongoClient } from "mongodb";

const globalForMongo = globalThis as typeof globalThis & { mongoClient?: Promise<MongoClient> };

async function getClient() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not configured.");
  globalForMongo.mongoClient ??= new MongoClient(uri).connect().catch(error => {
    delete globalForMongo.mongoClient;
    throw error;
  });
  return globalForMongo.mongoClient;
}

export async function getDatabase(): Promise<Db> {
  const client = await getClient();
  return client.db(process.env.MONGODB_DB || "garage-car");
}
