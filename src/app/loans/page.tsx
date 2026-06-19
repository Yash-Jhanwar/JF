'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Search, Plus } from 'lucide-react';
import AppShell from '@/components/ui/AppShell';
import StatusChip from '@/components/ui/StatusChip';
import MiniPriceChart from '@/components/charts/MiniPriceChart';
import { generatePriceHistory } from '@/lib/mock/data';
import { formatIndianCurrency, calculateQuarterlyInterest, calculateCurrentExposure, determineRiskStatus } from '@/lib/finance';
import type { LoanStatus } from '@/types';

interface LoanData {
  id: string;
  loanNumber: string;
  borrowerId: string;
  commodityId: string;
  principalAmountCurrent: number;
  annualInterestRate: number;
  receiptAmount: number;
  nextRolloverDate: string;
  dueDate: string;
  status: LoanStatus;
  tdsApplicable: boolean;
  tdsRate: number;
  graceRuleMode: string;
  graceDays: number;
}

interface BorrowerData {
  id: string;
  fullName: string;
}

interface CommodityData {
  id: string;
  commodityNameEn: string;
  commodityNameHi: string;
}

type FilterType = 'all' | 'active' | 'overdue' | 'due';

export default function LoansPage() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [allLoans, setAllLoans] = useState<LoanData[]>([]);
  const [borrowers, setBorrowers] = useState<BorrowerData[]>([]);
  const [commodities, setCommodities] = useState<CommodityData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [loansRes, borrowersRes, commoditiesRes] = await Promise.all([
          fetch('/api/loans'),
          fetch('/api/borrowers'),
          fetch('/api/commodities'),
        ]);
        const [loansData, borrowersData, commoditiesData] = await Promise.all([
          loansRes.json(),
          borrowersRes.json(),
          commoditiesRes.json(),
        ]);
        setAllLoans(loansData.data || []);
        setBorrowers(borrowersData.data || []);
        setCommodities(commoditiesData.data || []);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const loans = useMemo(() => {
    let list = allLoans.map(loan => {
      const borrower = borrowers.find(b => b.id === loan.borrowerId);
      const commodity = commodities.find(c => c.id === loan.commodityId);
      const exposure = calculateCurrentExposure(loan.principalAmountCurrent, loan.receiptAmount);
      const riskStatus = determineRiskStatus(exposure);
      const quarterlyInterest = calculateQuarterlyInterest(loan.principalAmountCurrent, loan.annualInterestRate);
      const priceHistory = generatePriceHistory(2300, 30);

      return {
        ...loan,
        borrowerName: borrower?.fullName || 'Unknown',
        commodityName: commodity?.commodityNameEn || 'Unknown',
        commodityHi: commodity?.commodityNameHi || '',
        exposure,
        riskStatus,
        quarterlyInterest,
        priceHistory,
      };
    });

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(l =>
        l.loanNumber.toLowerCase().includes(q) ||
        l.borrowerName.toLowerCase().includes(q) ||
        l.commodityName.toLowerCase().includes(q)
      );
    }

    if (filter === 'active') {
      list = list.filter(l => l.status === 'active');
    } else if (filter === 'overdue') {
      list = list.filter(l => l.status === 'overdue');
    } else if (filter === 'due') {
      list = list.filter(l => {
        const days = Math.ceil((new Date(l.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
        return days <= 30 && days > 0;
      });
    }

    return list;
  }, [search, filter, allLoans, borrowers, commodities]);

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
            <h1 className="text-lg font-bold text-[var(--foreground)]">Loans</h1>
            <p className="text-xs text-[var(--muted-foreground)]">{loans.length} loans</p>
          </div>
          <Link href="/loans/new" className="flex items-center gap-1.5 rounded-lg bg-[var(--primary)] px-3 py-2 text-xs font-medium text-white hover:opacity-90 transition-opacity">
            <Plus className="h-3.5 w-3.5" /> New Loan
          </Link>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <input
            type="text"
            placeholder="Search loans..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] py-2.5 pl-9 pr-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto">
          {(['all', 'active', 'overdue', 'due'] as FilterType[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === f
                  ? 'bg-[var(--primary)] text-white'
                  : 'border border-[var(--border)] text-[var(--muted-foreground)] hover:bg-[var(--secondary)]'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {loans.length === 0 ? (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-8 text-center">
              <p className="text-sm text-[var(--muted-foreground)]">No loans found</p>
            </div>
          ) : (
            loans.map(loan => (
              <Link
                key={loan.id}
                href={`/loans/${loan.id}`}
                className="block rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-semibold text-[var(--foreground)]">{loan.borrowerName}</h3>
                      <StatusChip status={loan.status} />
                      <StatusChip status={loan.riskStatus} />
                    </div>
                    <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">
                      {loan.commodityName} ({loan.commodityHi}) • {loan.loanNumber}
                    </p>
                  </div>
                  <div className="shrink-0 w-20">
                    <MiniPriceChart data={loan.priceHistory} />
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div>
                    <p className="text-[10px] uppercase text-[var(--muted-foreground)]">Principal</p>
                    <p className="text-sm font-bold text-[var(--foreground)]">{formatIndianCurrency(loan.principalAmountCurrent)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-[var(--muted-foreground)]">Quarterly Interest</p>
                    <p className="text-sm font-bold text-[var(--foreground)]">{formatIndianCurrency(loan.quarterlyInterest)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-[var(--muted-foreground)]">Next Qtr Due</p>
                    <p className={`text-sm font-bold ${loan.status === 'overdue' ? 'text-red-600' : 'text-[var(--foreground)]'}`}>
                      {new Date(loan.nextRolloverDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-[var(--muted-foreground)]">Full Settlement</p>
                    <p className="text-sm font-bold text-[var(--foreground)]">
                      {new Date(loan.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-2 text-[11px]">
                  <span className="text-[var(--muted-foreground)]">Exposure: {loan.exposure.toFixed(1)}%</span>
                  <span className="text-[var(--muted-foreground)]">•</span>
                  <span className="text-[var(--muted-foreground)]">Rate: {loan.annualInterestRate}% p.a.</span>
                  <span className="text-[var(--muted-foreground)]">•</span>
                  <span className="text-[var(--muted-foreground)]">TDS: {loan.tdsApplicable ? `${loan.tdsRate}%` : 'N/A'}</span>
                  <span className="text-[var(--muted-foreground)]">•</span>
                  <span className="text-[var(--muted-foreground)]">Grace: {loan.graceRuleMode === 'allow_grace' ? `${loan.graceDays}d` : 'None'}</span>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </AppShell>
  );
}