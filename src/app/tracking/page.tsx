"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { LuxuryInput } from "@/components/ui/Form";
import Button from "@/components/ui/Button";
import { motion, AnimatePresence } from "framer-motion";
import { IconSearch as Search, IconAlertCircle as AlertCircle, IconRefresh as RefreshCw, IconCheck } from "@tabler/icons-react";
import Image from "next/image";
import { TrackingResultSkeleton } from "@/components/ui/Skeleton";
import { OrderService } from "@/lib/services/order.service";
import type { Order } from "@/data/mock/orders";
import { useEventSubscribeMany } from "@/hooks/useEventBus";
import { getStatusMeta, buildCustomerTimeline, estimateDelivery } from "@/lib/orders/order-status";
import { ContentService } from "@/lib/services/storefront/content.service";
import { StoreService } from "@/lib/services/storefront/store.service";

type SearchStatus = "idle" | "loading" | "found" | "error";

const DEFAULT_CONTENT = {
  tracking_hero_title:    'تتبع طلبكِ',
  tracking_hero_label:    'مسار مقتنياتكِ',
  tracking_hero_subtitle: 'تابعي رحلة تصميم وتجهيز قطع أورا الفاخرة خطوة بخطوة، بدءاً من القص والأشغال اليدوية بالأتيلييه وحتى وصول المندوب لباب منزلكِ.',
  tracking_support_title: 'هل تحتاجين إلى مساعدة؟',
  tracking_support_text:  'منسقو أتيلييه أورا جاهزون للتواصل معكِ وتحديثكِ بتفاصيل المقاسات الدقيقة أو حالة التحويل عبر الواتساب.',
  tracking_support_btn:   'تواصلي معنا',
};

function formatEgp(value: number) {
  return `${value.toLocaleString("en-US")} ج.م`;
}

function formatArDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" });
}

function TrackingContent({ c, whatsappUrl }: { c: typeof DEFAULT_CONTENT; whatsappUrl: string }) {
  const searchParams = useSearchParams();
  const [orderId, setOrderId] = useState("");
  const [contact, setContact] = useState("");
  const [status, setStatus] = useState<SearchStatus>("idle");
  const [order, setOrder] = useState<Order | null>(null);

  const lookup = useCallback(async (rawId: string, mode: "loading" | "silent" = "loading") => {
    const id = rawId.trim();
    if (!id) return;
    if (mode === "loading") setStatus("loading");
    try {
      const found = await OrderService.getOrderByNumber(id);
      if (found) {
        setOrder(found);
        setStatus("found");
      } else if (mode === "loading") {
        setOrder(null);
        setStatus("error");
      }
    } catch {
      if (mode === "loading") setStatus("error");
    }
  }, []);

  useEffect(() => {
    const idParam = searchParams.get("id");
    if (idParam) {
      setOrderId(idParam);
      lookup(idParam);
    }
  }, [searchParams, lookup]);

  useEventSubscribeMany(["order.updated", "order.created", "order.deleted"], () => {
    if (order) lookup(order.orderNumber, "silent");
  });

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderId) return;
    lookup(orderId);
  };

  const meta = order ? getStatusMeta(order.status) : null;
  const timeline = order ? buildCustomerTimeline(order) : [];

  return (
    <main className="w-full max-w-[1280px] px-6 md:px-12 py-16 md:py-20 flex flex-col items-center gap-12">

      {/* Tracking Form */}
      <div className="w-full max-w-[600px] bg-background-secondary border border-brand-border p-6 md:p-8">
        <form onSubmit={handleSearchSubmit} className="flex flex-col gap-6">
          <div className="flex flex-col gap-4 text-right" dir="rtl">
            <LuxuryInput
              label="رقم طلب الكوتور *"
              placeholder="مثال: AURA-10025"
              required
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
            />
            <LuxuryInput
              label="رقم الهاتف أو البريد الإلكتروني المعتمد"
              placeholder="مثال: noura@example.com (اختياري)"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
            />
          </div>

          <Button type="submit" variant="primary" className="w-full h-12" disabled={status === "loading"}>
            {status === "loading" ? (
              <span className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-background-secondary" />
                <span>جاري الاستعلام...</span>
              </span>
            ) : (
              <span>تتبع الطلب</span>
            )}
          </Button>
        </form>
      </div>

      {/* Dynamic States */}
      <div className="w-full max-w-[1000px] min-h-[200px] flex flex-col items-center justify-center">
        <AnimatePresence mode="wait">
          {status === "loading" && (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full">
              <TrackingResultSkeleton />
            </motion.div>
          )}

          {status === "idle" && (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-center py-12 flex flex-col items-center gap-4 bg-background-secondary border border-brand-border w-full max-w-[600px] px-6"
            >
              <Search className="w-10 h-10 stroke-[1.2] text-brand-border" />
              <div>
                <h3 className="font-sans text-sm font-semibold text-text-primary">أدخلي رقم الطلب للمتابعة</h3>
                <p className="text-xs text-text-secondary font-light mt-1">لم تتبعي أي طلب بعد. أدخلي رقم طلبكِ في النموذج أعلاه لمشاهدة تفاصيل الشحن.</p>
              </div>
            </motion.div>
          )}

          {status === "error" && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="text-center py-12 flex flex-col items-center gap-4 bg-background-secondary border border-brand-border w-full max-w-[600px] px-6"
            >
              <AlertCircle className="w-10 h-10 stroke-[1.2] text-accent" />
              <div>
                <h3 className="font-sans text-sm font-bold text-text-primary">لم يتم العثور على طلب</h3>
                <p className="text-xs text-text-secondary font-light mt-2 max-w-sm leading-relaxed">
                  رقم الطلب الذي أدخلتيه غير مسجل لدينا في أتيلييه AURA. يرجى مراجعة رسالة التأكيد أو كتابة رقم الطلب بالشكل الصحيح (مثال: AURA-10025).
                </p>
              </div>
            </motion.div>
          )}

          {status === "found" && order && meta && (
            <motion.div
              key="found"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
              className="w-full flex flex-col gap-12"
            >
              {/* Timeline Container */}
              <div className="bg-background-secondary border border-brand-border p-6 md:p-10 flex flex-col gap-8 text-right" dir="rtl">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-brand-border pb-4">
                  <div>
                    <span className="font-sans text-[10px] text-text-secondary font-medium">حالة الطلب الحالية:</span>
                    <h2 className="font-sans text-lg font-bold text-accent mt-0.5">{meta.label}</h2>
                  </div>
                  <div className="md:text-left">
                    <span className="font-sans text-[10px] text-text-secondary font-medium block">التسليم المتوقع:</span>
                    <span className="font-sans text-sm font-semibold text-text-primary">
                      {order.status === "delivered"
                        ? "تم التسليم"
                        : order.estimatedDeliveryDate
                          ? formatArDate(order.estimatedDeliveryDate)
                          : estimateDelivery(order)}
                    </span>
                  </div>
                </div>

                {order.customerUpdate && (
                  <div className="bg-accent/5 border border-accent/20 p-4 flex flex-col gap-1">
                    <span className="font-sans text-[10px] text-accent font-bold uppercase">آخر تحديث من الأتيلييه</span>
                    <p className="font-sans text-sm text-text-primary leading-relaxed">{order.customerUpdate}</p>
                    {order.customerUpdatedAt && (
                      <span className="font-sans text-[10px] text-text-secondary font-light mt-0.5">{formatArDate(order.customerUpdatedAt)}</span>
                    )}
                  </div>
                )}

                {/* Progress Timeline */}
                <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-8 md:gap-4 py-6">
                  <div className="absolute top-1/2 left-4 right-4 h-[1px] bg-brand-border -translate-y-1/2 -z-10 hidden md:block" />
                  {timeline.map((step) => {
                    const active = step.state === "done" || step.state === "current";
                    return (
                      <div
                        key={step.key}
                        className="flex md:flex-col items-center md:items-center gap-4 md:gap-2 text-right md:text-center relative z-10 bg-background-secondary md:px-2 flex-grow"
                      >
                        <div className={`w-9 h-9 rounded-full font-display text-xs font-semibold flex items-center justify-center border transition-colors duration-500 ${active ? "bg-accent text-background-secondary border-accent" : "bg-background-secondary text-text-secondary border-brand-border"} ${step.state === "current" ? "ring-2 ring-accent/30" : ""}`}>
                          {step.state === "done" ? <IconCheck className="w-4 h-4" /> : null}
                          {step.state !== "done" && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
                        </div>
                        <div>
                          <h4 className={`font-sans text-xs font-bold ${active ? "text-text-primary" : "text-text-secondary"}`}>{step.label}</h4>
                          <span className="font-sans text-[10px] text-text-secondary font-light block mt-0.5">
                            {step.date ? formatArDate(step.date) : step.description}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {(order.status === "cancelled" || order.status === "returned") && (
                  <div className="bg-accent/5 border border-accent/20 px-4 py-3 text-xs text-accent font-sans text-center">
                    {meta.description}
                  </div>
                )}
              </div>

              {/* Order Information */}
              <div className="bg-background-secondary border border-brand-border p-6 md:p-8 flex flex-col gap-6 text-right" dir="rtl">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 border-b border-brand-border pb-6">
                  <div>
                    <span className="font-sans text-[10px] text-text-secondary font-medium">رقم الطلب</span>
                    <h5 className="font-sans text-xs font-bold text-text-primary mt-0.5">{order.orderNumber}</h5>
                  </div>
                  <div>
                    <span className="font-sans text-[10px] text-text-secondary font-medium">تاريخ الطلب</span>
                    <h5 className="font-sans text-xs font-bold text-text-primary mt-0.5">{formatArDate(order.createdAt || order.date)}</h5>
                  </div>
                  <div>
                    <span className="font-sans text-[10px] text-text-secondary font-medium">المستلمة</span>
                    <h5 className="font-sans text-xs font-bold text-text-primary mt-0.5">{order.customerName}</h5>
                  </div>
                  <div>
                    <span className="font-sans text-[10px] text-text-secondary font-medium">الإجمالي</span>
                    <h5 className="font-sans text-xs font-bold text-accent mt-0.5">{formatEgp(order.total)}</h5>
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex gap-4 items-center">
                      <div className="relative aspect-[3/4] w-14 shrink-0 overflow-hidden border border-brand-border bg-background-primary">
                        <Image
                          src={item.image || "/images/products/product_evening_gown.png"}
                          alt={item.productName} fill sizes="56px" className="object-cover"
                        />
                      </div>
                      <div className="flex-grow min-w-0">
                        <h4 className="font-sans text-xs font-semibold text-text-primary truncate">{item.productName}</h4>
                        <span className="text-[10px] text-text-secondary font-light block mt-0.5">
                          {item.size ? `المقاس: ${item.size}` : ""}{item.size && item.color ? " | " : ""}{item.color ? `اللون: ${item.color}` : ""}{(item.size || item.color) ? " | " : ""}العدد: {item.quantity}
                        </span>
                      </div>
                      <span className="font-display text-xs font-bold text-accent shrink-0">
                        {formatEgp(item.price * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>

                {(order.trackingNumber || order.shippingCompany || order.courierName) && (
                  <div className="border-t border-brand-border pt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {order.shippingCompany && (
                      <div>
                        <span className="font-sans text-[10px] text-text-secondary font-medium">شركة الشحن</span>
                        <p className="font-sans text-xs font-bold text-text-primary mt-0.5">{order.shippingCompany}</p>
                      </div>
                    )}
                    {order.trackingNumber && (
                      <div>
                        <span className="font-sans text-[10px] text-text-secondary font-medium">رقم التتبع</span>
                        <p className="font-sans text-xs font-bold text-text-primary mt-0.5" dir="ltr">{order.trackingNumber}</p>
                      </div>
                    )}
                    {order.courierName && (
                      <div>
                        <span className="font-sans text-[10px] text-text-secondary font-medium">مندوب التوصيل</span>
                        <p className="font-sans text-xs font-bold text-text-primary mt-0.5">{order.courierName}</p>
                      </div>
                    )}
                  </div>
                )}

                <div className="border-t border-brand-border pt-4">
                  <span className="font-sans text-[10px] text-text-secondary font-medium">عنوان الشحن</span>
                  <p className="font-sans text-xs text-text-primary mt-0.5 leading-relaxed">{order.shippingAddress || "—"}</p>
                </div>

                <div className="border-t border-brand-border pt-4 flex justify-between items-center">
                  <span className="font-sans text-[10px] text-text-secondary font-medium">آخر تحديث</span>
                  <span className="font-sans text-xs font-semibold text-text-primary">{formatArDate(order.updatedAt)}</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Support Section */}
      <section className="w-full max-w-[600px] border-t border-brand-border pt-12 text-center flex flex-col items-center gap-4">
        <h3 className="font-sans text-lg font-light text-text-primary">{c.tracking_support_title}</h3>
        <p className="font-sans text-xs text-text-secondary font-light max-w-xs leading-relaxed">
          {c.tracking_support_text}
        </p>
        <div className="mt-2">
          <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
            <Button variant="dark-outline" className="px-10">{c.tracking_support_btn}</Button>
          </a>
        </div>
      </section>
    </main>
  );
}

export default function TrackingPage() {
  const [c, setC] = useState(DEFAULT_CONTENT);
  const [whatsappUrl, setWhatsappUrl] = useState('https://wa.me/201000000000');

  const loadContent = useCallback(async () => {
    try {
      const [blocks, storeInfo] = await Promise.all([
        ContentService.getContentByGroup('pages'),
        StoreService.getInfo(),
      ]);
      const map: Record<string, string> = {};
      blocks.forEach(b => { map[b.key] = b.value; });
      setC(prev => ({ ...prev, ...map }));
      if (storeInfo.socialMedia?.whatsapp) setWhatsappUrl(storeInfo.socialMedia.whatsapp);
    } catch {
      // keep defaults
    }
  }, []);

  useEffect(() => { loadContent(); }, [loadContent]);
  useEventSubscribeMany(['website.changed'], loadContent);

  return (
    <div className="bg-background-primary min-h-screen flex flex-col items-center">
      <section className="w-full bg-background-secondary py-16 md:py-24 border-b border-brand-border flex flex-col items-center">
        <div className="max-w-[720px] mx-auto px-6 text-center">
          <span className="font-sans text-[10px] text-accent font-bold uppercase">{c.tracking_hero_label}</span>
          <h1 className="font-sans text-3xl font-light text-text-primary mt-2">{c.tracking_hero_title}</h1>
          <p className="font-sans text-xs md:text-sm text-text-secondary font-light mt-3 leading-relaxed">
            {c.tracking_hero_subtitle}
          </p>
        </div>
      </section>

      <Suspense fallback={
        <div className="w-full max-w-[1280px] px-6 md:px-12 py-16 md:py-20 flex flex-col items-center">
          <TrackingResultSkeleton />
        </div>
      }>
        <TrackingContent c={c} whatsappUrl={whatsappUrl} />
      </Suspense>
    </div>
  );
}
