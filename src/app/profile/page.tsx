"use client";

import React, { useState } from "react";
import Link from "next/link";
import { LuxuryInput } from "@/components/ui/Form";
import Button from "@/components/ui/Button";
import { User, Package, Settings, Ruler, Check } from "lucide-react";
import { motion } from "framer-motion";
import Image from "next/image";

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState("orders");
  const [isSaved, setIsSaved] = useState(false);

  const [measurements, setMeasurements] = useState({
    bust: "88 سم",
    waist: "68 سم",
    hips: "94 سم",
    height: "170 سم",
  });

  const handleSaveMeasurements = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const tabs = [
    { id: "orders", label: "طلبات الكوتور الخاصة", icon: Package },
    { id: "measurements", label: "قياسات قوامكِ كوتور", icon: Ruler },
    { id: "settings", label: "بيانات الحساب الفردية", icon: Settings },
  ];

  return (
    <div className="bg-background-primary min-h-screen">
      {/* 1. Header */}
      <section className="bg-background-secondary py-12 border-b border-brand-border/60">
        <div className="container text-center max-w-2xl flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center text-accent">
            <User className="w-8 h-8 stroke-[1.2]" />
          </div>
          <div>
            <span className="text-[10px] text-text-secondary uppercase-letter-spacing font-light block">
              عضو صالون أورا الخاص
            </span>
            <h1 className="text-serif text-3xl font-light text-text-primary mt-1">
              نورة آل سعود
            </h1>
          </div>
        </div>
      </section>

      {/* 2. Content */}
      <main className="container py-16">
        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-8 md:gap-12 items-start">
          
          {/* Right Navigation (RTL layout) */}
          <aside className="bg-background-secondary border border-brand-border/60 p-4 flex flex-col gap-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-xs uppercase-letter-spacing transition-colors ${
                    activeTab === tab.id
                      ? "text-accent bg-accent/5 font-bold"
                      : "text-text-secondary hover:text-text-primary"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </aside>

          {/* Left Content Area */}
          <div className="bg-background-secondary border border-brand-border/60 p-6 md:p-8 min-h-[400px]">
            
            {/* TAB 1: Orders Log */}
            {activeTab === "orders" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-6">
                <h3 className="text-serif text-lg font-bold text-text-primary border-b border-brand-border pb-3">تاريخ طلباتكِ</h3>
                
                {/* Order Item */}
                <div className="border border-brand-border p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="flex gap-4 items-center">
                  <div className="relative w-12 h-16 shrink-0 bg-background-primary">
                    <Image
                      src="https://images.unsplash.com/photo-1595777457583-95e059d581b8?q=80&w=300&auto=format&fit=crop"
                      alt=""
                      fill
                      sizes="48px"
                      className="object-cover"
                    />
                  </div>
                    <div>
                      <span className="text-[10px] text-accent uppercase-letter-spacing font-bold">مكتمل الشحن</span>
                      <h4 className="text-serif text-sm font-light mt-0.5">فستان أورا من الحرير بفتحة كتف راقية</h4>
                      <span className="text-[10px] text-text-secondary font-light">طلب رقم: AURA-89304 | ٢١ يونيو ٢٠٢٦</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                    <span className="text-sm font-bold text-accent font-display">٣,٤٠٠ ج.م</span>
                    <Link href="/tracking" className="text-xs text-text-primary underline underline-offset-4 font-light font-sans">
                      تتبع مسار الشحنة
                    </Link>
                  </div>
                </div>
              </motion.div>
            )}

            {/* TAB 2: Couture Measurements Form */}
            {activeTab === "measurements" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-6">
                <div className="border-b border-brand-border pb-3">
                  <h3 className="text-serif text-lg font-bold text-text-primary">مذكرة قياسات قوامكِ كوتور</h3>
                  <p className="text-xs text-text-secondary font-light mt-1">يستخدم خياطونا هذه القياسات لضبط القطع وتعديلها لتلائم قوامكِ تماماً قبل التعليب والشحن.</p>
                </div>

                <form onSubmit={handleSaveMeasurements} className="flex flex-col gap-6 max-w-md">
                  <div className="grid grid-cols-2 gap-4">
                    <LuxuryInput
                      label="محيط الصدر (Bust)"
                      value={measurements.bust}
                      onChange={(e) => setMeasurements({ ...measurements, bust: e.target.value })}
                    />
                    <LuxuryInput
                      label="محيط الخصر (Waist)"
                      value={measurements.waist}
                      onChange={(e) => setMeasurements({ ...measurements, waist: e.target.value })}
                    />
                    <LuxuryInput
                      label="محيط الورك (Hips)"
                      value={measurements.hips}
                      onChange={(e) => setMeasurements({ ...measurements, hips: e.target.value })}
                    />
                    <LuxuryInput
                      label="الطول الإجمالي (Height)"
                      value={measurements.height}
                      onChange={(e) => setMeasurements({ ...measurements, height: e.target.value })}
                    />
                  </div>

                  <Button type="submit" variant="primary" className="h-11">
                    {isSaved ? (
                      <>
                        <Check className="w-4 h-4 text-background-secondary" />
                        <span>تم حفظ قياساتكِ بنجاح</span>
                      </>
                    ) : (
                      <span>تحديث مذكرة القياسات</span>
                    )}
                  </Button>
                </form>
              </motion.div>
            )}

            {/* TAB 3: Settings */}
            {activeTab === "settings" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-6">
                <h3 className="text-serif text-lg font-bold text-text-primary border-b border-brand-border pb-3">بيانات الحساب الفردية</h3>
                
                <div className="flex flex-col gap-4 max-w-md font-sans">
                  <LuxuryInput label="عنوان البريد الإلكتروني" value="noura@example.com" disabled />
                  <LuxuryInput label="رقم الجوال المعتمد" value="01XXXXXXXXX 20+" disabled />
                  <p className="text-[10px] text-text-secondary font-light">يرجى التواصل مع صالة عناية العملاء care@aurafashion.eg لتغيير البريد الإلكتروني أو الهاتف المعتمد.</p>
                </div>
              </motion.div>
            )}

          </div>

        </div>
      </main>
    </div>
  );
}
