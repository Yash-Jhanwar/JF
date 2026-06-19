import { NextResponse } from 'next/server';
import { getDb, Collections } from '@/lib/db';

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}
function errorRes(message: string, status = 500) {
  return json({ success: false, error: message }, status);
}

// GET /api/dashboard/metrics
export async function GET() {
  try {
    const db = await getDb();

    // Fetch all active/overdue loans
    const loans = await db
      .collection(Collections.LOANS)
      .find({ status: { $in: ['active', 'overdue', 'due'] } })
      .toArray();

    const totalActiveLoans = loans.length;

    let totalDueAmount = 0;
    let totalTds = 0;
    let safeLoans = 0;
    let warningLoans = 0;
    let riskyLoans = 0;
    let upcomingDueReminders = 0;
    let quarterRolloverReminders = 0;

    const now = new Date();

    for (const loan of loans) {
      const principal = loan.principalAmountCurrent || 0;
      const rate = loan.annualInterestRate || 0;
      const quarterlyInterest = principal * (rate / 100 / 4);
      totalDueAmount += quarterlyInterest;

      if (loan.tdsApplicable) {
        totalTds += (quarterlyInterest * (loan.tdsRate || 10)) / 100;
      }

      // Risk calculation
      const exposure = loan.receiptAmount > 0
        ? (principal / loan.receiptAmount) * 100
        : 0;

      if (exposure <= 60) safeLoans++;
      else if (exposure <= 75) warningLoans++;
      else riskyLoans++;

      // Due reminders
      const dueDate = new Date(loan.dueDate);
      const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntilDue <= 30 && daysUntilDue > 0) upcomingDueReminders++;

      // Quarter rollover
      const nextRollover = new Date(loan.nextRolloverDate);
      const daysUntilRollover = Math.ceil(
        (nextRollover.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysUntilRollover <= 3 && daysUntilRollover >= 0) quarterRolloverReminders++;
    }

    const totalInterestEarned = totalDueAmount - totalTds;

    return json({
      success: true,
      data: {
        totalActiveLoans,
        totalDueAmount,
        totalInterestEarned,
        totalTds,
        upcomingDueReminders,
        quarterRolloverReminders,
        safeLoans,
        warningLoans,
        riskyLoans,
      },
    });
  } catch (err) {
    return errorRes(err instanceof Error ? err.message : 'Failed to compute dashboard metrics');
  }
}
