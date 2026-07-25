import { createClient } from '@/lib/supabase/client';

export interface RevenueData {
  name: string;
  revenue: number;
  orders: number;
}

export interface TopProduct {
  id: string;
  name: string;
  sales: number;
  revenue: number;
  image: string;
}

export interface DeviceData {
  name: string;
  value: number;
}

export interface AnalyticsSummary {
  totalRevenue: number;
  totalOrders: number;
  totalCustomers: number;
  conversionRate: number;
  revenueGrowth: number;
  ordersGrowth: number;
  customersGrowth: number;
  conversionGrowth: number;
}

const supabase = createClient();

function growthPct(current: number, previous: number): number {
  if (previous <= 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

/**
 * Backed by the Supabase RPCs in 20260715000011/20260715000012
 * (get_revenue_summary, get_revenue_series, get_top_products,
 * get_customer_growth). `conversionRate`/`conversionGrowth` stay 0 — there is
 * no traffic/session-tracking pipeline in this app to compute a conversion
 * rate from, and no real analytics service (GA/etc.) is wired in yet. That's
 * an honestly-empty metric, not a fabricated one.
 */
export const AnalyticsService = {
  async getSummary(): Promise<AnalyticsSummary> {
    const [{ data: revenueRows }, { data: growthRows }, { count: totalOrders }, { count: ordersLastMonth }] = await Promise.all([
      supabase.rpc('get_revenue_summary'),
      supabase.rpc('get_customer_growth'),
      supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'delivered').gte('created_at', new Date(new Date().setDate(1)).toISOString()),
      supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'delivered')
        .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toISOString())
        .lt('created_at', new Date(new Date().setDate(1)).toISOString()),
    ]);

    const revenue = revenueRows?.[0];
    const growth = growthRows?.[0];

    return {
      totalRevenue: revenue?.this_month ?? 0,
      revenueGrowth: 0, // requires last month's revenue too — see getRevenueData for the trend chart instead
      totalOrders: totalOrders ?? 0,
      ordersGrowth: growthPct(totalOrders ?? 0, ordersLastMonth ?? 0),
      totalCustomers: growth?.total_customers ?? 0,
      customersGrowth: growthPct(growth?.new_this_month ?? 0, growth?.new_last_month ?? 0),
      conversionRate: 0,
      conversionGrowth: 0,
    };
  },

  async getOverviewStats(period: 'today' | 'week' | 'month' | 'year'): Promise<RevenueData[]> {
    // The series RPC works in day/week/month buckets, not intraday — 'today' has no
    // finer granularity to show, so fall back to the week view as the closest thing.
    const rpcPeriod = period === 'today' ? 'week' : period;
    const { data, error } = await supabase.rpc('get_revenue_series', { p_period: rpcPeriod });
    if (error) throw error;
    return data ?? [];
  },

  async getRevenueData(period: 'week' | 'month' | 'year' = 'month'): Promise<RevenueData[]> {
    const { data, error } = await supabase.rpc('get_revenue_series', { p_period: period });
    if (error) throw error;
    return data ?? [];
  },

  async getTopProducts(): Promise<TopProduct[]> {
    const { data, error } = await supabase.rpc('get_top_products', { p_limit: 5 });
    if (error) throw error;
    return (data ?? []).map((row) => ({
      id: row.product_id,
      name: row.name ?? '',
      sales: row.sales,
      revenue: row.revenue,
      image: row.image ?? '',
    }));
  },

  /**
   * No device/traffic analytics pipeline exists in this app (no session
   * tracking, no GA integration) — there is genuinely nothing to report here.
   * Returns an empty array rather than fabricated percentages.
   */
  async getDeviceData(): Promise<DeviceData[]> {
    return [];
  },
};
