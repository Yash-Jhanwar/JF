import { NextRequest, NextResponse } from 'next/server';
import { getDb, Collections } from '@/lib/db';

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}
function errorRes(message: string, status = 500) {
  return json({ success: false, error: message }, status);
}

// PUT /api/brokers/[id]
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = await getDb();
    const body = await request.json();

    const result = await db.collection(Collections.BROKERS).findOneAndUpdate(
      { id },
      { $set: { ...body, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );

    if (!result) return errorRes('Broker not found', 404);
    return json({ success: true, data: result });
  } catch (err) {
    return errorRes(err instanceof Error ? err.message : 'Failed to update broker', 400);
  }
}
