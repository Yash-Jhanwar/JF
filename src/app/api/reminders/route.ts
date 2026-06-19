import { NextRequest, NextResponse } from 'next/server';
import { getDb, Collections } from '@/lib/db';

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}
function errorRes(message: string, status = 500) {
  return json({ success: false, error: message }, status);
}

// GET /api/reminders?loanId=...&status=...
export async function GET(request: NextRequest) {
  try {
    const db = await getDb();
    const loanId = request.nextUrl.searchParams.get('loanId');
    const status = request.nextUrl.searchParams.get('status');

    const filter: Record<string, unknown> = {};
    if (loanId) filter.loanId = loanId;
    if (status) filter.status = status;

    const reminders = await db
      .collection(Collections.REMINDERS)
      .find(filter)
      .sort({ scheduledAt: -1 })
      .toArray();

    return json({ success: true, data: reminders });
  } catch (err) {
    return errorRes(err instanceof Error ? err.message : 'Failed to fetch reminders');
  }
}

// POST /api/reminders
export async function POST(request: NextRequest) {
  try {
    const db = await getDb();
    const body = await request.json();

    const count = await db.collection(Collections.REMINDERS).countDocuments();
    const doc = {
      id: `REM-${String(count + 1).padStart(3, '0')}`,
      ...body,
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : new Date(),
      status: body.status || 'scheduled',
    };

    await db.collection(Collections.REMINDERS).insertOne(doc);
    return json({ success: true, data: doc }, 201);
  } catch (err) {
    return errorRes(err instanceof Error ? err.message : 'Failed to create reminder', 400);
  }
}
