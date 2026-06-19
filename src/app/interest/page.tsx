'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Search, IndianRupee, ArrowRight, AlertTriangle } from 'lucide-react';
import AppShell from '@/components/ui/AppShell';
import StatusChip from '@/components/ui/StatusChip';
import { formatIndianCurrency, calculateQuarterlyInterest } from '@/lib/finance';
import type { LoanStatus } from '@/types';

interface LoanData {
  id: string;
  loanNumber: string;
  borrowerId: string;
  commodityId: string;
  principalAmountInitial: number;
  principalAmountCurrent: number;
  annualInterestRate: number;
  nextRolloverDate: string;
  status: LoanStatus;
}

interface BorrowerData {
  id: string;
  fullName: string;
  mobileNumber: string;
}

type FilterType = 'all' | 'overdue' | 'due_soon';

export default function InterestDashboardPage() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [allLoans, setAllLoans] = useState<LoanData[]>([]);
  const [borrowers, setBorrowers] = useState<BorrowerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [loansRes, borrowersRes] = await Promise.all([
        fetch('/api/loans'),
        fetch('/api/borrowers'),
      ]);
      const [loansData, borrowersData] = await Promise.all([
        loansRes.json(),
        borrowersRes.json(),
      ]);
      setAllLoans(loansData.data?.filter((l: LoanData) => l.status === 'active') || []);
      setBorrowers(borrowersData.data || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  }

  const loans = useMemo(() => {
    let list = allLoans.map(loan => {
      const borrower = borrowers.find(b => b.id === loan.borrowerId);
      const quarterlyInterest = calculateQuarterlyInterest(loan.principalAmountCurrent, loan.annualInterestRate);
      const daysUntilNextQuarter = Math.ceil((new Date(loan.nextRolloverDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      const capitalizedInterest = loan.principalAmountCurrent - loan.principalAmountInitial;

      return {
        ...loan,
        borrowerName: borrower?.fullName || 'Unknown',
        mobileNumber: borrower?.mobileNumber || '',
        quarterlyInterest,
        daysUntilNextQuarter,
        capitalizedInterest
      };
    });

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(l =>
        l.loanNumber.toLowerCase().includes(q) ||
        l.borrowerName.toLowerCase().includes(q)
      );
    }

    if (filter === 'overdue') {
      list = list.filter(l => l.daysUntilNextQuarter <= 0);
    } else if (filter === 'due_soon') {
      list = list.filter(l => l.daysUntilNextQuarter > 0 && l.daysUntilNextQuarter <= 14);
    }

    // Sort by most urgent first
    list.sort((a, b) => a.daysUntilNextQuarter - b.daysUntilNextQuarter);

    return list;
  }, [search, filter, allLoans, borrowers]);

  const handleAction = async (loanId: string, action: 'paid' | 'capitalize', amount: number) => {
    if (!confirm(`Are you sure you want to ${action === 'paid' ? 'mark this interest as paid' : 'capitalize this interest into the principal'}?`)) return;
    
    setProcessingId(loanId);
    try {
      const res = await fetch(`/api/loans/${loanId}/interest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, amount })
      });
      if (res.ok) {
        // Refresh data
        await fetchData();
      } else {
        alert('Failed to process interest');
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred');
    } finally {
      setProcessingId(null);
    }
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-[var(--foreground)]">Interest Tracker</h1>
            <p className="text-xs text-[var(--muted-foreground)]">Manage and collect pending interest</p>
          </div>
          <div className="rounded-full bg-[var(--primary)]/10 p-2 text-[var(--primary)]">
            <IndianRupee className="h-5 w-5" />
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <input
            type="text"
            placeholder="Search by name or loan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] py-2.5 pl-9 pr-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setFilter('all')}
            className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${filter === 'all' ? 'bg-[var(--primary)] text-white' : 'border border-[var(--border)] text-[var(--muted-foreground)] hover:bg-[var(--secondary)]'}`}
          >
            All Active
          </button>
          <button
            onClick={() => setFilter('overdue')}
            className={`shrink-0 flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${filter === 'overdue' ? 'bg-red-600 text-white' : 'border border-red-200 text-red-600 hover:bg-red-50'}`}
          >
            <AlertTriangle className="h-3 w-3" /> Overdue
          </button>
          <button
            onClick={() => setFilter('due_soon')}
            className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${filter === 'due_soon' ? 'bg-amber-500 text-white' : 'border border-amber-200 text-amber-600 hover:bg-amber-50'}`}
          >
            Due in 14 days
          </button>
        </div>

        <div className="space-y-3">
          {loans.length === 0 ? (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-8 text-center">
              <p className="text-sm text-[var(--muted-foreground)]">No active loans found matching criteria.</p>
            </div>
          ) : (
            loans.map(loan => (
              <div key={loan.id} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <Link href={`/loans/${loan.id}`} className="hover:underline">
                      <h3 className="text-sm font-bold text-[var(--foreground)]">{loan.borrowerName}</h3>
                    </Link>
                    <p className="text-[11px] text-[var(--muted-foreground)]">{loan.loanNumber} • {loan.mobileNumber}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${loan.daysUntilNextQuarter <= 0 ? 'text-red-600' : loan.daysUntilNextQuarter <= 14 ? 'text-amber-600' : 'text-[var(--foreground)]'}`}>
                      {loan.daysUntilNextQuarter <= 0 ? 'Overdue' : `Due in ${loan.daysUntilNextQuarter}d`}
                    </p>
                    <p className="text-[10px] text-[var(--muted-foreground)]">
                      {new Date(loan.nextRolloverDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                </div>

                <div className="mb-3 grid grid-cols-3 gap-2 rounded-lg bg-[var(--secondary)] p-2">
                  <div>
                    <p className="text-[9px] uppercase text-[var(--muted-foreground)]">Initial</p>
                    <p className="text-xs font-medium text-[var(--foreground)]">{formatIndianCurrency(loan.principalAmountInitial)}</p>
                  </div>
                  <div className="text-center border-x border-[var(--border)]">
                    <p className="text-[9px] uppercase text-[var(--muted-foreground)]">+ Added</p>
                    <p className="text-xs font-medium text-amber-600">{formatIndianCurrency(loan.capitalizedInterest)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] uppercase text-[var(--muted-foreground)]">Current</p>
                    <p className="text-xs font-bold text-[var(--primary)]">{formatIndianCurrency(loan.principalAmountCurrent)}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] uppercase text-[var(--muted-foreground)]">Pending Interest</p>
                    <p className="text-sm font-bold text-[var(--foreground)]">{formatIndianCurrency(loan.quarterlyInterest)}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAction(loan.id, 'paid', loan.quarterlyInterest)}
                      disabled={processingId === loan.id}
                      className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                    >
                      {processingId === loan.id ? '...' : 'Mark Paid'}
                    </button>
                    <button
                      onClick={() => handleAction(loan.id, 'capitalize', loan.quarterlyInterest)}
                      disabled={processingId === loan.id}
                      className="rounded-lg bg-[var(--primary)] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-colors"
                    >
                      {processingId === loan.id ? '...' : 'Capitalize'}
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </AppShell>
  );
}
