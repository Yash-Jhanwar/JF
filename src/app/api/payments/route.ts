import { NextRequest, NextResponse } from 'next/server';
import { getDb, Collections } from '@/lib/db';

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}
function errorRes(message: string, status = 500) {
  return json({ success: false, error: message }, status);
}

// GET /api/payments?loanId=LOAN-101
export async function GET(request: NextRequest) {
  try {
    const db = await getDb();
    const loanId = request.nextUrl.searchParams.get('loanId');

    const filter: Record<string, unknown> = {};
    if (loanId) filter.loanId = loanId;

    const payments = await db
      .collection(Collections.PAYMENTS)
      .find(filter)
      .sort({ paymentDate: -1 })
      .toArray();

    return json({ success: true, data: payments });
  } catch (err) {
    return errorRes(err instanceof Error ? err.message : 'Failed to fetch payments');
  }
}

// POST /api/payments
export async function POST(request: NextRequest) {
  try {
    const db = await getDb();
    const body = await request.json();

    const now = new Date();
    const count = await db.collection(Collections.PAYMENTS).countDocuments();
    const doc = {
      id: `PAY-${String(count + 1).padStart(3, '0')}`,
      ...body,
      paymentDate: body.paymentDate ? new Date(body.paymentDate) : now,
      createdAt: now,
    };

    await db.collection(Collections.PAYMENTS).insertOne(doc);

    // If this is a principal payment, update the loan's current principal
    if (body.allocatedPrincipalAmount && body.allocatedPrincipalAmount > 0 && body.loanId) {
      await db.collection(Collections.LOANS).updateOne(
        { id: body.loanId },
        {
          $inc: { principalAmountCurrent: -body.allocatedPrincipalAmount },
          $set: { updatedAt: now },
        }
      );
    }

    return json({ success: true, data: doc }, 201);
  } catch (err) {
    return errorRes(err instanceof Error ? err.message : 'Failed to record payment', 400);
  }
}
