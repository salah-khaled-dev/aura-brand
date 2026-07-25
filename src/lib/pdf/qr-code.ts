import QRCode from 'qrcode';
import { getTrackingUrl } from '@/lib/orders/invoice-helpers';

/** PNG data URL of a QR code pointing at the order's tracking page — used by both the HTML invoice view and the PDF. */
export async function generateTrackingQrCode(orderNumber: string, origin?: string): Promise<string> {
  const url = getTrackingUrl(orderNumber, origin);
  return QRCode.toDataURL(url, {
    margin: 1,
    width: 220,
    color: { dark: '#1C1C1B', light: '#FFFFFF' },
  });
}
