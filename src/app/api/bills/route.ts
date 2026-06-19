import { NextRequest, NextResponse } from 'next/server';
import { getDb, Collections } from '@/lib/db';

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}
function errorRes(message: string, status = 500) {
  return json({ success: false, error: message }, status);
}

// GET /api/bills?loanId=LOAN-101&borrowerId=BORR-001
export async function GET(request: NextRequest) {
  try {
    const db = await getDb();
    const loanId = request.nextUrl.searchParams.get('loanId');
    const borrowerId = request.nextUrl.searchParams.get('borrowerId');

    const filter: Record<string, unknown> = {};
    if (loanId) filter.loanId = loanId;
    if (borrowerId) filter.borrowerId = borrowerId;

    const bills = await db
      .collection(Collections.BILLS)
      .find(filter)
      .sort({ generatedAt: -1 })
      .toArray();

    return json({ success: true, data: bills });
  } catch (err) {
    return errorRes(err instanceof Error ? err.message : 'Failed to fetch bills');
  }
}

// POST /api/bills
export async function POST(request: NextRequest) {
  try {
    const db = await getDb();
    const body = await request.json();

    const now = new Date();
    const count = await db.collection(Collections.BILLS).countDocuments();
    const doc = {
      id: `BILL-${String(count + 1).padStart(3, '0')}`,
      billNumber: `BILL-${now.getFullYear()}-${String(count + 1).padStart(3, '0')}`,
      ...body,
      dueDate: body.dueDate ? new Date(body.dueDate) : now,
      generatedAt: now,
    };

    await db.collection(Collections.BILLS).insertOne(doc);
    return json({ success: true, data: doc }, 201);
  } catch (err) {
    return errorRes(err instanceof Error ? err.message : 'Failed to generate bill', 400);
  }
}
