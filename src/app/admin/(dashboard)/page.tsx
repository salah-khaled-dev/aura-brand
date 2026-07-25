"use client";

import React, { useCallback, useEffect, useState } from "react";
import { motion, type Variants } from "framer-motion";
import Link from "next/link";
import { useEventSubscribeMany } from "@/hooks/useEventBus";
import { DASHBOARD_REFRESH_EVENTS } from "@/lib/events/refresh-events";
import {
  IconCurrencyDollar, IconShoppingCart, IconUsers, IconTrendingUp,
  IconPackage, IconArrowUpRight, IconAlertTriangle, IconStar,
  IconChartArea, IconClock, IconActivity,
  IconReceipt2, IconCoin, IconChartPie, IconWallet,
  IconTicket, IconCheck,
} from "@tabler/icons-react";
import { KpiCard } from "@/components/admin/design-system/KpiCard";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/admin/design-system/Card";
import { DataTable } from "@/components/admin/design-system/DataTable";
import { Badge } from "@/components/admin/design-system/Badge";
import { Button } from "@/components/admin/design-system/Button";
import { RevenueChart } from "@/components/admin/charts/RevenueChart";
import { AnalyticsService, AnalyticsSummary, RevenueData } from "@/lib/services/analytics.service";
import { OrderService } from "@/lib/services/order.service";
import { CustomerService } from "@/lib/services/customer.service";
import { ProductService } from "@/lib/services/product.service";
import { businessService } from "@/lib/services/business.service";
import { getStatusMeta } from "@/lib/orders/order-status";
import { toast } from "sonner";
import { adminAr } from "@/lib/i18n/admin-ar";
import { formatCurrency, formatNumber } from "@/lib/utils/formatters";
import { FadeIn, FadeUp, StaggerContainer, StaggerItem, HoverScale } from "@/components/admin/ui/motion";
import { IconContainer } from "@/components/admin/ui/IconContainer";

export default function DashboardHome() {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [financeSummary, setFinanceSummary] = useState<any>(null);
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [latestCustomers, setLatestCustomers] = useState<any[]>([]);
  const [lowStock, setLowStock] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
      try {
        const [sum, rev, orders, customers, products, reviews, coupons, finance, lowStockProducts] = await Promise.all([
          AnalyticsService.getSummary().catch(err => { console.error('[summary]', err); throw err; }),
          AnalyticsService.getRevenueData("month").catch(err => { console.error('[revenue]', err); throw err; }),
          OrderService.getOrders().catch(err => { console.error('[orders]', err); throw err; }),
          CustomerService.getCustomers().catch(err => { console.error('[customers]', err); throw err; }),
          ProductService.getProducts().catch(err => { console.error('[products]', err); throw err; }),
          import("@/lib/services/review.service").then(m => m.ReviewService.getReviews()).catch(err => { console.error('[reviews]', err); throw err; }),
          import("@/lib/services/coupon.service").then(m => m.CouponService.getCoupons()).catch(err => { console.error('[coupons]', err); throw err; }),
          businessService.getFinancialSummary().catch(err => { console.error('[finance]', err); throw err; }),
          ProductService.getLowStockProducts(5).catch(err => { console.error('[lowStock]', err); throw err; }),
        ]);

        const totalRevenue = orders.reduce(
          (acc: number, o) => acc + (o.paymentStatus === "paid" ? o.total : 0), 0
        );
        const countByStatus = (s: string) => orders.filter((o: any) => o.status === s).length;
        const pendingOrders   = countByStatus("pending");
        const preparingOrders = countByStatus("preparing") + countByStatus("processing");
        const shippedOrders   = countByStatus("shipped") + countByStatus("out_for_delivery");
        const cancelledOrders = countByStatus("cancelled");
        const completedOrders = orders.filter((o: any) => o.status === "completed" || o.status === "delivered").length;

        setSummary({
          ...sum,
          totalRevenue,
          totalOrders: orders.length,
          totalCustomers: customers.length,
          pendingReviews: reviews.filter((r: any) => r.status === "pending").length,
          activeCoupons: coupons.filter((c: any) => c.status === "active").length,
          pendingOrders,
          preparingOrders,
          shippedOrders,
          cancelledOrders,
          completedOrders,
          lowStockCount: products.filter((p: any) => (p.stock ?? 0) > 0 && (p.stock ?? 0) <= 10).length,
          outOfStockCount: products.filter((p: any) => (p.stock ?? 0) <= 0).length,
          totalProducts: products.length,
          inventoryValue: products.reduce((acc: number, p: any) => acc + (p.stock ?? 0) * ((p as any).costPrice ?? 0), 0),
        } as any);

        setFinanceSummary(finance);
        setRevenueData(rev);
        setRecentOrders(orders.slice(0, 5));

        const sorted = [...customers].sort(
          (a, b) => new Date(b.registrationDate ?? b.createdAt).getTime() - new Date(a.registrationDate ?? a.createdAt).getTime()
        );
        setLatestCustomers(sorted.slice(0, 5));
        setLowStock(lowStockProducts);
      } catch (err) {
        console.error('[dashboard] load failed:', err);
        toast.error(adminAr.toasts.unexpectedError);
      } finally {
        setLoading(false);
      }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEventSubscribeMany(DASHBOARD_REFRESH_EVENTS, load);

  if (loading || !summary) {
    return (
      <div className="space-y-6 animate-pulse p-4 md:p-6">
        <div className="h-10 w-64 rounded-[var(--admin-radius-md)] bg-[var(--admin-bg-elevated)]" />
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {[1,2,3,4,5,6,7,8].map(i => (
            <div key={i} className="h-[160px] rounded-[var(--admin-radius-2xl)] bg-[var(--admin-bg-elevated)]" />
          ))}
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 h-[400px] rounded-[var(--admin-radius-2xl)] bg-[var(--admin-bg-elevated)]" />
          <div className="h-[400px] rounded-[var(--admin-radius-2xl)] bg-[var(--admin-bg-elevated)]" />
        </div>
      </div>
    );
  }

  const s = summary as any;

  return (
    <StaggerContainer className="space-y-8 pb-12">

      {/* ── Page header ─────────────── */}
      <FadeUp className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[var(--admin-text-base)] tracking-tight">نظرة عامة</h1>
          <p className="text-sm text-[var(--admin-text-muted)] mt-1 font-medium">مرحباً بك مجدداً! إليك ملخص لأداء متجرك.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/admin/analytics">
            <Button variant="secondary" size="md" leftIcon={<IconChartArea size={18} />}>
              التحليلات الكاملة
            </Button>
          </Link>
          <Link href="/admin/orders">
            <Button variant="primary" size="md" leftIcon={<IconActivity size={18} />}>
              إدارة الطلبات
            </Button>
          </Link>
        </div>
      </FadeUp>

      {/* ── Sales KPIs ─────────────────── */}
      <StaggerItem>
        <p className="text-xs font-bold text-[var(--admin-text-subtle)] uppercase tracking-widest mb-3 px-1">المبيعات والعملاء</p>
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <KpiCard
            title={adminAr.dashboard.totalRevenue}
            value={formatCurrency(summary.totalRevenue)}
            icon={<IconCurrencyDollar stroke={2} />}
            trend={{ value: Math.abs(summary.revenueGrowth ?? 0), label: adminAr.dashboard.vsLastMonth, isPositive: (summary.revenueGrowth ?? 0) >= 0 }}
            accentColor="purple"
          />
          <KpiCard
            title={adminAr.dashboard.totalOrders}
            value={formatNumber(summary.totalOrders)}
            icon={<IconShoppingCart stroke={2} />}
            trend={{ value: Math.abs(summary.ordersGrowth ?? 0), label: adminAr.dashboard.vsLastMonth, isPositive: (summary.ordersGrowth ?? 0) >= 0 }}
            accentColor="blue"
          />
          <KpiCard
            title={adminAr.dashboard.totalCustomers}
            value={formatNumber(summary.totalCustomers)}
            icon={<IconUsers stroke={2} />}
            trend={{ value: Math.abs(summary.customersGrowth ?? 0), label: adminAr.dashboard.vsLastMonth, isPositive: (summary.customersGrowth ?? 0) >= 0 }}
            accentColor="emerald"
          />
          <KpiCard
            title="نسبة التحويل"
            value={`${summary.conversionRate}%`}
            icon={<IconTrendingUp stroke={2} />}
            trend={{ value: Math.abs(summary.conversionGrowth ?? 0), label: adminAr.dashboard.vsLastMonth, isPositive: (summary.conversionGrowth ?? 0) >= 0 }}
            accentColor="cyan"
          />
        </div>
      </StaggerItem>

      {/* ── Operations KPIs ─────────────────── */}
      <StaggerItem>
        <p className="text-xs font-bold text-[var(--admin-text-subtle)] uppercase tracking-widest mb-3 px-1">العمليات والمخزون</p>
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <KpiCard
            title="طلبات معلقة"
            value={formatNumber(s.pendingOrders ?? 0)}
            icon={<IconClock stroke={2} />}
            trend={{ value: 0, label: "تحتاج مراجعة", isPositive: false }}
            accentColor="orange"
          />
          <KpiCard
            title="طلبات مكتملة"
            value={formatNumber(s.completedOrders ?? 0)}
            icon={<IconCheck stroke={2} />}
            trend={{ value: 0, label: "من إجمالي الطلبات", isPositive: true }}
            accentColor="emerald"
          />
          <KpiCard
            title="مخزون منخفض"
            value={formatNumber(s.lowStockCount ?? 0)}
            icon={<IconAlertTriangle stroke={2} />}
            trend={{ value: 0, label: "منتجات تحت 10 وحدات", isPositive: false }}
            accentColor="orange"
          />
          <KpiCard
            title="قيمة المخزون"
            value={formatCurrency(s.inventoryValue ?? 0)}
            icon={<IconPackage stroke={2} />}
            trend={{ value: 0, label: "القيمة الحالية للمخزون", isPositive: true }}
            accentColor="indigo"
          />
        </div>
      </StaggerItem>

      {/* ── Order Status KPIs ─────────────────── */}
      <StaggerItem>
        <p className="text-xs font-bold text-[var(--admin-text-subtle)] uppercase tracking-widest mb-3 px-1">حالة الطلبات</p>
        <div className="grid grid-cols-2 xl:grid-cols-5 gap-4">
          <KpiCard
            title="بانتظار المراجعة"
            value={formatNumber(s.pendingOrders ?? 0)}
            icon={<IconClock stroke={2} />}
            accentColor="orange"
          />
          <KpiCard
            title="جاري التجهيز"
            value={formatNumber(s.preparingOrders ?? 0)}
            icon={<IconActivity stroke={2} />}
            accentColor="indigo"
          />
          <KpiCard
            title="تم الشحن"
            value={formatNumber(s.shippedOrders ?? 0)}
            icon={<IconPackage stroke={2} />}
            accentColor="blue"
          />
          <KpiCard
            title="تم التسليم"
            value={formatNumber(s.completedOrders ?? 0)}
            icon={<IconCheck stroke={2} />}
            accentColor="emerald"
          />
          <KpiCard
            title="ملغاة"
            value={formatNumber(s.cancelledOrders ?? 0)}
            icon={<IconAlertTriangle stroke={2} />}
            accentColor="pink"
          />
        </div>
      </StaggerItem>

      {/* ── Finance KPIs ─────────────────── */}
      {financeSummary && (
        <StaggerItem>
          <div className="flex items-center justify-between mb-3 px-1">
            <p className="text-xs font-bold text-[var(--admin-text-subtle)] uppercase tracking-widest">المالية</p>
            <Link href="/admin/business" className="text-xs font-semibold text-[var(--admin-primary)] hover:underline">
              النظرة المالية الكاملة ←
            </Link>
          </div>
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            <KpiCard
              title="صافي الربح"
              value={formatCurrency(financeSummary.netProfit ?? 0)}
              icon={<IconTrendingUp stroke={2} />}
              trend={{ value: 0, label: "الشهر الحالي", isPositive: (financeSummary.netProfit ?? 0) >= 0 }}
              accentColor="emerald"
            />
            <KpiCard
              title="إجمالي المصروفات"
              value={formatCurrency(financeSummary.totalExpenses ?? 0)}
              icon={<IconReceipt2 stroke={2} />}
              trend={{ value: 0, label: "الشهر الحالي", isPositive: false }}
              accentColor="pink"
            />
            <KpiCard
              title="رأس المال"
              value={formatCurrency(financeSummary.totalCapital ?? 0)}
              icon={<IconCoin stroke={2} />}
              trend={{ value: 0, label: "لا يوجد تغيير", isPositive: true }}
              accentColor="yellow"
            />
            <KpiCard
              title="التدفق النقدي"
              value={formatCurrency(financeSummary.cashFlow ?? 0)}
              icon={<IconWallet stroke={2} />}
              trend={{ value: 0, label: "الشهر الحالي", isPositive: (financeSummary.cashFlow ?? 0) >= 0 }}
              accentColor="blue"
            />
          </div>
        </StaggerItem>
      )}

      {/* ── Marketing KPIs ─────────────────── */}
      <StaggerItem>
        <p className="text-xs font-bold text-[var(--admin-text-subtle)] uppercase tracking-widest mb-3 px-1">التسويق</p>
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <KpiCard
            title="كوبونات نشطة"
            value={formatNumber(s.activeCoupons ?? 0)}
            icon={<IconTicket stroke={2} />}
            trend={{ value: 0, label: "متاحة للاستخدام", isPositive: true }}
            accentColor="orange"
          />
          <KpiCard
            title="تقييمات جديدة"
            value={formatNumber(s.pendingReviews ?? 0)}
            icon={<IconStar stroke={2} />}
            trend={{ value: 0, label: "بانتظار المراجعة", isPositive: false }}
            accentColor="yellow"
          />
          <KpiCard
            title="إجمالي المنتجات"
            value={formatNumber(s.totalProducts ?? 0)}
            icon={<IconPackage stroke={2} />}
            accentColor="indigo"
          />
          <KpiCard
            title="نفد من المخزون"
            value={formatNumber(s.outOfStockCount ?? 0)}
            icon={<IconAlertTriangle stroke={2} />}
            trend={{ value: 0, label: "تحتاج إعادة تخزين", isPositive: false }}
            accentColor="pink"
          />
        </div>
      </StaggerItem>

      {/* ── Charts Row ── */}
      <StaggerItem className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="xl:col-span-2 overflow-hidden flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-[var(--admin-border-light)] bg-[var(--admin-bg-surface)]">
            <div className="flex items-center gap-3">
              <IconContainer icon={<IconChartArea />} color="indigo" size="sm" />
              <div>
                <CardTitle>{adminAr.dashboard.revenueOverview}</CardTitle>
                <p className="text-xs font-medium text-[var(--admin-text-subtle)] mt-0.5">الإيرادات خلال الشهر الحالي</p>
              </div>
            </div>
            <Link href="/admin/analytics">
              <Button variant="ghost" size="sm" rightIcon={<IconArrowUpRight size={16} />}>
                التقرير الكامل
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="flex-1 p-6 min-h-[350px]">
            <RevenueChart data={revenueData as any} />
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-[var(--admin-border-light)] bg-[var(--admin-bg-surface)]">
            <div className="flex items-center gap-3">
              <IconContainer icon={<IconUsers />} color="cyan" size="sm" />
              <CardTitle>{adminAr.dashboard.latestCustomers}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-hidden">
            <div className="divide-y divide-[var(--admin-border-light)]">
              {latestCustomers.map((c) => (
                <HoverScale key={c.id} className="flex items-center gap-4 p-4 hover:bg-[var(--admin-bg-hover)] cursor-pointer transition-colors group">
                  <div className="w-10 h-10 rounded-full bg-[var(--admin-primary-muted)] border-2 border-[var(--admin-bg-surface)] shadow-sm flex items-center justify-center text-sm font-bold text-[var(--admin-primary)] shrink-0">
                    {(c.fullName ?? c.name)?.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-[var(--admin-text-base)] truncate group-hover:text-[var(--admin-primary)] transition-colors">
                      {c.fullName ?? c.name}
                    </p>
                    <p className="text-xs font-medium text-[var(--admin-text-muted)] truncate">{c.email}</p>
                  </div>
                  <Badge variant="primary" size="sm" className="shrink-0 font-bold tabular-nums">
                    {formatCurrency(c.totalSpent ?? c.spent ?? 0)}
                  </Badge>
                </HoverScale>
              ))}
            </div>
          </CardContent>
          <div className="p-3 border-t border-[var(--admin-border-light)] bg-[var(--admin-bg-surface)] text-center">
            <Link href="/admin/customers" className="text-sm font-semibold text-[var(--admin-primary)] hover:text-[var(--admin-primary-hover)] transition-colors">
              عرض كل العملاء
            </Link>
          </div>
        </Card>
      </StaggerItem>

      {/* ── Bottom Row ── */}
      <StaggerItem className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="xl:col-span-2 flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-[var(--admin-border-light)] bg-[var(--admin-bg-surface)]">
            <div className="flex items-center gap-3">
              <IconContainer icon={<IconShoppingCart />} color="blue" size="sm" />
              <CardTitle>{adminAr.dashboard.recentOrders}</CardTitle>
            </div>
            <Link href="/admin/orders">
              <Button variant="ghost" size="sm" rightIcon={<IconArrowUpRight size={16} />}>
                جميع الطلبات
              </Button>
            </Link>
          </CardHeader>
          <div className="overflow-x-auto">
            <DataTable
              columns={[
                { accessor: "orderNumber", header: "رقم الطلب" },
                { accessor: "customerName", header: "العميل" },
                { accessor: "date", header: "التاريخ", type: "date" },
                {
                  accessor: "status",
                  header: "الحالة",
                  render: (_: any, row: any) => {
                    const meta = getStatusMeta(row.status);
                    return <Badge variant={meta.badge} size="sm">{meta.label}</Badge>;
                  },
                },
                { accessor: "total", header: "الإجمالي", type: "price", align: "end" },
              ]}
              data={recentOrders}
              pageSize={5}
              className="border-0 shadow-none rounded-none [&_th]:bg-[var(--admin-bg-surface)]"
            />
          </div>
        </Card>

        <div className="flex flex-col gap-4">
          {/* Low Stock Alert */}
          <Card className="flex-1 flex flex-col border-[var(--admin-danger-muted)]">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-[var(--admin-border-light)]">
              <CardTitle className="flex items-center gap-2 text-[var(--admin-danger)]">
                <IconAlertTriangle size={18} />
                تنبيهات المخزون
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1">
              {lowStock.length === 0 ? (
                <div className="p-6 text-center">
                  <IconPackage size={32} className="mx-auto text-[var(--admin-success)] mb-2" />
                  <p className="text-sm font-semibold text-[var(--admin-text-base)]">المخزون ممتاز</p>
                </div>
              ) : (
                <div className="divide-y divide-[var(--admin-border-light)]">
                  {lowStock.slice(0, 4).map(p => (
                    <div key={p.id} className="flex items-center justify-between gap-3 p-3 hover:bg-[var(--admin-bg-hover)] transition-colors">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-[var(--admin-text-base)] truncate">{p.name}</p>
                        <p className="text-xs font-mono text-[var(--admin-text-subtle)]">{p.sku}</p>
                      </div>
                      <Badge variant={p.stock <= 0 ? "danger" : "warning"} size="sm" animated>
                        {p.stock <= 0 ? 'نفد' : `${p.stock} متبقي`}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
            {lowStock.length > 0 && (
              <div className="p-3 border-t border-[var(--admin-border-light)] bg-[var(--admin-bg-surface)] text-center">
                <Link href="/admin/inventory" className="text-xs font-semibold text-[var(--admin-danger)] hover:underline">
                  إدارة المخزون
                </Link>
              </div>
            )}
          </Card>

          {/* Pending Reviews */}
          <Card className="relative overflow-hidden bg-gradient-to-br from-[var(--admin-warning-muted)] to-transparent border-[var(--admin-warning-muted)]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="flex items-center gap-2 text-[var(--admin-warning)]">
                <IconStar size={18} />
                تقييمات جديدة
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-4xl font-black text-[var(--admin-text-base)] tracking-tighter tabular-nums mt-1">
                {formatNumber(s.pendingReviews ?? 0)}
              </div>
              <div className="flex items-center gap-2 mt-3">
                <IconClock size={14} className="text-[var(--admin-warning)]" />
                <p className="text-sm font-semibold text-[var(--admin-text-muted)]">بحاجة للمراجعة والموافقة</p>
              </div>
              <Link href="/admin/reviews" className="inline-block mt-3 text-sm font-bold text-[var(--admin-warning)] hover:underline">
                مراجعة التقييمات &rarr;
              </Link>
            </CardContent>
            <IconStar size={100} className="absolute -bottom-6 -left-6 text-[var(--admin-warning)] opacity-10 rotate-12 pointer-events-none" />
          </Card>
        </div>
      </StaggerItem>

    </StaggerContainer>
  );
}
