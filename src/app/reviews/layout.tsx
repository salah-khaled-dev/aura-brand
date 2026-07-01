import type { Metadata } from 'next';
import { generatePageMetadata } from '@/utils/seo-helper';

export async function generateMetadata(): Promise<Metadata> {
  return generatePageMetadata(
    'reviews',
    'آراء العملاء | دار أورا',
    'اقرئي آراء وتجارب عميلات دار أورا مع تصاميم الكوتور الراقية.'
  );
}

export default function ReviewsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
