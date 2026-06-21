"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useStore } from "@/context/StoreContext";
import { useNotification } from "@/context/NotificationContext";
import { LuxuryInput, LuxurySelect } from "@/components/ui/Form";
import Button from "@/components/ui/Button";
import { analytics } from "@/utils/analytics";
import { CheckCircle, Truck, ShieldAlert, Loader2, ArrowLeft, ArrowRight, Package } from "lucide-react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

export default function CheckoutPage() {
  const { showNotification } = useNotification();
  const { cart, cartSubtotal, clearCart } = useStore();
  const router = useRouter();

  // Wizard Steps: 1 = Personal Info, 2 = Shipping, 3 = Payment, 4 = Success
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generatedOrderId, setGeneratedOrderId] = useState("");

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

  const handleFinalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(3)) return;

    setIsSubmitting(true);

    // Submit concierge order request
    setTimeout(() => {
      const orderId = `AURA-${Math.floor(10000 + Math.random() * 90000)}`;
      setGeneratedOrderId(orderId);
      
      // Store the concierge request locally until backend order sync is connected
      const conciergeOrder = {
        orderId,
        date: new Date().toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" }),
        customerName: `${form.firstName} ${form.lastName}`,
        paymentMethod: form.paymentMethod === "instapay" ? "InstaPay" : "Vodafone Cash",
        subtotal: cartSubtotal,
        cartItems: [...cart],
        address: form.address,
        governorate: governorateOptions.find(o => o.value === form.governorate)?.label || form.governorate,
        status: "received"
      };
      
      localStorage.setItem(`aura_order_${orderId}`, JSON.stringify(conciergeOrder));
      // Save order ID to active tracking list for easy tracking page loading
      localStorage.setItem("aura_last_order_id", orderId);

      // Trigger analytics
      analytics.trackPurchaseSuccess(orderId, cart, cartSubtotal, form.paymentMethod);

      setIsSubmitting(false);
      setStep(4);
      clearCart();
      showNotification("تم إرسال طلبكِ إلى مستشارة AURA بنجاح", "success");
    }, 2000);
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
            <div className="absolute top-1/2 left-0 right-0 h-[1.5px] bg-brand-border -translate-y-1/2 -z-10" />
            
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
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-background-secondary/95 z-30 flex flex-col justify-center items-center text-center gap-4 p-8"
                >
                  <Loader2 className="w-12 h-12 stroke-[1.2] text-accent animate-spin" />
                  <div className="flex flex-col gap-2">
                    <p className="font-sans text-base font-semibold text-text-primary">جاري إرسال طلبكِ الفاخر...</p>
                    <p className="text-xs text-text-secondary font-light max-w-xs leading-relaxed">
                      يتم الآن صياغة كود الطلب وتنسيق قياساتكِ وتفاصيل الشحن يدوياً بأتيلييه الإسكندرية.
                    </p>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>

            {/* STEP 1: Personal Info */}
            {step === 1 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
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
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
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
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
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
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
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
                  <div className="flex justify-between font-bold pt-1">
                    <span>المبلغ قبل مراجعة المستشارة:</span>
                    <span className="text-accent text-sm">{cartSubtotal.toLocaleString()} ج.م</span>
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
                      <Image src={item.image} alt="" fill sizes="40px" className="object-cover" />
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

              {/* Cost Calculations */}
              <div className="flex flex-col gap-3 text-xs font-sans text-text-secondary border-b border-brand-border pb-4">
                <div className="flex justify-between">
                  <span>المجموع الفرعي:</span>
                  <span className="font-display">{(cartSubtotal).toLocaleString()} ج.م</span>
                </div>
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
                <span className="font-display text-lg text-accent">{(cartSubtotal).toLocaleString()} ج.م</span>
              </div>
            </aside>
          )}

        </div>
      </main>
    </div>
  );
}

