import { NextRequest, NextResponse } from 'next/server';
import { getDb, Collections } from '@/lib/db';

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}
function errorRes(message: string, status = 500) {
  return json({ success: false, error: message }, status);
}

// GET /api/warehouse-receipts?borrowerId=BORR-001
export async function GET(request: NextRequest) {
  try {
    const db = await getDb();
    const borrowerId = request.nextUrl.searchParams.get('borrowerId');

    const filter: Record<string, unknown> = {};
    if (borrowerId) filter.borrowerId = borrowerId;

    const receipts = await db
      .collection(Collections.WAREHOUSE_RECEIPTS)
      .find(filter)
      .sort({ issueDate: -1 })
      .toArray();

    return json({ success: true, data: receipts });
  } catch (err) {
    return errorRes(err instanceof Error ? err.message : 'Failed to fetch receipts');
  }
}

// POST /api/warehouse-receipts
export async function POST(request: NextRequest) {
  try {
    const db = await getDb();
    const body = await request.json();

    const now = new Date();
    const count = await db.collection(Collections.WAREHOUSE_RECEIPTS).countDocuments();
    const doc = {
      id: `WR-${String(count + 1).padStart(3, '0')}`,
      receiptNumber: `REC-${now.getFullYear()}-${String(count + 1).padStart(3, '0')}`,
      ...body,
      extraFiles: body.extraFiles || [],
      issueDate: body.issueDate ? new Date(body.issueDate) : now,
      expiryDate: body.expiryDate ? new Date(body.expiryDate) : now,
      createdAt: now,
      updatedAt: now,
    };

    await db.collection(Collections.WAREHOUSE_RECEIPTS).insertOne(doc);
    return json({ success: true, data: doc }, 201);
  } catch (err) {
    return errorRes(err instanceof Error ? err.message : 'Failed to create receipt', 400);
  }
}
