"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { LuxuryInput } from "@/components/ui/Form";
import Button from "@/components/ui/Button";
import { motion, AnimatePresence } from "framer-motion";
import { Search, AlertCircle, RefreshCw } from "lucide-react";
import Image from "next/image";
import { TrackingResultSkeleton } from "@/components/ui/Skeleton";

// Sub-component that consumes search params
function TrackingContent() {
  const searchParams = useSearchParams();
  const [orderId, setOrderId] = useState("");
  const [contact, setContact] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error" | "found">("idle");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [searchedOrder, setSearchedOrder] = useState<any>(null);

  // Auto load query parameter if present
  useEffect(() => {
    const idParam = searchParams.get("id");
    if (idParam) {
      const id = idParam.trim().toUpperCase();
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOrderId(id);
      setStatus("loading");
      setTimeout(() => {
        if (id.length === 10 && id.startsWith("AU")) {
          setSearchedOrder({
            id: id,
            status: "shipped",
            date: "14 يونيو 2026",
            expectedDelivery: "16 يونيو 2026",
            items: [
              {
                title: "فستان سهرة كلاسيك ميدي",
                color: "برونزي",
                size: "M",
                image: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?q=80&w=800&auto=format&fit=crop",
              }
            ],
            shippingAddress: "التجمع الخامس، القاهرة الجديدة",
            timeline: [
              { status: "تم استلام الطلب", date: "14 يونيو 2026", completed: true },
              { status: "جاري التجهيز في الأتيلييه", date: "15 يونيو 2026", completed: true },
              { status: "تم الشحن", date: "15 يونيو 2026", completed: true },
              { status: "في الطريق للتوصيل", date: "", completed: false },
              { status: "تم التسليم", date: "", completed: false },
            ]
          });
          setStatus("found");
        } else {
          setStatus("error");
        }
      }, 1200);
    }
  }, [searchParams]);

  const performSearch = (id: string) => {
    const cleanId = id.trim().toUpperCase();
    
    // 1. Try to find in localStorage (created by Checkout Wizard)
    const stored = localStorage.getItem(`aura_order_${cleanId}`);
    if (stored) {
      const orderData = JSON.parse(stored);
      setSearchedOrder(orderData);
      setStatus("success");
      return;
    }

    // 2. Fallback to default mock order AURA-89304 for presentation
    if (cleanId === "AURA-89304") {
      const defaultMock = {
        orderId: "AURA-89304",
        date: "٢١ يونيو ٢٠٢٦",
        customerName: "نورة الشافعي",
        paymentMethod: "InstaPay",
        subtotal: 3400,
        address: "حي لوران - طريق الجيش الرئيسي - مبنى ٤٢ - شقة ٤",
        governorate: "الإسكندرية",
        status: "preparing",
        cartItems: [
          {
            id: "1",
            title: "فستان أورا من الحرير بفتحة كتف راقية",
            price: 3400,
            quantity: 1,
            image: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?q=80&w=300&auto=format&fit=crop",
            size: "S",
            color: "أسود"
          }
        ]
      };
      setSearchedOrder(defaultMock);
      setStatus("success");
      return;
    }

    // 3. Not found state
    setSearchedOrder(null);
    setStatus("error");
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderId) return;

    setStatus("loading");
    setTimeout(() => {
      const id = orderId.trim().toUpperCase();
      if (id.length === 10 && id.startsWith("AU")) {
        setSearchedOrder({
          id: id,
          status: "shipped",
          date: "14 يونيو 2026",
          expectedDelivery: "16 يونيو 2026",
          items: [
            {
              title: "فستان سهرة كلاسيك ميدي",
              color: "برونزي",
              size: "M",
              image: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?q=80&w=800&auto=format&fit=crop",
            }
          ],
          shippingAddress: "التجمع الخامس، القاهرة الجديدة",
          timeline: [
            { status: "تم استلام الطلب", date: "14 يونيو 2026", completed: true },
            { status: "جاري التجهيز في الأتيلييه", date: "15 يونيو 2026", completed: true },
            { status: "تم الشحن", date: "15 يونيو 2026", completed: true },
            { status: "في الطريق للتوصيل", date: "", completed: false },
            { status: "تم التسليم", date: "", completed: false },
          ]
        });
        setStatus("found");
      } else {
        performSearch(orderId);
      }
    }, 1200);
  };

  const steps = [
    { num: "01", name: "تم استلام الطلب", desc: "تم اعتماد المقاسات وتأكيد الطلب", active: true },
    { num: "02", name: "جاري تجهيز الطلب", desc: "يتم تفصيل القطعة يدوياً بأتيلييه الإسكندرية", active: true },
    { num: "03", name: "خرج للشحن", desc: "الشحنة مع مندوب التوصيل السريع", active: searchedOrder?.status === "shipped" || searchedOrder?.status === "delivered" },
    { num: "04", name: "تم التوصيل", desc: "تم التسليم الفردي الفاخر لعنوانكِ", active: searchedOrder?.status === "delivered" }
  ];

  return (
    <main className="w-full max-w-[1280px] px-6 md:px-12 py-16 md:py-20 flex flex-col items-center gap-12">
      
      {/* Tracking Form Section (max-w-[600px]) */}
      <div className="w-full max-w-[600px] bg-background-secondary border border-brand-border p-6 md:p-8">
        <form onSubmit={handleSearchSubmit} className="flex flex-col gap-6">
          <div className="flex flex-col gap-4 text-right" dir="rtl">
            <LuxuryInput
              label="رقم طلب الكوتور *"
              placeholder="مثال: AURA-89304"
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

      {/* 3. Dynamic Status States */}
      <div className="w-full max-w-[1000px] min-h-[200px] flex flex-col items-center justify-center">
        
        <AnimatePresence mode="wait">
          {/* A. Loading Shimmer Skeletons */}
          {status === "loading" && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full"
            >
              <TrackingResultSkeleton />
            </motion.div>
          )}

          {/* B. Idle / Empty State */}
          {status === "idle" && (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-12 flex flex-col items-center gap-4 bg-background-secondary border border-brand-border w-full max-w-[600px] px-6"
            >
              <Search className="w-10 h-10 stroke-[1.2] text-brand-border" />
              <div>
                <h3 className="font-sans text-sm font-semibold text-text-primary">أدخلي رقم الطلب للمتابعة</h3>
                <p className="text-xs text-text-secondary font-light mt-1">لم تتبعي أي طلب بعد. أدخلي رقم طلبكِ في النموذج أعلاه لمشاهدة تفاصيل الشحن.</p>
              </div>
            </motion.div>
          )}

          {/* C. Not Found / Error State */}
          {status === "error" && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-center py-12 flex flex-col items-center gap-4 bg-background-secondary border border-brand-border w-full max-w-[600px] px-6"
            >
              <AlertCircle className="w-10 h-10 stroke-[1.2] text-accent" />
              <div>
                <h3 className="font-sans text-sm font-bold text-text-primary">لم يتم العثور على طلب</h3>
                <p className="text-xs text-text-secondary font-light mt-2 max-w-sm leading-relaxed">
                  رقم الطلب الذي أدخلتيه غير مسجل لدينا في أتيلييه AURA أو البيانات غير متطابقة. يرجى مراجعة واتساب التأكيد أو كتابة رقم الطلب بالشكل الصحيح (مثال: AURA-89304).
                </p>
              </div>
            </motion.div>
          )}

          {/* D. Success Searched State */}
          {status === "success" && searchedOrder && (
            <motion.div
              key="success"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="w-full flex flex-col gap-12"
            >
              {/* Timeline Container */}
              <div className="bg-background-secondary border border-brand-border p-6 md:p-10 flex flex-col gap-8 text-right" dir="rtl">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-brand-border pb-4">
                  <div>
                    <span className="font-sans text-[10px] text-text-secondary font-medium">حالة الطلب الحالي:</span>
                    <h2 className="font-sans text-lg font-bold text-accent mt-0.5">
                      {searchedOrder.status === "received" && "تم استلام الطلب وبانتظار اتصال الأتيلييه"}
                      {searchedOrder.status === "preparing" && "جاري تجهيز القطعة بعناية في أتيلييه أورا"}
                      {searchedOrder.status === "shipped" && "خرج للشحن مع مندوب التوصيل السريع"}
                      {searchedOrder.status === "delivered" && "تم تسليم الشحنة بنجاح"}
                    </h2>
                  </div>
                  <div className="md:text-left">
                    <span className="font-sans text-[10px] text-text-secondary font-medium block">التسليم المتوقع:</span>
                    <span className="font-sans text-sm font-semibold text-text-primary">خلال ٢ إلى ٥ أيام عمل</span>
                  </div>
                </div>

                {/* Editorial Progress Timeline (Desktop Horizontal / Mobile Vertical) */}
                <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-8 md:gap-4 py-6">
                  {/* Desktop connecting line */}
                  <div className="absolute top-1/2 left-4 right-4 h-[1px] bg-brand-border -translate-y-1/2 -z-10 hidden md:block" />
                  
                  {steps.map((step) => {
                    return (
                      <div
                        key={step.num}
                        className="flex md:flex-col items-center md:items-center gap-4 md:gap-2 text-right md:text-center relative z-10 bg-background-secondary md:px-4 flex-grow"
                      >
                        {/* Number Indicator */}
                        <div
                          className={`w-9 h-9 rounded-full font-display text-xs font-semibold flex items-center justify-center border transition-colors duration-500 ${
                            step.active
                              ? "bg-accent text-background-secondary border-accent"
                              : "bg-background-secondary text-text-secondary border-brand-border"
                          }`}
                        >
                          {step.num}
                        </div>
                        <div>
                          <h4 className={`font-sans text-xs font-bold ${step.active ? "text-text-primary" : "text-text-secondary"}`}>
                            {step.name}
                          </h4>
                          <span className="font-sans text-[10px] text-text-secondary font-light block mt-0.5">
                            {step.desc}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 4. Order Information Card */}
              <div className="bg-background-secondary border border-brand-border p-6 md:p-8 grid grid-cols-1 md:grid-cols-[100px_1fr] gap-6 items-center">
                {/* Product Thumbnail */}
                <div className="relative aspect-[3/4] w-20 md:w-24 overflow-hidden border border-brand-border bg-background-primary mx-auto md:mx-0">
                  <Image
                    src={searchedOrder.cartItems?.[0]?.image || "https://images.unsplash.com/photo-1595777457583-95e059d581b8?q=80&w=300&auto=format&fit=crop"}
                    alt="صورة المنتج المختار"
                    fill
                    sizes="96px"
                    className="object-cover"
                  />
                </div>

                {/* Details layout */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-right" dir="rtl">
                  <div>
                    <span className="font-sans text-[10px] text-text-secondary font-medium">رقم الطلب</span>
                    <h5 className="font-sans text-xs font-bold text-text-primary mt-0.5">#{searchedOrder.orderId}</h5>
                  </div>
                  <div>
                    <span className="font-sans text-[10px] text-text-secondary font-medium">التاريخ المعتمد</span>
                    <h5 className="font-sans text-xs font-bold text-text-primary mt-0.5">{searchedOrder.date || "٢١ يونيو ٢٠٢٦"}</h5>
                  </div>
                  <div>
                    <span className="font-sans text-[10px] text-text-secondary font-medium">المستلم والموقع</span>
                    <h5 className="font-sans text-xs font-bold text-text-primary mt-0.5">{searchedOrder.customerName} ({searchedOrder.governorate})</h5>
                  </div>
                  <div>
                    <span className="font-sans text-[10px] text-text-secondary font-medium">طريقة الدفع ونوع الشحن</span>
                    <h5 className="font-sans text-xs font-bold text-text-primary mt-0.5">{searchedOrder.paymentMethod} | شحن محافظات مصر</h5>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 5. Bespoke Support Section (max-w-[600px]) */}
      <section className="w-full max-w-[600px] border-t border-brand-border pt-12 text-center flex flex-col items-center gap-4">
        <h3 className="font-sans text-lg font-light text-text-primary">هل تحتاجين إلى مساعدة؟</h3>
        <p className="font-sans text-xs text-text-secondary font-light max-w-xs leading-relaxed">
          منسقو أتيلييه أورا جاهزون للتواصل معكِ وتحديثكِ بتفاصيل المقاسات الدقيقة أو حالة التحويل عبر الواتساب.
        </p>
        <div className="mt-2">
          <a href="https://wa.me/201000000000" target="_blank" rel="noopener noreferrer">
            <Button variant="dark-outline" className="px-10">تواصلي معنا</Button>
          </a>
        </div>
      </section>
    </main>
  );
}

// Main page component wrapped in Suspense
export default function TrackingPage() {
  return (
    <div className="bg-background-primary min-h-screen flex flex-col items-center">
      {/* 1. HERO SECTION - Minimal Campaign Header */}
      <section className="w-full bg-background-secondary py-16 md:py-24 border-b border-brand-border flex flex-col items-center">
        <div className="max-w-[720px] mx-auto px-6 text-center">
          <span className="font-sans text-[10px] text-accent font-bold uppercase">
            مسار مقتنياتكِ
          </span>
          <h1 className="font-sans text-3xl font-light text-text-primary mt-2">
            تتبع طلبكِ
          </h1>
          <p className="font-sans text-xs md:text-sm text-text-secondary font-light mt-3 leading-relaxed">
            تابعي رحلة تصميم وتجهيز قطع أورا الفاخرة خطوة بخطوة، بدءاً من القص والأشغال اليدوية بالأتيلييه وحتى وصول المندوب لباب منزلكِ.
          </p>
        </div>
      </section>

      <Suspense fallback={
        <div className="w-full max-w-[1280px] px-6 md:px-12 py-16 md:py-20 flex flex-col items-center">
          <TrackingResultSkeleton />
        </div>
      }>
        <TrackingContent />
      </Suspense>
    </div>
  );
}

