import type { Loan, LoanInterestCycle, PaymentType } from '@/types';

export function calculateQuarterlyInterest(
  principal: number,
  annualRate: number,
  _cycleMonths?: number // eslint-disable-line @typescript-eslint/no-unused-vars
): number {
  const quarterlyRate = annualRate / 100 / 4;
  return principal * quarterlyRate;
}

export function calculateTds(interestAmount: number, tdsRate: number = 10): number {
  return (interestAmount * tdsRate) / 100;
}

export function calculateNetInterest(grossInterest: number, tdsAmount: number): number {
  return grossInterest - tdsAmount;
}

export function calculateCurrentExposure(
  currentPrincipal: number,
  receiptAmount: number
): number {
  if (receiptAmount === 0) return 0;
  return (currentPrincipal / receiptAmount) * 100;
}

export function determineRiskStatus(exposurePercent: number): 'safe' | 'warning' | 'risky' {
  if (exposurePercent <= 60) return 'safe';
  if (exposurePercent <= 75) return 'warning';
  return 'risky';
}

export function calculateMandiDropPercent(
  currentPrice: number,
  originalReferencePrice: number
): number {
  if (originalReferencePrice === 0) return 0;
  return ((originalReferencePrice - currentPrice) / originalReferencePrice) * 100;
}

export function processInterestCycle(
  loan: Loan,
  cycleStartDate: Date,
  cycleEndDate: Date,
  paidWithinGrace: boolean
): Partial<LoanInterestCycle> & { newPrincipal: number } {
  const grossInterest = calculateQuarterlyInterest(
    loan.principalAmountCurrent,
    loan.annualInterestRate,
    loan.interestCycleMonths
  );

  const tdsAmount = loan.tdsApplicable ? calculateTds(grossInterest, loan.tdsRate) : 0;
  const netInterest = calculateNetInterest(grossInterest, tdsAmount);

  let capitalizedToPrincipal = false;
  let newPrincipal = loan.principalAmountCurrent;

  if (!paidWithinGrace) {
    if (loan.graceRuleMode === 'capitalize_immediately') {
      capitalizedToPrincipal = true;
      newPrincipal = loan.principalAmountCurrent + grossInterest;
    } else if (loan.graceRuleMode === 'allow_grace') {
      capitalizedToPrincipal = true;
      newPrincipal = loan.principalAmountCurrent + grossInterest;
    }
  }

  return {
    cycleStartDate,
    cycleEndDate,
    interestAmountGross: grossInterest,
    tdsAmount,
    interestAmountNet: netInterest,
    paidWithinGrace,
    capitalizedToPrincipal,
    principalBeforeCycle: loan.principalAmountCurrent,
    principalAfterCycle: newPrincipal,
    status: paidWithinGrace ? 'paid' : (capitalizedToPrincipal ? 'capitalized' : 'pending'),
    newPrincipal,
  };
}

export function allocatePayment(
  paymentAmount: number,
  outstandingInterest: number,
  outstandingPrincipal: number,
  paymentType: PaymentType = 'mixed'
): { allocatedInterest: number; allocatedPrincipal: number } {
  if (paymentType === 'interest') {
    const allocatedInterest = Math.min(paymentAmount, outstandingInterest);
    return { allocatedInterest, allocatedPrincipal: 0 };
  }

  if (paymentType === 'principal') {
    const allocatedPrincipal = Math.min(paymentAmount, outstandingPrincipal);
    return { allocatedInterest: 0, allocatedPrincipal };
  }

  const allocatedInterest = Math.min(paymentAmount, outstandingInterest);
  const remaining = paymentAmount - allocatedInterest;
  const allocatedPrincipal = Math.min(remaining, outstandingPrincipal);

  return { allocatedInterest, allocatedPrincipal };
}

export function calculateNextRolloverDate(startDate: Date, cycleMonths: number = 3): Date {
  const date = new Date(startDate);
  date.setMonth(date.getMonth() + cycleMonths);
  return date;
}

export function isLoanOverdue(dueDate: Date): boolean {
  return new Date() > dueDate;
}

export function isQuarterDue(nextRolloverDate: Date, daysBefore: number = 3): boolean {
  const now = new Date();
  const diffTime = nextRolloverDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays <= daysBefore && diffDays >= 0;
}

export function formatIndianCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatIndianNumber(num: number): string {
  return new Intl.NumberFormat('en-IN').format(num);
}

export function parseIndianCurrency(str: string): number {
  return parseFloat(str.replace(/[₹,]/g, '')) || 0;
}