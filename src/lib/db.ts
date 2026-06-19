import { MongoClient, Db } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI!;
const MONGODB_DB = process.env.MONGODB_DB || 'jhanwar_finance';

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable in .env.local');
}

// Module-scoped cached connection (survives hot-reloads in dev)
let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

export async function getDb(): Promise<Db> {
  if (cachedDb) return cachedDb;

  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db(MONGODB_DB);

  cachedClient = client;
  cachedDb = db;

  return db;
}

export async function getClient(): Promise<MongoClient> {
  if (cachedClient) return cachedClient;
  await getDb(); // ensures connection + caches client
  return cachedClient!;
}

// Collection name constants — single source of truth
export const Collections = {
  USERS: 'users',
  FIRM_SETTINGS: 'firm_settings',
  BORROWERS: 'borrowers',
  BROKERS: 'brokers',
  COMMODITIES: 'commodities',
  WAREHOUSE_RECEIPTS: 'warehouse_receipts',
  LOANS: 'loans',
  PAYMENTS: 'payments',
  BILLS: 'bills',
  MANDI_PRICES: 'mandi_prices',
  REMINDERS: 'reminders',
  REMINDER_TEMPLATES: 'reminder_templates',
  AUDIT_LOGS: 'audit_logs',
} as const;
