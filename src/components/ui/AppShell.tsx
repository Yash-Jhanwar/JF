'use client';

import { ReactNode } from 'react';
import TopBar from './TopBar';
import BottomNav from './BottomNav';
import SidebarNav from './SidebarNav';

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        <SidebarNav />
        <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
          <div className="mx-auto max-w-5xl p-4">
            {children}
          </div>
        </main>
      </div>
      <BottomNav />
    </div>
  );
}