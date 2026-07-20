import React, { useEffect, useMemo, useState } from 'react';
import { db } from '../lib/db';
import { Product, SalesTransaction } from '../types';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../hooks/useI18n';
import { useTheme } from '../hooks/useTheme';
import { hasRole } from '../lib/rbac';
import { apiClient } from '../lib/apiClient';
import { PlayCircle, BarChart2, RefreshCcw, DollarSign, Sparkles } from 'lucide-react';

type Toast = (text: string, type: 'success' | 'error' | 'info') => void;

export const Dashboard: React.FC<{ addToast: Toast }> = ({ addToast }) => {
  const { activeBusiness, businessSettings, currentUser } = useAuth();
  const { t, dir } = useI18n();
  const { theme, primaryColor } = useTheme();

  const brand = primaryColor
    || (businessSettings && (businessSettings as any).brandColor)
    || '#2563EB';
  const currency = (activeBusiness as any)?.currency || 'KES';

  // KPI state
  const [productsCount, setProductsCount] = useState(0);
  const [customersCount, setCustomersCount] = useState(0);
  const [todaysSalesCount, setTodaysSalesCount] = useState(0);
  const [grossSales, setGrossSales] = useState(0);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiForecast, setAiForecast] = useState<string | null>(null);

  // RBAC (Owner/Manager/Cashier)
  const canRunAI = hasRole(currentUser, 'owner', 'manager');
  const canRefresh = hasRole(currentUser, 'owner', 'manager', 'cashier');

  // ---- Offline-first load (preserved) ----
  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      const products = await db.getAll<Product>('products');
      setProductsCount(products.filter(p => p.tenantId === activeBusiness?.tenantId).length);

      const customers = await db.getAll('customers');
      setCustomersCount(customers.filter((c: any) => c.tenantId === activeBusiness?.tenantId).length);

      const sales = await db.getAll<SalesTransaction>('sales_transactions');
      const tenantSales = sales.filter(s => s.tenantId === activeBusiness?.tenantId);

      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const todaySales = tenantSales.filter(s => new Date(s.createdAt) >= startOfDay);
      setTodaysSalesCount(todaySales.length);

      const gross = tenantSales.reduce((sum, s) => sum + (s.grossTotal || 0), 0);
      setGrossSales(gross);

      // Activation milestone mailer (fires once per tenant when first tx recorded)
      if (
        tenantSales.length > 0 &&
        activeBusiness?.tenantId &&
        !localStorage.getItem(`activation_mail_sent_${activeBusiness.tenantId}`)
      ) {
        localStorage.setItem(`activation_mail_sent_${activeBusiness.tenantId}`, '1');
        apiClient.post('/api/mail/activation', {
          to: (activeBusiness as any).ownerEmail,
          template: 'first_sale',
          locale: (businessSettings as any)?.language || 'en',
          theme: { primary: brand, mode: theme },
          data: {
            tenantId: activeBusiness.tenantId,
            legalName: (activeBusiness as any).legalName,
          },
        }).catch(() => { /* non-fatal */ });
      }
    } catch (err: any) {
      addToast(t('dashboard.err.load', 'Failed to load dashboard data.'), 'error');
      console.error('[Dashboard] fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  // ---- AI forecast (preserved offline queue + RBAC gate) ----
  const generateAIForecast = async () => {
    if (!canRunAI) {
      addToast(t('rbac.err.forecast', 'You do not have permission to run AI forecasts.'), 'error');
      return;
    }
    try {
      setAiLoading(true);
      addToast(t('dashboard.ai.starting', 'Generating AI forecast — this may take a few seconds.'), 'info');

      const products = await db.getAll<Product>('products');
      const sales = await db.getAll<SalesTransaction>('sales_transactions');
      const payload = {
        products: products.filter(p => p.tenantId === activeBusiness?.tenantId),
        sales: sales.filter(s => s.tenantId === activeBusiness?.tenantId).slice(-50),
        industry: activeBusiness?.industry || 'Retail',
        tenantId: activeBusiness?.tenantId,
        locale: (businessSettings as any)?.language || 'en',
      };

      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        localStorage.setItem('pending_forecast_request', JSON.stringify(payload));
        addToast(t('dashboard.ai.queued', 'Offline: forecast queued. It will run when you are back online.'), 'info');
        setAiLoading(false);
        return;
      }

      const res = await fetch('/api/gemini/forecast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || 'Forecast call failed');
      }
      const data = await res.json();
      setAiForecast(data?.forecast || data?.message || t('dashboard.ai.empty', 'No forecast returned.'));
      addToast(t('dashboard.ai.ok', 'AI forecast generated.'), 'success');
    } catch (err: any) {
      addToast(t('dashboard.ai.err', 'AI forecast failed.'), 'error');
      console.error('[Dashboard] AI forecast error:', err);
    } finally {
      setAiLoading(false);
    }
  };

  // ---- Retry queued forecast on reconnect (preserved) ----
  useEffect(() => {
    const tryPendingForecast = async () => {
      try {
        const pending = localStorage.getItem('pending_forecast_request');
        if (!pending) return;
        if (typeof navigator !== 'undefined' && !navigator.onLine) return;

        const payload = JSON.parse(pending);
        addToast(t('dashboard.ai.retry', 'Processing queued forecast now you are online.'), 'info');

        const res = await fetch('/api/gemini/forecast', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const data = await res.json();
          setAiForecast(data?.forecast || null);
          localStorage.removeItem('pending_forecast_request');
          addToast(t('dashboard.ai.retryOk', 'Queued forecast processed successfully.'), 'success');
        } else {
          console.warn('[Dashboard] queued forecast failed:', await res.text());
        }
      } catch (err) {
        console.warn('[Dashboard] retry pending forecast error:', err);
      }
    };

    // Retry queued welcome email (from Auth flow)
    const tryPendingWelcome = async () => {
      const pending = localStorage.getItem('pending_welcome_email');
      if (!pending || (typeof navigator !== 'undefined' && !navigator.onLine)) return;
      try {
        await apiClient.post('/api/mail/welcome', JSON.parse(pending));
        localStorage.removeItem('pending_welcome_email');
      } catch { /* keep queued */ }
    };

    const handleOnline = () => { tryPendingForecast(); tryPendingWelcome(); };
    window.addEventListener('online', handleOnline);
    tryPendingForecast(); tryPendingWelcome();

    return () => window.removeEventListener('online', handleOnline);
  }, [activeBusiness, t]);

  // ---- Live IndexedDB subscription (preserved) ----
  useEffect(() => {
    fetchDashboardData();
    const unsub = db.subscribe(fetchDashboardData);
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBusiness]);

  const kpis = useMemo(() => ([
    { key: 'products',  label: t('kpi.products',  'Products'),   value: loading ? '—' : productsCount,        Icon: BarChart2 },
    { key: 'customers', label: t('kpi.customers', 'Customers'),  value: loading ? '—' : customersCount,       Icon: PlayCircle },
    { key: 'today',     label: t('kpi.todaysTx',  "Today's Tx"), value: loading ? '—' : todaysSalesCount,     Icon: RefreshCcw },
    { key: 'gross',     label: t('kpi.gross',     'Gross Sales'),
      value: loading ? '—' : `${currency} ${grossSales.toLocaleString()}`, Icon: DollarSign },
  ]), [loading, productsCount, customersCount, todaysSalesCount, grossSales, currency, t]);

  const cardCls =
    'rounded-lg p-2.5 shadow-sm border transition-colors ' +
    'bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800';

  return (
    <div dir={dir} className="p-2 md:p-3" style={{ ['--brand' as any]: brand }}>
      <div className="border-b border-zinc-200 dark:border-zinc-800 pb-2 mb-3">
        <h2 className="text-sm font-extrabold uppercase tracking-tight" style={{ color: 'var(--brand)' }}>
          {t('dashboard.title', 'Dashboard')}
        </h2>
        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
          {t('dashboard.subtitle', 'Overview & quick actions')}
        </p>
      </div>

      {/* KPI grid — compact, 2 cols mobile, 4 cols desktop */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 mb-3">
        {kpis.map(({ key, label, value, Icon }) => (
          <div key={key} className={cardCls}>
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[10px] uppercase text-zinc-500 dark:text-zinc-400 truncate">{label}</p>
                <p className="text-sm font-bold truncate text-zinc-900 dark:text-zinc-100">{value}</p>
              </div>
              <div className="rounded-md p-1.5" style={{ background: 'color-mix(in oklab, var(--brand) 12%, transparent)' }}>
                <Icon className="w-4 h-4" style={{ color: 'var(--brand)' }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        {/* AI Forecast */}
        <div className={cardCls}>
          <div className="flex items-center justify-between gap-2 mb-2">
            <h3 className="text-xs font-bold flex items-center gap-1.5 text-zinc-900 dark:text-zinc-100">
              <Sparkles className="w-3.5 h-3.5" style={{ color: 'var(--brand)' }} />
              {t('dashboard.ai.title', 'AI Forecast & Recommendations')}
            </h3>
            <button
              className="text-[11px] px-2.5 py-1 rounded-md text-white shadow-sm disabled:opacity-60"
              style={{ background: 'var(--brand)' }}
              onClick={generateAIForecast}
              disabled={aiLoading || !canRunAI}
              title={!canRunAI ? t('rbac.err.forecast', 'You do not have permission to run AI forecasts.') : ''}
            >
              {aiLoading ? t('dashboard.ai.running', 'Generating…') : t('dashboard.ai.run', 'Run Forecast')}
            </button>
          </div>

          {aiForecast ? (
            <div className="text-[12px] text-zinc-700 dark:text-zinc-300 whitespace-pre-line">{aiForecast}</div>
          ) : (
            <p className="text-[12px] text-zinc-500 dark:text-zinc-400">
              {t('dashboard.ai.hint', 'Run an AI forecast to receive actionable insights on replenishment, pricing and trends.')}
            </p>
          )}
        </div>

        {/* Quick Actions */}
        <div className={cardCls}>
          <h4 className="text-xs font-bold mb-2 text-zinc-900 dark:text-zinc-100">
            {t('dashboard.quick.title', 'Quick Actions')}
          </h4>
          <div className="flex flex-wrap gap-2">
            <button
              className="text-[11px] px-2.5 py-1 rounded-md shadow-sm border transition
                         bg-white dark:bg-zinc-900
                         text-[color:var(--brand)]
                         border-[color:var(--brand)]/30
                         hover:bg-[color:var(--brand)]/10"
              onClick={() => {
                if (!canRefresh) {
                  addToast(t('rbac.err.refresh', 'You do not have permission to refresh.'), 'error');
                  return;
                }
                fetchDashboardData();
                addToast(t('dashboard.quick.refreshed', 'Dashboard refreshed.'), 'success');
              }}
            >
              {t('dashboard.quick.refresh', 'Refresh')}
            </button>
            <button
              className="text-[11px] px-2.5 py-1 rounded-md shadow-sm border transition
                         bg-white dark:bg-zinc-900
                         text-[color:var(--brand)]
                         border-[color:var(--brand)]/30
                         hover:bg-[color:var(--brand)]/10"
              onClick={() => { setAiForecast(null); addToast(t('dashboard.quick.cleared', 'AI forecast cleared.'), 'info'); }}
            >
              {t('dashboard.quick.clear', 'Clear Forecast')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
