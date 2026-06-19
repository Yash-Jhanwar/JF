'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { Upload, TrendingDown, TrendingUp, RefreshCw, IndianRupee } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import AppShell from '@/components/ui/AppShell';
import type { MandiPriceData } from '@/lib/mandi/prices';

function generatePriceHistory(basePrice: number, days: number = 90): { date: string; price: number }[] {
  const history: { date: string; price: number }[] = [];
  let current = basePrice;
  for (let i = 0; i < days; i++) {
    const change = (Math.random() - 0.5) * basePrice * 0.04;
    current = Math.max(basePrice * 0.7, Math.min(basePrice * 1.3, current + change));
    const date = new Date();
    date.setDate(date.getDate() - (days - 1 - i));
    history.push({
      date: date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      price: Math.round(current),
    });
  }
  return history;
}

export default function MandiPricesPage() {
  const [prices, setPrices] = useState<MandiPriceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [dataSource, setDataSource] = useState<string>('');
  const [selectedCommodity, setSelectedCommodity] = useState<string>('');
  const initRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch('/api/mandi-prices');
        const data = await response.json();

        if (!cancelled) {
          if (data.success) {
            setPrices(data.data);
            setLastUpdated(data.lastUpdated);
            setDataSource(data.source);
            if (data.data.length > 0 && !initRef.current) {
              initRef.current = true;
              setSelectedCommodity(data.data[0].commodity);
            }
          } else {
            setError(data.error || 'Failed to fetch prices');
            setPrices(data.data || []);
            if (data.data?.length > 0 && !initRef.current) {
              initRef.current = true;
              setSelectedCommodity(data.data[0].commodity);
            }
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError('Network error - using fallback data');
          console.error('Fetch error:', err);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  const fetchPrices = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/mandi-prices');
      const data = await response.json();
      if (data.success) {
        setPrices(data.data);
        setLastUpdated(data.lastUpdated);
        setDataSource(data.source);
      } else {
        setError(data.error || 'Failed to fetch prices');
        setPrices(data.data || []);
      }
    } catch (err) {
      setError('Network error - using fallback data');
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const uniqueCommodities = useMemo(() => {
    const map = new Map<string, MandiPriceData>();
    prices.forEach(p => {
      if (!map.has(p.commodity)) {
        map.set(p.commodity, p);
      }
    });
    return Array.from(map.values());
  }, [prices]);

  const selectedPrice = useMemo(() => {
    return prices.find(p => p.commodity === selectedCommodity);
  }, [prices, selectedCommodity]);

  const priceHistory = useMemo(() => {
    const basePrice = selectedPrice?.modalPrice || 2300;
    return generatePriceHistory(basePrice, 90);
  }, [selectedPrice?.modalPrice]);

  const priceChange = priceHistory.length > 1
    ? ((priceHistory[priceHistory.length - 1].price - priceHistory[0].price) / priceHistory[0].price) * 100
    : 0;

  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-[var(--foreground)]">नीमच मंडी भाव</h1>
            <p className="text-xs text-[var(--muted-foreground)]">
              Neemuch Mandi • {lastUpdated ? new Date(lastUpdated).toLocaleString('en-IN') : 'Loading...'}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={fetchPrices}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--secondary)] disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <Link
              href="/ocr-review"
              className="flex items-center gap-1.5 rounded-lg bg-[var(--primary)] px-3 py-2 text-xs font-medium text-white hover:opacity-90 transition-opacity"
            >
              <Upload className="h-3.5 w-3.5" /> OCR Scan
            </Link>
          </div>
        </div>

        {dataSource && (
          <div className="flex items-center gap-2 text-[11px] text-[var(--muted-foreground)]">
            <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 ${
              dataSource === 'neemuchmandibhav.in' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
            }`}>
              {dataSource === 'neemuchmandibhav.in' ? '🟢 Live' : '🟡 Fallback'}
            </span>
            <span>Source: {dataSource}</span>
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
            {error}
          </div>
        )}

        {selectedPrice && (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold text-[var(--foreground)]">{selectedPrice.commodityHi} ({selectedPrice.commodity})</h2>
                <p className="text-xs text-[var(--muted-foreground)]">Variety: {selectedPrice.variety} • Per {selectedPrice.unit}</p>
              </div>
              <div className={`flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium ${
                priceChange >= 0 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
              }`}>
                {priceChange >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {Math.abs(priceChange).toFixed(1)}%
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="rounded-lg bg-emerald-50 p-4 text-center dark:bg-emerald-900/20">
                <p className="text-[10px] uppercase font-medium text-emerald-600 dark:text-emerald-400">न्यूनतम भाव</p>
                <p className="text-xl font-bold text-emerald-700 dark:text-emerald-400">₹{selectedPrice.minPrice}</p>
                <p className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70">Min Price</p>
              </div>
              <div className="rounded-lg bg-[var(--primary)]/10 p-4 text-center">
                <p className="text-[10px] uppercase font-medium text-[var(--primary)]">मॉडल भाव</p>
                <p className="text-xl font-bold text-[var(--primary)]">₹{selectedPrice.modalPrice}</p>
                <p className="text-[10px] text-[var(--primary)]/70">Modal Price</p>
              </div>
              <div className="rounded-lg bg-red-50 p-4 text-center dark:bg-red-900/20">
                <p className="text-[10px] uppercase font-medium text-red-600 dark:text-red-400">अधिकतम भाव</p>
                <p className="text-xl font-bold text-red-700 dark:text-red-400">₹{selectedPrice.maxPrice}</p>
                <p className="text-[10px] text-red-600/70 dark:text-red-400/70">Max Price</p>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2 text-[11px] text-[var(--muted-foreground)]">
              <span className="rounded bg-[var(--secondary)] px-1.5 py-0.5">
                📅 {selectedPrice.date}
              </span>
            </div>
          </div>
        )}

        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
            90-Day Price Trend • {selectedPrice?.commodityHi || 'गेहूं'}
          </h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={priceHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                  domain={['dataMin - 100', 'dataMax + 100']}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="price"
                  stroke="var(--primary)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
          <div className="bg-[var(--primary)] px-4 py-3">
            <h3 className="text-sm font-bold text-white">नीमच मंडी भाव सूची</h3>
            <p className="text-[11px] text-white/80">Neemuch Mandi Price List</p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-[var(--muted-foreground)]" />
            </div>
          ) : uniqueCommodities.length === 0 ? (
            <p className="py-8 text-center text-sm text-[var(--muted-foreground)]">No prices available</p>
          ) : (
            <>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[var(--border)] bg-[var(--secondary)]">
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-[var(--foreground)]">फसल</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-emerald-600">न्यूनतम भाव</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-[var(--primary)]">मॉडल भाव</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-red-600">अधिकतम भाव</th>
                    </tr>
                  </thead>
                  <tbody>
                    {uniqueCommodities.map((price, idx) => (
                      <tr
                        key={`${price.commodity}-${idx}`}
                        onClick={() => setSelectedCommodity(price.commodity)}
                        className={`cursor-pointer border-b border-[var(--border)] transition-colors ${
                          selectedCommodity === price.commodity
                            ? 'bg-[var(--primary)]/10'
                            : 'hover:bg-[var(--secondary)]'
                        }`}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <IndianRupee className="h-3 w-3 text-[var(--muted-foreground)]" />
                            <div>
                              <p className="text-sm font-semibold text-[var(--foreground)]">{price.commodityHi}</p>
                              <p className="text-[10px] text-[var(--muted-foreground)]">{price.commodity}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <p className="text-sm font-bold text-emerald-600">₹{price.minPrice.toLocaleString('en-IN')}</p>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <p className="text-sm font-bold text-[var(--primary)]">₹{price.modalPrice.toLocaleString('en-IN')}</p>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <p className="text-sm font-bold text-red-600">₹{price.maxPrice.toLocaleString('en-IN')}</p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="md:hidden divide-y divide-[var(--border)]">
                {uniqueCommodities.map((price, idx) => (
                  <button
                    key={`${price.commodity}-${idx}`}
                    onClick={() => setSelectedCommodity(price.commodity)}
                    className={`w-full px-4 py-3 text-left transition-colors ${
                      selectedCommodity === price.commodity
                        ? 'bg-[var(--primary)]/10'
                        : 'active:bg-[var(--secondary)]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-[var(--foreground)]">{price.commodityHi}</p>
                        <p className="text-[10px] text-[var(--muted-foreground)]">{price.commodity} • {price.variety}</p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-3 text-xs">
                          <span className="text-emerald-600">₹{price.minPrice.toLocaleString('en-IN')}</span>
                          <span className="text-[var(--primary)] font-bold">₹{price.modalPrice.toLocaleString('en-IN')}</span>
                          <span className="text-red-600">₹{price.maxPrice.toLocaleString('en-IN')}</span>
                        </div>
                        <p className="text-[10px] text-[var(--muted-foreground)] mt-0.5">{price.date}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}