'use client';

import { useMemo, use, useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Phone, MessageCircle, FileText, AlertTriangle, Camera, FileImage, X } from 'lucide-react';
import AppShell from '@/components/ui/AppShell';
import StatusChip from '@/components/ui/StatusChip';
import MiniPriceChart from '@/components/charts/MiniPriceChart';
import { generatePriceHistory } from '@/lib/mock/data';
import { formatIndianCurrency, calculateQuarterlyInterest, calculateCurrentExposure, determineRiskStatus, calculateTds, calculateNetInterest } from '@/lib/finance';
import type { LoanStatus, RiskStatus } from '@/types';

interface LoanData { id: string; loanNumber: string; borrowerId: string; commodityId: string; principalAmountInitial: number; principalAmountCurrent: number; receiptAmount: number; annualInterestRate: number; interestCycleMonths: number; tdsApplicable: boolean; tdsRate: number; status: LoanStatus; startDate: string; nextRolloverDate: string; dueDate: string; graceRuleMode: string; graceDays: number; }
interface BorrowerData { id: string; fullName: string; mobileNumber: string; whatsappNumber: string; }
interface CommodityData { id: string; commodityNameEn: string; commodityNameHi: string; }
interface PaymentData { id: string; loanId: string; amountReceived: number; paymentMode: string; referenceNumber: string; paymentDate: string; }
interface MandiPriceData { id: string; commodityId: string; priceLow: number; priceMedium: number; priceHigh: number; }

export default function LoanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  
  const [loan, setLoan] = useState<LoanData | null>(null);
  const [borrower, setBorrower] = useState<BorrowerData | null>(null);
  const [commodity, setCommodity] = useState<CommodityData | null>(null);
  const [payments, setPayments] = useState<PaymentData[]>([]);
  const [mandiPrice, setMandiPrice] = useState<MandiPriceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [processingInterest, setProcessingInterest] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const loanRes = await fetch(`/api/loans/${id}`);
        const loanData = await loanRes.json();
        const loanItem = loanData.data;
        setLoan(loanItem || null);

        if (loanItem) {
          const [borRes, comRes, payRes, mandiRes] = await Promise.all([
            fetch(`/api/borrowers/${loanItem.borrowerId}`),
            fetch(`/api/commodities/${loanItem.commodityId}`),
            fetch(`/api/payments?loanId=${id}`),
            fetch(`/api/mandi-prices`)
          ]);
          
          const [borData, comData, payData, mandiData] = await Promise.all([
            borRes.json(), comRes.json(), payRes.json(), mandiRes.json()
          ]);
          
          setBorrower(borData.data || null);
          setCommodity(comData.data || null);
          setPayments(payData.data || []);
          
          const allMandi = mandiData.data || [];
          setMandiPrice(allMandi.find((p: any) => p.commodityId === loanItem.commodityId) || null);
        }
      } catch (err) {
        console.error('Failed to load loan data:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

  const priceHistory = useMemo(() => {
    return generatePriceHistory(mandiPrice?.priceMedium || 2300, 30);
  }, [mandiPrice]);

  const receiptInputRef = useRef<HTMLInputElement>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);

  const handleReceiptChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setReceiptPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removeReceipt = () => {
    setReceiptPreview(null);
    if (receiptInputRef.current) receiptInputRef.current.value = '';
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

  if (!loan || !borrower || !commodity) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center py-16">
          <AlertTriangle className="h-12 w-12 text-amber-500" />
          <p className="mt-4 text-sm text-[var(--muted-foreground)]">Loan not found</p>
          <Link href="/loans" className="mt-3 text-sm text-[var(--primary)] hover:underline">Back to Loans</Link>
        </div>
      </AppShell>
    );
  }

  const exposure = calculateCurrentExposure(loan.principalAmountCurrent, loan.receiptAmount);
  const riskStatus = determineRiskStatus(exposure);
  const quarterlyInterest = calculateQuarterlyInterest(loan.principalAmountCurrent, loan.annualInterestRate);
  const tdsAmount = loan.tdsApplicable ? calculateTds(quarterlyInterest, loan.tdsRate) : 0;
  const netInterest = calculateNetInterest(quarterlyInterest, tdsAmount);

  const daysUntilNextQuarter = Math.ceil((new Date(loan.nextRolloverDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
  const daysUntilFullSettlement = Math.ceil((new Date(loan.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
  const totalQuartersRemaining = Math.max(0, Math.ceil(daysUntilFullSettlement / (loan.interestCycleMonths * 30)));
  const totalInterestPending = quarterlyInterest * totalQuartersRemaining;

  const capitalizedInterest = loan.principalAmountCurrent - loan.principalAmountInitial;

  const handleInterestAction = async (action: 'paid' | 'capitalize') => {
    if (!confirm(`Are you sure you want to ${action === 'paid' ? 'mark this interest as paid' : 'capitalize this interest into the principal'}?`)) return;
    
    setProcessingInterest(true);
    try {
      const res = await fetch(`/api/loans/${id}/interest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, amount: netInterest })
      });
      if (res.ok) {
        window.location.reload();
      } else {
        alert('Failed to process interest');
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred');
    } finally {
      setProcessingInterest(false);
    }
  };

  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Link href="/loans" className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] hover:bg-[var(--secondary)]">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-[var(--foreground)]">{loan.loanNumber}</h1>
            <p className="text-xs text-[var(--muted-foreground)]">{borrower.fullName} • {commodity.commodityNameEn}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <StatusChip status={loan.status} size="md" />
          <StatusChip status={riskStatus as RiskStatus} size="md" />
          {daysUntilNextQuarter <= 0 && <StatusChip status="overdue" size="md" />}
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-base font-bold text-[var(--foreground)]">{borrower.fullName}</h2>
              <p className="text-xs text-[var(--muted-foreground)]">{borrower.mobileNumber}</p>
            </div>
            <div className="flex gap-1.5">
              <a href={`tel:${borrower.mobileNumber}`} className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)] hover:bg-[var(--secondary)]">
                <Phone className="h-4 w-4" />
              </a>
              <a href={`https://wa.me/91${borrower.whatsappNumber}`} target="_blank" rel="noopener noreferrer" className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white hover:bg-emerald-700">
                <MessageCircle className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Loan Details</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 rounded-lg bg-[var(--secondary)] p-3 flex justify-between items-center">
              <div>
                <p className="text-[10px] uppercase text-[var(--muted-foreground)]">Initial Principal</p>
                <p className="text-xs font-medium text-[var(--foreground)]">{formatIndianCurrency(loan.principalAmountInitial)}</p>
              </div>
              <div className="text-center px-2">
                <p className="text-[10px] uppercase text-[var(--muted-foreground)]">Interest Added</p>
                <p className="text-xs font-medium text-amber-600">+{formatIndianCurrency(capitalizedInterest)}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase text-[var(--muted-foreground)]">Total Current Principal</p>
                <p className="text-sm font-bold text-[var(--primary)]">{formatIndianCurrency(loan.principalAmountCurrent)}</p>
              </div>
            </div>
            <div>
              <p className="text-[10px] uppercase text-[var(--muted-foreground)]">Receipt Amount</p>
              <p className="text-sm font-bold text-[var(--foreground)]">{formatIndianCurrency(loan.receiptAmount)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-[var(--muted-foreground)]">Exposure</p>
              <p className={`text-sm font-bold ${riskStatus === 'risky' ? 'text-red-600' : riskStatus === 'warning' ? 'text-amber-600' : 'text-emerald-600'}`}>
                {exposure.toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-[var(--muted-foreground)]">Interest Rate</p>
              <p className="text-sm font-bold text-[var(--foreground)]">{loan.annualInterestRate}% p.a.</p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-[var(--muted-foreground)]">Start Date</p>
              <p className="text-sm font-bold text-[var(--foreground)]">{new Date(loan.startDate).toLocaleDateString('en-IN')}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-[var(--muted-foreground)]">Interest Cycle</p>
              <p className="text-sm font-bold text-[var(--foreground)]">{loan.interestCycleMonths} months</p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-[var(--muted-foreground)]">Grace Rule</p>
              <p className="text-sm font-bold text-[var(--foreground)]">
                {loan.graceRuleMode === 'allow_grace' ? `${loan.graceDays} days` : 'Capitalize immediately'}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-[var(--muted-foreground)]">TDS</p>
              <p className="text-sm font-bold text-[var(--foreground)]">
                {loan.tdsApplicable ? `${loan.tdsRate}%` : 'Not applicable'}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">तिमाही ब्याज / Quarterly Interest</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--muted-foreground)]">Gross Interest</span>
              <span className="text-sm font-bold text-[var(--foreground)]">{formatIndianCurrency(quarterlyInterest)}</span>
            </div>
            {loan.tdsApplicable && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--muted-foreground)]">TDS ({loan.tdsRate}%)</span>
                <span className="text-sm font-bold text-amber-600">-{formatIndianCurrency(tdsAmount)}</span>
              </div>
            )}
            <div className="flex items-center justify-between border-t border-[var(--border)] pt-2">
              <span className="text-sm font-semibold text-[var(--foreground)]">Net Receivable</span>
              <span className="text-sm font-bold text-[var(--primary)]">{formatIndianCurrency(netInterest)}</span>
            </div>
          </div>
        </div>

        {/* Quarterly Interest Due Date */}
        <div className={`rounded-xl border-2 p-4 ${daysUntilNextQuarter <= 0 ? 'border-red-400 bg-red-50' : daysUntilNextQuarter <= 7 ? 'border-amber-400 bg-amber-50' : 'border-[var(--border)] bg-[var(--card)]'}`}>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
            अगली तिमाही ब्याज देय तिथि / Next Quarterly Interest Due
          </h3>
          <div className="flex items-end justify-between">
            <div>
              <p className={`text-lg font-bold ${daysUntilNextQuarter <= 0 ? 'text-red-600' : daysUntilNextQuarter <= 7 ? 'text-amber-600' : 'text-[var(--foreground)]'}`}>
                {new Date(loan.nextRolloverDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
              <p className="text-xs text-[var(--muted-foreground)]">तिमाही ब्याज देय है</p>
            </div>
            <div className="text-right">
              {daysUntilNextQuarter > 0 ? (
                <span className={`text-lg font-bold ${daysUntilNextQuarter <= 7 ? 'text-amber-600' : 'text-[var(--primary)]'}`}>
                  {daysUntilNextQuarter} days
                </span>
              ) : (
                <span className="text-lg font-bold text-red-600">Overdue</span>
              )}
              <p className="text-[10px] text-[var(--muted-foreground)]">{formatIndianCurrency(netInterest)} net</p>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => handleInterestAction('paid')}
              disabled={processingInterest}
              className="flex-1 rounded-lg bg-emerald-600 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              Mark Paid
            </button>
            <button
              onClick={() => handleInterestAction('capitalize')}
              disabled={processingInterest}
              className="flex-1 rounded-lg bg-[var(--primary)] py-2 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
            >
              Capitalize (Add to Principal)
            </button>
          </div>
        </div>

        {/* Full Settlement Date */}
        <div className={`rounded-xl border-2 p-4 ${daysUntilFullSettlement <= 0 ? 'border-red-400 bg-red-50' : daysUntilFullSettlement <= 30 ? 'border-amber-400 bg-amber-50' : 'border-[var(--border)] bg-[var(--card)]'}`}>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
            पूर्ण भुगतान देय तिथि / Full Settlement Due
          </h3>
          <div className="flex items-end justify-between">
            <div>
              <p className={`text-lg font-bold ${daysUntilFullSettlement <= 0 ? 'text-red-600' : daysUntilFullSettlement <= 30 ? 'text-amber-600' : 'text-[var(--foreground)]'}`}>
                {new Date(loan.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
              <p className="text-xs text-[var(--muted-foreground)]">मूलधन + सम्पूर्ण ब्याज देय है</p>
            </div>
            <div className="text-right">
              {daysUntilFullSettlement > 0 ? (
                <span className={`text-lg font-bold ${daysUntilFullSettlement <= 30 ? 'text-amber-600' : 'text-[var(--primary)]'}`}>
                  {daysUntilFullSettlement} days
                </span>
              ) : (
                <span className="text-lg font-bold text-red-600">Overdue</span>
              )}
              <p className="text-[10px] text-[var(--muted-foreground)]">{totalQuartersRemaining} quarters left</p>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <div className="rounded-lg bg-[var(--secondary)] p-2 text-center">
              <p className="text-[9px] text-[var(--muted-foreground)]">Principal</p>
              <p className="text-xs font-bold text-[var(--foreground)]">{formatIndianCurrency(loan.principalAmountCurrent)}</p>
            </div>
            <div className="rounded-lg bg-[var(--secondary)] p-2 text-center">
              <p className="text-[9px] text-[var(--muted-foreground)]">Pending Interest</p>
              <p className="text-xs font-bold text-amber-600">{formatIndianCurrency(totalInterestPending)}</p>
            </div>
            <div className="rounded-lg bg-[var(--secondary)] p-2 text-center">
              <p className="text-[9px] text-[var(--muted-foreground)]">Total Settlement</p>
              <p className="text-xs font-bold text-[var(--primary)]">{formatIndianCurrency(loan.principalAmountCurrent + totalInterestPending)}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
            {commodity.commodityNameHi} Price Trend
          </h3>
          <div className="h-32">
            <MiniPriceChart data={priceHistory} color={riskStatus === 'risky' ? '#dc2626' : '#166534'} />
          </div>
          {mandiPrice && (
            <div className="mt-2 flex items-center justify-between text-[11px]">
              <span className="text-[var(--muted-foreground)]">Today: ₹{mandiPrice.priceLow} - ₹{mandiPrice.priceHigh}</span>
              <span className="text-[var(--muted-foreground)]">Avg: ₹{mandiPrice.priceMedium}</span>
            </div>
          )}
        </div>

        {/* Warehouse Receipt Photo */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
            वेयरहाउस रसीद / Warehouse Receipt
          </h3>
          <input
            type="file"
            accept="image/*"
            ref={receiptInputRef}
            onChange={handleReceiptChange}
            className="hidden"
          />
          {receiptPreview ? (
            <div className="relative rounded-lg border border-[var(--border)] overflow-hidden">
              <img src={receiptPreview} alt="Warehouse Receipt" className="w-full h-48 object-cover" />
              <button
                onClick={removeReceipt}
                className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-red-600 text-white hover:bg-red-700"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                <p className="text-[10px] text-white flex items-center gap-1">
                  <FileImage className="h-3 w-3" /> Receipt photo uploaded
                </p>
              </div>
            </div>
          ) : (
            <button
              onClick={() => receiptInputRef.current?.click()}
              className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-[var(--border)] bg-[var(--secondary)] py-6 text-[var(--muted-foreground)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors"
            >
              <Camera className="h-5 w-5" />
              <div className="text-center">
                <p className="text-xs font-medium">Update Receipt Photo</p>
                <p className="text-[10px]">Tap to take new photo or choose from gallery</p>
              </div>
            </button>
          )}
        </div>

        {payments.length > 0 && (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Payment History</h3>
            <div className="space-y-2">
              {payments.map(payment => (
                <div key={payment.id} className="flex items-center justify-between rounded-lg border border-[var(--border)] px-3 py-2">
                  <div>
                    <p className="text-sm font-medium text-[var(--foreground)]">{formatIndianCurrency(payment.amountReceived)}</p>
                    <p className="text-[10px] text-[var(--muted-foreground)]">
                      {payment.paymentMode.toUpperCase()} • {new Date(payment.paymentDate).toLocaleDateString('en-IN')}
                    </p>
                  </div>
                  <span className="text-[10px] font-medium text-[var(--muted-foreground)]">{payment.referenceNumber}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <Link
            href={`/bills?loanId=${loan.id}`}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-[var(--border)] px-4 py-3 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--secondary)]"
          >
            <FileText className="h-4 w-4" /> Generate Bill
          </Link>
          <a
            href={`https://wa.me/91${borrower.whatsappNumber}?text=${encodeURIComponent(`नमस्ते ${borrower.fullName} जी,\nआपका ऋण ${loan.loanNumber} (${commodity.commodityNameHi}) की किश्त ${formatIndianCurrency(quarterlyInterest)} देय है।\nकृपया भुगतान करें।\nधन्यवाद,\nJhanwar Finance`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-medium text-white hover:bg-emerald-700"
          >
            <MessageCircle className="h-4 w-4" /> Send Reminder
          </a>
        </div>
      </div>
    </AppShell>
  );
}