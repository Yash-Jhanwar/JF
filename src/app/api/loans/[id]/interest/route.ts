import { NextRequest, NextResponse } from 'next/server';
import { getDb, Collections } from '@/lib/db';

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

function errorRes(message: string, status = 500) {
  return json({ success: false, error: message }, status);
}

// POST /api/loans/[id]/interest
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = await getDb();
    const body = await request.json();

    const { action, amount } = body;

    if (!['paid', 'capitalize'].includes(action)) {
      return errorRes('Invalid action. Must be "paid" or "capitalize"', 400);
    }
    if (!amount || amount <= 0) {
      return errorRes('Amount must be greater than 0', 400);
    }

    const loan = await db.collection(Collections.LOANS).findOne({ id });
    if (!loan) return errorRes('Loan not found', 404);

    const now = new Date();
    
    // Calculate new nextRolloverDate (add interestCycleMonths to current nextRolloverDate)
    const currentRollover = new Date(loan.nextRolloverDate);
    currentRollover.setMonth(currentRollover.getMonth() + loan.interestCycleMonths);
    const newRolloverDate = currentRollover.toISOString();

    if (action === 'capitalize') {
      // Add amount to principalAmountCurrent, and update rollover date
      await db.collection(Collections.LOANS).updateOne(
        { id },
        {
          $inc: { principalAmountCurrent: amount },
          $set: { 
            nextRolloverDate: newRolloverDate,
            updatedAt: now 
          }
        }
      );
      
      // Also log a capitalization record in payments for audit trails
      const pCount = await db.collection(Collections.PAYMENTS).countDocuments();
      await db.collection(Collections.PAYMENTS).insertOne({
        id: `PAY-${String(pCount + 1).padStart(3, '0')}`,
        loanId: id,
        amountReceived: 0,
        allocatedPrincipalAmount: -amount, // Negative means principal increased
        allocatedInterestAmount: amount, // Interest was "paid" via capitalization
        paymentMode: 'capitalized',
        referenceNumber: 'AUTO-CAPITALIZED',
        paymentDate: now,
        notes: 'Interest capitalized to principal',
        createdAt: now
      });

    } else if (action === 'paid') {
      // Just record the payment and update rollover date
      await db.collection(Collections.LOANS).updateOne(
        { id },
        {
          $set: { 
            nextRolloverDate: newRolloverDate,
            updatedAt: now 
          }
        }
      );

      const pCount = await db.collection(Collections.PAYMENTS).countDocuments();
      await db.collection(Collections.PAYMENTS).insertOne({
        id: `PAY-${String(pCount + 1).padStart(3, '0')}`,
        loanId: id,
        amountReceived: amount,
        allocatedPrincipalAmount: 0,
        allocatedInterestAmount: amount,
        paymentMode: body.paymentMode || 'cash',
        referenceNumber: body.referenceNumber || '',
        paymentDate: now,
        notes: 'Quarterly interest paid',
        createdAt: now
      });
    }

    // Return the updated loan
    const updatedLoan = await db.collection(Collections.LOANS).findOne({ id });
    return json({ success: true, data: updatedLoan });
  } catch (err) {
    return errorRes(err instanceof Error ? err.message : 'Failed to process interest');
  }
}
