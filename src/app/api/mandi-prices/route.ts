import { NextRequest, NextResponse } from 'next/server';
import { fetchNeemuchMandiPrices, fetchMandiPricesByCommodity } from '@/lib/mandi/prices';
import { getDb, Collections } from '@/lib/db';

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}
function errorRes(message: string, status = 500) {
  return json({ success: false, error: message }, status);
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const commodity = searchParams.get('commodity');
  const source = searchParams.get('source'); // 'db' to fetch from database

  try {
    // If source=db, fetch from MongoDB
    if (source === 'db') {
      const db = await getDb();
      const filter: Record<string, unknown> = {};
      if (commodity) {
        filter.commodityNameSnapshot = { $regex: commodity, $options: 'i' };
      }

      const prices = await db
        .collection(Collections.MANDI_PRICES)
        .find(filter)
        .sort({ entryDate: -1 })
        .limit(100)
        .toArray();

      return json({ success: true, data: prices, source: 'database' });
    }

    // Otherwise fetch live prices (existing behavior)
    let result;
    if (commodity) {
      result = await fetchMandiPricesByCommodity(commodity);
    } else {
      result = await fetchNeemuchMandiPrices();
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch mandi prices',
        data: [],
        lastUpdated: new Date().toISOString(),
        source: 'error',
      },
      { status: 500 }
    );
  }
}

// POST /api/mandi-prices — save a price entry to DB
export async function POST(request: NextRequest) {
  try {
    const db = await getDb();
    const body = await request.json();

    const now = new Date();
    const count = await db.collection(Collections.MANDI_PRICES).countDocuments();
    const doc = {
      id: `MP-${String(count + 1).padStart(3, '0')}`,
      ...body,
      entryDate: body.entryDate ? new Date(body.entryDate) : now,
      verificationStatus: body.verificationStatus || 'pending',
      createdAt: now,
      updatedAt: now,
    };

    await db.collection(Collections.MANDI_PRICES).insertOne(doc);
    return json({ success: true, data: doc }, 201);
  } catch (err) {
    return errorRes(err instanceof Error ? err.message : 'Failed to save mandi price', 400);
  }
}