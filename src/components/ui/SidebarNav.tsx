'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { LayoutDashboard, Users, IndianRupee, BarChart3, Settings, ScanLine, Receipt, FileText } from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/borrowers', label: 'Borrowers', icon: Users },
  { href: '/loans', label: 'Loans', icon: IndianRupee },
  { href: '/mandi-prices', label: 'Mandi Prices', icon: BarChart3 },
  { href: '/ocr-review', label: 'OCR Review', icon: ScanLine },
  { href: '/bills', label: 'Bills', icon: Receipt },
  { href: '/interest', label: 'Interest', icon: IndianRupee },
  { href: '/reports', label: 'Reports', icon: FileText },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export default function SidebarNav() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex w-56 shrink-0 flex-col border-r border-[var(--border)] bg-[var(--card)]">
      <div className="flex flex-col gap-1 p-3 flex-1">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-[var(--primary)]/10 text-[var(--primary)]'
                  : 'text-[var(--muted-foreground)] hover:bg-[var(--secondary)] hover:text-[var(--foreground)]'
              }`}
            >
              <item.icon className={`h-4 w-4 ${isActive ? 'text-[var(--primary)]' : ''}`} />
              {item.label}
            </Link>
          );
        })}
      </div>
    </aside>
  );
}