import { NextRequest, NextResponse } from 'next/server';
import { getDb, Collections } from '@/lib/db';

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}
function errorRes(message: string, status = 500) {
  return json({ success: false, error: message }, status);
}

// GET /api/loans/[id]
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = await getDb();
    const loan = await db.collection(Collections.LOANS).findOne({ id });

    if (!loan) return errorRes('Loan not found', 404);
    return json({ success: true, data: loan });
  } catch (err) {
    return errorRes(err instanceof Error ? err.message : 'Failed to fetch loan');
  }
}

// PUT /api/loans/[id]
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = await getDb();
    const body = await request.json();

    const result = await db.collection(Collections.LOANS).findOneAndUpdate(
      { id },
      { $set: { ...body, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );

    if (!result) return errorRes('Loan not found', 404);
    return json({ success: true, data: result });
  } catch (err) {
    return errorRes(err instanceof Error ? err.message : 'Failed to update loan', 400);
  }
}

// DELETE /api/loans/[id]
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = await getDb();
    const result = await db.collection(Collections.LOANS).findOneAndUpdate(
      { id },
      { $set: { status: 'closed', updatedAt: new Date() } },
      { returnDocument: 'after' }
    );

    if (!result) return errorRes('Loan not found', 404);
    return json({ success: true, data: result, message: 'Loan closed' });
  } catch (err) {
    return errorRes(err instanceof Error ? err.message : 'Failed to close loan');
  }
}
