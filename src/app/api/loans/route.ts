import { NextRequest, NextResponse } from 'next/server';
import { getDb, Collections } from '@/lib/db';

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}
function errorRes(message: string, status = 500) {
  return json({ success: false, error: message }, status);
}

// GET /api/loans?status=active&borrowerId=BORR-001
export async function GET(request: NextRequest) {
  try {
    const db = await getDb();
    const status = request.nextUrl.searchParams.get('status');
    const borrowerId = request.nextUrl.searchParams.get('borrowerId');

    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;
    if (borrowerId) filter.borrowerId = borrowerId;

    const loans = await db
      .collection(Collections.LOANS)
      .find(filter)
      .sort({ createdAt: -1 })
      .toArray();

    return json({ success: true, data: loans });
  } catch (err) {
    return errorRes(err instanceof Error ? err.message : 'Failed to fetch loans');
  }
}

// POST /api/loans
export async function POST(request: NextRequest) {
  try {
    const db = await getDb();
    const body = await request.json();

    const now = new Date();
    const count = await db.collection(Collections.LOANS).countDocuments();
    const doc = {
      id: `LOAN-${100 + count + 1}`,
      loanNumber: `LF-${now.getFullYear()}-${String(count + 1).padStart(3, '0')}`,
      ...body,
      interestMode: 'compound',
      status: body.status || 'active',
      createdAt: now,
      updatedAt: now,
    };

    await db.collection(Collections.LOANS).insertOne(doc);
    return json({ success: true, data: doc }, 201);
  } catch (err) {
    return errorRes(err instanceof Error ? err.message : 'Failed to create loan', 400);
  }
}
