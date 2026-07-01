"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useStore } from "@/context/StoreContext";
import { useNotification } from "@/context/NotificationContext";
import { CouponService } from "@/lib/services/coupon.service";
import { OrderService } from "@/lib/services/order.service";
import { LuxuryInput, LuxurySelect } from "@/components/ui/Form";
import Button from "@/components/ui/Button";
import { analytics } from "@/utils/analytics";
import { IconCircleCheck as CheckCircle, IconTruck as Truck, IconShieldExclamation as ShieldAlert, IconLoader2 as Loader2, IconArrowLeft as ArrowLeft, IconArrowRight as ArrowRight, IconPackage as Package } from "@tabler/icons-react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { fadeIn, slideInRight, scaleIn } from "@/lib/animations";
import { eventBus } from "@/lib/events/EventBus";
import { refreshFromStorage as refreshCouponsFromStorage } from "@/data/mock/coupons";

export default function CheckoutPage() {
  const { showNotification } = useNotification();
  const { cart, cartSubtotal, clearCart } = useStore();
  const router = useRouter();

  // Wizard Steps: 1 = Personal Info, 2 = Shipping, 3 = Payment, 4 = Success
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generatedOrderId, setGeneratedOrderId] = useState("");
  // Snapshot of totals captured at submit (cart is cleared on success).
  const [submittedTotals, setSubmittedTotals] = useState<{ subtotal: number; discount: number; total: number; couponCode: string | null } | null>(null);

  // Form Fields
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    address: "",
    governorate: "cairo",
    phone: "",
    email: "",
    paymentMethod: "instapay",
  });

  // Validation Errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Coupon state (validated through the shared CouponService — same source as admin)
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{ id: string; code: string; discount: number; type: string; discountValue: number } | null>(null);
  const [couponError, setCouponError] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);

  const discount = appliedCoupon?.discount ?? 0;
  const cartTotal = Math.max(0, cartSubtotal - discount);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'aura_mock_db:coupons') {
        if (refreshCouponsFromStorage()) {
          eventBus.emit('coupon.changed');
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Re-validate the applied coupon whenever the cart subtotal changes (e.g. min-order no longer met).
  useEffect(() => {
    if (!appliedCoupon) return;
    let active = true;
    CouponService.calculateDiscount(appliedCoupon.code, cartSubtotal).then((res) => {
      if (!active) return;
      if (!res.valid) {
        setAppliedCoupon(null);
        setCouponError(res.error || "لم يعد الكوبون صالحاً");
      } else if (res.discountAmount !== appliedCoupon.discount) {
        setAppliedCoupon({
          id: appliedCoupon.id,
          code: appliedCoupon.code,
          discount: res.discountAmount,
          type: appliedCoupon.type,
          discountValue: appliedCoupon.discountValue
        });
      }
    });
    return () => { active = false; };
  }, [cartSubtotal]);

  // Reactive subscription to Coupon changes / deletions
  useEffect(() => {
    if (!appliedCoupon) return;
    const handleCouponChange = async () => {
      const res = await CouponService.calculateDiscount(appliedCoupon.code, cartSubtotal);
      if (!res.valid) {
        setAppliedCoupon(null);
        setCouponError(res.error || "تم إيقاف الكوبون من الإدارة");
      } else {
        setAppliedCoupon({
          id: res.coupon!.id,
          code: res.coupon!.code,
          discount: res.discountAmount,
          type: res.coupon!.type,
          discountValue: res.coupon!.discountValue
        });
      }
    };

    const handleCouponDelete = (payload: any) => {
      const deletedId = typeof payload === 'object' ? payload.id : payload;
      if (deletedId === appliedCoupon.id) {
        setAppliedCoupon(null);
        setCouponError("تم حذف هذا الكوبون من الإدارة");
      }
    };

    eventBus.subscribe('coupon.changed', handleCouponChange);
    eventBus.subscribe('coupon.deleted', handleCouponDelete);

    return () => {
      eventBus.unsubscribe('coupon.changed', handleCouponChange);
      eventBus.unsubscribe('coupon.deleted', handleCouponDelete);
    };
  }, [appliedCoupon, cartSubtotal]);

  const handleApplyCoupon = async () => {
    const code = couponInput.trim();
    if (!code) { setCouponError("أدخلي رمز الكوبون"); return; }
    setCouponLoading(true);
    setCouponError("");
    try {
      const res = await CouponService.calculateDiscount(code, cartSubtotal);
      if (!res.valid) {
        setAppliedCoupon(null);
        setCouponError(res.error || "الكوبون غير صالح");
      } else {
        setAppliedCoupon({
          id: res.coupon!.id,
          code: res.coupon!.code,
          discount: res.discountAmount,
          type: res.coupon!.type,
          discountValue: res.coupon!.discountValue
        });
        showNotification("تم تطبيق الكوبون بنجاح", "success");
      }
    } catch {
      setCouponError("تعذر التحقق من الكوبون");
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput("");
    setCouponError("");
  };

  // Trigger Checkout Start Analytics
  useEffect(() => {
    if (cart.length > 0) {
      analytics.trackCheckoutStart(cart.length, cartSubtotal);
    }
  }, [cart.length, cartSubtotal]);

  const governorateOptions = [
    { value: "cairo", label: "القاهرة" },
    { value: "giza", label: "الجيزة" },
    { value: "alexandria", label: "الإسكندرية" },
    { value: "qalyubia", label: "القليوبية" },
    { value: "dakahlia", label: "الدقهلية" },
    { value: "gharbia", label: "الغربية" },
    { value: "portsaid", label: "بور سعيد" },
    { value: "suez", label: "السويس" },
    { value: "sharqia", label: "الشرقية" },
    { value: "menofia", label: "المنوفية" },
    { value: "beheira", label: "البحيرة" },
    { value: "luxor", label: "الأقصر" },
    { value: "aswan", label: "أسوان" },
  ];

  const paymentOptions = [
    { value: "instapay", label: "InstaPay بعد مراجعة الطلب من مستشارة AURA" },
    { value: "vodafone-cash", label: "Vodafone Cash بعد تأكيد المقاس والتوفر" },
  ];

  // Helper validation for steps
  const validateStep = (currentStep: number) => {
    const newErrors: Record<string, string> = {};

    if (currentStep === 1) {
      if (!form.firstName.trim()) newErrors.firstName = "الاسم الأول مطلوب";
      if (!form.lastName.trim()) newErrors.lastName = "اسم العائلة مطلوب";
      
      const phoneRegex = /^01[0125][0-9]{8}$/;
      if (!form.phone.trim()) {
        newErrors.phone = "رقم الهاتف مطلوب";
      } else if (!phoneRegex.test(form.phone.trim())) {
        newErrors.phone = "رقم الهاتف المصري غير صحيح (مثال: 01000000000 مكون من 11 رقماً)";
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!form.email.trim()) {
        newErrors.email = "البريد الإلكتروني مطلوب";
      } else if (!emailRegex.test(form.email.trim())) {
        newErrors.email = "البريد الإلكتروني غير صحيح";
      }
    }

    if (currentStep === 2) {
      if (!form.address.trim() || form.address.trim().length < 8) {
        newErrors.address = "يرجى كتابة العنوان بالتفصيل (8 أحرف على الأقل)";
      }
      if (!form.governorate) {
        newErrors.governorate = "المحافظة مطلوبة";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNextStep = () => {
    if (validateStep(step)) {
      setStep((prev) => prev + 1);
      window.scrollTo(0, 0);
    } else {
      showNotification("يرجى تصحيح الأخطاء الموضحة قبل المتابعة", "warning");
    }
  };

  const handlePrevStep = () => {
    setStep((prev) => Math.max(1, prev - 1));
    window.scrollTo(0, 0);
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(3)) return;

    setIsSubmitting(true);

    const governorateLabelValue = governorateOptions.find(o => o.value === form.governorate)?.label || form.governorate;
    const paymentLabel = form.paymentMethod === "instapay" ? "InstaPay" : "Vodafone Cash";

    try {
      // Create the order through the SAME unified OrderService the admin uses, so it
      // persists in mockStorage and appears live in Admin → Orders via the EventBus.
      const created = await OrderService.createOrder({
        customerId: "",
        customerName: `${form.firstName} ${form.lastName}`.trim(),
        customerEmail: form.email.trim(),
        customerPhone: form.phone.trim(),
        shippingAddress: `${governorateLabelValue} - ${form.address}`,
        shipping: 0,
        taxRate: 0,
        discount,
        couponCode: appliedCoupon?.code ?? null,
        couponId: appliedCoupon?.id ?? null,
        discountValue: appliedCoupon?.discountValue ?? 0,
        discountType: (appliedCoupon?.type as any) ?? undefined,
        paymentMethod: form.paymentMethod,
        source: "storefront",
        notes: `طلب من المتجر — طريقة الدفع: ${paymentLabel}`,
        items: cart.map((item) => ({
          productId: String(item.id),
          productName: item.title,
          sku: String(item.id),
          quantity: item.quantity,
          price: item.price,
          image: item.image,
          size: item.size,
          color: item.color,
        })),
      });

      setGeneratedOrderId(created.orderNumber);
      setSubmittedTotals({ subtotal: cartSubtotal, discount, total: cartTotal, couponCode: appliedCoupon?.code ?? null });

      // Remember the latest order number so the tracking page can preload it.
      localStorage.setItem("aura_last_order_id", created.orderNumber);

      // Record coupon redemption through the shared service (auto-disables at limit,
      // emits coupon.used → admin coupon list updates live).
      if (appliedCoupon) {
        await CouponService.incrementUsage(appliedCoupon.code);
      }

      analytics.trackPurchaseSuccess(created.orderNumber, cart, cartTotal, form.paymentMethod);

      setStep(4);
      clearCart();
      showNotification("تم إرسال طلبكِ إلى مستشارة AURA بنجاح", "success");
    } catch {
      showNotification("تعذر إرسال الطلب، يرجى المحاولة مرة أخرى", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (cart.length === 0 && step !== 4) {
    return (
      <div className="max-w-[720px] mx-auto py-24 px-6 text-center flex flex-col items-center gap-6">
        <Package className="w-16 h-16 stroke-[1.2] text-brand-border" />
        <div>
          <h2 className="font-sans text-3xl font-light text-text-primary">حقيبتكِ فارغة حالياً</h2>
          <p className="text-xs text-text-secondary mt-2">لا يمكنكِ إتمام الطلب من دون إضافة قطع كوتور أولاً.</p>
        </div>
        <Link href="/shop" className="mt-4">
          <Button variant="primary">زيارة المتجر الكوتور</Button>
        </Link>
      </div>
    );
  }

  const governorateLabel = governorateOptions.find((o) => o.value === form.governorate)?.label || "";

  return (
    <div className="bg-background-primary min-h-screen flex flex-col items-center pb-20">
      {/* 1. Header */}
      <section className="w-full bg-background-secondary py-12 border-b border-brand-border flex flex-col items-center">
        <div className="max-w-[720px] mx-auto px-6 text-center">
          <span className="font-sans text-[10px] text-accent font-bold uppercase">
            طلب AURA الخاص
          </span>
          <h1 className="font-sans text-3xl font-light text-text-primary mt-2">
            إرسال طلب المراجعة
          </h1>
        </div>
      </section>

      {/* 2. Step Indicator (Desktop/Mobile responsive) */}
      {step < 4 && (
        <div className="w-full max-w-[800px] px-6 mt-8">
          <div className="flex justify-between items-center relative py-4" dir="rtl">
            <div className="absolute top-1/2 start-0 end-0 h-[1.5px] bg-brand-border -translate-y-1/2 -z-10" />
            <motion.div
              className="absolute top-1/2 start-0 h-[1.5px] bg-accent -translate-y-1/2 -z-10"
              initial={false}
              animate={{ width: `${((step - 1) / 2) * 100}%` }}
              transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
            />

            {[
              { num: 1, name: "البيانات الشخصية" },
              { num: 2, name: "تفاصيل الشحن" },
              { num: 3, name: "طريقة الدفع" },
            ].map((s) => (
              <div key={s.num} className="flex flex-col items-center bg-background-primary px-4 z-10 relative">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center border text-xs font-sans font-bold transition-all duration-300 ${
                    step >= s.num
                      ? "bg-accent text-background-secondary border-accent"
                      : "bg-background-secondary text-text-secondary border-brand-border"
                  }`}
                >
                  {step > s.num ? "✓" : s.num}
                </div>
                <span className={`text-[10px] font-sans font-bold mt-1.5 hidden sm:block ${step >= s.num ? "text-text-primary" : "text-text-secondary"}`}>
                  {s.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Main content */}
      <main className="w-full max-w-[1280px] px-6 md:px-12 mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-8 md:gap-12 items-start">
          
          {/* Form Wizard Area */}
          <div className="bg-background-secondary border border-brand-border p-6 md:p-8 min-h-[420px] relative">
            
            <AnimatePresence mode="wait">
              {isSubmitting ? (
                /* Simulated Luxury Loading Screen */
                <motion.div
                  {...fadeIn}
                  className="absolute inset-0 bg-background-secondary/95 z-30 flex flex-col justify-center items-center text-center gap-4 p-8"
                >
                  <Loader2 className="w-12 h-12 stroke-[1.2] text-accent animate-spin" />
                  <div className="flex flex-col gap-2">
                    <p className="font-sans text-base font-semibold text-text-primary">جاري إرسال طلبكِ الفاخر...</p>
                    <p className="text-xs text-text-secondary font-light max-w-xs leading-relaxed">
                      يتم الآن صياغة كود الطلب وتنسيق قياساتكِ وتفاصيل الشحن يدوياً بأتيلييه الجيزة.
                    </p>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>

            {/* STEP 1: Personal Info */}
            {step === 1 && (
              <motion.div {...slideInRight}>
                <h3 className="font-sans text-base font-bold text-text-primary mb-6 border-b border-brand-border pb-3 text-right">
                  ١. البيانات الشخصية وبيانات الاتصال
                </h3>
                <div className="flex flex-col gap-5 text-right" dir="rtl">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <LuxuryInput
                      label="الاسم الأول *"
                      placeholder="مثال: ياسمين"
                      required
                      value={form.firstName}
                      onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                      error={errors.firstName}
                    />
                    <LuxuryInput
                      label="اسم العائلة *"
                      placeholder="مثال: الشافعي"
                      required
                      value={form.lastName}
                      onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                      error={errors.lastName}
                    />
                  </div>

                  <LuxuryInput
                    label="رقم الهاتف الجوال (مرتبط بالواتساب للتنسيق) *"
                    placeholder="مثال: 01000000000 (11 رقماً)"
                    required
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    error={errors.phone}
                  />

                  <LuxuryInput
                    label="البريد الإلكتروني المعتمد *"
                    placeholder="مثال: yasmin@example.com"
                    required
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    error={errors.email}
                  />

                  <div className="flex justify-end mt-6">
                    <Button variant="primary" onClick={handleNextStep} className="w-full sm:w-auto px-12">
                      <span>متابعة تفاصيل الشحن</span>
                      <ArrowLeft className="w-4 h-4 mr-2" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 2: Shipping Details */}
            {step === 2 && (
              <motion.div {...slideInRight}>
                <h3 className="font-sans text-base font-bold text-text-primary mb-6 border-b border-brand-border pb-3 text-right">
                  ٢. تفاصيل الشحن والتسليم
                </h3>
                <div className="flex flex-col gap-5 text-right" dir="rtl">
                  <LuxurySelect
                    label="المحافظة *"
                    options={governorateOptions}
                    required
                    value={form.governorate}
                    onChange={(e) => setForm({ ...form, governorate: e.target.value })}
                    error={errors.governorate}
                  />

                  <LuxuryInput
                    label="العنوان بالتفصيل (الشارع / رقم المبنى / الدور / الشقة) *"
                    placeholder="مثال: حي لوران - طريق الجيش الرئيسي - مبنى ٤٢ - شقة ٤"
                    required
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    error={errors.address}
                  />

                  <div className="bg-background-primary p-4 border border-brand-border text-xs text-text-secondary leading-relaxed flex items-start gap-2.5">
                    <Truck className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                    <p>
                      الشحن متوفر بالكامل لجميع محافظات جمهورية مصر العربية مجانًا. تستغرق مدة التوصيل من يومين إلى ٥ أيام عمل كحد أقصى بعد تأكيد خياط الأتيلييه لمقاساتكِ هاتفياً.
                    </p>
                  </div>

                  <div className="flex justify-between items-center mt-8">
                    <Button variant="secondary" onClick={handlePrevStep} className="px-6">
                      <ArrowRight className="w-4 h-4 ml-2" />
                      <span>السابق</span>
                    </Button>
                    <Button variant="primary" onClick={handleNextStep} className="px-12">
                      <span>متابعة لطريقة الدفع</span>
                      <ArrowLeft className="w-4 h-4 mr-2" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 3: Payment Selection */}
            {step === 3 && (
              <motion.div {...slideInRight}>
                <h3 className="font-sans text-base font-bold text-text-primary mb-6 border-b border-brand-border pb-3 text-right">
                  ٣. تفضيل الدفع بعد المراجعة
                </h3>
                <form onSubmit={handleFinalSubmit} className="flex flex-col gap-5 text-right" dir="rtl">
                  
                  <LuxurySelect
                    label="اختاري طريقة الدفع المفضلة بعد اعتماد الطلب *"
                    options={paymentOptions}
                    required
                    value={form.paymentMethod}
                    onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
                  />

                  <div className="bg-background-primary p-5 border border-brand-border flex flex-col gap-3">
                    <p className="font-sans text-xs text-text-secondary leading-relaxed">
                      {form.paymentMethod === "instapay"
                        ? "سيتم مراجعة طلبكِ من مستشارة AURA أولاً للتأكد من المقاس والتوفر ومدة التجهيز، ثم تُرسل لكِ بيانات InstaPay المعتمدة لإتمام الدفع بأمان."
                        : "بعد مراجعة المقاس والتوفر، ترسل لكِ مستشارة AURA رقم المحفظة المعتمد عبر واتساب لتأكيد حجز القطعة وتجهيزها للشحن."}
                    </p>
                    
                    <div className="border-t border-brand-border/60 pt-3 mt-1 flex items-start gap-2 text-[10px] text-accent leading-relaxed">
                      <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold block mb-0.5">ملاحظة قبل اعتماد الدفع:</span>
                        إرسال الطلب لا يخصم أي مبلغ تلقائياً. فريق AURA يراجع التفاصيل أولاً، ثم يؤكد وسيلة الدفع والموعد المتوقع عبر واتساب.
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center mt-8">
                    <Button variant="secondary" onClick={handlePrevStep} className="px-6" type="button">
                      <ArrowRight className="w-4 h-4 ml-2" />
                      <span>السابق</span>
                    </Button>
                    <Button variant="primary" type="submit" className="px-12">
                      <span>إرسال الطلب للمراجعة</span>
                    </Button>
                  </div>

                </form>
              </motion.div>
            )}

            {/* STEP 4: Success Confirmation */}
            {step === 4 && (
              <motion.div
                {...scaleIn}
                className="flex flex-col items-center text-center gap-6 py-8"
              >
                <CheckCircle className="w-16 h-16 text-accent stroke-[1.2]" />
                
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] text-accent font-sans font-bold uppercase">طلبكِ وصل إلى مستشارة AURA</span>
                  <h3 className="font-sans text-2xl font-light text-text-primary">تم إرسال طلب المراجعة بنجاح</h3>
                  <p className="text-xs text-text-secondary max-w-sm mt-1 leading-relaxed">
                    شكراً لاختياركِ دار AURA للأزياء الراقية. سيتواصل معكِ فريق AURA عبر واتساب لتأكيد المقاسات، توفر القطعة، وبيانات الدفع قبل اعتماد الطلب نهائياً.
                  </p>
                </div>

                {/* Demo notice tag */}
                <div className="bg-accent/5 border border-accent/20 px-4 py-2 text-[10px] text-accent font-sans flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-accent animate-ping" />
                  <span>طبيعة التشغيل: وضع العرض التجريبي (Frontend Demo Mode) - لم يتم خصم أموال</span>
                </div>

                {/* Details summary */}
                <div className="w-full max-w-[500px] bg-background-primary border border-brand-border p-5 text-right flex flex-col gap-3 text-xs font-sans mt-2" dir="rtl">
                  <div className="flex justify-between border-b border-brand-border/60 pb-2 font-bold">
                    <span>رقم طلب المراجعة:</span>
                    <span className="text-accent text-sm font-display font-bold">{generatedOrderId}</span>
                  </div>
                  <div className="flex justify-between border-b border-brand-border/40 pb-2">
                    <span>المستلم:</span>
                    <span>{form.firstName} {form.lastName}</span>
                  </div>
                  <div className="flex justify-between border-b border-brand-border/40 pb-2">
                    <span>رقم الهاتف:</span>
                    <span>{form.phone}</span>
                  </div>
                  <div className="flex justify-between border-b border-brand-border/40 pb-2">
                    <span>العنوان والتسليم:</span>
                    <span>{governorateLabel} - {form.address}</span>
                  </div>
                  <div className="flex justify-between border-b border-brand-border/40 pb-2">
                    <span>طريقة الدفع والتأكيد:</span>
                    <span>{form.paymentMethod === "instapay" ? "InstaPay" : "Vodafone Cash"}</span>
                  </div>
                  {submittedTotals && submittedTotals.discount > 0 && (
                    <div className="flex justify-between border-b border-brand-border/40 pb-2 text-accent">
                      <span>الخصم{submittedTotals.couponCode ? ` (${submittedTotals.couponCode})` : ""}:</span>
                      <span>- {submittedTotals.discount.toLocaleString()} ج.م</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold pt-1">
                    <span>المبلغ قبل مراجعة المستشارة:</span>
                    <span className="text-accent text-sm">{(submittedTotals?.total ?? cartSubtotal).toLocaleString()} ج.م</span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 mt-4 w-full max-w-[400px]">
                  <button
                    onClick={() => router.push(`/tracking?id=${generatedOrderId}`)}
                    className="inline-flex items-center justify-center bg-text-primary text-background-secondary font-sans text-xs min-h-[44px] hover:bg-accent transition-colors flex-grow cursor-pointer"
                  >
                    متابعة طلب المراجعة
                  </button>
                  <Link href="/shop" className="flex-grow">
                    <Button variant="secondary" className="w-full">مواصلة التسوق</Button>
                  </Link>
                </div>
              </motion.div>
            )}

          </div>

          {/* Checkout Summary sidebar (Solid panel, no glass) */}
          {step < 4 && (
            <aside className="bg-background-secondary border border-brand-border p-6 md:p-8 flex flex-col gap-6 lg:sticky lg:top-24 text-right" dir="rtl">
              <h3 className="font-sans text-sm font-bold text-text-primary border-b border-brand-border pb-4">ملخص شحنتكِ</h3>
              
              {/* Items List */}
              <div className="flex flex-col gap-4 border-b border-brand-border pb-4 max-h-[220px] overflow-y-auto scrollbar-none">
                {cart.map((item) => (
                  <div key={`${item.id}-${item.color}-${item.size}`} className="flex gap-4 items-center">
                    <div className="relative w-10 h-14 shrink-0 bg-background-primary border border-brand-border">
                      <Image src={item.image} alt={item.title} fill sizes="40px" className="object-cover" />
                    </div>
                    <div className="flex-grow min-w-0">
                      <h4 className="font-sans text-xs font-medium truncate max-w-[160px]">{item.title}</h4>
                      <span className="text-[10px] text-text-secondary font-light block mt-0.5">
                        المقاس: {item.size} | اللون: {item.color} | العدد: {item.quantity}
                      </span>
                    </div>
                    <span className="font-display text-xs font-bold text-accent shrink-0">
                      {(item.price * item.quantity).toLocaleString()} ج.م
                    </span>
                  </div>
                ))}
              </div>

              {/* Coupon Code */}
              <div className="flex flex-col gap-2 border-b border-brand-border pb-4">
                {appliedCoupon ? (
                  <div className="flex justify-between items-center bg-accent/5 border border-accent/20 px-3 py-2">
                    <div className="flex flex-col">
                      <span className="font-sans text-xs font-bold text-accent uppercase">{appliedCoupon.code}</span>
                      <span className="text-[10px] text-text-secondary">تم تطبيق الخصم</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveCoupon}
                      className="text-[10px] text-text-secondary hover:text-accent underline"
                    >
                      إزالة
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      id="couponInput"
                      aria-label="رمز الكوبون"
                      value={couponInput}
                      onChange={(e) => { setCouponInput(e.target.value); setCouponError(""); }}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleApplyCoupon(); } }}
                      placeholder="رمز الكوبون"
                      className="flex-grow min-w-0 bg-background-primary border border-brand-border px-3 py-2 text-xs font-sans text-text-primary placeholder:text-text-secondary outline-none focus:border-accent transition-colors uppercase"
                    />
                    <button
                      type="button"
                      onClick={handleApplyCoupon}
                      disabled={couponLoading}
                      className="bg-text-primary text-background-secondary px-4 text-xs font-sans font-bold hover:bg-accent transition-colors disabled:opacity-50 shrink-0"
                    >
                      {couponLoading ? "..." : "تطبيق"}
                    </button>
                  </div>
                )}
                {couponError && <span className="text-[10px] text-red-500 font-sans">{couponError}</span>}
              </div>

              {/* Cost Calculations */}
              <div className="flex flex-col gap-3 text-xs font-sans text-text-secondary border-b border-brand-border pb-4">
                <div className="flex justify-between">
                  <span>المجموع الفرعي:</span>
                  <span className="font-display">{(cartSubtotal).toLocaleString()} ج.م</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-accent">
                    <span>الخصم{appliedCoupon ? ` (${appliedCoupon.code})` : ""}:</span>
                    <span className="font-display">- {discount.toLocaleString()} ج.م</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>التعبئة والعلبة الحصرية:</span>
                  <span>مجانًا</span>
                </div>
                <div className="flex justify-between">
                  <span>الشحن السريع (محافظات مصر):</span>
                  <span>مجانًا</span>
                </div>
              </div>

              <div className="flex justify-between items-center text-sm font-bold text-text-primary">
                <span className="font-sans">المجموع الإجمالي:</span>
                <span className="font-display text-lg text-accent">{(cartTotal).toLocaleString()} ج.م</span>
              </div>
            </aside>
          )}

        </div>
      </main>
    </div>
  );
}

