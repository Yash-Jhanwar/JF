'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';
import AppShell from '@/components/ui/AppShell';

export default function NewBorrowerPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    fullName: '',
    mobileNumber: '',
    whatsappNumber: '',
    address: '',
    idProofType: 'Aadhar Card',
    idProofNumber: '',
    notes: '',
  });

  const update = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch('/api/borrowers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      
      if (res.ok) {
        router.push('/borrowers');
      } else {
        console.error('Failed to create borrower');
        setSaving(false);
      }
    } catch (err) {
      console.error('Error saving borrower:', err);
      setSaving(false);
    }
  };

  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Link href="/borrowers" className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] hover:bg-[var(--secondary)]">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-[var(--foreground)]">नया ऋणधारक / New Borrower</h1>
            <p className="text-xs text-[var(--muted-foreground)]">Add a new borrower profile</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 space-y-3">
            <h2 className="text-sm font-semibold text-[var(--foreground)]">Personal Details</h2>
            
            <div>
              <label className="text-xs text-[var(--muted-foreground)]">Full Name *</label>
              <input
                type="text"
                value={form.fullName}
                onChange={e => update('fullName', e.target.value)}
                required
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[var(--muted-foreground)]">Mobile Number *</label>
                <input
                  type="tel"
                  value={form.mobileNumber}
                  onChange={e => update('mobileNumber', e.target.value)}
                  required
                  className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                />
              </div>
              <div>
                <label className="text-xs text-[var(--muted-foreground)]">WhatsApp Number</label>
                <input
                  type="tel"
                  value={form.whatsappNumber}
                  onChange={e => update('whatsappNumber', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-[var(--muted-foreground)]">Address *</label>
              <input
                type="text"
                value={form.address}
                onChange={e => update('address', e.target.value)}
                required
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
              />
            </div>
          </div>

          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 space-y-3">
            <h2 className="text-sm font-semibold text-[var(--foreground)]">ID Proof</h2>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[var(--muted-foreground)]">ID Proof Type</label>
                <select
                  value={form.idProofType}
                  onChange={e => update('idProofType', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                >
                  <option value="Aadhar Card">Aadhar Card</option>
                  <option value="PAN Card">PAN Card</option>
                  <option value="Driving License">Driving License</option>
                  <option value="Voter ID">Voter ID</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-[var(--muted-foreground)]">ID Proof Number</label>
                <input
                  type="text"
                  value={form.idProofNumber}
                  onChange={e => update('idProofNumber', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
            <label className="text-xs text-[var(--muted-foreground)]">Notes</label>
            <textarea
              value={form.notes}
              onChange={e => update('notes', e.target.value)}
              rows={2}
              placeholder="Optional notes..."
              className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
            />
          </div>

          <button
            type="submit"
            disabled={saving || !form.fullName || !form.mobileNumber || !form.address}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--primary)] py-3 text-sm font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save Borrower'}
          </button>
        </form>
      </div>
    </AppShell>
  );
}
