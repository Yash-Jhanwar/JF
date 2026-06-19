import { loadEnvConfig } from '@next/env';
import { MongoClient } from 'mongodb';

loadEnvConfig(process.cwd());

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
}
const DB_NAME = process.env.MONGODB_DB || 'jhanwar_finance';

async function clearData() {
  console.log('🔌 Connecting to MongoDB…');
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db(DB_NAME);
  console.log(`✅ Connected to database: ${DB_NAME}`);

  const collectionsToClear = [
    'borrowers',
    'loans',
    'payments',
    'bills',
    'warehouse_receipts',
    'reminders',
  ];

  console.log('\n🧹 Clearing dummy transactional data…');

  for (const name of collectionsToClear) {
    const col = db.collection(name);
    const result = await col.deleteMany({});
    console.log(`   🗑️ ${name}: Deleted ${result.deletedCount} documents`);
  }

  console.log('\n🎉 Clearing complete! (Kept firm_settings, users, commodities, brokers)');
  await client.close();
  process.exit(0);
}

clearData().catch((err) => {
  console.error('❌ Failed:', err);
  process.exit(1);
});
