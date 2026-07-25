"use client";

import React, { useEffect, useState, use } from 'react';
import { OrderService } from '@/lib/services/order.service';
import { Order } from '@/data/mock/orders';
import { StoreService, type StoreInfo } from '@/lib/services/storefront/store.service';
import { IconPrinter, IconArrowRight, IconDownload, IconLink } from '@tabler/icons-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button } from '@/components/admin/design-system/Button';
import InvoiceView from '@/components/invoice/InvoiceView';
import { downloadInvoicePdf } from '@/lib/pdf/generate-invoice-pdf';

export default function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: orderId } = use(params);
  const [order, setOrder] = useState<Order | null>(null);
  const [storeInfo, setStoreInfo] = useState<StoreInfo | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    Promise.all([OrderService.getOrder(orderId), StoreService.getInfo()])
      .then(([orderData, info]) => {
        if (orderData) {
          setOrder(orderData);
          setStoreInfo(info);
          setState('ready');
        } else {
          setState('error');
        }
      })
      .catch(() => setState('error'));
  }, [orderId]);

  const handleDownload = async () => {
    if (!order || !storeInfo) return;
    setDownloading(true);
    try {
      await downloadInvoicePdf(order, storeInfo);
    } catch {
      toast.error('تعذّر تحميل الفاتورة');
    } finally {
      setDownloading(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success('تم نسخ رابط الفاتورة');
    } catch {
      toast.error('تعذّر نسخ الرابط');
    }
  };

  if (state === 'error') return <div className="p-10 text-center">تعذّر تحميل الطلب.</div>;
  if (!order || !storeInfo) return <div className="p-10 text-center">جاري التحميل...</div>;

  return (
    <div className="min-h-screen -m-6 p-6 sm:p-10 bg-[var(--admin-bg-base)]">
      <div className="max-w-4xl mx-auto mb-6 flex flex-wrap justify-between items-center gap-3 print:hidden">
        <Link href={`/admin/orders/${order.id}`} className="flex items-center gap-2 text-[var(--admin-text-muted)] hover:text-[var(--admin-text-base)]">
          <IconArrowRight size={18} /> عودة للطلب
        </Link>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={handleCopyLink} leftIcon={<IconLink size={16} />}>نسخ رابط الفاتورة</Button>
          <Button variant="secondary" onClick={() => window.print()} leftIcon={<IconPrinter size={16} />}>طباعة</Button>
          <Button onClick={handleDownload} isLoading={downloading} leftIcon={<IconDownload size={16} />}>تحميل PDF</Button>
        </div>
      </div>

      <InvoiceView order={order} storeInfo={storeInfo} hideActions />
    </div>
  );
}
