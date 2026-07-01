import type { Metadata } from 'next';
import { generatePageMetadata } from '@/utils/seo-helper';

export async function generateMetadata(): Promise<Metadata> {
  return generatePageMetadata(
    'journal',
    'مجلة أورا | الموضة والأناقة',
    'اكتشفي مقالات أورا عن الموضة المعاصرة والأناقة الهادئة والحرفية الراقية.'
  );
}

export default function JournalLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
