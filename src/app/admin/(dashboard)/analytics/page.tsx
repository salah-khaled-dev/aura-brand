"use client";

import React, { useState, useEffect } from 'react';
import { adminAr } from '@/lib/i18n/admin-ar';
import { AnalyticsService, AnalyticsSummary, RevenueData, TopProduct, DeviceData } from '@/lib/services/analytics.service';
import { formatCurrency } from '@/lib/utils/formatters';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

// SaaS UI Components
import { PageHeader, Skeleton } from '@/components/admin/design-system/Layout';
import { Card } from '@/components/admin/design-system/Card';

// Tabler Icons
import { 
  IconTrendingUp, 
  IconTrendingDown, 
  IconCurrencyDollar, 
  IconShoppingCart, 
  IconUsers, 
  IconActivity 
} from '@tabler/icons-react';

const COLORS = ['var(--admin-primary)', 'var(--admin-success)', 'var(--admin-warning)', 'var(--admin-danger)'];

export default function AnalyticsPage() {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [deviceData, setDeviceData] = useState<DeviceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month');

  const loadData = async () => {
    setLoading(true);
    try {
      const [sum, rev, top, dev] = await Promise.all([
        AnalyticsService.getSummary(),
        AnalyticsService.getRevenueData(period),
        AnalyticsService.getTopProducts(),
        AnalyticsService.getDeviceData()
      ]);
      setSummary(sum);
      setRevenueData(rev);
      setTopProducts(top);
      setDeviceData(dev);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [period]);

  const renderTrend = (value: number) => {
    const isPositive = value >= 0;
    return (
      <span className={`text-xs font-semibold flex items-center gap-1 tabular-nums ${isPositive ? 'text-[var(--admin-success)]' : 'text-[var(--admin-danger)]'}`}>
        {isPositive ? <IconTrendingUp size={14} /> : <IconTrendingDown size={14} />}
        {Math.abs(value)}%
      </span>
    );
  };

  if (loading || !summary) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between mb-8">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-72" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-32 rounded-[var(--admin-radius-xl)]" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="lg:col-span-2 h-96 rounded-[var(--admin-radius-xl)]" />
          <Skeleton className="h-96 rounded-[var(--admin-radius-xl)]" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20">
      <PageHeader 
        title={adminAr.analytics.title}
        description={adminAr.analytics.subtitle}
        actions={
          <select 
            value={period}
            onChange={(e) => setPeriod(e.target.value as any)}
            className="px-4 py-2 bg-[var(--admin-bg-base)] border border-[var(--admin-border-base)] rounded-[var(--admin-radius-md)] text-sm outline-none focus:border-[var(--admin-primary)] focus:ring-1 focus:ring-[var(--admin-primary)] font-medium text-[var(--admin-text-base)] shadow-[var(--admin-shadow-sm)]"
          >
            <option value="week">{adminAr.analytics.period.week}</option>
            <option value="month">{adminAr.analytics.period.month}</option>
            <option value="year">{adminAr.analytics.period.year}</option>
          </select>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[var(--admin-text-muted)] text-sm font-semibold">{adminAr.analytics.totalRevenue}</h3>
            <div className="w-10 h-10 bg-[var(--admin-info)]/10 text-[var(--admin-info)] rounded-full flex items-center justify-center">
              <IconCurrencyDollar size={20} />
            </div>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-2xl font-bold text-[var(--admin-text-base)] tabular-nums">{formatCurrency(summary.totalRevenue)}</p>
            </div>
            {renderTrend(summary.revenueGrowth)}
          </div>
        </Card>

        <Card className="p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[var(--admin-text-muted)] text-sm font-semibold">{adminAr.analytics.totalOrders}</h3>
            <div className="w-10 h-10 bg-[var(--admin-success)]/10 text-[var(--admin-success)] rounded-full flex items-center justify-center">
              <IconShoppingCart size={20} />
            </div>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-2xl font-bold text-[var(--admin-text-base)] tabular-nums">{summary.totalOrders.toLocaleString('en-US')}</p>
            </div>
            {renderTrend(summary.ordersGrowth)}
          </div>
        </Card>

        <Card className="p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[var(--admin-text-muted)] text-sm font-semibold">{adminAr.analytics.totalCustomers}</h3>
            <div className="w-10 h-10 bg-[var(--admin-primary-muted)] text-[var(--admin-primary)] rounded-full flex items-center justify-center">
              <IconUsers size={20} />
            </div>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-2xl font-bold text-[var(--admin-text-base)] tabular-nums">{summary.totalCustomers.toLocaleString('en-US')}</p>
            </div>
            {renderTrend(summary.customersGrowth)}
          </div>
        </Card>

        <Card className="p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[var(--admin-text-muted)] text-sm font-semibold">{adminAr.analytics.conversionRate}</h3>
            <div className="w-10 h-10 bg-[var(--admin-warning)]/10 text-[var(--admin-warning)] rounded-full flex items-center justify-center">
              <IconActivity size={20} />
            </div>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-2xl font-bold text-[var(--admin-text-base)] tabular-nums">{summary.conversionRate}%</p>
            </div>
            {renderTrend(summary.conversionGrowth)}
          </div>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 p-6">
          <h3 className="text-lg font-bold mb-6 text-[var(--admin-text-base)]">{adminAr.analytics.revenueChart}</h3>
          <div className="h-[300px] w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--admin-primary)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--admin-primary)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} tickFormatter={(val) => `EGP ${val/1000}k`} />
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--admin-border-light)" />
                <Tooltip 
                  contentStyle={{ borderRadius: 'var(--admin-radius-lg)', border: '1px solid var(--admin-border-base)', backgroundColor: 'var(--admin-bg-base)', boxShadow: 'var(--admin-shadow-lg)' }}
                  itemStyle={{ color: 'var(--admin-text-base)', fontWeight: 'bold' }}
                  labelStyle={{ color: 'var(--admin-text-muted)', marginBottom: '4px' }}
                  formatter={(value: any) => [formatCurrency(value), adminAr.analytics.totalRevenue]}
                />
                <Area type="monotone" dataKey="revenue" stroke="var(--admin-primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-bold mb-6 text-[var(--admin-text-base)]">{adminAr.analytics.devices}</h3>
          <div className="h-[300px] w-full flex flex-col items-center justify-center">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={deviceData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {deviceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: 'var(--admin-radius-lg)', border: '1px solid var(--admin-border-base)', backgroundColor: 'var(--admin-bg-base)', boxShadow: 'var(--admin-shadow-lg)' }}
                  itemStyle={{ color: 'var(--admin-text-base)', fontWeight: 'bold' }}
                  formatter={(value: any) => [`${value}%`, 'النسبة']} 
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap justify-center gap-4 mt-4 w-full">
              {deviceData.map((entry, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                  <span className="text-[var(--admin-text-muted)] font-medium">{entry.name} ({entry.value}%)</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-bold mb-6 text-[var(--admin-text-base)]">{adminAr.analytics.ordersChart}</h3>
          <div className="h-[300px] w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }} barSize={30}>
                <defs>
                  <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--admin-accent)" stopOpacity={1}/>
                    <stop offset="100%" stopColor="var(--admin-primary)" stopOpacity={0.8}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--admin-border-light)" />
                <Tooltip 
                  cursor={{ fill: 'var(--admin-bg-hover)' }}
                  contentStyle={{ borderRadius: 'var(--admin-radius-lg)', border: '1px solid var(--admin-border-base)', backgroundColor: 'var(--admin-bg-base)', boxShadow: 'var(--admin-shadow-lg)' }}
                  itemStyle={{ color: 'var(--admin-text-base)', fontWeight: 'bold' }}
                  labelStyle={{ color: 'var(--admin-text-muted)', marginBottom: '4px' }}
                  formatter={(value: any) => [value, adminAr.analytics.totalOrders]}
                />
                <Bar dataKey="orders" fill="url(#colorOrders)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-bold mb-6 text-[var(--admin-text-base)]">{adminAr.analytics.topProducts}</h3>
          <div className="space-y-2">
            {topProducts.map((product, idx) => (
              <div key={product.id} className="flex items-center gap-4 p-3 hover:bg-[var(--admin-bg-elevated)] rounded-[var(--admin-radius-md)] transition-colors border border-transparent hover:border-[var(--admin-border-base)]">
                <span className="font-bold text-[var(--admin-text-subtle)] w-4 text-center">{idx + 1}</span>
                <div className="w-12 h-12 rounded-[var(--admin-radius-sm)] overflow-hidden bg-[var(--admin-bg-elevated)] shrink-0 border border-[var(--admin-border-light)]">
                  <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-sm text-[var(--admin-text-base)] truncate">{product.name}</h4>
                  <p className="text-xs text-[var(--admin-text-muted)] mt-1.5 font-medium tabular-nums">{product.sales} مبيعات</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-sm text-[var(--admin-text-base)] tabular-nums">{formatCurrency(product.revenue)}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
