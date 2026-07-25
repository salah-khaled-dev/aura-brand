import { pdf, type DocumentProps } from '@react-pdf/renderer';
import React from 'react';
import type { Order } from '@/data/mock/orders';
import type { StoreInfo } from '@/lib/services/storefront/store.service';
import { AuraInvoiceDocument } from '@/lib/pdf/AuraInvoiceDocument';
import { generateTrackingQrCode } from '@/lib/pdf/qr-code';
import { getInvoiceNumber } from '@/lib/orders/invoice-helpers';

/**
 * Builds the invoice PDF and triggers a browser download. Everything here
 * (QR code + PDF render) only runs when called — never on page load — so
 * viewing an order/tracking/checkout page carries no PDF-generation cost.
 */
export async function downloadInvoicePdf(order: Order, storeInfo: StoreInfo): Promise<void> {
  const qrCodeDataUrl = await generateTrackingQrCode(order.orderNumber);
  const documentElement = React.createElement(AuraInvoiceDocument, { order, storeInfo, qrCodeDataUrl }) as React.ReactElement<DocumentProps>;
  const blob = await pdf(documentElement).toBlob();

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `AURA-Invoice-${getInvoiceNumber(order)}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
