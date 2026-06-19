'use client';

import { Moon, Sun, Bell } from 'lucide-react';
import { useTheme } from './ThemeProvider';

export default function TopBar() {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--card)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--card)]/80">
      <div className="flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--primary)] text-[14px] font-bold text-white">
            JF
          </div>
          <div className="hidden sm:block">
            <h1 className="text-sm font-bold text-[var(--foreground)]">Jhanwar Finance</h1>
            <p className="text-[10px] text-[var(--muted-foreground)]">Mandi Finance Manager</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--muted-foreground)] hover:bg-[var(--secondary)] hover:text-[var(--foreground)] transition-colors"
            aria-label="Toggle theme"
          >
            {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </button>
          <button
            className="relative flex h-9 w-9 items-center justify-center rounded-lg text-[var(--muted-foreground)] hover:bg-[var(--secondary)] hover:text-[var(--foreground)] transition-colors"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />
          </button>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--primary)]/10 text-[11px] font-bold text-[var(--primary)]">
            RJ
          </div>
        </div>
      </div>
    </header>
  );
}