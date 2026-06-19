'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { LayoutDashboard, Users, IndianRupee, BarChart3, Settings } from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', labelHi: 'डैशबोर्ड', icon: LayoutDashboard },
  { href: '/borrowers', label: 'Borrowers', labelHi: 'ऋणी', icon: Users },
  { href: '/loans', label: 'Loans', labelHi: 'ऋण', icon: IndianRupee },
  { href: '/reports', label: 'Reports', labelHi: 'रिपोर्ट', icon: BarChart3 },
  { href: '/interest', label: 'Interest', labelHi: 'ब्याज', icon: IndianRupee },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-[var(--border)] bg-[var(--card)] safe-area-bottom md:hidden">
      <div className="flex items-center justify-around py-1">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 px-3 py-2 text-[10px] font-medium transition-colors ${
                isActive
                  ? 'text-[var(--primary)]'
                  : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
              }`}
            >
              <item.icon className={`h-5 w-5 ${isActive ? 'text-[var(--primary)]' : ''}`} />
              <span>{item.labelHi}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}