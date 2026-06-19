'use client';

import { ReactNode } from 'react';

interface MetricCardProps {
  label: string;
  value: string;
  icon?: ReactNode;
  trend?: { value: number; isUp: boolean };
  className?: string;
}

export default function MetricCard({ label, value, icon, trend, className = '' }: MetricCardProps) {
  return (
    <div className={`rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm ${className}`}>
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]">{label}</p>
          <p className="mt-1 text-xl font-bold tracking-tight text-[var(--foreground)]">{value}</p>
          {trend && (
            <p className={`mt-1 text-[11px] font-medium ${trend.isUp ? 'text-emerald-600' : 'text-red-600'}`}>
              {trend.isUp ? '↑' : '↓'} {Math.abs(trend.value)}%
            </p>
          )}
        </div>
        {icon && (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--primary)]/10 text-[var(--primary)]">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}