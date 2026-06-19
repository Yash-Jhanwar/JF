'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Save, IndianRupee, CheckCircle2, TrendingUp } from 'lucide-react';
import AppShell from '@/components/ui/AppShell';
import StatusChip from '@/components/ui/StatusChip';
import { formatIndianCurrency, calculateQuarterlyInterest, calculateCurrentExposure, determineRiskStatus, calculateTds, calculateNetInterest } from '@/lib/finance';
import type { LoanStatus } from '@/types';

type PaymentMode = 'cash' | 'upi' | 'cheque' | 'bank_transfer';
type PaymentAction = 'interest_paid' | 'add_to_principal';

interface LoanData { id: string; loanNumber: string; borrowerId: string; commodityId: string; principalAmountCurrent: number; receiptAmount: number; annualInterestRate: number; tdsApplicable: boolean; tdsRate: number; status: LoanStatus; }
interface BorrowerData { id: string; fullName: string; }
interface CommodityData { id: string; commodityNameEn: string; commodityNameHi: string; }
interface PaymentData { id: string; loanId: string; amountReceived: number; allocatedInterestAmount: number; allocatedPrincipalAmount: number; paymentDate: string; paymentMode: string; referenceNumber: string; }

export default function RecordPaymentPage() {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [selectedLoanId, setSelectedLoanId] = useState('');
  const [action, setAction] = useState<PaymentAction>('interest_paid');
  const [form, setForm] = useState({
    amount: '',
    paymentMode: 'cash' as PaymentMode,
    referenceNumber: '',
    paymentDate: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const [allLoans, setAllLoans] = useState<LoanData[]>([]);
  const [allBorrowers, setAllBorrowers] = useState<BorrowerData[]>([]);
  const [allCommodities, setAllCommodities] = useState<CommodityData[]>([]);
  const [allPayments, setAllPayments] = useState<PaymentData[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const fetchData = async () => {
    try {
      const [loansRes, borRes, comRes, payRes] = await Promise.all([
        fetch('/api/loans?status=active'),
        fetch('/api/borrowers'),
        fetch('/api/commodities'),
        fetch('/api/payments')
      ]);
      const [loanData, borData, comData, payData] = await Promise.all([
        loansRes.json(), borRes.json(), comRes.json(), payRes.json()
      ]);
      setAllLoans(loanData.data || []);
      setAllBorrowers(borData.data || []);
      setAllCommodities(comData.data || []);
      setAllPayments(payData.data || []);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const loan = useMemo(() => {
    if (!selectedLoanId) return null;
    return allLoans.find(l => l.id === selectedLoanId) || null;
  }, [selectedLoanId, allLoans]);

  const borrower = useMemo(() => {
    if (!loan) return null;
    return allBorrowers.find(b => b.id === loan.borrowerId) || null;
  }, [loan, allBorrowers]);

  const commodity = useMemo(() => {
    if (!loan) return null;
    return allCommodities.find(c => c.id === loan.commodityId) || null;
  }, [loan, allCommodities]);

  const loanPayments = useMemo(() => {
    if (!loan) return [];
    return allPayments.filter(p => p.loanId === loan.id).sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());
  }, [loan, allPayments]);

  const quarterlyInterest = useMemo(() => {
    if (!loan) return 0;
    return calculateQuarterlyInterest(loan.principalAmountCurrent, loan.annualInterestRate);
  }, [loan]);

  const tdsAmount = useMemo(() => {
    if (!loan) return 0;
    return loan.tdsApplicable ? calculateTds(quarterlyInterest, loan.tdsRate) : 0;
  }, [loan, quarterlyInterest]);

  const netInterest = useMemo(() => {
    return calculateNetInterest(quarterlyInterest, tdsAmount);
  }, [quarterlyInterest, tdsAmount]);

  const exposure = useMemo(() => {
    if (!loan) return 0;
    return calculateCurrentExposure(loan.principalAmountCurrent, loan.receiptAmount);
  }, [loan]);

  const riskStatus = useMemo(() => {
    return determineRiskStatus(exposure);
  }, [exposure]);

  const totalPaid = useMemo(() => {
    return loanPayments.reduce((sum, p) => sum + p.allocatedInterestAmount, 0);
  }, [loanPayments]);

  const outstandingInterest = Math.max(0, quarterlyInterest - totalPaid);

  const update = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loan) return;

    setSaving(true);
    const paymentAmount = parseFloat(form.amount) || 0;
    const allocatedInterestAmount = action === 'interest_paid' ? Math.min(paymentAmount, outstandingInterest) : 0;
    const allocatedPrincipalAmount = action === 'add_to_principal' ? paymentAmount : 0;

    const newPayment = {
      loanId: loan.id,
      amountReceived: paymentAmount,
      allocatedInterestAmount,
      allocatedPrincipalAmount,
      paymentMode: form.paymentMode,
      referenceNumber: form.referenceNumber,
      paymentDate: new Date(form.paymentDate).toISOString(),
      notes: form.notes,
    };

    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPayment)
      });
      if (res.ok) {
        setSaving(false);
        setSaved(true);
        fetchData(); // Refresh data to show new payment
        setTimeout(() => {
          setSaved(false);
          setSelectedLoanId('');
          setForm({ amount: '', paymentMode: 'cash', referenceNumber: '', paymentDate: new Date().toISOString().split('T')[0], notes: '' });
        }, 2000);
      } else {
        console.error('Failed to record payment');
        setSaving(false);
      }
    } catch (err) {
      console.error('Error saving payment:', err);
      setSaving(false);
    }
  };

  if (loadingData) {
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
        <div className="flex items-center gap-3">
          <Link href="/loans" className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] hover:bg-[var(--secondary)]">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-[var(--foreground)]">भुगतान दर्ज करें / Record Payment</h1>
            <p className="text-xs text-[var(--muted-foreground)]">Mark interest paid or add to principal</p>
          </div>
        </div>

        {/* Loan Selection */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 space-y-3">
          <h2 className="text-sm font-semibold text-[var(--foreground)]">Select Loan Taker</h2>
          <select
            value={selectedLoanId}
            onChange={e => setSelectedLoanId(e.target.value)}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
          >
            <option value="">Choose loan taker...</option>
            {allLoans.map(l => {
              const b = allBorrowers.find(br => br.id === l.borrowerId);
              return (
                <option key={l.id} value={l.id}>
                  {b?.fullName} — {l.loanNumber} ({formatIndianCurrency(l.principalAmountCurrent)})
                </option>
              );
            })}
          </select>
        </div>

        {loan && borrower && commodity && (
          <>
            {/* Loan Summary */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-[var(--foreground)]">{borrower.fullName}</h2>
                  <p className="text-[11px] text-[var(--muted-foreground)]">{loan.loanNumber} • {commodity.commodityNameEn} ({commodity.commodityNameHi})</p>
                </div>
                <div className="flex gap-1.5">
                  <StatusChip status={loan.status} />
                  <StatusChip status={riskStatus} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-[var(--secondary)] p-3">
                  <p className="text-[10px] uppercase text-[var(--muted-foreground)]">Current Principal</p>
                  <p className="text-sm font-bold text-[var(--foreground)]">{formatIndianCurrency(loan.principalAmountCurrent)}</p>
                </div>
                <div className="rounded-lg bg-[var(--secondary)] p-3">
                  <p className="text-[10px] uppercase text-[var(--muted-foreground)]">Receipt Amount</p>
                  <p className="text-sm font-bold text-[var(--foreground)]">{formatIndianCurrency(loan.receiptAmount)}</p>
                </div>
                <div className="rounded-lg bg-[var(--secondary)] p-3">
                  <p className="text-[10px] uppercase text-[var(--muted-foreground)]">Exposure</p>
                  <p className={`text-sm font-bold ${riskStatus === 'risky' ? 'text-red-600' : riskStatus === 'warning' ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {exposure.toFixed(1)}%
                  </p>
                </div>
                <div className="rounded-lg bg-[var(--secondary)] p-3">
                  <p className="text-[10px] uppercase text-[var(--muted-foreground)]">Rate</p>
                  <p className="text-sm font-bold text-[var(--foreground)]">{loan.annualInterestRate}% p.a.</p>
                </div>
              </div>
            </div>

            {/* Interest Summary */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 space-y-3">
              <h2 className="text-sm font-semibold text-[var(--foreground)]">तिमाही ब्याज / Quarterly Interest</h2>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[var(--muted-foreground)]">Gross Interest (ब्याज)</span>
                  <span className="text-sm font-bold text-[var(--foreground)]">{formatIndianCurrency(quarterlyInterest)}</span>
                </div>
                {loan.tdsApplicable && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[var(--muted-foreground)]">TDS ({loan.tdsRate}%)</span>
                    <span className="text-sm font-bold text-amber-600">-{formatIndianCurrency(tdsAmount)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between border-t border-[var(--border)] pt-2">
                  <span className="text-xs font-semibold text-[var(--foreground)]">Net Receivable (प्राप्त राशि)</span>
                  <span className="text-sm font-bold text-[var(--primary)]">{formatIndianCurrency(netInterest)}</span>
                </div>
                {totalPaid > 0 && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[var(--muted-foreground)]">Already Paid (भुगतान हुआ)</span>
                      <span className="text-sm font-bold text-emerald-600">{formatIndianCurrency(totalPaid)}</span>
                    </div>
                    <div className="flex items-center justify-between border-t border-[var(--border)] pt-2">
                      <span className="text-xs font-semibold text-[var(--foreground)]">Outstanding (बकाया)</span>
                      <span className={`text-sm font-bold ${outstandingInterest > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                        {formatIndianCurrency(outstandingInterest)}
                      </span>
                    </div>
                  </>
                )}
              </div>

              {loanPayments.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  <p className="text-[10px] uppercase font-medium text-[var(--muted-foreground)]">Previous Payments</p>
                  {loanPayments.map(p => (
                    <div key={p.id} className="flex items-center justify-between rounded-lg bg-[var(--secondary)] px-3 py-2">
                      <div>
                        <p className="text-xs font-medium text-[var(--foreground)]">{formatIndianCurrency(p.amountReceived)}</p>
                        <p className="text-[10px] text-[var(--muted-foreground)]">{p.paymentMode.toUpperCase()} • {new Date(p.paymentDate).toLocaleDateString('en-IN')}</p>
                      </div>
                      <span className="text-[10px] text-[var(--muted-foreground)]">{p.referenceNumber}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Payment Action */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 space-y-3">
              <h2 className="text-sm font-semibold text-[var(--foreground)]">Payment Action</h2>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setAction('interest_paid')}
                  className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all ${
                    action === 'interest_paid'
                      ? 'border-[var(--primary)] bg-[var(--primary)]/5'
                      : 'border-[var(--border)] hover:border-[var(--primary)]/50'
                  }`}
                >
                  <CheckCircle2 className={`h-6 w-6 ${action === 'interest_paid' ? 'text-[var(--primary)]' : 'text-[var(--muted-foreground)]'}`} />
                  <div className="text-center">
                    <p className={`text-xs font-semibold ${action === 'interest_paid' ? 'text-[var(--primary)]' : 'text-[var(--foreground)]'}`}>
                      ब्याज भुगतान
                    </p>
                    <p className="text-[10px] text-[var(--muted-foreground)]">Interest Paid</p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setAction('add_to_principal')}
                  className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all ${
                    action === 'add_to_principal'
                      ? 'border-[var(--primary)] bg-[var(--primary)]/5'
                      : 'border-[var(--border)] hover:border-[var(--primary)]/50'
                  }`}
                >
                  <TrendingUp className={`h-6 w-6 ${action === 'add_to_principal' ? 'text-[var(--primary)]' : 'text-[var(--muted-foreground)]'}`} />
                  <div className="text-center">
                    <p className={`text-xs font-semibold ${action === 'add_to_principal' ? 'text-[var(--primary)]' : 'text-[var(--foreground)]'}`}>
                      मूलधन में जोड़ें
                    </p>
                    <p className="text-[10px] text-[var(--muted-foreground)]">Add to Principal</p>
                  </div>
                </button>
              </div>

              {action === 'add_to_principal' && (
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-700">
                  This amount will be added to the current principal. Interest will be calculated on the new principal amount in the next cycle.
                </div>
              )}
            </div>

            {/* Payment Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 space-y-3">
                <h2 className="text-sm font-semibold text-[var(--foreground)]">Payment Details</h2>
                <div>
                  <label className="text-xs text-[var(--muted-foreground)]">
                    Amount (₹) {action === 'interest_paid' ? `- Max: ${formatIndianCurrency(outstandingInterest)}` : ''}
                  </label>
                  <div className="relative mt-1">
                    <IndianRupee className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
                    <input
                      type="number"
                      value={form.amount}
                      onChange={e => update('amount', e.target.value)}
                      required
                      max={action === 'interest_paid' ? outstandingInterest : undefined}
                      placeholder="Enter amount"
                      className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] py-2.5 pl-9 pr-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-[var(--muted-foreground)]">Payment Mode</label>
                  <select
                    value={form.paymentMode}
                    onChange={e => update('paymentMode', e.target.value)}
                    className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                  >
                    <option value="cash">Cash (नकद)</option>
                    <option value="upi">UPI</option>
                    <option value="cheque">Cheque (चेक)</option>
                    <option value="bank_transfer">Bank Transfer</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-[var(--muted-foreground)]">Reference Number</label>
                  <input
                    type="text"
                    value={form.referenceNumber}
                    onChange={e => update('referenceNumber', e.target.value)}
                    placeholder="e.g. CASH-001, UPI ref, Cheque no."
                    className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                  />
                </div>
                <div>
                  <label className="text-xs text-[var(--muted-foreground)]">Payment Date</label>
                  <input
                    type="date"
                    value={form.paymentDate}
                    onChange={e => update('paymentDate', e.target.value)}
                    required
                    className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                  />
                </div>
                <div>
                  <label className="text-xs text-[var(--muted-foreground)]">Notes</label>
                  <textarea
                    value={form.notes}
                    onChange={e => update('notes', e.target.value)}
                    rows={2}
                    placeholder="Optional notes..."
                    className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                  />
                </div>
              </div>

              {saved ? (
                <div className="flex items-center justify-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 py-3 text-sm font-semibold text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" /> Payment Recorded Successfully!
                </div>
              ) : (
                <button
                  type="submit"
                  disabled={saving || !form.amount || parseFloat(form.amount) <= 0}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--primary)] py-3 text-sm font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {saving ? 'Recording...' : action === 'interest_paid' ? 'Record Interest Payment' : 'Add to Principal'}
                </button>
              )}
            </form>
          </>
        )}

        {!selectedLoanId && (
          <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--card)] p-8 text-center">
            <IndianRupee className="mx-auto h-10 w-10 text-[var(--muted-foreground)]" />
            <p className="mt-2 text-sm text-[var(--muted-foreground)]">Select a loan taker above to record payment</p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
