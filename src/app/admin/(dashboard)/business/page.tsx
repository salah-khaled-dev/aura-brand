'use client';

import React, { useEffect } from 'react';
import { create } from 'zustand';
import { businessService } from '@/lib/services/business.service';
import {
  IconTrendingUp, IconPackage, IconReceipt, IconArrowUpRight, IconArrowDownRight,
  IconCurrencyDollar, IconWallet, IconBuildingSkyscraper, IconFileText
} from '@tabler/icons-react';
import { useEventSubscribe } from '@/hooks/useEventBus';
import { adminAr } from '@/lib/i18n/admin-ar';
import { KpiCard } from '@/components/admin/design-system/KpiCard';
import { formatCurrency } from '@/lib/utils/formatters';

interface DashboardState {
  summary: any;
  isLoading: boolean;
  fetchData: () => Promise<void>;
}

const useDashboardStore = create<DashboardState>((set) => ({
  summary: null,
  isLoading: true,
  fetchData: async () => {
    try {
      const summary = await businessService.getFinancialSummary();
      set({ summary, isLoading: false });
    } catch (e) {
      console.error(e);
      set({ isLoading: false });
    }
  }
}));

export default function BusinessDashboardPage() {
  const { summary, isLoading, fetchData } = useDashboardStore();
  const t = adminAr.business.dashboard;

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEventSubscribe('business.changed', fetchData);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[var(--admin-primary)] border-t-transparent" />
      </div>
    );
  }

  if (!summary) return null;

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold text-[var(--admin-text-base)]">{t.title}</h1>
        <p className="text-sm text-[var(--admin-text-subtle)] mt-1">{t.subtitle}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in slide-in-from-bottom-2">
        <KpiCard
          title={t.revenue}
          value={formatCurrency(summary.totalRevenue)}
          icon={<IconTrendingUp />}
          accentColor="emerald"
          trend={{ value: 0, label: "الشهر الحالي", isPositive: true }}
        />
        <KpiCard
          title={t.cogs}
          value={formatCurrency(summary.totalCOGS)}
          icon={<IconPackage />}
          accentColor="yellow"
          trend={{ value: 0, label: "الشهر الحالي", isPositive: false }}
        />
        <KpiCard
          title={t.expenses}
          value={formatCurrency(summary.totalExpenses)}
          icon={<IconReceipt />}
          accentColor="pink"
          trend={{ value: 0, label: "الشهر الحالي", isPositive: false }}
        />
        <KpiCard
          title={t.netProfit}
          value={formatCurrency(summary.netProfit)}
          icon={<IconCurrencyDollar />}
          accentColor="primary"
          trend={{ value: 0, label: "الشهر الحالي", isPositive: (summary.netProfit ?? 0) >= 0 }}
        />
        <KpiCard
          title={t.cashFlow}
          value={formatCurrency(summary.cashFlow)}
          icon={<IconWallet />}
          accentColor="blue"
          trend={{ value: 0, label: "الشهر الحالي", isPositive: (summary.cashFlow ?? 0) >= 0 }}
        />
        <KpiCard
          title={t.assets}
          value={formatCurrency(summary.totalAssets)}
          icon={<IconBuildingSkyscraper />}
          accentColor="indigo"
          trend={{ value: 0, label: "الرصيد الحالي", isPositive: true }}
        />
        <KpiCard
          title={t.liabilities}
          value={formatCurrency(summary.totalLiabilities)}
          icon={<IconFileText />}
          accentColor="pink"
          trend={{ value: 0, label: "الرصيد الحالي", isPositive: false }}
        />
        <KpiCard
          title={t.capital}
          value={formatCurrency(summary.totalCapital)}
          icon={<IconCurrencyDollar />}
          accentColor="purple"
          trend={{ value: 0, label: "لا يوجد تغيير", isPositive: true }}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-in fade-in slide-in-from-bottom-4">
        <div className="bg-[var(--admin-bg-surface)] p-5 rounded-[var(--admin-radius-xl)] border border-[var(--admin-border-base)] shadow-[var(--admin-shadow-sm)]">
          <h3 className="text-[var(--admin-text-subtle)] text-sm font-medium">{t.inventoryValue}</h3>
          <p className="text-2xl font-bold text-[var(--admin-text-base)] mt-2">{formatCurrency(summary.inventoryValue)}</p>
        </div>
        <div className="bg-[var(--admin-bg-surface)] p-5 rounded-[var(--admin-radius-xl)] border border-[var(--admin-border-base)] shadow-[var(--admin-shadow-sm)]">
          <h3 className="text-[var(--admin-text-subtle)] text-sm font-medium">{t.outstandingPayments}</h3>
          <p className="text-2xl font-bold text-[var(--admin-text-base)] mt-2">{formatCurrency(summary.outstandingPayments)}</p>
        </div>
        <div className="bg-[var(--admin-bg-surface)] p-5 rounded-[var(--admin-radius-xl)] border border-[var(--admin-border-base)] shadow-[var(--admin-shadow-sm)]">
          <h3 className="text-[var(--admin-text-subtle)] text-sm font-medium">{t.supplierCount} / {t.purchaseOrders}</h3>
          <p className="text-2xl font-bold text-[var(--admin-text-base)] mt-2">{summary.supplierCount} مورد / {summary.poCount} أمر شراء</p>
        </div>
      </div>
    </div>
  );
}
