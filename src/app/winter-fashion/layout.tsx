import { Metadata } from "next";
import { SITE_URL } from "@/lib/constants/site";

export const metadata: Metadata = {
  title: "أزياء الشتاء | AURA",
  description: "تشكيلة الشتاء الفاخرة من دار أورا — معاطف وقطع شتوية راقية بأقمشة الكشمير والصوف الطبيعي.",
  openGraph: {
    title: "أزياء الشتاء | AURA",
    description: "تشكيلة الشتاء الفاخرة من دار أورا.",
    url: `${SITE_URL}/winter-fashion`,
  },
  alternates: {
    canonical: `${SITE_URL}/winter-fashion`,
  },
};

export default function WinterFashionLayout({ children }: { children: React.ReactNode }) {
  return children;
}
