"use client";

import React, { useEffect, useState, use } from 'react';
import { OrderService } from '@/lib/services/order.service';
import { Order } from '@/data/mock/orders';
import { formatDate } from '@/lib/utils/formatters';
import { IconPrinter, IconArrowRight, IconPackage } from '@tabler/icons-react';
import Link from 'next/link';

export default function PackingSlipPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: orderId } = use(params);
  const [order, setOrder] = useState<Order | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    OrderService.getOrder(orderId)
      .then(data => {
        if (data) {
          setOrder(data);
          setState('ready');
        } else {
          setState('error');
        }
      })
      .catch(() => setState('error'));
  }, [orderId]);

  if (state === 'error') return <div className="p-10 text-center">تعذّر تحميل الطلب.</div>;
  if (!order) return <div className="p-10 text-center">جاري التحميل...</div>;

  return (
    <div className="bg-gray-50 min-h-screen -m-6 p-6 sm:p-10 font-serif">
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-slip, #printable-slip * {
            visibility: visible;
          }
          #printable-slip {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 0;
            box-shadow: none;
          }
          @page { size: A4; margin: 0; }
        }
      `}} />
      
      <div className="max-w-4xl mx-auto mb-6 flex justify-between items-center print:hidden">
        <Link href={`/admin/orders/${order.id}`} className="flex items-center gap-2 text-gray-600 hover:text-black">
          <IconArrowRight size={18} /> عودة للطلب
        </Link>
        <button 
          onClick={() => window.print()}
          className="flex items-center gap-2 px-6 py-2.5 bg-black text-white font-medium rounded-md shadow-sm hover:bg-gray-800"
        >
          <IconPrinter size={18} /> طباعة بوليصة الشحن
        </button>
      </div>

      <div id="printable-slip" className="max-w-4xl mx-auto bg-white p-10 sm:p-16 rounded-xl shadow-sm border border-gray-100">
        
        {/* Header */}
        <div className="flex justify-between items-start border-b-2 border-black pb-6 mb-10">
          <div className="flex items-center gap-3">
            <IconPackage size={40} className="text-black" />
            <div>
              <h1 className="text-3xl font-bold text-black uppercase">بوليصة تعبئة</h1>
              <p className="text-gray-500 text-sm mt-1">المخزن الرئيسي</p>
            </div>
          </div>
          <div className="text-end text-sm">
            <p className="font-bold text-lg text-black mb-1">الطلب {order.orderNumber}</p>
            <p className="text-gray-600 mb-1">تاريخ الطلب: {formatDate(order.date)}</p>
            <p className="text-gray-600">تاريخ الطباعة: {formatDate(new Date().toISOString())}</p>
          </div>
        </div>

        {/* Addresses */}
        <div className="grid grid-cols-2 gap-10 mb-12">
          <div>
            <h3 className="text-sm font-bold text-black uppercase tracking-wider mb-2 border-b pb-1 inline-block">عنوان الشحن</h3>
            <p className="font-bold text-gray-900 text-lg mt-2 mb-1">{order.customerName}</p>
            <p className="text-gray-800">{order.shippingAddress}</p>
            <p className="text-gray-800 mt-2 font-medium" dir="ltr">{order.customerPhone}</p>
          </div>
          <div>
            <h3 className="text-sm font-bold text-black uppercase tracking-wider mb-2 border-b pb-1 inline-block">معلومات التوصيل</h3>
            <p className="text-gray-800 mt-2 font-medium">طريقة الشحن: {order.shippingMethod}</p>
            {order.customerNotes && (
              <div className="mt-4 p-3 border-l-4 border-black bg-gray-50">
                <p className="text-xs font-bold text-gray-500 mb-1">ملاحظة العميل:</p>
                <p className="text-sm font-medium text-black">{order.customerNotes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Table */}
        <table className="w-full mb-12 text-sm text-right border-collapse">
          <thead>
            <tr className="bg-gray-100 text-black">
              <th className="py-3 px-4 font-bold border border-gray-300">الرمز (SKU)</th>
              <th className="py-3 px-4 font-bold border border-gray-300">المنتج</th>
              <th className="py-3 px-4 font-bold border border-gray-300 text-center">المقاس</th>
              <th className="py-3 px-4 font-bold border border-gray-300 text-center">اللون</th>
              <th className="py-3 px-4 font-bold border border-gray-300 text-center">الكمية المطلوبة</th>
              <th className="py-3 px-4 font-bold border border-gray-300 text-center">تم التجهيز</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map(item => (
              <tr key={item.id}>
                <td className="py-4 px-4 border border-gray-300 font-medium font-sans">{item.sku}</td>
                <td className="py-4 px-4 border border-gray-300 font-bold">{item.productName}</td>
                <td className="py-4 px-4 border border-gray-300 text-center">{item.size || '-'}</td>
                <td className="py-4 px-4 border border-gray-300 text-center">{item.color || '-'}</td>
                <td className="py-4 px-4 border border-gray-300 text-center font-bold text-lg">{item.quantity}</td>
                <td className="py-4 px-4 border border-gray-300 text-center">
                  <div className="w-6 h-6 border-2 border-gray-400 rounded-sm mx-auto"></div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Footer */}
        <div className="border-t-2 border-black pt-6 mt-16 text-center">
          <p className="text-sm font-bold text-black mb-1">توقيع المسؤول عن التعبئة:</p>
          <div className="w-48 border-b border-gray-400 mx-auto mt-8"></div>
        </div>

      </div>
    </div>
  );
}
