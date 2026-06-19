import { NextRequest, NextResponse } from 'next/server';
import { getDb, Collections } from '@/lib/db';

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}
function errorRes(message: string, status = 500) {
  return json({ success: false, error: message }, status);
}

// GET /api/commodities
export async function GET() {
  try {
    const db = await getDb();
    const commodities = await db
      .collection(Collections.COMMODITIES)
      .find({})
      .sort({ commodityNameEn: 1 })
      .toArray();

    return json({ success: true, data: commodities });
  } catch (err) {
    return errorRes(err instanceof Error ? err.message : 'Failed to fetch commodities');
  }
}

// POST /api/commodities
export async function POST(request: NextRequest) {
  try {
    const db = await getDb();
    const body = await request.json();

    const now = new Date();
    const count = await db.collection(Collections.COMMODITIES).countDocuments();
    const doc = {
      id: `CMD-${String(count + 1).padStart(3, '0')}`,
      ...body,
      isActive: body.isActive ?? true,
      createdAt: now,
    };

    await db.collection(Collections.COMMODITIES).insertOne(doc);
    return json({ success: true, data: doc }, 201);
  } catch (err) {
    return errorRes(err instanceof Error ? err.message : 'Failed to create commodity', 400);
  }
}
