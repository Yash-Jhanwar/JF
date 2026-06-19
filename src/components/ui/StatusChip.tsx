'use client';

import { LoanStatus, RiskStatus } from '@/types';

interface StatusChipProps {
  status: LoanStatus | RiskStatus;
  size?: 'sm' | 'md';
}

const statusStyles: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  due: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  overdue: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  closed: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
  renewed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  safe: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  warning: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  risky: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

const sizeStyles = {
  sm: 'px-2 py-0.5 text-[10px]',
  md: 'px-2.5 py-1 text-xs',
};

export default function StatusChip({ status, size = 'sm' }: StatusChipProps) {
  const label = status.charAt(0).toUpperCase() + status.slice(1);
  return (
    <span className={`inline-flex items-center rounded-full font-medium ${statusStyles[status] || 'bg-gray-100 text-gray-800'} ${sizeStyles[size]}`}>
      {label}
    </span>
  );
}