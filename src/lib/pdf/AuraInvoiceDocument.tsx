import React from 'react';
import { Document, Page, View, Text, Image, Svg, Path, Font, StyleSheet } from '@react-pdf/renderer';
import { siWhatsapp, siInstagram, siFacebook } from 'simple-icons';
import type { Order } from '@/data/mock/orders';
import type { StoreInfo } from '@/lib/services/storefront/store.service';
import { formatCurrency, formatDate } from '@/lib/utils/formatters';
import { getInvoiceNumber, getPaymentBadgeMeta } from '@/lib/orders/invoice-helpers';
import { getStatusMeta, buildCustomerTimeline, hasShipped } from '@/lib/orders/order-status';

let fontsRegistered = false;

/**
 * Registered once per session — El Messiri (display) + Alexandria (body) are the
 * only fonts in this document that actually shape/join Arabic glyphs correctly.
 *
 * Sources must be fully-qualified URLs, not root-relative paths: react-pdf's font
 * loader (@react-pdf/font) uses the `is-url` package to pick between `fetch(src)`
 * and `fontkit.open(src)` (a Node-only filesystem read that isn't even exported
 * by fontkit's browser bundle). `is-url` requires a scheme, so a path like
 * `/fonts/Alexandria-Regular.ttf` is NOT a URL to it — every registration would
 * fall into the fontkit.open() branch and throw "fontkit.open is not a function"
 * the instant the PDF renders, in every browser, 100% of the time.
 */
function registerFonts() {
  if (fontsRegistered) return;
  const base = window.location.origin;
  Font.register({
    family: 'ElMessiri',
    fonts: [
      { src: `${base}/fonts/ElMessiri-Regular.ttf`, fontWeight: 'normal' },
      { src: `${base}/fonts/ElMessiri-Bold.ttf`, fontWeight: 'bold' },
    ],
  });
  Font.register({
    family: 'Alexandria',
    fonts: [
      { src: `${base}/fonts/Alexandria-Regular.ttf`, fontWeight: 'normal' },
      { src: `${base}/fonts/Alexandria-Bold.ttf`, fontWeight: 'bold' },
    ],
  });
  fontsRegistered = true;
}

const COLORS = {
  ivory: '#FAF8F5',
  white: '#FFFFFF',
  beige: '#E8E4DC',
  border: '#E5E0D8',
  text: '#1C1C1B',
  textMuted: '#5C5A56',
  gold: '#C5A880',
  goldDark: '#8E6B4B',
};

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Alexandria',
    fontSize: 9,
    color: COLORS.text,
    backgroundColor: COLORS.ivory,
    padding: 32,
  },
  headerRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 18,
  },
  brandBlock: { flexDirection: 'column', alignItems: 'flex-end' },
  brandName: { fontFamily: 'ElMessiri', fontSize: 22, fontWeight: 'bold', letterSpacing: 2 },
  brandTagline: { fontSize: 8, color: COLORS.textMuted, marginTop: 2 },
  invoiceTitle: { fontFamily: 'ElMessiri', fontSize: 16, marginBottom: 4 },
  metaGrid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    backgroundColor: COLORS.white,
    borderRadius: 10,
    border: `1px solid ${COLORS.border}`,
    padding: 12,
    marginBottom: 14,
  },
  metaCell: { width: '33%', marginBottom: 8, textAlign: 'right' },
  metaLabel: { fontSize: 7.5, color: COLORS.textMuted, marginBottom: 2 },
  metaValue: { fontSize: 10, fontWeight: 'bold' },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    border: `1px solid ${COLORS.border}`,
    padding: 14,
    marginBottom: 14,
  },
  cardTitle: {
    fontFamily: 'ElMessiri',
    fontSize: 12,
    marginBottom: 8,
    textAlign: 'right',
  },
  row: { flexDirection: 'row-reverse', justifyContent: 'space-between', marginBottom: 4 },
  label: { color: COLORS.textMuted, textAlign: 'right' },
  value: { fontWeight: 'bold', textAlign: 'right' },
  twoCol: { flexDirection: 'row-reverse', gap: 20 },
  col: { flex: 1 },
  table: { marginTop: 4 },
  tableHeaderRow: {
    flexDirection: 'row-reverse',
    backgroundColor: COLORS.beige,
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  tableRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottom: `1px solid ${COLORS.border}`,
  },
  th: { fontSize: 8, fontWeight: 'bold', color: COLORS.textMuted, textAlign: 'right' },
  td: { fontSize: 8.5, textAlign: 'right' },
  productImage: { width: 28, height: 36, borderRadius: 4, objectFit: 'cover' },
  colImage: { width: '10%' },
  colName: { width: '30%', paddingRight: 6 },
  colColor: { width: '12%' },
  colSize: { width: '10%' },
  colQty: { width: '10%' },
  colPrice: { width: '14%' },
  colTotal: { width: '14%' },
  summaryCard: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    border: `1px solid ${COLORS.border}`,
    padding: 14,
    marginBottom: 14,
    width: '55%',
    marginLeft: 0,
  },
  grandTotalBox: {
    backgroundColor: COLORS.gold,
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
  },
  grandTotalLabel: { fontFamily: 'ElMessiri', fontSize: 12, color: COLORS.white },
  grandTotalValue: { fontFamily: 'ElMessiri', fontSize: 14, fontWeight: 'bold', color: COLORS.white },
  badge: { borderRadius: 12, paddingVertical: 3, paddingHorizontal: 10, fontSize: 8, fontWeight: 'bold' },
  timelineRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', marginTop: 6 },
  timelineStep: { alignItems: 'center', width: '19%' },
  timelineDot: { width: 8, height: 8, borderRadius: 4, marginBottom: 3 },
  timelineLabel: { fontSize: 6.5, textAlign: 'center' },
  trackingCard: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    border: `1.5px solid ${COLORS.gold}`,
    padding: 14,
    marginBottom: 14,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  trackingNumber: { fontFamily: 'ElMessiri', fontSize: 15, fontWeight: 'bold', color: COLORS.goldDark },
  supportCard: {
    backgroundColor: COLORS.beige,
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    textAlign: 'center',
  },
  supportTitle: { fontFamily: 'ElMessiri', fontSize: 13, marginBottom: 6 },
  supportText: { fontSize: 8.5, color: COLORS.textMuted, textAlign: 'center', lineHeight: 1.6, marginBottom: 10 },
  socialRow: { flexDirection: 'row', gap: 16, marginTop: 4 },
  socialItem: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4 },
  socialLabel: { fontSize: 8 },
  footer: { marginTop: 14, alignItems: 'center' },
});

function Badge({ label, bg, fg }: { label: string; bg: string; fg: string }) {
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={{ color: fg }}>{label}</Text>
    </View>
  );
}

function BrandIcon({ path, color, size = 12 }: { path: string; color: string; size?: number }) {
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size}>
      <Path d={path} fill={color} />
    </Svg>
  );
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cod: 'الدفع عند الاستلام',
  card: 'بطاقة ائتمان',
  instapay: 'InstaPay',
  'vodafone-cash': 'Vodafone Cash',
  vodafone_cash: 'فودافون كاش',
  bank_transfer: 'تحويل بنكي',
};

export interface AuraInvoiceDocumentProps {
  order: Order;
  storeInfo: StoreInfo;
  qrCodeDataUrl: string;
}

export function AuraInvoiceDocument({ order, storeInfo, qrCodeDataUrl }: AuraInvoiceDocumentProps) {
  registerFonts();

  const invoiceNumber = getInvoiceNumber(order);
  const paymentBadge = getPaymentBadgeMeta(order);
  const statusMeta = getStatusMeta(order.status);
  const timeline = buildCustomerTimeline(order);
  const paymentMethodLabel = order.paymentMethod ? (PAYMENT_METHOD_LABELS[order.paymentMethod] ?? order.paymentMethod) : '—';

  const socialRows: Array<{ label: string; path: string; color: string; href: string }> = [];
  if (storeInfo.socialMedia?.whatsapp || storeInfo.whatsapp) {
    socialRows.push({ label: 'WhatsApp', path: siWhatsapp.path, color: `#${siWhatsapp.hex}`, href: storeInfo.socialMedia?.whatsapp || storeInfo.whatsapp });
  }
  if (storeInfo.socialMedia?.instagram) {
    socialRows.push({ label: 'Instagram', path: siInstagram.path, color: `#${siInstagram.hex}`, href: storeInfo.socialMedia.instagram });
  }
  if (storeInfo.socialMedia?.facebook) {
    socialRows.push({ label: 'Facebook', path: siFacebook.path, color: `#${siFacebook.hex}`, href: storeInfo.socialMedia.facebook });
  }

  return (
    <Document title="AURA Invoice" author="AURA" subject="Order Invoice" keywords="AURA, Invoice, Fashion">
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={styles.brandBlock}>
            <Text style={styles.brandName}>AURA</Text>
            <Text style={styles.brandTagline}>Luxury Fashion House</Text>
          </View>
          <View>
            <Text style={styles.invoiceTitle}>Invoice</Text>
          </View>
        </View>

        {/* Meta grid */}
        <View style={styles.metaGrid}>
          <View style={styles.metaCell}>
            <Text style={styles.metaLabel}>رقم الفاتورة</Text>
            <Text style={styles.metaValue}>{invoiceNumber}</Text>
          </View>
          <View style={styles.metaCell}>
            <Text style={styles.metaLabel}>رقم الطلب</Text>
            <Text style={styles.metaValue}>{order.orderNumber}</Text>
          </View>
          <View style={styles.metaCell}>
            <Text style={styles.metaLabel}>تاريخ الفاتورة</Text>
            <Text style={styles.metaValue}>{formatDate(order.date)}</Text>
          </View>
          <View style={styles.metaCell}>
            <Text style={styles.metaLabel}>رقم التتبع</Text>
            <Text style={[styles.metaValue, { color: COLORS.goldDark }]}>{order.trackingNumber || '—'}</Text>
          </View>
          <View style={styles.metaCell}>
            <Text style={styles.metaLabel}>حالة الطلب</Text>
            <Text style={styles.metaValue}>{statusMeta.label}</Text>
          </View>
          <View style={styles.metaCell}>
            <Text style={styles.metaLabel}>حالة الدفع</Text>
            <Badge label={paymentBadge.label} bg={paymentBadge.bg} fg={paymentBadge.fg} />
          </View>
        </View>

        {/* Customer + Payment */}
        <View style={styles.twoCol}>
          <View style={[styles.card, styles.col]}>
            <Text style={styles.cardTitle}>بيانات العميل</Text>
            <View style={styles.row}><Text style={styles.label}>الاسم</Text><Text style={styles.value}>{order.customerName}</Text></View>
            <View style={styles.row}><Text style={styles.label}>الهاتف</Text><Text style={styles.value}>{order.customerPhone || '—'}</Text></View>
            <View style={styles.row}><Text style={styles.label}>البريد الإلكتروني</Text><Text style={styles.value}>{order.customerEmail || '—'}</Text></View>
            <View style={styles.row}><Text style={styles.label}>عنوان التوصيل</Text><Text style={[styles.value, { maxWidth: '70%' }]}>{order.shippingAddress}</Text></View>
          </View>
          <View style={[styles.card, styles.col]}>
            <Text style={styles.cardTitle}>الدفع</Text>
            <View style={styles.row}><Text style={styles.label}>طريقة الدفع</Text><Text style={styles.value}>{paymentMethodLabel}</Text></View>
            <View style={styles.row}><Text style={styles.label}>حالة الدفع</Text><Badge label={paymentBadge.label} bg={paymentBadge.bg} fg={paymentBadge.fg} /></View>
          </View>
        </View>

        {/* Products */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>المنتجات</Text>
          <View style={styles.table}>
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.th, styles.colImage]}></Text>
              <Text style={[styles.th, styles.colName]}>المنتج</Text>
              <Text style={[styles.th, styles.colColor]}>اللون</Text>
              <Text style={[styles.th, styles.colSize]}>المقاس</Text>
              <Text style={[styles.th, styles.colQty]}>الكمية</Text>
              <Text style={[styles.th, styles.colPrice]}>سعر الوحدة</Text>
              <Text style={[styles.th, styles.colTotal]}>الإجمالي</Text>
            </View>
            {order.items.map((item) => (
              <View key={item.id} style={styles.tableRow}>
                <View style={styles.colImage}>
                  {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf's Image (PDF renderer, not HTML/next Image) has no alt prop */}
                  {item.image ? <Image src={item.image} style={styles.productImage} /> : null}
                </View>
                <View style={styles.colName}>
                  <Text style={styles.td}>{item.productName}</Text>
                </View>
                <Text style={[styles.td, styles.colColor]}>{item.color || '—'}</Text>
                <Text style={[styles.td, styles.colSize]}>{item.size || '—'}</Text>
                <Text style={[styles.td, styles.colQty]}>{item.quantity}</Text>
                <Text style={[styles.td, styles.colPrice]}>{formatCurrency(item.price)}</Text>
                <Text style={[styles.td, styles.colTotal, { fontWeight: 'bold' }]}>{formatCurrency(item.price * item.quantity)}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Summary */}
        <View style={{ flexDirection: 'row-reverse' }}>
          <View style={styles.summaryCard}>
            <View style={styles.row}><Text style={styles.label}>المجموع الفرعي</Text><Text style={styles.value}>{formatCurrency(order.subtotal)}</Text></View>
            {order.discount > 0 && (
              <View style={styles.row}><Text style={styles.label}>الخصم</Text><Text style={[styles.value, { color: '#2F6B3A' }]}>-{formatCurrency(order.discount)}</Text></View>
            )}
            <View style={styles.row}><Text style={styles.label}>الشحن</Text><Text style={styles.value}>{formatCurrency(order.shipping)}</Text></View>
            {order.tax > 0 && (
              <View style={styles.row}><Text style={styles.label}>الضرائب</Text><Text style={styles.value}>{formatCurrency(order.tax)}</Text></View>
            )}
            <View style={styles.grandTotalBox}>
              <Text style={styles.grandTotalLabel}>الإجمالي الكلي</Text>
              <Text style={styles.grandTotalValue}>{formatCurrency(order.total)}</Text>
            </View>
          </View>
        </View>

        {/* Shipping timeline */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>حالة الشحن</Text>
          <View style={styles.timelineRow}>
            {timeline.map((step) => {
              const active = step.state === 'done' || step.state === 'current';
              return (
                <View key={step.key} style={styles.timelineStep}>
                  <View style={[styles.timelineDot, { backgroundColor: active ? COLORS.gold : COLORS.border }]} />
                  <Text style={[styles.timelineLabel, { color: active ? COLORS.text : COLORS.textMuted, fontWeight: step.state === 'current' ? 'bold' : 'normal' }]}>
                    {step.label}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Tracking card */}
        <View style={styles.trackingCard}>
          <View>
            <Text style={{ fontSize: 8, color: COLORS.textMuted, marginBottom: 3 }}>رقم التتبع</Text>
            <Text style={styles.trackingNumber}>{order.trackingNumber || (hasShipped(order.status) ? 'سيُضاف رقم التتبع قريباً' : 'سيتوفر بعد الشحن')}</Text>
            {order.shippingCompany && <Text style={{ fontSize: 8, color: COLORS.textMuted, marginTop: 3 }}>شركة الشحن: {order.shippingCompany}</Text>}
            <Text style={{ fontSize: 7.5, color: COLORS.textMuted, marginTop: 4 }}>يمكنكِ استخدام رمز QR أو رقم التتبع لمتابعة طلبكِ.</Text>
          </View>
          {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf's Image (PDF renderer, not HTML/next Image) has no alt prop */}
          <Image src={qrCodeDataUrl} style={{ width: 60, height: 60 }} />
        </View>

        {/* Notes */}
        {order.customerNotes ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>ملاحظات الطلب</Text>
            <Text style={{ fontSize: 8.5, textAlign: 'right', color: COLORS.textMuted }}>{order.customerNotes}</Text>
          </View>
        ) : null}

        {/* Support */}
        <View style={styles.supportCard}>
          <Text style={styles.supportTitle}>خدمة العملاء</Text>
          <Text style={styles.supportText}>
            شكراً لاختياركِ AURA. في حالة وجود أي استفسار أو مشكلة، يرجى إرسال هذه الفاتورة إلى خدمة العملاء،
            وسيتم خدمتكِ بشكل أسرع باستخدام رقم الفاتورة أو رقم الطلب.
          </Text>
          <View style={styles.socialRow}>
            {socialRows.map((s) => (
              <View key={s.label} style={styles.socialItem}>
                <BrandIcon path={s.path} color={s.color} />
                <Text style={styles.socialLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={{ fontSize: 7, color: COLORS.textMuted }}>AURA — {invoiceNumber}</Text>
        </View>
      </Page>
    </Document>
  );
}
