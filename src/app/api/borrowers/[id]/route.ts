import { NextRequest, NextResponse } from 'next/server';
import { getDb, Collections } from '@/lib/db';

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}
function errorRes(message: string, status = 500) {
  return json({ success: false, error: message }, status);
}

// GET /api/borrowers/[id]
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = await getDb();
    const borrower = await db.collection(Collections.BORROWERS).findOne({ id });

    if (!borrower) return errorRes('Borrower not found', 404);
    return json({ success: true, data: borrower });
  } catch (err) {
    return errorRes(err instanceof Error ? err.message : 'Failed to fetch borrower');
  }
}

// PUT /api/borrowers/[id]
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = await getDb();
    const body = await request.json();

    const result = await db.collection(Collections.BORROWERS).findOneAndUpdate(
      { id },
      { $set: { ...body, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );

    if (!result) return errorRes('Borrower not found', 404);
    return json({ success: true, data: result });
  } catch (err) {
    return errorRes(err instanceof Error ? err.message : 'Failed to update borrower', 400);
  }
}

// DELETE /api/borrowers/[id]
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = await getDb();
    const result = await db.collection(Collections.BORROWERS).deleteOne({ id });

    if (result.deletedCount === 0) return errorRes('Borrower not found', 404);
    return json({ success: true, message: 'Borrower deleted' });
  } catch (err) {
    return errorRes(err instanceof Error ? err.message : 'Failed to delete borrower');
  }
}
