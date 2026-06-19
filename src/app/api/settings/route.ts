import { NextRequest, NextResponse } from 'next/server';
import { getDb, Collections } from '@/lib/db';

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}
function errorRes(message: string, status = 500) {
  return json({ success: false, error: message }, status);
}

// GET /api/settings
export async function GET() {
  try {
    const db = await getDb();
    const settings = await db.collection(Collections.FIRM_SETTINGS).findOne({});

    if (!settings) {
      return json({ success: true, data: null });
    }
    return json({ success: true, data: settings });
  } catch (err) {
    return errorRes(err instanceof Error ? err.message : 'Failed to fetch settings');
  }
}

// PUT /api/settings
export async function PUT(request: NextRequest) {
  try {
    const db = await getDb();
    const body = await request.json();

    const result = await db.collection(Collections.FIRM_SETTINGS).findOneAndUpdate(
      {},
      { $set: { ...body, updatedAt: new Date() } },
      { returnDocument: 'after', upsert: true }
    );

    return json({ success: true, data: result });
  } catch (err) {
    return errorRes(err instanceof Error ? err.message : 'Failed to update settings', 400);
  }
}
