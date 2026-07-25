import { Metadata } from "next";
import { SITE_URL } from "@/lib/constants/site";

export const metadata: Metadata = {
  title: "أزياء الصيف | AURA",
  description: "تشكيلة الصيف المنعشة من دار أورا — قطع صيفية حصرية بأقمشة الكتان والقطن المصري الطبيعي.",
  openGraph: {
    title: "أزياء الصيف | AURA",
    description: "تشكيلة الصيف المنعشة من دار أورا.",
    url: `${SITE_URL}/summer-fashion`,
  },
  alternates: {
    canonical: `${SITE_URL}/summer-fashion`,
  },
};

export default function SummerFashionLayout({ children }: { children: React.ReactNode }) {
  return children;
}
