/**
 * Seed script — populates MongoDB with mock data.
 * Run: npx tsx src/lib/db/seed.ts
 */
import { MongoClient } from 'mongodb';
import {
  mockUsers,
  mockFirmSettings,
  mockBorrowers,
  mockBrokers,
  mockCommodities,
  mockReceipts,
  mockLoans,
  mockPayments,
  mockBills,
  mockMandiPrices,
  mockReminders,
  mockReminderTemplates,
} from '../mock/data';

const MONGODB_URI =
  process.env.MONGODB_URI ||
  'mongodb+srv://deskflowadmin:maskchat11@maskchat.typkipc.mongodb.net/?appName=Maskchat';
const DB_NAME = process.env.MONGODB_DB || 'jhanwar_finance';

async function seed() {
  console.log('🔌 Connecting to MongoDB…');
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db(DB_NAME);
  console.log(`✅ Connected to database: ${DB_NAME}`);

  // ── Helper: drop-then-insert ──────────────────────────────────────────
  async function upsertCollection(name: string, docs: unknown[]) {
    const col = db.collection(name);
    await col.deleteMany({});
    if (docs.length > 0) {
      await col.insertMany(docs as Document[]);
    }
    console.log(`   📦 ${name}: ${docs.length} documents`);
  }

  // ── Seed data ─────────────────────────────────────────────────────────
  console.log('\n📝 Seeding collections…');

  await upsertCollection('users', mockUsers);
  await upsertCollection('firm_settings', [mockFirmSettings]);
  await upsertCollection('borrowers', mockBorrowers);
  await upsertCollection('brokers', mockBrokers);
  await upsertCollection('commodities', mockCommodities);
  await upsertCollection('warehouse_receipts', mockReceipts);
  await upsertCollection('loans', mockLoans);
  await upsertCollection('payments', mockPayments);
  await upsertCollection('bills', mockBills);
  await upsertCollection('mandi_prices', mockMandiPrices);
  await upsertCollection('reminders', mockReminders);
  await upsertCollection('reminder_templates', mockReminderTemplates);

  // ── Create indexes ────────────────────────────────────────────────────
  console.log('\n🔑 Creating indexes…');

  await db.collection('users').createIndex({ email: 1 }, { unique: true });
  await db.collection('users').createIndex({ phone: 1 });

  await db.collection('borrowers').createIndex({ mobileNumber: 1 }, { unique: true });
  await db.collection('borrowers').createIndex({ fullName: 'text' });

  await db.collection('brokers').createIndex({ name: 1 });
  await db.collection('brokers').createIndex({ isActive: 1 });

  await db.collection('commodities').createIndex({ commodityNameEn: 1 }, { unique: true });
  await db.collection('commodities').createIndex({ isActive: 1 });

  await db.collection('warehouse_receipts').createIndex({ receiptNumber: 1 }, { unique: true });
  await db.collection('warehouse_receipts').createIndex({ borrowerId: 1 });

  await db.collection('loans').createIndex({ loanNumber: 1 }, { unique: true });
  await db.collection('loans').createIndex({ borrowerId: 1 });
  await db.collection('loans').createIndex({ status: 1 });
  await db.collection('loans').createIndex({ dueDate: 1 });

  await db.collection('payments').createIndex({ loanId: 1 });
  await db.collection('payments').createIndex({ paymentDate: 1 });

  await db.collection('bills').createIndex({ billNumber: 1 }, { unique: true });
  await db.collection('bills').createIndex({ loanId: 1 });
  await db.collection('bills').createIndex({ borrowerId: 1 });

  await db
    .collection('mandi_prices')
    .createIndex({ commodityId: 1, entryDate: -1, mandiName: 1 }, { unique: true });

  await db.collection('reminders').createIndex({ loanId: 1 });
  await db.collection('reminders').createIndex({ status: 1 });
  await db.collection('reminders').createIndex({ scheduledAt: 1 });

  await db.collection('reminder_templates').createIndex({ triggerType: 1 });

  await db.collection('audit_logs').createIndex({ entityType: 1, entityId: 1 });
  await db.collection('audit_logs').createIndex({ createdAt: -1 });

  console.log('   ✅ All indexes created');

  // ── Done ──────────────────────────────────────────────────────────────
  console.log('\n🎉 Seed complete!');
  await client.close();
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
