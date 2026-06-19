'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { IndianRupee, TrendingUp, ArrowUpRight, FileText } from 'lucide-react';
import AppShell from '@/components/ui/AppShell';
import MetricCard from '@/components/ui/MetricCard';
import StatusChip from '@/components/ui/StatusChip';
import MiniPriceChart from '@/components/charts/MiniPriceChart';
import DonutChart from '@/components/charts/DonutChart';
import { generatePriceHistory } from '@/lib/mock/data';
import { formatIndianCurrency, calculateQuarterlyInterest, calculateCurrentExposure, determineRiskStatus } from '@/lib/finance';
import type { LoanStatus, RiskStatus } from '@/types';

interface DashboardMetrics {
  totalActiveLoans: number;
  totalDueAmount: number;
  totalInterestEarned: number;
  totalTds: number;
  safeLoans: number;
  warningLoans: number;
  riskyLoans: number;
}

interface LoanData {
  id: string;
  loanNumber: string;
  borrowerId: string;
  commodityId: string;
  principalAmountCurrent: number;
  annualInterestRate: number;
  receiptAmount: number;
  dueDate: string;
  status: LoanStatus;
  tdsApplicable: boolean;
  tdsRate: number;
}

interface BorrowerData {
  id: string;
  fullName: string;
  whatsappNumber: string;
}

interface CommodityData {
  id: string;
  commodityNameEn: string;
  commodityNameHi: string;
}

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loans, setLoans] = useState<LoanData[]>([]);
  const [borrowers, setBorrowers] = useState<BorrowerData[]>([]);
  const [commodities, setCommodities] = useState<CommodityData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [metricsRes, loansRes, borrowersRes, commoditiesRes] = await Promise.all([
          fetch('/api/dashboard/metrics'),
          fetch('/api/loans'),
          fetch('/api/borrowers'),
          fetch('/api/commodities'),
        ]);

        const [metricsData, loansData, borrowersData, commoditiesData] = await Promise.all([
          metricsRes.json(),
          loansRes.json(),
          borrowersRes.json(),
          commoditiesRes.json(),
        ]);

        setMetrics(metricsData.data);
        setLoans(loansData.data || []);
        setBorrowers(borrowersData.data || []);
        setCommodities(commoditiesData.data || []);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const loanCards = useMemo(() => {
    return loans.map(loan => {
      const borrower = borrowers.find(b => b.id === loan.borrowerId);
      const commodity = commodities.find(c => c.id === loan.commodityId);
      const exposure = calculateCurrentExposure(loan.principalAmountCurrent, loan.receiptAmount);
      const riskStatus = determineRiskStatus(exposure);
      const priceHistory = generatePriceHistory(2300, 30);

      return {
        ...loan,
        borrowerName: borrower?.fullName || 'Unknown',
        commodityName: commodity?.commodityNameEn || 'Unknown',
        commodityHi: commodity?.commodityNameHi || '',
        exposure,
        riskStatus,
        priceHistory,
        whatsappNumber: borrower?.whatsappNumber || '',
      };
    });
  }, [loans, borrowers, commodities]);

  const safeCount = metrics?.safeLoans ?? 0;
  const warningCount = metrics?.warningLoans ?? 0;
  const riskyCount = metrics?.riskyLoans ?? 0;

  const dueSoonLoans = loanCards.filter(l => {
    const daysUntilDue = Math.ceil((new Date(l.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilDue <= 30 && daysUntilDue > 0;
  });

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
      <div className="space-y-5">
        <div>
          <h1 className="text-lg font-bold text-[var(--foreground)]">Dashboard</h1>
          <p className="text-xs text-[var(--muted-foreground)]">{new Date().toLocaleDateString('hi-IN', { day: 'numeric', month: 'long', year: 'numeric' })} • Jhanwar Finance Services</p>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <MetricCard
            label="Active Loans"
            value={String(metrics?.totalActiveLoans ?? 0)}
            icon={<IndianRupee className="h-4 w-4" />}
          />
          <MetricCard
            label="Interest Due"
            value={formatIndianCurrency(metrics?.totalDueAmount ?? 0)}
            icon={<TrendingUp className="h-4 w-4" />}
          />
          <MetricCard
            label="Interest Earned"
            value={formatIndianCurrency(metrics?.totalInterestEarned ?? 0)}
            icon={<ArrowUpRight className="h-4 w-4" />}
          />
          <MetricCard
            label="TDS Total"
            value={formatIndianCurrency(metrics?.totalTds ?? 0)}
            icon={<FileText className="h-4 w-4" />}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Risk Distribution</h3>
            <DonutChart
              data={[
                { label: 'Safe', value: safeCount, color: '#16a34a' },
                { label: 'Warning', value: warningCount, color: '#f59e0b' },
                { label: 'Risky', value: riskyCount, color: '#dc2626' },
              ]}
            />
          </div>

          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 lg:col-span-2">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Upcoming Due</h3>
            {dueSoonLoans.length === 0 ? (
              <p className="py-4 text-center text-sm text-[var(--muted-foreground)]">No upcoming dues</p>
            ) : (
              <div className="space-y-2">
                {dueSoonLoans.map(loan => (
                  <div key={loan.id} className="flex items-center justify-between rounded-lg border border-[var(--border)] px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-[var(--foreground)]">{loan.borrowerName}</p>
                      <p className="text-[11px] text-[var(--muted-foreground)]">{loan.commodityName} • {loan.loanNumber}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-[var(--foreground)]">
                        {formatIndianCurrency(calculateQuarterlyInterest(loan.principalAmountCurrent, loan.annualInterestRate))}
                      </p>
                      <p className="text-[10px] text-[var(--muted-foreground)]">
                        Due {new Date(loan.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Active Loans</h3>
            <Link href="/loans" className="text-[11px] font-medium text-[var(--primary)] hover:underline">View All</Link>
          </div>
          <div className="space-y-3">
            {loanCards.map(loan => (
              <div key={loan.id} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="truncate text-sm font-semibold text-[var(--foreground)]">{loan.borrowerName}</h4>
                      <StatusChip status={loan.status as LoanStatus} />
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

                <div className="mt-3 grid grid-cols-3 gap-3">
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
                    <p className="text-[10px] uppercase text-[var(--muted-foreground)]">Due Date</p>
                    <p className={`text-sm font-bold ${loan.status === 'overdue' ? 'text-red-600' : 'text-[var(--foreground)]'}`}>
                      {new Date(loan.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <Link
                    href={`/loans/${loan.id}`}
                    className="flex items-center gap-1 rounded-lg border border-[var(--border)] px-3 py-1.5 text-[11px] font-medium text-[var(--foreground)] hover:bg-[var(--secondary)] transition-colors"
                  >
                    View
                  </Link>
                  <Link
                    href={`/bills?loanId=${loan.id}`}
                    className="flex items-center gap-1 rounded-lg border border-[var(--border)] px-3 py-1.5 text-[11px] font-medium text-[var(--foreground)] hover:bg-[var(--secondary)] transition-colors"
                  >
                    <FileText className="h-3 w-3" /> Bill
                  </Link>
                  <a
                    href={`https://wa.me/91${loan.whatsappNumber}?text=${encodeURIComponent(`Hello ${loan.borrowerName}, your loan ${loan.loanNumber} is due.`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-[11px] font-medium text-white hover:bg-emerald-700 transition-colors"
                  >
                    WhatsApp
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}