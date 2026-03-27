import { MongoClient, type Db } from "mongodb";
import dns from "node:dns/promises";

// Fix Node.js v22+ Windows DNS SRV issue
dns.setServers(["8.8.8.8", "1.1.1.1"]);

const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/smltrack";
const dbName = process.env.MONGODB_DB || "smltrack";

let client: MongoClient;
let db: Db;

export async function getDB(): Promise<Db> {
  if (db) return db;
  client = new MongoClient(uri);
  await client.connect();
  db = client.db(dbName);

  // Ensure indexes (runs once on first connect — idempotent)
  try {
    await Promise.all([
      db.collection("messages").createIndex({ sourceId: 1, createdAt: -1 }),
      db.collection("messages").createIndex({ sourceId: 1 }),
      db.collection("groups_meta").createIndex({ sourceId: 1 }),
      db.collection("chat_analytics").createIndex({ sourceId: 1 }),
      db.collection("customers").createIndex({ teamId: 1, updatedAt: -1 }),
      db.collection("user_emails").createIndex({ email: 1 }, { unique: true }),
      db.collection("user_emails").createIndex({ userId: 1 }),
      db.collection("team_members").createIndex({ teamId: 1 }),
      db.collection("team_members").createIndex({ userId: 1 }),
      db.collection("user_last_seen").createIndex({ userEmail: 1 }, { unique: true }),
      db.collection("payments").createIndex({ status: 1, createdAt: -1 }),
      db.collection("documents").createIndex({ categoryGroup: 1, createdAt: -1 }),
      db.collection("documents").createIndex({ category: 1, createdAt: -1 }),
      db.collection("documents").createIndex({ status: 1, createdAt: -1 }),
      db.collection("appointments").createIndex({ date: 1, status: 1 }),
      db.collection("appointments").createIndex({ staffNames: 1, date: 1 }),
    ]);
    console.log("[MongoDB] Indexes ensured");
  } catch (e) {
    console.warn("[MongoDB] Index creation warning:", (e as Error).message);
  }

  return db;
}

export interface ChatMessage {
  _id?: string;
  role: "user" | "assistant";
  userName?: string;
  userId?: string;
  content: string;
  messageType: string;
  imageUrl?: string | null;
  groupId?: string;
  messageId?: string;
  timestamp?: number;
  createdAt?: Date | string;
}
