import "server-only";
import { MongoClient, type Collection } from "mongodb";
import type { Order } from "./types";

const globalForMongo = globalThis as unknown as {
  mongoClient?: Promise<MongoClient>;
  ordersIndexed?: Promise<unknown>;
};

function client() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set");
  // Reuse one connection across hot reloads and serverless invocations.
  globalForMongo.mongoClient ??= new MongoClient(uri).connect();
  return globalForMongo.mongoClient;
}

export async function ordersCollection(): Promise<Collection<Order>> {
  const db = (await client()).db(process.env.MONGODB_DB ?? "omyre");
  const orders = db.collection<Order>("orders");
  globalForMongo.ordersIndexed ??= Promise.all([
    orders.createIndex({ id: 1 }, { unique: true }),
    orders.createIndex({ createdAt: -1 }),
  ]);
  await globalForMongo.ordersIndexed;
  return orders;
}
