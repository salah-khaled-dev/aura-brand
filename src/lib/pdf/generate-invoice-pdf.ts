import type { Order } from '@/data/mock/orders';
import type { StoreInfo } from '@/lib/services/storefront/store.service';
import { getInvoiceNumber } from '@/lib/orders/invoice-helpers';

/**
 * Requests the invoice PDF from /api/invoice/pdf and triggers a browser download.
 * Rendering happens server-side (@react-pdf/renderer's layout engine instantiates
 * WebAssembly, which the page CSP blocks in the browser) — see that route for why.
 */
export async function downloadInvoicePdf(order: Order, storeInfo: StoreInfo): Promise<void> {
  const response = await fetch('/api/invoice/pdf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ order, storeInfo }),
  });
  if (!response.ok) {
    throw new Error(`Failed to generate invoice PDF (${response.status})`);
  }
  const blob = await response.blob();

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `AURA-Invoice-${getInvoiceNumber(order)}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
