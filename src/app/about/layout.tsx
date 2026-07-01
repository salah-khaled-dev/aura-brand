import type { Metadata } from 'next';
import { generatePageMetadata } from '@/utils/seo-helper';

export async function generateMetadata(): Promise<Metadata> {
  return generatePageMetadata(
    'about',
    'الأتيليه | قصة دار أورا الفنية',
    'تعرفي على قصة دار أورا وحرفية صنع الأزياء الراقية المستوحاة من الجمال المصري العريق.'
  );
}

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
