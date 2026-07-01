import type { Metadata } from 'next';
import { generatePageMetadata } from '@/utils/seo-helper';

export async function generateMetadata(): Promise<Metadata> {
  return generatePageMetadata(
    'tracking',
    'تتبع طلبكِ | أورا',
    'تتبعي حالة شحنتك من دار أورا بإدخال رقم الطلب.'
  );
}

export default function TrackingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
