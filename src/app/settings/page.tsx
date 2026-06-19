'use client';

import { useState, useEffect } from 'react';
import { Save, Building, Bell, Globe, Palette, FileText } from 'lucide-react';
import AppShell from '@/components/ui/AppShell';

interface FirmSettings {
  id: string;
  firmName: string;
  defaultLanguage: 'en' | 'hi';
  tdsDefaultEnabled: boolean;
  tdsRateDefault: number;
  reminderDaysBeforeDue: number;
  quarterGraceDaysDefault: number;
  autoRenewDefault: boolean;
  supportedCommodities: string[];
  ocrProvider: string;
}

const defaultSettings: FirmSettings = {
  id: '',
  firmName: '',
  defaultLanguage: 'hi',
  tdsDefaultEnabled: true,
  tdsRateDefault: 10,
  reminderDaysBeforeDue: 3,
  quarterGraceDaysDefault: 3,
  autoRenewDefault: true,
  supportedCommodities: [],
  ocrProvider: 'google-vision',
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<FirmSettings>(defaultSettings);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch('/api/settings');
        const data = await res.json();
        if (data.data) setSettings(data.data);
      } catch (error) {
        console.error('Failed to load settings:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchSettings();
  }, []);

  const handleSave = async () => {
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  };

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
            <h1 className="text-lg font-bold text-[var(--foreground)]">Settings</h1>
            <p className="text-xs text-[var(--muted-foreground)]">Firm configuration and preferences</p>
          </div>
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 rounded-lg bg-[var(--primary)] px-3 py-2 text-xs font-medium text-white hover:opacity-90 transition-opacity"
          >
            <Save className="h-3.5 w-3.5" /> Save
          </button>
        </div>

        {saved && (
          <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">
            Settings saved successfully!
          </div>
        )}

        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
          <div className="flex items-center gap-2 mb-3">
            <Building className="h-4 w-4 text-[var(--primary)]" />
            <h3 className="text-sm font-semibold text-[var(--foreground)]">Firm Profile</h3>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-[var(--foreground)]">Firm Name</label>
              <input
                type="text"
                value={settings.firmName}
                onChange={(e) => setSettings(s => ({ ...s, firmName: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
              />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="h-4 w-4 text-[var(--primary)]" />
            <h3 className="text-sm font-semibold text-[var(--foreground)]">TDS Settings</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-[var(--foreground)]">TDS Default Enabled</label>
              <button
                onClick={() => setSettings(s => ({ ...s, tdsDefaultEnabled: !s.tdsDefaultEnabled }))}
                className={`relative h-6 w-11 rounded-full transition-colors ${settings.tdsDefaultEnabled ? 'bg-[var(--primary)]' : 'bg-gray-300'}`}
              >
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${settings.tdsDefaultEnabled ? 'translate-x-5.5' : 'translate-x-0.5'}`} />
              </button>
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--foreground)]">Default TDS Rate (%)</label>
              <input
                type="number"
                value={settings.tdsRateDefault}
                onChange={(e) => setSettings(s => ({ ...s, tdsRateDefault: Number(e.target.value) }))}
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
              />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
          <div className="flex items-center gap-2 mb-3">
            <Bell className="h-4 w-4 text-[var(--primary)]" />
            <h3 className="text-sm font-semibold text-[var(--foreground)]">Reminder Settings</h3>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-[var(--foreground)]">Days Before Due Reminder</label>
              <input
                type="number"
                value={settings.reminderDaysBeforeDue}
                onChange={(e) => setSettings(s => ({ ...s, reminderDaysBeforeDue: Number(e.target.value) }))}
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--foreground)]">Quarter Grace Days</label>
              <input
                type="number"
                value={settings.quarterGraceDaysDefault}
                onChange={(e) => setSettings(s => ({ ...s, quarterGraceDaysDefault: Number(e.target.value) }))}
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
              />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
          <div className="flex items-center gap-2 mb-3">
            <Globe className="h-4 w-4 text-[var(--primary)]" />
            <h3 className="text-sm font-semibold text-[var(--foreground)]">Language</h3>
          </div>
          <div className="flex gap-2">
            {(['en', 'hi'] as const).map(lang => (
              <button
                key={lang}
                onClick={() => setSettings(s => ({ ...s, defaultLanguage: lang }))}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  settings.defaultLanguage === lang
                    ? 'bg-[var(--primary)] text-white'
                    : 'border border-[var(--border)] text-[var(--muted-foreground)] hover:bg-[var(--secondary)]'
                }`}
              >
                {lang === 'en' ? 'English' : 'हिन्दी'}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
          <div className="flex items-center gap-2 mb-3">
            <Palette className="h-4 w-4 text-[var(--primary)]" />
            <h3 className="text-sm font-semibold text-[var(--foreground)]">Supported Commodities</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {settings.supportedCommodities.map(c => (
              <span key={c} className="rounded-lg bg-[var(--secondary)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)]">
                {c}
              </span>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}