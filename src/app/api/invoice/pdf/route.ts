import { NextRequest } from 'next/server';
import { pdf, type DocumentProps } from '@react-pdf/renderer';
import React from 'react';
import type { Order } from '@/data/mock/orders';
import type { StoreInfo } from '@/lib/services/storefront/store.service';
import { AuraInvoiceDocument } from '@/lib/pdf/AuraInvoiceDocument';
import { generateTrackingQrCode } from '@/lib/pdf/qr-code';
import { getInvoiceNumber } from '@/lib/orders/invoice-helpers';

// yoga-layout (react-pdf's flex engine) instantiates WebAssembly, which the page's
// CSP (script-src 'self' 'unsafe-inline', no wasm-unsafe-eval) blocks in the browser.
// Node has no concept of a page's CSP, so rendering here sidesteps the block entirely
// instead of loosening the header. Requires the Node runtime for fs-based font loading
// (see AuraInvoiceDocument.tsx) and yoga's wasm instantiation.
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  let body: { order?: Order; storeInfo?: StoreInfo };
  try {
    body = await request.json();
  } catch {
    return new Response('Invalid JSON body', { status: 400 });
  }

  const { order, storeInfo } = body;
  if (!order || !storeInfo) {
    return new Response('Missing order or storeInfo', { status: 400 });
  }

  const qrCodeDataUrl = await generateTrackingQrCode(order.orderNumber, request.nextUrl.origin);
  const documentElement = React.createElement(AuraInvoiceDocument, { order, storeInfo, qrCodeDataUrl }) as React.ReactElement<DocumentProps>;
  const blob = await pdf(documentElement).toBlob();

  return new Response(blob, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="AURA-Invoice-${getInvoiceNumber(order)}.pdf"`,
    },
  });
}
