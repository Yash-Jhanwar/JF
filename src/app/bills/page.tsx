'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Download, FileText, Calendar, IndianRupee, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import AppShell from '@/components/ui/AppShell';
import { formatIndianCurrency, calculateQuarterlyInterest, calculateCurrentExposure, determineRiskStatus, calculateTds, calculateNetInterest } from '@/lib/finance';

interface BillData {
  id: string;
  loanId: string;
  borrowerId: string;
  billNumber: string;
  principalAmount: number;
  interestAmount: number;
  totalAmount: number;
  tdsAmount: number;
  dueDate: string;
  generatedAt: string;
}

interface LoanData {
  id: string;
  loanNumber: string;
  borrowerId: string;
  commodityId: string;
  principalAmountCurrent: number;
  sanctionedAmount: number;
  receiptAmount: number;
  annualInterestRate: number;
  tdsApplicable: boolean;
  tdsRate: number;
  startDate: string;
  nextRolloverDate: string;
  dueDate: string;
  status: string;
  graceRuleMode: string;
  graceDays: number;
  autoRenewEnabled: boolean;
}

interface BorrowerData {
  id: string;
  fullName: string;
  mobileNumber: string;
  whatsappNumber: string;
  address: string;
  idProofType: string;
  idProofNumber: string;
}

interface CommodityData {
  id: string;
  commodityNameEn: string;
  commodityNameHi: string;
}

interface PaymentData {
  id: string;
  loanId: string;
  amountReceived: number;
  allocatedInterestAmount: number;
  paymentDate: string;
  paymentMode: string;
  referenceNumber: string;
}
export default function BillsPage() {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showTdsReport, setShowTdsReport] = useState(false);
  const [expandedBill, setExpandedBill] = useState<string | null>(null);
  const [allBills, setAllBills] = useState<BillData[]>([]);
  const [allLoans, setAllLoans] = useState<LoanData[]>([]);
  const [allBorrowers, setAllBorrowers] = useState<BorrowerData[]>([]);
  const [allCommodities, setAllCommodities] = useState<CommodityData[]>([]);
  const [allPayments, setAllPayments] = useState<PaymentData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [billsRes, loansRes, borrowersRes, commoditiesRes, paymentsRes] = await Promise.all([
          fetch('/api/bills'),
          fetch('/api/loans'),
          fetch('/api/borrowers'),
          fetch('/api/commodities'),
          fetch('/api/payments'),
        ]);
        const [billsData, loansData, borrowersData, commoditiesData, paymentsData] = await Promise.all([
          billsRes.json(),
          loansRes.json(),
          borrowersRes.json(),
          commoditiesRes.json(),
          paymentsRes.json(),
        ]);
        setAllBills(billsData.data || []);
        setAllLoans(loansData.data || []);
        setAllBorrowers(borrowersData.data || []);
        setAllCommodities(commoditiesData.data || []);
        setAllPayments(paymentsData.data || []);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const bills = useMemo(() => {
    return allBills.map(bill => {
      const loan = allLoans.find(l => l.id === bill.loanId);
      const borrower = allBorrowers.find(b => b.id === bill.borrowerId);
      const commodity = loan ? allCommodities.find(c => c.id === loan.commodityId) : null;
      return { ...bill, loan, borrower, commodity };
    });
  }, [allBills, allLoans, allBorrowers, allCommodities]);

  const tdsReport = useMemo(() => {
    let loans = allLoans.filter(l => l.status === 'active' || l.status === 'overdue');

    if (dateFrom) {
      loans = loans.filter(l => new Date(l.startDate) >= new Date(dateFrom));
    }
    if (dateTo) {
      loans = loans.filter(l => new Date(l.startDate) <= new Date(dateTo));
    }

    return loans.map(loan => {
      const borrower = allBorrowers.find(b => b.id === loan.borrowerId);
      const commodity = allCommodities.find(c => c.id === loan.commodityId);
      const payments = allPayments.filter(p => p.loanId === loan.id);
      const quarterlyInterest = calculateQuarterlyInterest(loan.principalAmountCurrent, loan.annualInterestRate);
      const tdsAmount = loan.tdsApplicable ? calculateTds(quarterlyInterest, loan.tdsRate) : 0;
      const netInterest = calculateNetInterest(quarterlyInterest, tdsAmount);
      const totalPaid = payments.reduce((sum, p) => sum + p.allocatedInterestAmount, 0);
      const outstanding = Math.max(0, quarterlyInterest - totalPaid);
      const exposure = calculateCurrentExposure(loan.principalAmountCurrent, loan.receiptAmount);
      const riskStatus = determineRiskStatus(exposure);

      return {
        ...loan,
        borrowerName: borrower?.fullName || 'Unknown',
        borrowerMobile: borrower?.mobileNumber || '',
        borrowerAddress: borrower?.address || '',
        borrowerIdProof: borrower?.idProofType ? `${borrower.idProofType}: ${borrower.idProofNumber}` : '',
        commodityName: commodity?.commodityNameEn || 'Unknown',
        commodityHi: commodity?.commodityNameHi || '',
        quarterlyInterest,
        tdsAmount,
        netInterest,
        totalPaid,
        outstanding,
        exposure,
        riskStatus,
      };
    });
  }, [dateFrom, dateTo, allLoans, allBorrowers, allCommodities, allPayments]);

  const tdsSummary = useMemo(() => {
    const totalGross = tdsReport.reduce((sum, r) => sum + r.quarterlyInterest, 0);
    const totalTds = tdsReport.reduce((sum, r) => sum + r.tdsAmount, 0);
    const totalNet = tdsReport.reduce((sum, r) => sum + r.netInterest, 0);
    const totalOutstanding = tdsReport.reduce((sum, r) => sum + r.outstanding, 0);
    return { totalGross, totalTds, totalNet, totalOutstanding, count: tdsReport.length };
  }, [tdsReport]);

  const handleDownloadCollectiveTdsPdf = useCallback(async () => {
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('JHANWAR FINANCE SERVICES', pageWidth / 2, 15, { align: 'center' });

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('Collective TDS Bill Report / सामूहिक TDS बिल रिपोर्ट', pageWidth / 2, 22, { align: 'center' });

    const dateRange = dateFrom && dateTo
      ? `Period: ${dateFrom} to ${dateTo}`
      : dateFrom
        ? `From: ${dateFrom}`
        : dateTo
          ? `Up to: ${dateTo}`
          : 'All Active Loans';
    doc.setFontSize(9);
    doc.text(`${dateRange}  |  Generated: ${new Date().toLocaleDateString('en-IN')}`, pageWidth / 2, 28, { align: 'center' });

    const tableBody = tdsReport.map((entry, i) => [
      String(i + 1),
      entry.loanNumber,
      entry.borrowerName,
      entry.commodityName,
      formatIndianCurrency(entry.principalAmountCurrent),
      `${entry.annualInterestRate}%`,
      formatIndianCurrency(entry.quarterlyInterest),
      `${entry.tdsRate}%`,
      formatIndianCurrency(entry.tdsAmount),
      formatIndianCurrency(entry.netInterest),
      formatIndianCurrency(entry.totalPaid),
      formatIndianCurrency(entry.outstanding),
      entry.status.toUpperCase(),
    ]);

    const tableFooter = [
      '',
      '',
      'TOTAL',
      '',
      '',
      '',
      formatIndianCurrency(tdsSummary.totalGross),
      '',
      formatIndianCurrency(tdsSummary.totalTds),
      formatIndianCurrency(tdsSummary.totalNet),
      '',
      formatIndianCurrency(tdsSummary.totalOutstanding),
      '',
    ];

    autoTable(doc, {
      startY: 33,
      head: [['#', 'Loan No.', 'Borrower', 'Commodity', 'Principal', 'Rate', 'Gross Interest', 'TDS %', 'TDS Amount', 'Net Receivable', 'Paid', 'Outstanding', 'Status']],
      body: [...tableBody, tableFooter],
      theme: 'grid',
      styles: {
        fontSize: 7,
        cellPadding: 2,
        overflow: 'linebreak',
        font: 'helvetica',
      },
      headStyles: {
        fillColor: [30, 58, 138],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 7,
      },
      bodyStyles: {
        textColor: [30, 30, 30],
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245],
      },
      columnStyles: {
        0: { cellWidth: 8 },
        1: { cellWidth: 22 },
        2: { cellWidth: 32 },
        3: { cellWidth: 22 },
        4: { cellWidth: 25 },
        5: { cellWidth: 14 },
        6: { cellWidth: 25 },
        7: { cellWidth: 14 },
        8: { cellWidth: 25 },
        9: { cellWidth: 25 },
        10: { cellWidth: 22 },
        11: { cellWidth: 25 },
        12: { cellWidth: 18 },
      },
      margin: { left: 10, right: 10 },
      didParseCell: function (data) {
        if (data.section === 'body' && data.row.index === tdsReport.length) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [230, 240, 255];
        }
      },
    });

    const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Summary / सारांश:', 14, finalY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`Total Loan Takers: ${tdsSummary.count}`, 14, finalY + 6);
    doc.text(`Total Gross Interest: ${formatIndianCurrency(tdsSummary.totalGross)}`, 14, finalY + 11);
    doc.text(`Total TDS: ${formatIndianCurrency(tdsSummary.totalTds)}`, 14, finalY + 16);
    doc.text(`Total Net Receivable: ${formatIndianCurrency(tdsSummary.totalNet)}`, 14, finalY + 21);
    doc.text(`Total Outstanding: ${formatIndianCurrency(tdsSummary.totalOutstanding)}`, 14, finalY + 26);

    doc.setFontSize(7);
    doc.setTextColor(120, 120, 120);
    doc.text('Generated by Jhanwar Finance Services', pageWidth / 2, doc.internal.pageSize.getHeight() - 8, { align: 'center' });

    doc.save(`TDS-Collective-Report-${new Date().toISOString().split('T')[0]}.pdf`);
  }, [tdsReport, tdsSummary, dateFrom, dateTo]);

  const handleGenerateBill = (entry: typeof tdsReport[0]) => {
    console.log('Generating TDS bill for:', {
      loanNumber: entry.loanNumber,
      borrowerName: entry.borrowerName,
      principal: entry.principalAmountCurrent,
      grossInterest: entry.quarterlyInterest,
      tdsRate: entry.tdsRate,
      tdsAmount: entry.tdsAmount,
      netInterest: entry.netInterest,
      outstanding: entry.outstanding,
    });

    const billContent = `
JHANWAR FINANCE SERVICES
TDS BILL
================================
Bill Date: ${new Date().toLocaleDateString('en-IN')}
Loan Number: ${entry.loanNumber}

BORROWER DETAILS
----------------
Name: ${entry.borrowerName}
Mobile: ${entry.borrowerMobile}
Address: ${entry.borrowerAddress}
ID: ${entry.borrowerIdProof}

LOAN DETAILS
------------
Commodity: ${entry.commodityName} (${entry.commodityHi})
Principal: ${formatIndianCurrency(entry.principalAmountCurrent)}
Sanctioned: ${formatIndianCurrency(entry.sanctionedAmount)}
Receipt Value: ${formatIndianCurrency(entry.receiptAmount)}
Interest Rate: ${entry.annualInterestRate}% p.a.
Start Date: ${new Date(entry.startDate).toLocaleDateString('en-IN')}
Due Date: ${new Date(entry.dueDate).toLocaleDateString('en-IN')}
Status: ${entry.status.toUpperCase()}
Exposure: ${entry.exposure.toFixed(1)}%

INTEREST & TDS CALCULATION
--------------------------
Gross Interest (तिमाही ब्याज): ${formatIndianCurrency(entry.quarterlyInterest)}
TDS (${entry.tdsRate}%): ${formatIndianCurrency(entry.tdsAmount)}
Net Receivable (प्राप्त राशि): ${formatIndianCurrency(entry.netInterest)}
Already Paid (भुगतान हुआ): ${formatIndianCurrency(entry.totalPaid)}
Outstanding (बकाया): ${formatIndianCurrency(entry.outstanding)}

================================
Generated by: Jhanwar Finance
    `.trim();

    const blob = new Blob([billContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TDS-Bill-${entry.loanNumber}-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadBill = (bill: typeof bills[0]) => {
    if (!bill.loan || !bill.borrower || !bill.commodity) return;

    const payments = allPayments.filter(p => p.loanId === bill.loanId);
    const totalPaid = payments.reduce((sum, p) => sum + p.allocatedInterestAmount, 0);

    const billContent = `
JHANWAR FINANCE SERVICES
BILL
================================
Bill Number: ${bill.billNumber}
Bill Date: ${new Date(bill.generatedAt).toLocaleDateString('en-IN')}
Due Date: ${new Date(bill.dueDate).toLocaleDateString('en-IN')}

BORROWER DETAILS
----------------
Name: ${bill.borrower.fullName}
Mobile: ${bill.borrower.mobileNumber}
Address: ${bill.borrower.address}
ID Proof: ${bill.borrower.idProofType}: ${bill.borrower.idProofNumber}

LOAN DETAILS
------------
Loan Number: ${bill.loan.loanNumber}
Commodity: ${bill.commodity.commodityNameEn} (${bill.commodity.commodityNameHi})
Principal: ${formatIndianCurrency(bill.loan.principalAmountCurrent)}
Sanctioned: ${formatIndianCurrency(bill.loan.sanctionedAmount)}
Receipt Value: ${formatIndianCurrency(bill.loan.receiptAmount)}
Interest Rate: ${bill.loan.annualInterestRate}% p.a.
Start Date: ${new Date(bill.loan.startDate).toLocaleDateString('en-IN')}
Next Rollover: ${new Date(bill.loan.nextRolloverDate).toLocaleDateString('en-IN')}
Due Date: ${new Date(bill.loan.dueDate).toLocaleDateString('en-IN')}
Status: ${bill.loan.status.toUpperCase()}
Grace Rule: ${bill.loan.graceRuleMode === 'allow_grace' ? `${bill.loan.graceDays} days` : 'Capitalize immediately'}
TDS: ${bill.loan.tdsApplicable ? `${bill.loan.tdsRate}%` : 'Not applicable'}
Auto-Renew: ${bill.loan.autoRenewEnabled ? 'Yes' : 'No'}
Exposure: ${calculateCurrentExposure(bill.loan.principalAmountCurrent, bill.loan.receiptAmount).toFixed(1)}%

BILL AMOUNTS
------------
Principal: ${formatIndianCurrency(bill.principalAmount)}
Interest: ${formatIndianCurrency(bill.interestAmount)}
TDS: ${formatIndianCurrency(bill.tdsAmount)}
Total Due: ${formatIndianCurrency(bill.totalAmount)}

PAYMENT HISTORY
---------------
${payments.length > 0 ? payments.map(p => `• ${formatIndianCurrency(p.amountReceived)} via ${p.paymentMode.toUpperCase()} on ${new Date(p.paymentDate).toLocaleDateString('en-IN')} (${p.referenceNumber})`).join('\n') : 'No payments recorded'}

Already Paid: ${formatIndianCurrency(totalPaid)}
Outstanding: ${formatIndianCurrency(bill.totalAmount - totalPaid)}

================================
Generated by: Jhanwar Finance
    `.trim();

    const blob = new Blob([billContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${bill.billNumber}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary)]" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-4">
        <div>
          <h1 className="text-lg font-bold text-[var(--foreground)]">बिल / Bills</h1>
          <p className="text-xs text-[var(--muted-foreground)]">{bills.length} bills generated</p>
        </div>

        {/* TDS Bill Generation Section */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 space-y-3">
          <button
            onClick={() => setShowTdsReport(!showTdsReport)}
            className="flex w-full items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <IndianRupee className="h-4 w-4 text-[var(--primary)]" />
              <h2 className="text-sm font-semibold text-[var(--foreground)]">TDS Bill Generation / TDS बिल बनाएं</h2>
            </div>
            {showTdsReport ? <ChevronUp className="h-4 w-4 text-[var(--muted-foreground)]" /> : <ChevronDown className="h-4 w-4 text-[var(--muted-foreground)]" />}
          </button>

          {showTdsReport && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[var(--muted-foreground)]">From Date / दिनांक से</label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={e => setDateFrom(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                  />
                </div>
                <div>
                  <label className="text-xs text-[var(--muted-foreground)]">To Date / दिनांक तक</label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={e => setDateTo(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                  />
                </div>
              </div>

              <button
                onClick={() => { setDateFrom(''); setDateTo(''); }}
                className="flex items-center gap-1.5 text-xs text-[var(--primary)] hover:underline"
              >
                <Filter className="h-3 w-3" /> Clear Filters
              </button>

              {tdsReport.length > 0 ? (
                <>
                  {/* Summary */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-[var(--secondary)] p-3">
                      <p className="text-[10px] uppercase text-[var(--muted-foreground)]">Total Gross Interest</p>
                      <p className="text-sm font-bold text-[var(--foreground)]">{formatIndianCurrency(tdsSummary.totalGross)}</p>
                    </div>
                    <div className="rounded-lg bg-[var(--secondary)] p-3">
                      <p className="text-[10px] uppercase text-[var(--muted-foreground)]">Total TDS</p>
                      <p className="text-sm font-bold text-amber-600">{formatIndianCurrency(tdsSummary.totalTds)}</p>
                    </div>
                    <div className="rounded-lg bg-[var(--secondary)] p-3">
                      <p className="text-[10px] uppercase text-[var(--muted-foreground)]">Total Net Receivable</p>
                      <p className="text-sm font-bold text-[var(--primary)]">{formatIndianCurrency(tdsSummary.totalNet)}</p>
                    </div>
                    <div className="rounded-lg bg-[var(--secondary)] p-3">
                      <p className="text-[10px] uppercase text-[var(--muted-foreground)]">Total Outstanding</p>
                      <p className="text-sm font-bold text-red-600">{formatIndianCurrency(tdsSummary.totalOutstanding)}</p>
                    </div>
                  </div>

                  {/* Download Collective PDF */}
                  <button
                    onClick={handleDownloadCollectiveTdsPdf}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[var(--primary)] bg-[var(--primary)]/5 py-3 text-sm font-semibold text-[var(--primary)] hover:bg-[var(--primary)]/10 transition-colors"
                  >
                    <Download className="h-4 w-4" /> Download Collective TDS Report (PDF) / सामूहिक TDS रिपोर्ट डाउनलोड करें
                  </button>

                  {/* Loan Taker List */}
                  <div className="space-y-2">
                    <p className="text-[10px] uppercase font-medium text-[var(--muted-foreground)]">
                      {tdsSummary.count} Loan Takers / ऋण लेने वाले
                    </p>
                    {tdsReport.map(entry => (
                      <div key={entry.id} className="rounded-lg border border-[var(--border)] p-3 space-y-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-sm font-semibold text-[var(--foreground)]">{entry.borrowerName}</p>
                            <p className="text-[10px] text-[var(--muted-foreground)]">{entry.loanNumber} • {entry.commodityName} ({entry.commodityHi})</p>
                          </div>
                          <button
                            onClick={() => handleGenerateBill(entry)}
                            className="flex items-center gap-1 rounded-lg bg-[var(--primary)] px-2.5 py-1.5 text-[10px] font-medium text-white hover:opacity-90"
                          >
                            <Download className="h-3 w-3" /> Generate Bill
                          </button>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div className="rounded bg-[var(--secondary)] p-1.5">
                            <p className="text-[9px] text-[var(--muted-foreground)]">Gross Interest</p>
                            <p className="text-[11px] font-bold text-[var(--foreground)]">{formatIndianCurrency(entry.quarterlyInterest)}</p>
                          </div>
                          <div className="rounded bg-[var(--secondary)] p-1.5">
                            <p className="text-[9px] text-[var(--muted-foreground)]">TDS ({entry.tdsRate}%)</p>
                            <p className="text-[11px] font-bold text-amber-600">{formatIndianCurrency(entry.tdsAmount)}</p>
                          </div>
                          <div className="rounded bg-[var(--secondary)] p-1.5">
                            <p className="text-[9px] text-[var(--muted-foreground)]">Outstanding</p>
                            <p className="text-[11px] font-bold text-red-600">{formatIndianCurrency(entry.outstanding)}</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-[var(--muted-foreground)]">
                          <span>Principal: {formatIndianCurrency(entry.principalAmountCurrent)}</span>
                          <span>Net: {formatIndianCurrency(entry.netInterest)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="rounded-lg border border-dashed border-[var(--border)] p-6 text-center">
                  <Calendar className="mx-auto h-8 w-8 text-[var(--muted-foreground)]" />
                  <p className="mt-2 text-xs text-[var(--muted-foreground)]">Select date range to view TDS bills</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Existing Bills */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-[var(--foreground)]">Generated Bills / बनाए गए बिल</h2>
          {bills.length === 0 ? (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-8 text-center">
              <FileText className="mx-auto h-10 w-10 text-[var(--muted-foreground)]" />
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">No bills generated yet</p>
            </div>
          ) : (
            bills.map(bill => {
              const isExpanded = expandedBill === bill.id;
              return (
                <div key={bill.id} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-[var(--foreground)]">{bill.borrower?.fullName}</h3>
                      <p className="text-[11px] text-[var(--muted-foreground)]">{bill.billNumber} • {bill.commodity?.commodityNameEn} ({bill.commodity?.commodityNameHi})</p>
                    </div>
                    <span className="rounded-lg bg-[var(--secondary)] px-2 py-1 text-[10px] font-medium text-[var(--muted-foreground)]">
                      {new Date(bill.generatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[10px] uppercase text-[var(--muted-foreground)]">Principal / मूलधन</p>
                      <p className="text-sm font-bold text-[var(--foreground)]">{formatIndianCurrency(bill.principalAmount)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase text-[var(--muted-foreground)]">Interest / ब्याज</p>
                      <p className="text-sm font-bold text-[var(--foreground)]">{formatIndianCurrency(bill.interestAmount)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase text-[var(--muted-foreground)]">TDS</p>
                      <p className="text-sm font-bold text-[var(--foreground)]">{formatIndianCurrency(bill.tdsAmount)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase text-[var(--muted-foreground)]">Total / कुल</p>
                      <p className="text-sm font-bold text-[var(--primary)]">{formatIndianCurrency(bill.totalAmount)}</p>
                    </div>
                  </div>

                  {/* Expandable Details */}
                  <button
                    onClick={() => setExpandedBill(isExpanded ? null : bill.id)}
                    className="mt-3 flex items-center gap-1 text-[10px] text-[var(--primary)] hover:underline"
                  >
                    {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    {isExpanded ? 'Hide Details' : 'View All Details'}
                  </button>

                  {isExpanded && bill.loan && (
                    <div className="mt-3 rounded-lg bg-[var(--secondary)] p-3 space-y-2 text-[11px]">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <p className="text-[var(--muted-foreground)]">Borrower</p>
                          <p className="font-medium text-[var(--foreground)]">{bill.borrower?.fullName}</p>
                        </div>
                        <div>
                          <p className="text-[var(--muted-foreground)]">Mobile</p>
                          <p className="font-medium text-[var(--foreground)]">{bill.borrower?.mobileNumber}</p>
                        </div>
                        <div>
                          <p className="text-[var(--muted-foreground)]">Address</p>
                          <p className="font-medium text-[var(--foreground)]">{bill.borrower?.address}</p>
                        </div>
                        <div>
                          <p className="text-[var(--muted-foreground)]">ID Proof</p>
                          <p className="font-medium text-[var(--foreground)]">{bill.borrower?.idProofType}: {bill.borrower?.idProofNumber}</p>
                        </div>
                        <div>
                          <p className="text-[var(--muted-foreground)]">Loan Number</p>
                          <p className="font-medium text-[var(--foreground)]">{bill.loan.loanNumber}</p>
                        </div>
                        <div>
                          <p className="text-[var(--muted-foreground)]">Commodity</p>
                          <p className="font-medium text-[var(--foreground)]">{bill.commodity?.commodityNameEn} ({bill.commodity?.commodityNameHi})</p>
                        </div>
                        <div>
                          <p className="text-[var(--muted-foreground)]">Interest Rate</p>
                          <p className="font-medium text-[var(--foreground)]">{bill.loan.annualInterestRate}% p.a.</p>
                        </div>
                        <div>
                          <p className="text-[var(--muted-foreground)]">Start Date</p>
                          <p className="font-medium text-[var(--foreground)]">{new Date(bill.loan.startDate).toLocaleDateString('en-IN')}</p>
                        </div>
                        <div>
                          <p className="text-[var(--muted-foreground)]">Due Date</p>
                          <p className="font-medium text-[var(--foreground)]">{new Date(bill.loan.dueDate).toLocaleDateString('en-IN')}</p>
                        </div>
                        <div>
                          <p className="text-[var(--muted-foreground)]">Receipt Amount</p>
                          <p className="font-medium text-[var(--foreground)]">{formatIndianCurrency(bill.loan.receiptAmount)}</p>
                        </div>
                        <div>
                          <p className="text-[var(--muted-foreground)]">Grace Rule</p>
                          <p className="font-medium text-[var(--foreground)]">{bill.loan.graceRuleMode === 'allow_grace' ? `${bill.loan.graceDays} days` : 'Capitalize immediately'}</p>
                        </div>
                        <div>
                          <p className="text-[var(--muted-foreground)]">TDS Rate</p>
                          <p className="font-medium text-[var(--foreground)]">{bill.loan.tdsApplicable ? `${bill.loan.tdsRate}%` : 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => handleDownloadBill(bill)}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[var(--primary)] px-3 py-2 text-xs font-medium text-white hover:opacity-90"
                    >
                      <Download className="h-3.5 w-3.5" /> Generate Bill
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </AppShell>
  );
}
