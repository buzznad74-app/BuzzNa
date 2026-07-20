import React, { useEffect, useState } from 'react';
import { db } from '../lib/db';
import { Product, SalesTransaction } from '../types';
import { useAuth } from '../context/AuthContext';
import { PlayCircle, BarChart2, RefreshCcw } from 'lucide-react';

export const Dashboard: React.FC<{ addToast: (text: string, type: 'success' | 'error') => void }> = ({ addToast }) => {
  const { activeBusiness, businessSettings } = useAuth();

  // Local state: compact KPI values
  const [productsCount, setProductsCount] = useState<number>(0);
  const [customersCount, setCustomersCount] = useState<number>(0);
  const [todaysSalesCount, setTodaysSalesCount] = useState<number>(0);
  const [grossSales, setGrossSales] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiForecast, setAiForecast] = useState<string | null>(null);

  const primaryColor = (businessSettings && businessSettings.brandColor) ? businessSettings.brandColor : '#2563EB';

  // Fetch core dashboard data from local IndexedDB (works offline)
  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      const products = await db.getAll<Product>('products');
      setProductsCount(products.filter(p => p.tenantId === activeBusiness?.tenantId).length);

      const customers = await db.getAll('customers');
      setCustomersCount(customers.filter((c: any) => c.tenantId === activeBusiness?.tenantId).length);

      const sales = await db.getAll<SalesTransaction>('sales_transactions');
      const tenantSales = sales.filter(s => s.tenantId === activeBusiness?.tenantId);

      // Compute today's sales (local timezone)
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const todaySales = tenantSales.filter(s => new Date(s.createdAt) >= startOfDay);
      setTodaysSalesCount(todaySales.length);

      const gross = tenantSales.reduce((sum, s) => sum + (s.grossTotal || 0), 0);
      setGrossSales(gross);

      setLoading(false);
    } catch (err: any) {
      setLoading(false);
      addToast('Failed to load dashboard data.', 'error');
      console.error('[Dashboard] fetch error:', err);
    }
  };

  // Create payload and call server-side forecasting endpoint
  const generateAIForecast = async () => {
    try {
      setAiLoading(true);
      addToast('Generating AI forecast — this may take a few seconds.', 'success');

      // Gather payload from local DB (offline-first)
      const products = await db.getAll<Product>('products');
      const sales = await db.getAll<SalesTransaction>('sales_transactions');

      const payload = {
        products: products.filter(p => p.tenantId === activeBusiness?.tenantId),
        sales: sales.filter(s => s.tenantId === activeBusiness?.tenantId).slice(-50),
        industry: activeBusiness?.industry || 'Retail'
      };

      // If offline, persist pending request and inform user
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        localStorage.setItem('pending_forecast_request', JSON.stringify(payload));
        addToast('Offline: forecast queued. It will run when you are back online.', 'info');
        setAiLoading(false);
        return;
      }

      // Send to server /api/gemini/forecast - server returns { forecast: string }
      const res = await fetch('/api/gemini/forecast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || 'Forecast call failed');
      }

      const data = await res.json();
      const forecastText = data?.forecast || data?.message || 'No forecast returned.';
      setAiForecast(forecastText);
      addToast('AI forecast generated.', 'success');
      setAiLoading(false);
    } catch (err: any) {
      setAiLoading(false);
      addToast('AI forecast failed.', 'error');
      console.error('[Dashboard] AI forecast error:', err);
    }
  };

  // Retry pending forecast when connection restored
  useEffect(() => {
    const tryPendingForecast = async () => {
      try {
        const pending = localStorage.getItem('pending_forecast_request');
        if (!pending) return;
        if (typeof navigator !== 'undefined' && !navigator.onLine) return;

        const payload = JSON.parse(pending);
        addToast('Processing queued forecast now you are online.', 'info');

        const res = await fetch('/api/gemini/forecast', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          const data = await res.json();
          setAiForecast(data?.forecast || null);
          localStorage.removeItem('pending_forecast_request');
          addToast('Queued forecast processed successfully.', 'success');
        } else {
          const txt = await res.text();
          console.warn('[Dashboard] queued forecast failed:', txt);
        }
      } catch (err) {
        console.warn('[Dashboard] retry pending forecast error:', err);
      }
    };

    const handleOnline = () => {
      tryPendingForecast();
    };

    window.addEventListener('online', handleOnline);
    tryPendingForecast();

    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [activeBusiness]);

  useEffect(() => {
    fetchDashboardData();
    const unsub = db.subscribe(fetchDashboardData);
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBusiness]);

  return (
    <div className="p-3 md:p-4">
      <div className="border-b pb-3 mb-3">
        <h2 className="text-sm font-extrabold uppercase tracking-tight" style={{ color: primaryColor }}>
          Dashboard
        </h2>
        <p className="text-xs text-zinc-500 mt-1">Overview & quick actions</p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 mb-3">
        <div className="bg-white rounded-xl p-3 shadow-sm border border-zinc-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase text-zinc-500">Products</p>
              <p className="text-sm font-bold">{loading ? '—' : productsCount}</p>
            </div>
            <div className="bg-blue-50 rounded p-2">
              <BarChart2 className="w-4 h-4 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-3 shadow-sm border border-zinc-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase text-zinc-500">Customers</p>
              <p className="text-sm font-bold">{loading ? '—' : customersCount}</p>
            </div>
            <div className="bg-blue-50 rounded p-2">
              <PlayCircle className="w-4 h-4 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-3 shadow-sm border border-zinc-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase text-zinc-500">Today's Tx</p>
              <p className="text-sm font-bold">{loading ? '—' : todaysSalesCount}</p>
            </div>
            <div className="bg-blue-50 rounded p-2">
              <RefreshCcw className="w-4 h-4 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-3 shadow-sm border border-zinc-100">
          <div>
            <p className="text-[10px] uppercase text-zinc-500">Gross Sales</p>
            <p className="text-sm font-bold">{loading ? '—' : `KES ${grossSales.toLocaleString()}`}</p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="bg-white rounded-xl p-3 shadow-sm border border-zinc-100">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold">AI Forecast & Recommendations</h3>
            <button
              className="text-xs px-3 py-1 rounded-md bg-blue-600 text-white shadow-sm"
              style={{ background: primaryColor }}
              onClick={() => generateAIForecast()}
              disabled={aiLoading}
            >
              {aiLoading ? 'Generating…' : 'Run Forecast'}
            </button>
          </div>

          {aiForecast ? (
            <div className="text-xs text-zinc-700 whitespace-pre-line">{aiForecast}</div>
          ) : (
            <p className="text-[12px] text-zinc-500">Run an AI forecast to receive actionable insights on replenishment, pricing and trends.</p>
          )}
        </div>

        <div className="bg-white rounded-xl p-3 shadow-sm border border-zinc-100">
          <h4 className="text-xs font-bold mb-2">Quick Actions</h4>
          <div className="flex gap-2">
            <button
              className="text-xs px-3 py-1 rounded-md bg-white border border-blue-200 text-blue-700 shadow-sm"
              onClick={() => { fetchDashboardData(); addToast('Dashboard refreshed.', 'success'); }}
            >
              Refresh
            </button>
            <button
              className="text-xs px-3 py-1 rounded-md bg-white border border-blue-200 text-blue-700 shadow-sm"
              onClick={() => { setAiForecast(null); addToast('AI forecast cleared.', 'info'); }}
            >
              Clear Forecast
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
