import { NextRequest, NextResponse } from 'next/server';
import { getDb, Collections } from '@/lib/db';
import { ObjectId } from 'mongodb';

// Helper: standardised JSON response
function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

function errorRes(message: string, status = 500) {
  return json({ success: false, error: message }, status);
}

// GET /api/borrowers?search=...
export async function GET(request: NextRequest) {
  try {
    const db = await getDb();
    const search = request.nextUrl.searchParams.get('search');

    const filter: Record<string, unknown> = {};
    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { mobileNumber: { $regex: search, $options: 'i' } },
        { address: { $regex: search, $options: 'i' } },
      ];
    }

    const borrowers = await db
      .collection(Collections.BORROWERS)
      .find(filter)
      .sort({ createdAt: -1 })
      .toArray();

    return json({ success: true, data: borrowers });
  } catch (err) {
    return errorRes(err instanceof Error ? err.message : 'Failed to fetch borrowers');
  }
}

// POST /api/borrowers
export async function POST(request: NextRequest) {
  try {
    const db = await getDb();
    const body = await request.json();

    const now = new Date();
    const count = await db.collection(Collections.BORROWERS).countDocuments();
    const doc = {
      id: `BORR-${String(count + 1).padStart(3, '0')}`,
      ...body,
      agreementPhotoUrls: body.agreementPhotoUrls || [],
      createdAt: now,
      updatedAt: now,
    };

    await db.collection(Collections.BORROWERS).insertOne(doc);
    return json({ success: true, data: doc }, 201);
  } catch (err) {
    return errorRes(err instanceof Error ? err.message : 'Failed to create borrower', 400);
  }
}
