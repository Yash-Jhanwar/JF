'use client';

import { useState, useMemo, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import AppShell from '@/components/ui/AppShell';
import { formatIndianCurrency, calculateQuarterlyInterest, calculateCurrentExposure, determineRiskStatus } from '@/lib/finance';
import type { LoanStatus } from '@/types';

interface LoanData { id: string; commodityId: string; principalAmountCurrent: number; receiptAmount: number; annualInterestRate: number; tdsApplicable: boolean; tdsRate: number; status: LoanStatus; }
interface CommodityData { id: string; commodityNameEn: string; commodityNameHi: string; }
interface PaymentData { id: string; paymentDate: string; allocatedInterestAmount: number; allocatedPrincipalAmount: number; }

export default function ReportsPage() {
  const [allLoans, setAllLoans] = useState<LoanData[]>([]);
  const [allCommodities, setAllCommodities] = useState<CommodityData[]>([]);
  const [allPayments, setAllPayments] = useState<PaymentData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [loansRes, comRes, payRes] = await Promise.all([
          fetch('/api/loans'),
          fetch('/api/commodities'),
          fetch('/api/payments')
        ]);
        const [loansData, comData, payData] = await Promise.all([
          loansRes.json(), comRes.json(), payRes.json()
        ]);
        setAllLoans(loansData.data || []);
        setAllCommodities(comData.data || []);
        setAllPayments(payData.data || []);
      } catch (error) {
        console.error('Failed to load report data:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const loanDistribution = useMemo(() => {
    const dist: Record<string, number> = {};
    allLoans.forEach(loan => {
      const cmd = allCommodities.find(c => c.id === loan.commodityId);
      const name = cmd?.commodityNameEn || 'Unknown';
      dist[name] = (dist[name] || 0) + loan.principalAmountCurrent;
    });
    return Object.entries(dist).map(([name, value]) => ({ name, value }));
  }, [allLoans, allCommodities]);

  const riskDistribution = useMemo(() => {
    const dist = { safe: 0, warning: 0, risky: 0 };
    allLoans.forEach(loan => {
      const exposure = calculateCurrentExposure(loan.principalAmountCurrent, loan.receiptAmount);
      const status = determineRiskStatus(exposure);
      dist[status]++;
    });
    return [
      { name: 'Safe', value: dist.safe, color: '#16a34a' },
      { name: 'Warning', value: dist.warning, color: '#f59e0b' },
      { name: 'Risky', value: dist.risky, color: '#dc2626' },
    ];
  }, [allLoans]);

  const monthlyInterest = useMemo(() => {
    return allPayments.map(p => ({
      month: new Date(p.paymentDate).toLocaleDateString('en-IN', { month: 'short' }),
      interest: p.allocatedInterestAmount,
      principal: p.allocatedPrincipalAmount,
    }));
  }, [allPayments]);

  const totalLoans = allLoans.length;
  const totalPrincipal = allLoans.reduce((sum, l) => sum + l.principalAmountCurrent, 0);
  const totalInterest = allLoans.reduce((sum, l) => sum + calculateQuarterlyInterest(l.principalAmountCurrent, l.annualInterestRate), 0);
  const totalTds = allLoans.filter(l => l.tdsApplicable).reduce((sum, l) => sum + (calculateQuarterlyInterest(l.principalAmountCurrent, l.annualInterestRate) * l.tdsRate) / 100, 0);

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
          <h1 className="text-lg font-bold text-[var(--foreground)]">Reports</h1>
          <p className="text-xs text-[var(--muted-foreground)]">Analytics and export</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-3 text-center">
            <p className="text-[10px] uppercase text-[var(--muted-foreground)]">Total Loans</p>
            <p className="text-xl font-bold text-[var(--foreground)]">{totalLoans}</p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-3 text-center">
            <p className="text-[10px] uppercase text-[var(--muted-foreground)]">Total Principal</p>
            <p className="text-xl font-bold text-[var(--foreground)]">{formatIndianCurrency(totalPrincipal)}</p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-3 text-center">
            <p className="text-[10px] uppercase text-[var(--muted-foreground)]">Interest Earned</p>
            <p className="text-xl font-bold text-[var(--primary)]">{formatIndianCurrency(totalInterest)}</p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-3 text-center">
            <p className="text-[10px] uppercase text-[var(--muted-foreground)]">TDS Collected</p>
            <p className="text-xl font-bold text-amber-600">{formatIndianCurrency(totalTds)}</p>
          </div>
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Loan Distribution by Commodity</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={loanDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  formatter={(value) => [formatIndianCurrency(Number(value)), 'Amount']}
                />
                <Bar dataKey="value" fill="var(--primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Risk Distribution</h3>
          <div className="flex items-center justify-center">
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={riskDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {riskDistribution.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Payments Received</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyInterest}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  formatter={(value) => [formatIndianCurrency(Number(value)), '']}
                />
                <Bar dataKey="interest" name="Interest" fill="#16a34a" radius={[4, 4, 0, 0]} />
                <Bar dataKey="principal" name="Principal" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="flex gap-3">
          <button className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-[var(--border)] px-4 py-3 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--secondary)]">
            Export PDF
          </button>
          <button className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-3 text-sm font-medium text-white hover:opacity-90">
            Export Excel
          </button>
        </div>
      </div>
    </AppShell>
  );
}