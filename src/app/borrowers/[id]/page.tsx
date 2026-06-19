'use client';

import { useState, useMemo, use, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Phone, MessageCircle, MapPin, CreditCard, AlertTriangle } from 'lucide-react';
import AppShell from '@/components/ui/AppShell';
import StatusChip from '@/components/ui/StatusChip';
import { formatIndianCurrency, calculateCurrentExposure, determineRiskStatus } from '@/lib/finance';
import type { LoanStatus, RiskStatus } from '@/types';

interface BorrowerData { id: string; fullName: string; mobileNumber: string; whatsappNumber: string; address: string; idProofType: string; idProofNumber: string; notes?: string; }
interface LoanData { id: string; loanNumber: string; commodityId: string; principalAmountCurrent: number; receiptAmount: number; dueDate: string; status: LoanStatus; }
interface CommodityData { id: string; commodityNameEn: string; commodityNameHi: string; }

export default function BorrowerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  
  const [borrower, setBorrower] = useState<BorrowerData | null>(null);
  const [loans, setLoans] = useState<LoanData[]>([]);
  const [commodities, setCommodities] = useState<CommodityData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [borRes, loansRes, comRes] = await Promise.all([
          fetch(`/api/borrowers/${id}`),
          fetch(`/api/loans?borrowerId=${id}`),
          fetch(`/api/commodities`)
        ]);
        
        const borData = await borRes.json();
        const loansData = await loansRes.json();
        const comData = await comRes.json();
        
        setBorrower(borData.data || null);
        setLoans(loansData.data || []);
        setCommodities(comData.data || []);
      } catch (err) {
        console.error('Failed to load borrower data:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

  const loanDetails = useMemo(() => {
    return loans.map(loan => {
      const commodity = commodities.find(c => c.id === loan.commodityId);
      const exposure = calculateCurrentExposure(loan.principalAmountCurrent, loan.receiptAmount);
      const riskStatus = determineRiskStatus(exposure);
      return { ...loan, commodityName: commodity?.commodityNameEn || 'Unknown', commodityHi: commodity?.commodityNameHi || '', exposure, riskStatus };
    });
  }, [loans, commodities]);

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary)]" />
        </div>
      </AppShell>
    );
  }

  if (!borrower) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center py-16">
          <AlertTriangle className="h-12 w-12 text-amber-500" />
          <p className="mt-4 text-sm text-[var(--muted-foreground)]">Borrower not found</p>
          <Link href="/borrowers" className="mt-3 text-sm text-[var(--primary)] hover:underline">Back to Borrowers</Link>
        </div>
      </AppShell>
    );
  }

  const totalOutstanding = loanDetails.reduce((sum, l) => sum + l.principalAmountCurrent, 0);
  const activeLoans = loanDetails.filter(l => l.status === 'active' || l.status === 'overdue');

  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Link href="/borrowers" className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] hover:bg-[var(--secondary)]">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-[var(--foreground)]">{borrower.fullName}</h1>
            <p className="text-xs text-[var(--muted-foreground)]">{borrower.id}</p>
          </div>
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-[var(--foreground)]">
                <Phone className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
                {borrower.mobileNumber}
              </div>
              <div className="flex items-center gap-2 text-sm text-[var(--foreground)]">
                <MapPin className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
                {borrower.address}
              </div>
              <div className="flex items-center gap-2 text-sm text-[var(--foreground)]">
                <CreditCard className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
                {borrower.idProofType}: {borrower.idProofNumber}
              </div>
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
          {borrower.notes && (
            <p className="mt-3 text-xs italic text-[var(--muted-foreground)]">{borrower.notes}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-3 text-center">
            <p className="text-[10px] uppercase text-[var(--muted-foreground)]">Active Loans</p>
            <p className="text-xl font-bold text-[var(--foreground)]">{activeLoans.length}</p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-3 text-center">
            <p className="text-[10px] uppercase text-[var(--muted-foreground)]">Outstanding</p>
            <p className="text-xl font-bold text-[var(--primary)]">{formatIndianCurrency(totalOutstanding)}</p>
          </div>
        </div>

        <div>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Loans</h3>
          <div className="space-y-3">
            {loanDetails.length === 0 ? (
              <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 text-center">
                <p className="text-sm text-[var(--muted-foreground)]">No loans found</p>
              </div>
            ) : (
              loanDetails.map(loan => (
                <Link
                  key={loan.id}
                  href={`/loans/${loan.id}`}
                  className="block rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-[var(--foreground)]">{loan.loanNumber}</h4>
                    <StatusChip status={loan.status} />
                    <StatusChip status={loan.riskStatus as RiskStatus} />
                  </div>
                  <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">{loan.commodityName} ({loan.commodityHi})</p>
                  <div className="mt-2 grid grid-cols-3 gap-3">
                    <div>
                      <p className="text-[10px] uppercase text-[var(--muted-foreground)]">Principal</p>
                      <p className="text-sm font-bold text-[var(--foreground)]">{formatIndianCurrency(loan.principalAmountCurrent)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase text-[var(--muted-foreground)]">Exposure</p>
                      <p className={`text-sm font-bold ${loan.riskStatus === 'risky' ? 'text-red-600' : loan.riskStatus === 'warning' ? 'text-amber-600' : 'text-emerald-600'}`}>
                        {loan.exposure.toFixed(1)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase text-[var(--muted-foreground)]">Due</p>
                      <p className={`text-sm font-bold ${loan.status === 'overdue' ? 'text-red-600' : 'text-[var(--foreground)]'}`}>
                        {new Date(loan.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}