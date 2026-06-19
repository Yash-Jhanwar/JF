'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard');
  }, [router]);

  return (
    <div className="flex flex-1 items-center justify-center min-h-screen">
      <div className="flex items-center gap-2 text-[var(--muted-foreground)]">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent" />
        <span className="text-sm">Loading...</span>
      </div>
    </div>
  );
}