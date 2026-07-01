import type { Metadata } from 'next';
import { generatePageMetadata } from '@/utils/seo-helper';

export async function generateMetadata(): Promise<Metadata> {
  return generatePageMetadata(
    'shop',
    'متجر أورا | أزياء نسائية فاخرة',
    'تسوقي أحدث تصاميم دار أورا من فساتين ومجموعات راقية مصنوعة من أجود الأقمشة الطبيعية.'
  );
}

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
