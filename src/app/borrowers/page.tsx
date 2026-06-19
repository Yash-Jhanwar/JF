'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Search, Plus, Phone, MessageCircle } from 'lucide-react';
import AppShell from '@/components/ui/AppShell';
import StatusChip from '@/components/ui/StatusChip';
import { formatIndianCurrency } from '@/lib/finance';
import type { LoanStatus } from '@/types';

interface BorrowerData {
  id: string;
  fullName: string;
  mobileNumber: string;
  whatsappNumber: string;
  address: string;
  notes: string;
}

interface LoanData {
  id: string;
  borrowerId: string;
  principalAmountCurrent: number;
  status: string;
}

type FilterType = 'all' | 'active' | 'overdue';

export default function BorrowersPage() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [allBorrowers, setAllBorrowers] = useState<BorrowerData[]>([]);
  const [allLoans, setAllLoans] = useState<LoanData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [borrowersRes, loansRes] = await Promise.all([
          fetch('/api/borrowers'),
          fetch('/api/loans'),
        ]);
        const [borrowersData, loansData] = await Promise.all([
          borrowersRes.json(),
          loansRes.json(),
        ]);
        setAllBorrowers(borrowersData.data || []);
        setAllLoans(loansData.data || []);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const borrowers = useMemo(() => {
    let list = allBorrowers.map(b => {
      const loans = allLoans.filter(l => l.borrowerId === b.id);
      const activeLoans = loans.filter(l => l.status === 'active' || l.status === 'overdue');
      const totalOutstanding = activeLoans.reduce((sum, l) => sum + l.principalAmountCurrent, 0);
      const hasOverdue = loans.some(l => l.status === 'overdue');

      return { ...b, loans, activeLoans, totalOutstanding, hasOverdue };
    });

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(b => b.fullName.toLowerCase().includes(q) || b.mobileNumber.includes(q));
    }

    if (filter === 'active') {
      list = list.filter(b => b.activeLoans.length > 0);
    } else if (filter === 'overdue') {
      list = list.filter(b => b.hasOverdue);
    }

    return list;
  }, [search, filter, allBorrowers, allLoans]);

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
            <h1 className="text-lg font-bold text-[var(--foreground)]">Borrowers</h1>
            <p className="text-xs text-[var(--muted-foreground)]">{borrowers.length} total</p>
          </div>
          <Link href="/borrowers/new" className="flex items-center gap-1.5 rounded-lg bg-[var(--primary)] px-3 py-2 text-xs font-medium text-white hover:opacity-90 transition-opacity">
            <Plus className="h-3.5 w-3.5" /> Add
          </Link>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <input
            type="text"
            placeholder="Search by name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] py-2.5 pl-9 pr-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
          />
        </div>

        <div className="flex gap-2">
          {(['all', 'active', 'overdue'] as FilterType[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
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
          {borrowers.length === 0 ? (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-8 text-center">
              <p className="text-sm text-[var(--muted-foreground)]">No borrowers found</p>
            </div>
          ) : (
            borrowers.map(borrower => (
              <Link
                key={borrower.id}
                href={`/borrowers/${borrower.id}`}
                className="block rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-[var(--foreground)]">{borrower.fullName}</h3>
                      {borrower.hasOverdue && <StatusChip status="overdue" />}
                      {borrower.activeLoans.length > 0 && !borrower.hasOverdue && <StatusChip status="active" />}
                    </div>
                    <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">{borrower.address}</p>
                  </div>
                  <div className="flex gap-1.5">
                    <a
                      href={`tel:${borrower.mobileNumber}`}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--muted-foreground)] hover:bg-[var(--secondary)]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Phone className="h-3.5 w-3.5" />
                    </a>
                    <a
                      href={`https://wa.me/91${borrower.whatsappNumber}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>

                {borrower.activeLoans.length > 0 && (
                  <div className="mt-3 border-t border-[var(--border)] pt-3">
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <p className="text-[10px] uppercase text-[var(--muted-foreground)]">Loans</p>
                        <p className="text-sm font-bold text-[var(--foreground)]">{borrower.activeLoans.length}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase text-[var(--muted-foreground)]">Outstanding</p>
                        <p className="text-sm font-bold text-[var(--foreground)]">{formatIndianCurrency(borrower.totalOutstanding)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase text-[var(--muted-foreground)]">Status</p>
                        <p className={`text-sm font-bold ${borrower.hasOverdue ? 'text-red-600' : 'text-emerald-600'}`}>
                          {borrower.hasOverdue ? 'Overdue' : 'Current'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {borrower.notes && (
                  <p className="mt-2 text-[11px] italic text-[var(--muted-foreground)]">{borrower.notes}</p>
                )}
              </Link>
            ))
          )}
        </div>
      </div>
    </AppShell>
  );
}