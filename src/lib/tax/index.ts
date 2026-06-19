export function calculateTdsOnInterest(
  interestAmount: number,
  tdsRate: number = 10,
  isApplicable: boolean = true
): { tdsAmount: number; netInterest: number; grossInterest: number } {
  if (!isApplicable) {
    return { tdsAmount: 0, netInterest: interestAmount, grossInterest: interestAmount };
  }

  const tdsAmount = (interestAmount * tdsRate) / 100;
  const netInterest = interestAmount - tdsAmount;

  return { tdsAmount, netInterest, grossInterest: interestAmount };
}

export function generateTdsReportData(loans: Array<{
  id: string;
  loanNumber: string;
  borrowerName: string;
  interestAmount: number;
  tdsAmount: number;
  netInterest: number;
  tdsRate: number;
  date: Date;
}>) {
  return loans.map(loan => ({
    loanNumber: loan.loanNumber,
    borrowerName: loan.borrowerName,
    grossInterest: loan.interestAmount,
    tdsRate: loan.tdsRate,
    tdsAmount: loan.tdsAmount,
    netReceivable: loan.netInterest,
    date: loan.date.toISOString().split('T')[0],
  }));
}

export function calculateTotalTds(loans: Array<{ tdsAmount: number }>): number {
  return loans.reduce((sum, loan) => sum + loan.tdsAmount, 0);
}

export function calculateTotalGrossInterest(loans: Array<{ interestAmount: number }>): number {
  return loans.reduce((sum, loan) => sum + loan.interestAmount, 0);
}

export function calculateTotalNetInterest(loans: Array<{ netInterest: number }>): number {
  return loans.reduce((sum, loan) => sum + loan.netInterest, 0);
}