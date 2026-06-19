'use client';

import { useState } from 'react';
import { Upload, CheckCircle, XCircle, AlertTriangle, FileImage } from 'lucide-react';
import AppShell from '@/components/ui/AppShell';

interface OcrField {
  key: string;
  label: string;
  value: string;
  confidence: number;
  needsReview: boolean;
}

export default function OcrReviewPage() {
  const [uploaded, setUploaded] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const [fields, setFields] = useState<OcrField[]>([
    { key: 'commodity', label: 'Commodity', value: 'Wheat', confidence: 0.95, needsReview: false },
    { key: 'priceLow', label: 'Price Low', value: '2250', confidence: 0.88, needsReview: false },
    { key: 'priceMedium', label: 'Price Medium', value: '2320', confidence: 0.92, needsReview: false },
    { key: 'priceHigh', label: 'Price High', value: '2380', confidence: 0.85, needsReview: true },
    { key: 'unit', label: 'Unit', value: 'Quintal', confidence: 0.97, needsReview: false },
  ]);

  const handleUpload = () => {
    setProcessing(true);
    setTimeout(() => {
      setProcessing(false);
      setUploaded(true);
    }, 2000);
  };

  const updateField = (key: string, value: string) => {
    setFields(f => f.map(field => field.key === key ? { ...field, value } : field));
  };

  const handleConfirm = () => {
    setConfirmed(true);
  };

  if (confirmed) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center py-16">
          <CheckCircle className="h-16 w-16 text-emerald-500" />
          <h2 className="mt-4 text-lg font-bold text-[var(--foreground)]">Price Saved Successfully</h2>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">Mandi prices have been confirmed and saved.</p>
          <a
            href="/mandi-prices"
            className="mt-6 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            View Mandi Prices
          </a>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-4">
        <div>
          <h1 className="text-lg font-bold text-[var(--foreground)]">OCR Price Review</h1>
          <p className="text-xs text-[var(--muted-foreground)]">Upload Hindi newspaper mandi bhav image</p>
        </div>

        {!uploaded && (
          <div className="rounded-xl border-2 border-dashed border-[var(--border)] bg-[var(--card)] p-8 text-center">
            <FileImage className="mx-auto h-12 w-12 text-[var(--muted-foreground)]" />
            <p className="mt-3 text-sm font-medium text-[var(--foreground)]">Upload Newspaper Image</p>
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">Supports JPG, PNG formats</p>
            <div className="mt-4 flex justify-center gap-3">
              <button
                onClick={handleUpload}
                disabled={processing}
                className="flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                {processing ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Processing OCR...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" /> Upload & Scan
                  </>
                )}
              </button>
              <button className="flex items-center gap-2 rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--secondary)]">
                <FileImage className="h-4 w-4" /> Gallery
              </button>
            </div>
          </div>
        )}

        {uploaded && (
          <>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--secondary)]">
                  <FileImage className="h-6 w-6 text-[var(--muted-foreground)]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[var(--foreground)]">newspaper_mandi_13jun2026.jpg</p>
                  <p className="text-[11px] text-[var(--muted-foreground)]">Hindi newspaper • Mandi Bhav section</p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Extracted Fields</h3>
              <div className="space-y-3">
                {fields.map(field => (
                  <div key={field.key}>
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-[var(--foreground)]">{field.label}</label>
                      <div className="flex items-center gap-2">
                        {field.needsReview && (
                          <span className="flex items-center gap-1 text-[10px] text-amber-600">
                            <AlertTriangle className="h-3 w-3" /> Review
                          </span>
                        )}
                        <span className={`text-[10px] ${field.confidence >= 0.9 ? 'text-emerald-600' : field.confidence >= 0.7 ? 'text-amber-600' : 'text-red-600'}`}>
                          {(field.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                    <input
                      type={field.key.includes('price') ? 'number' : 'text'}
                      value={field.value}
                      onChange={(e) => updateField(field.key, e.target.value)}
                      className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] ${
                        field.needsReview ? 'border-amber-300 bg-amber-50 dark:bg-amber-900/10' : 'border-[var(--border)] bg-[var(--card)]'
                      }`}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Raw OCR Text</h3>
              <pre className="whitespace-pre-wrap rounded-lg bg-[var(--secondary)] p-3 text-[11px] text-[var(--muted-foreground)]">
{`गेहूं (Wheat) - नीमच मंडी
न्यूनतम: ₹2250/क्विंटल
मध्यम: ₹2320/क्विंटल
अधिकतम: ₹2380/क्विंटल
तिथि: 13 जून 2026`}
              </pre>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleConfirm}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-3 text-sm font-medium text-white hover:opacity-90"
              >
                <CheckCircle className="h-4 w-4" /> Confirm & Save
              </button>
              <button
                onClick={() => { setUploaded(false); setProcessing(false); }}
                className="flex items-center justify-center gap-2 rounded-lg border border-[var(--border)] px-4 py-3 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--secondary)]"
              >
                <XCircle className="h-4 w-4" /> Reject
              </button>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}