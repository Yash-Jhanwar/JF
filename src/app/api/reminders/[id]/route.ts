import { NextRequest, NextResponse } from 'next/server';
import { getDb, Collections } from '@/lib/db';

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}
function errorRes(message: string, status = 500) {
  return json({ success: false, error: message }, status);
}

// PUT /api/reminders/[id]
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = await getDb();
    const body = await request.json();

    const updateFields: Record<string, unknown> = { ...body };
    if (body.status === 'sent') {
      updateFields.sentAt = new Date();
    }

    const result = await db.collection(Collections.REMINDERS).findOneAndUpdate(
      { id },
      { $set: updateFields },
      { returnDocument: 'after' }
    );

    if (!result) return errorRes('Reminder not found', 404);
    return json({ success: true, data: result });
  } catch (err) {
    return errorRes(err instanceof Error ? err.message : 'Failed to update reminder', 400);
  }
}
