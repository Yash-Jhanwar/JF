'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Upload, Camera, FileImage, X, Plus } from 'lucide-react';
import Link from 'next/link';
import AppShell from '@/components/ui/AppShell';

interface BorrowerData { id: string; fullName: string; mobileNumber: string; address: string; idProofType: string; idProofNumber: string; }
interface CommodityData { id: string; commodityNameEn: string; commodityNameHi: string; unit: string; }
interface BrokerData { id: string; name: string; }

export default function NewLoanPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const receiptInputRef = useRef<HTMLInputElement>(null);
  const agreementInputRef = useRef<HTMLInputElement>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [agreementPreview, setAgreementPreview] = useState<string | null>(null);
  const [form, setForm] = useState({
    borrowerId: '',
    brokerId: '',
    commodityId: '',
    principalAmount: '',
    sanctionedAmount: '',
    receiptAmount: '',
    annualInterestRate: '18',
    interestCycleMonths: '3',
    startDate: new Date().toISOString().split('T')[0],
    graceDays: '3',
    autoRenew: true,
    tdsApplicable: true,
    tdsRate: '10',
    notes: '',
  });

  const [borrowers, setBorrowers] = useState<BorrowerData[]>([]);
  const [commodities, setCommodities] = useState<CommodityData[]>([]);
  const [brokers, setBrokers] = useState<BrokerData[]>([]);
  const [loansCount, setLoansCount] = useState(0);
  const [loadingData, setLoadingData] = useState(true);

  // New Borrower Modal State
  const [showBorrowerModal, setShowBorrowerModal] = useState(false);
  const [savingBorrower, setSavingBorrower] = useState(false);
  const [newBorrowerForm, setNewBorrowerForm] = useState({
    fullName: '',
    mobileNumber: '',
    address: '',
  });

  useEffect(() => {
    async function fetchData() {
      try {
        const [borRes, comRes, broRes, loanRes] = await Promise.all([
          fetch('/api/borrowers'),
          fetch('/api/commodities'),
          fetch('/api/brokers'),
          fetch('/api/loans')
        ]);
        const [borData, comData, broData, loanData] = await Promise.all([
          borRes.json(), comRes.json(), broRes.json(), loanRes.json()
        ]);
        setBorrowers(borData.data || []);
        setCommodities(comData.data || []);
        setBrokers(broData.data || []);
        setLoansCount((loanData.data || []).length);
      } catch (err) {
        console.error('Failed to load form dependencies:', err);
      } finally {
        setLoadingData(false);
      }
    }
    fetchData();
  }, []);

  const update = (field: string, value: string | boolean) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (type: 'receipt' | 'agreement', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      if (type === 'receipt') {
        setReceiptPreview(reader.result as string);
      } else {
        setAgreementPreview(reader.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const removeFile = (type: 'receipt' | 'agreement') => {
    if (type === 'receipt') {
      setReceiptPreview(null);
      if (receiptInputRef.current) receiptInputRef.current.value = '';
    } else {
      setAgreementPreview(null);
      if (agreementInputRef.current) agreementInputRef.current.value = '';
    }
  };

  const selectedBorrower = borrowers.find(b => b.id === form.borrowerId);
  const selectedCommodity = commodities.find(c => c.id === form.commodityId);

  const principalNum = parseFloat(form.principalAmount) || 0;
  const receiptNum = parseFloat(form.receiptAmount) || 0;
  const exposure = receiptNum > 0 ? ((principalNum / receiptNum) * 100).toFixed(1) : '0';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const loanNumber = `LF-2026-${String(loansCount + 1).padStart(3, '0')}`;
    const startDate = new Date(form.startDate);
    const dueDate = new Date(startDate);
    dueDate.setMonth(dueDate.getMonth() + parseInt(form.interestCycleMonths));

    const newLoan = {
      loanNumber,
      borrowerId: form.borrowerId,
      brokerId: form.brokerId || undefined,
      commodityId: form.commodityId,
      principalAmountInitial: principalNum,
      principalAmountCurrent: principalNum,
      sanctionedAmount: parseFloat(form.sanctionedAmount) || principalNum,
      receiptAmount: receiptNum,
      annualInterestRate: parseFloat(form.annualInterestRate),
      interestCycleMonths: parseInt(form.interestCycleMonths),
      startDate: startDate.toISOString(),
      nextRolloverDate: dueDate.toISOString(),
      dueDate: dueDate.toISOString(),
      graceRuleMode: 'allow_grace',
      graceDays: parseInt(form.graceDays),
      autoRenewEnabled: form.autoRenew,
      tdsApplicable: form.tdsApplicable,
      tdsRate: parseFloat(form.tdsRate),
      status: 'active',
      notes: form.notes,
      receiptFileUrl: receiptPreview || '',
      agreementPhotoUrl: agreementPreview || '',
    };

    try {
      const res = await fetch('/api/loans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLoan)
      });
      if (res.ok) {
        router.push('/loans');
      } else {
        console.error('Failed to save loan');
        setSaving(false);
      }
    } catch (err) {
      console.error('Error saving loan:', err);
      setSaving(false);
    }
  };

  const handleSaveNewBorrower = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingBorrower(true);
    try {
      const res = await fetch('/api/borrowers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newBorrowerForm,
          whatsappNumber: newBorrowerForm.mobileNumber,
          idProofType: 'Aadhar Card',
          idProofNumber: '',
          notes: ''
        })
      });
      if (res.ok) {
        const data = await res.json();
        const newBorrower = data.data;
        setBorrowers(prev => [...prev, newBorrower]);
        setForm(prev => ({ ...prev, borrowerId: newBorrower.id }));
        setShowBorrowerModal(false);
        setNewBorrowerForm({ fullName: '', mobileNumber: '', address: '' });
      } else {
        console.error('Failed to create borrower');
      }
    } catch (err) {
      console.error('Error creating borrower:', err);
    } finally {
      setSavingBorrower(false);
    }
  };

  if (loadingData) {
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
        <div className="flex items-center gap-3">
          <Link href="/loans" className="rounded-lg p-1.5 hover:bg-[var(--secondary)] transition-colors">
            <ArrowLeft className="h-5 w-5 text-[var(--foreground)]" />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-[var(--foreground)]">नया लोन / New Loan</h1>
            <p className="text-xs text-[var(--muted-foreground)]">Create a new loan entry</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Borrower */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 space-y-3">
            <h2 className="text-sm font-semibold text-[var(--foreground)]">Borrower Details</h2>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-[var(--muted-foreground)]">Borrower *</label>
                <button 
                  type="button" 
                  onClick={() => setShowBorrowerModal(true)}
                  className="flex items-center gap-1 text-xs font-medium text-[var(--primary)] hover:underline"
                >
                  <Plus className="h-3 w-3" /> Add New
                </button>
              </div>
              <select
                value={form.borrowerId}
                onChange={e => update('borrowerId', e.target.value)}
                required
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
              >
                <option value="">Select borrower...</option>
                {borrowers.map(b => (
                  <option key={b.id} value={b.id}>{b.fullName} ({b.mobileNumber})</option>
                ))}
              </select>
            </div>
            {selectedBorrower && (
              <div className="rounded-lg bg-[var(--secondary)] p-3 text-xs text-[var(--muted-foreground)]">
                {selectedBorrower.address} • {selectedBorrower.idProofType}: {selectedBorrower.idProofNumber}
              </div>
            )}
            <div>
              <label className="text-xs text-[var(--muted-foreground)]">Broker</label>
              <select
                value={form.brokerId}
                onChange={e => update('brokerId', e.target.value)}
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
              >
                <option value="">None</option>
                {brokers.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Loan Details */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 space-y-3">
            <h2 className="text-sm font-semibold text-[var(--foreground)]">Loan Details</h2>
            <div>
              <label className="text-xs text-[var(--muted-foreground)]">Commodity *</label>
              <select
                value={form.commodityId}
                onChange={e => update('commodityId', e.target.value)}
                required
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
              >
                <option value="">Select commodity...</option>
                {commodities.map(c => (
                  <option key={c.id} value={c.id}>{c.commodityNameEn} ({c.commodityNameHi})</option>
                ))}
              </select>
            </div>
            {selectedCommodity && (
              <div className="rounded-lg bg-[var(--secondary)] p-3 text-xs text-[var(--muted-foreground)]">
                Unit: {selectedCommodity.unit}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[var(--muted-foreground)]">Principal Amount *</label>
                <input
                  type="number"
                  value={form.principalAmount}
                  onChange={e => update('principalAmount', e.target.value)}
                  required
                  placeholder="e.g. 300000"
                  className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                />
              </div>
              <div>
                <label className="text-xs text-[var(--muted-foreground)]">Sanctioned Amount</label>
                <input
                  type="number"
                  value={form.sanctionedAmount}
                  onChange={e => update('sanctionedAmount', e.target.value)}
                  placeholder="Same as principal"
                  className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-[var(--muted-foreground)]">Receipt Amount (Warehouse Receipt Value) *</label>
              <input
                type="number"
                value={form.receiptAmount}
                onChange={e => update('receiptAmount', e.target.value)}
                required
                placeholder="e.g. 500000"
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
              />
            </div>
            {principalNum > 0 && receiptNum > 0 && (
              <div className="rounded-lg bg-[var(--secondary)] p-3 flex items-center justify-between">
                <span className="text-xs text-[var(--muted-foreground)]">Exposure</span>
                <span className={`text-sm font-bold ${parseFloat(exposure) > 80 ? 'text-red-600' : parseFloat(exposure) > 60 ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {exposure}%
                </span>
              </div>
            )}
          </div>

          {/* Document Uploads */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 space-y-3">
            <h2 className="text-sm font-semibold text-[var(--foreground)]">दस्तावेज़ / Documents</h2>

            {/* Warehouse Receipt Photo */}
            <div>
              <label className="text-xs text-[var(--muted-foreground)]">वेयरहाउस रसीद फोटो / Warehouse Receipt Photo *</label>
              <input
                type="file"
                accept="image/*"
                ref={receiptInputRef}
                onChange={e => handleFileChange('receipt', e)}
                className="hidden"
              />
              {receiptPreview ? (
                <div className="relative mt-1 rounded-lg border border-[var(--border)] overflow-hidden">
                  <img src={receiptPreview} alt="Warehouse Receipt" className="w-full h-40 object-cover" />
                  <button
                    type="button"
                    onClick={() => removeFile('receipt')}
                    className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-red-600 text-white hover:bg-red-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                    <p className="text-[10px] text-white flex items-center gap-1">
                      <FileImage className="h-3 w-3" /> Receipt uploaded
                    </p>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => receiptInputRef.current?.click()}
                  className="mt-1 flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-[var(--border)] bg-[var(--secondary)] py-6 text-[var(--muted-foreground)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors"
                >
                  <Camera className="h-6 w-6" />
                  <div className="text-center">
                    <p className="text-xs font-medium">Upload Receipt Photo</p>
                    <p className="text-[10px]">Tap to take photo or choose from gallery</p>
                  </div>
                </button>
              )}
            </div>

            {/* Agreement Photo */}
            <div>
              <label className="text-xs text-[var(--muted-foreground)]">समझौता फोटो / Agreement Photo *</label>
              <input
                type="file"
                accept="image/*"
                ref={agreementInputRef}
                onChange={e => handleFileChange('agreement', e)}
                className="hidden"
              />
              {agreementPreview ? (
                <div className="relative mt-1 rounded-lg border border-[var(--border)] overflow-hidden">
                  <img src={agreementPreview} alt="Agreement" className="w-full h-40 object-cover" />
                  <button
                    type="button"
                    onClick={() => removeFile('agreement')}
                    className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-red-600 text-white hover:bg-red-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                    <p className="text-[10px] text-white flex items-center gap-1">
                      <FileImage className="h-3 w-3" /> Agreement uploaded
                    </p>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => agreementInputRef.current?.click()}
                  className="mt-1 flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-[var(--border)] bg-[var(--secondary)] py-6 text-[var(--muted-foreground)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors"
                >
                  <Upload className="h-6 w-6" />
                  <div className="text-center">
                    <p className="text-xs font-medium">Upload Agreement Photo</p>
                    <p className="text-[10px]">Tap to take photo or choose from gallery</p>
                  </div>
                </button>
              )}
            </div>
          </div>

          {/* Interest */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 space-y-3">
            <h2 className="text-sm font-semibold text-[var(--foreground)]">Interest Settings</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[var(--muted-foreground)]">Annual Interest Rate (%)</label>
                <input
                  type="number"
                  value={form.annualInterestRate}
                  onChange={e => update('annualInterestRate', e.target.value)}
                  step="0.5"
                  className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                />
              </div>
              <div>
                <label className="text-xs text-[var(--muted-foreground)]">Cycle (months)</label>
                <select
                  value={form.interestCycleMonths}
                  onChange={e => update('interestCycleMonths', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                >
                  <option value="1">1 month</option>
                  <option value="3">3 months (quarterly)</option>
                  <option value="6">6 months</option>
                  <option value="12">12 months</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs text-[var(--muted-foreground)]">Start Date *</label>
              <input
                type="date"
                value={form.startDate}
                onChange={e => update('startDate', e.target.value)}
                required
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
              />
            </div>
          </div>

          {/* TDS & Grace */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 space-y-3">
            <h2 className="text-sm font-semibold text-[var(--foreground)]">TDS & Grace</h2>
            <div className="flex items-center justify-between">
              <label className="text-xs text-[var(--muted-foreground)]">TDS Applicable</label>
              <button
                type="button"
                role="switch"
                aria-checked={form.tdsApplicable}
                onClick={() => update('tdsApplicable', !form.tdsApplicable)}
                className={`relative h-6 w-11 cursor-pointer rounded-full transition-colors duration-200 ${form.tdsApplicable ? 'bg-[var(--primary)]' : 'bg-[var(--border)]'}`}
              >
                <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${form.tdsApplicable ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>
            {form.tdsApplicable && (
              <div>
                <label className="text-xs text-[var(--muted-foreground)]">TDS Rate (%)</label>
                <input
                  type="number"
                  value={form.tdsRate}
                  onChange={e => update('tdsRate', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                />
              </div>
            )}
            <div>
              <label className="text-xs text-[var(--muted-foreground)]">Grace Days</label>
              <input
                type="number"
                value={form.graceDays}
                onChange={e => update('graceDays', e.target.value)}
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-xs text-[var(--muted-foreground)]">Auto-Renew</label>
              <button
                type="button"
                role="switch"
                aria-checked={form.autoRenew}
                onClick={() => update('autoRenew', !form.autoRenew)}
                className={`relative h-6 w-11 cursor-pointer rounded-full transition-colors duration-200 ${form.autoRenew ? 'bg-[var(--primary)]' : 'bg-[var(--border)]'}`}
              >
                <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${form.autoRenew ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>
          </div>

          {/* Notes */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
            <label className="text-xs text-[var(--muted-foreground)]">Notes</label>
            <textarea
              value={form.notes}
              onChange={e => update('notes', e.target.value)}
              rows={2}
              placeholder="Optional notes..."
              className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={saving || !form.borrowerId || !form.commodityId || !form.principalAmount || !form.receiptAmount}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--primary)] py-3 text-sm font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Creating...' : 'Create Loan'}
          </button>
        </form>
      </div>

      {/* New Borrower Modal */}
      {showBorrowerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-[var(--background)] shadow-xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-[var(--border)] p-4 bg-[var(--card)]">
              <h3 className="text-sm font-bold text-[var(--foreground)]">Quick Add Borrower</h3>
              <button 
                onClick={() => setShowBorrowerModal(false)}
                className="rounded-full p-1 text-[var(--muted-foreground)] hover:bg-[var(--secondary)] transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSaveNewBorrower} className="p-4 space-y-3">
              <div>
                <label className="text-xs text-[var(--muted-foreground)]">Full Name *</label>
                <input
                  type="text"
                  required
                  value={newBorrowerForm.fullName}
                  onChange={e => setNewBorrowerForm(prev => ({ ...prev, fullName: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                />
              </div>
              <div>
                <label className="text-xs text-[var(--muted-foreground)]">Mobile Number *</label>
                <input
                  type="tel"
                  required
                  value={newBorrowerForm.mobileNumber}
                  onChange={e => setNewBorrowerForm(prev => ({ ...prev, mobileNumber: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                />
              </div>
              <div>
                <label className="text-xs text-[var(--muted-foreground)]">Address *</label>
                <input
                  type="text"
                  required
                  value={newBorrowerForm.address}
                  onChange={e => setNewBorrowerForm(prev => ({ ...prev, address: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                />
              </div>
              <button
                type="submit"
                disabled={savingBorrower || !newBorrowerForm.fullName || !newBorrowerForm.mobileNumber || !newBorrowerForm.address}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--primary)] py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {savingBorrower ? 'Saving...' : 'Save & Select'}
              </button>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
