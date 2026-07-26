"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  IconDownload,
  IconPrinter,
  IconBrandWhatsapp,
  IconBrandInstagram,
  IconBrandFacebook,
  IconTruck,
} from "@tabler/icons-react";
import type { Order } from "@/data/mock/orders";
import type { StoreInfo } from "@/lib/services/storefront/store.service";
import { formatCurrency, formatDate } from "@/lib/utils/formatters";
import { getInvoiceNumber, getPaymentBadgeMeta } from "@/lib/orders/invoice-helpers";
import { getStatusMeta, buildCustomerTimeline, hasShipped } from "@/lib/orders/order-status";
import { downloadInvoicePdf } from "@/lib/pdf/generate-invoice-pdf";
import { generateTrackingQrCode } from "@/lib/pdf/qr-code";
import { useNotification } from "@/context/NotificationContext";

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cod: "الدفع عند الاستلام",
  card: "بطاقة ائتمان",
  instapay: "InstaPay",
  "vodafone-cash": "Vodafone Cash",
  vodafone_cash: "فودافون كاش",
  bank_transfer: "تحويل بنكي",
};

interface InvoiceViewProps {
  order: Order;
  storeInfo: StoreInfo;
  /** Hide the built-in Download/Print action row (host page renders its own). */
  hideActions?: boolean;
}

export default function InvoiceView({ order, storeInfo, hideActions }: InvoiceViewProps) {
  const { showNotification } = useNotification();
  const [downloading, setDownloading] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    generateTrackingQrCode(order.orderNumber).then((url) => {
      if (active) setQrCodeDataUrl(url);
    });
    return () => {
      active = false;
    };
  }, [order.orderNumber]);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await downloadInvoicePdf(order, storeInfo);
    } catch (error) {
      console.error('Failed to generate invoice PDF:', error);
      showNotification('تعذّر تحميل الفاتورة، يرجى المحاولة مرة أخرى', 'error');
    } finally {
      setDownloading(false);
    }
  };

  const invoiceNumber = getInvoiceNumber(order);
  const paymentBadge = getPaymentBadgeMeta(order);
  const statusMeta = getStatusMeta(order.status);
  const timeline = buildCustomerTimeline(order);
  const paymentMethodLabel = order.paymentMethod ? (PAYMENT_METHOD_LABELS[order.paymentMethod] ?? order.paymentMethod) : "—";
  const trackingPath = `/tracking?order=${encodeURIComponent(order.orderNumber)}`;

  const socialLinks = [
    (storeInfo.socialMedia?.whatsapp || storeInfo.whatsapp) && {
      key: "whatsapp",
      label: "WhatsApp",
      href: storeInfo.socialMedia?.whatsapp || storeInfo.whatsapp,
      Icon: IconBrandWhatsapp,
    },
    storeInfo.socialMedia?.instagram && { key: "instagram", label: "Instagram", href: storeInfo.socialMedia.instagram, Icon: IconBrandInstagram },
    storeInfo.socialMedia?.facebook && { key: "facebook", label: "Facebook", href: storeInfo.socialMedia.facebook, Icon: IconBrandFacebook },
  ].filter(Boolean) as Array<{ key: string; label: string; href: string; Icon: typeof IconBrandWhatsapp }>;

  return (
    <div className="w-full" dir="rtl">
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @media print {
          body * { visibility: hidden; }
          #printable-invoice, #printable-invoice * { visibility: visible; }
          #printable-invoice {
            position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 0; box-shadow: none;
          }
          @page { size: A4; margin: 0; }
        }
      `,
        }}
      />

      {!hideActions && (
        <div className="flex items-center justify-end gap-3 mb-4 print:hidden">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-5 py-2.5 border border-brand-border text-text-primary text-xs font-sans font-medium rounded-full hover:border-accent transition-colors"
          >
            <IconPrinter size={16} /> طباعة الفاتورة
          </button>
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-text-primary text-background-secondary text-xs font-sans font-medium rounded-full hover:bg-accent transition-colors disabled:opacity-60"
          >
            <IconDownload size={16} /> {downloading ? "جاري التحميل..." : "تحميل PDF"}
          </button>
        </div>
      )}

      <div
        id="printable-invoice"
        className="max-w-4xl mx-auto bg-background-secondary border border-brand-border rounded-2xl shadow-sm p-6 sm:p-10 md:p-14"
      >
        {/* Header */}
        <div className="flex flex-col items-center text-center border-b border-brand-border pb-8 mb-8">
          <span className="font-display text-4xl tracking-widest text-text-primary">AURA</span>
          <span className="font-sans text-[10px] text-accent font-bold uppercase tracking-wider mt-1">Luxury Fashion House</span>
          <h1 className="font-display text-2xl text-text-primary mt-4">Invoice</h1>
        </div>

        {/* Meta grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 bg-background-primary border border-brand-border rounded-xl p-5 mb-8">
          <div>
            <p className="text-[10px] text-text-secondary font-sans">رقم الفاتورة</p>
            <p className="font-sans text-sm font-bold text-text-primary mt-0.5">{invoiceNumber}</p>
          </div>
          <div>
            <p className="text-[10px] text-text-secondary font-sans">رقم الطلب</p>
            <p className="font-sans text-sm font-bold text-text-primary mt-0.5">{order.orderNumber}</p>
          </div>
          <div>
            <p className="text-[10px] text-text-secondary font-sans">تاريخ الفاتورة</p>
            <p className="font-sans text-sm font-bold text-text-primary mt-0.5">{formatDate(order.date)}</p>
          </div>
          <div>
            <p className="text-[10px] text-text-secondary font-sans">رقم التتبع</p>
            <p className="font-sans text-sm font-bold text-accent mt-0.5" dir="ltr">{order.trackingNumber || "—"}</p>
          </div>
          <div>
            <p className="text-[10px] text-text-secondary font-sans">حالة الطلب</p>
            <p className="font-sans text-sm font-bold text-text-primary mt-0.5">{statusMeta.label}</p>
          </div>
          <div>
            <p className="text-[10px] text-text-secondary font-sans">حالة الدفع</p>
            <span
              className="inline-block mt-0.5 px-3 py-1 rounded-full text-[10px] font-sans font-bold"
              style={{ backgroundColor: paymentBadge.bg, color: paymentBadge.fg }}
            >
              {paymentBadge.label}
            </span>
          </div>
        </div>

        {/* Customer + Payment */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
          <div className="bg-background-primary border border-brand-border rounded-xl p-5">
            <h3 className="font-display text-base text-text-primary mb-3">بيانات العميل</h3>
            <div className="space-y-2 text-xs font-sans">
              <div className="flex justify-between"><span className="text-text-secondary">الاسم</span><span className="font-bold text-text-primary">{order.customerName}</span></div>
              <div className="flex justify-between"><span className="text-text-secondary">الهاتف</span><span className="font-bold text-text-primary" dir="ltr">{order.customerPhone || "—"}</span></div>
              <div className="flex justify-between"><span className="text-text-secondary">البريد الإلكتروني</span><span className="font-bold text-text-primary">{order.customerEmail || "—"}</span></div>
              <div className="flex justify-between gap-3"><span className="text-text-secondary shrink-0">عنوان التوصيل</span><span className="font-bold text-text-primary text-end">{order.shippingAddress}</span></div>
            </div>
          </div>
          <div className="bg-background-primary border border-brand-border rounded-xl p-5">
            <h3 className="font-display text-base text-text-primary mb-3">الدفع</h3>
            <div className="space-y-2 text-xs font-sans">
              <div className="flex justify-between"><span className="text-text-secondary">طريقة الدفع</span><span className="font-bold text-text-primary">{paymentMethodLabel}</span></div>
              <div className="flex justify-between items-center">
                <span className="text-text-secondary">حالة الدفع</span>
                <span className="px-3 py-1 rounded-full text-[10px] font-bold" style={{ backgroundColor: paymentBadge.bg, color: paymentBadge.fg }}>{paymentBadge.label}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Products */}
        <div className="mb-8">
          <h3 className="font-display text-base text-text-primary mb-3">المنتجات</h3>
          <div className="border border-brand-border rounded-xl overflow-hidden">
            <table className="w-full text-xs font-sans">
              <thead>
                <tr className="bg-background-tertiary text-text-secondary">
                  <th className="py-3 px-3 font-bold text-right"></th>
                  <th className="py-3 px-3 font-bold text-right">المنتج</th>
                  <th className="py-3 px-3 font-bold text-center">اللون</th>
                  <th className="py-3 px-3 font-bold text-center">المقاس</th>
                  <th className="py-3 px-3 font-bold text-center">الكمية</th>
                  <th className="py-3 px-3 font-bold text-center">سعر الوحدة</th>
                  <th className="py-3 px-3 font-bold text-end">الإجمالي</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border">
                {order.items.map((item) => (
                  <tr key={item.id}>
                    <td className="py-3 px-3 w-14">
                      {item.image ? (
                        <img src={item.image} alt={item.productName} className="w-10 h-12 object-cover rounded-md border border-brand-border" />
                      ) : null}
                    </td>
                    <td className="py-3 px-3">
                      <p className="font-bold text-text-primary">{item.productName}</p>
                    </td>
                    <td className="py-3 px-3 text-center text-text-primary">
                      {item.color ? (
                        <span className="inline-flex items-center gap-1.5">
                          {item.colorHex && (
                            <span
                              className="inline-block w-2.5 h-2.5 rounded-full border border-black/10 shrink-0"
                              style={{ backgroundColor: item.colorHex }}
                            />
                          )}
                          {item.color}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="py-3 px-3 text-center text-text-primary">{item.size || "—"}</td>
                    <td className="py-3 px-3 text-center text-text-primary">{item.quantity}</td>
                    <td className="py-3 px-3 text-center text-text-primary">{formatCurrency(item.price)}</td>
                    <td className="py-3 px-3 text-end font-bold text-text-primary">{formatCurrency(item.price * item.quantity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary */}
        <div className="flex justify-start mb-8">
          <div className="w-full sm:w-80 bg-background-primary border border-brand-border rounded-xl p-5 space-y-2 text-xs font-sans">
            <div className="flex justify-between text-text-secondary"><span>المجموع الفرعي</span><span className="font-bold text-text-primary">{formatCurrency(order.subtotal)}</span></div>
            {order.discount > 0 && (
              <div className="flex justify-between text-green-700"><span>الخصم</span><span className="font-bold">-{formatCurrency(order.discount)}</span></div>
            )}
            <div className="flex justify-between text-text-secondary"><span>الشحن</span><span className="font-bold text-text-primary">{formatCurrency(order.shipping)}</span></div>
            {order.tax > 0 && (
              <div className="flex justify-between text-text-secondary"><span>الضرائب</span><span className="font-bold text-text-primary">{formatCurrency(order.tax)}</span></div>
            )}
            <div className="bg-accent rounded-lg px-4 py-3 flex justify-between items-center mt-3">
              <span className="font-display text-background-secondary text-sm">الإجمالي الكلي</span>
              <span className="font-display text-background-secondary text-lg font-bold">{formatCurrency(order.total)}</span>
            </div>
          </div>
        </div>

        {/* Shipping timeline */}
        <div className="bg-background-primary border border-brand-border rounded-xl p-5 mb-8">
          <h3 className="font-display text-base text-text-primary mb-4">حالة الشحن</h3>
          <div className="flex flex-wrap justify-between gap-4">
            {timeline.map((step) => {
              const active = step.state === "done" || step.state === "current";
              return (
                <div key={step.key} className="flex flex-col items-center text-center flex-1 min-w-[70px]">
                  <div className={`w-3 h-3 rounded-full mb-2 ${active ? "bg-accent" : "bg-brand-border"}`} />
                  <span className={`text-[10px] font-sans ${step.state === "current" ? "font-bold text-text-primary" : active ? "text-text-primary" : "text-text-secondary"}`}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tracking card */}
        <div className="border-2 border-accent/40 bg-background-primary rounded-xl p-5 mb-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
              <IconTruck size={20} className="text-accent" />
            </div>
            <div>
              <p className="text-[10px] text-text-secondary font-sans">رقم التتبع</p>
              <p className="font-display text-lg text-accent-dark" dir="ltr">{order.trackingNumber || (hasShipped(order.status) ? "سيُضاف رقم التتبع قريباً" : "سيتوفر بعد الشحن")}</p>
              {order.shippingCompany && <p className="text-[10px] text-text-secondary font-sans mt-0.5">شركة الشحن: {order.shippingCompany}</p>}
              <p className="text-[10px] text-text-secondary font-sans mt-1">يمكنكِ استخدام رقم التتبع لمتابعة طلبكِ.</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {qrCodeDataUrl && (
              <img src={qrCodeDataUrl} alt="QR" className="w-16 h-16 rounded-md border border-brand-border bg-white p-1 print:block" />
            )}
            <Link
              href={trackingPath}
              className="shrink-0 inline-flex items-center gap-2 px-5 py-2.5 bg-text-primary text-background-secondary text-xs font-sans font-bold rounded-full hover:bg-accent transition-colors print:hidden"
            >
              تتبع الشحنة
            </Link>
          </div>
        </div>

        {/* Notes */}
        {order.customerNotes && (
          <div className="bg-background-primary border border-brand-border rounded-xl p-5 mb-8">
            <h3 className="font-display text-base text-text-primary mb-2">ملاحظات الطلب</h3>
            <p className="text-xs font-sans text-text-secondary leading-relaxed">{order.customerNotes}</p>
          </div>
        )}

        {/* Support */}
        <div className="bg-background-tertiary rounded-xl p-8 text-center flex flex-col items-center">
          <h3 className="font-display text-lg text-text-primary mb-3">خدمة العملاء</h3>
          <p className="text-xs font-sans text-text-secondary leading-relaxed max-w-md mb-5">
            شكراً لاختياركِ AURA. في حالة وجود أي استفسار أو مشكلة، يرجى إرسال هذه الفاتورة إلى خدمة العملاء،
            وسيتم خدمتكِ بشكل أسرع باستخدام رقم الفاتورة أو رقم الطلب.
          </p>
          {socialLinks.length > 0 && (
            <div className="flex items-center gap-6 print:hidden">
              {socialLinks.map(({ key, label, href, Icon }) => (
                <a key={key} href={href} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1 text-text-secondary hover:text-accent transition-colors">
                  <Icon size={22} stroke={1.5} />
                  <span className="text-[9px] font-sans">{label}</span>
                </a>
              ))}
            </div>
          )}
        </div>

        <p className="text-center text-[10px] font-sans text-text-secondary mt-8">AURA — {invoiceNumber}</p>
      </div>
    </div>
  );
}
