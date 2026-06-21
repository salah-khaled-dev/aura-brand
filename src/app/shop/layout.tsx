import { Metadata } from "next";

export const metadata: Metadata = {
  title: "التشكيلة | AURA",
  description: "استكشفي أحدث تشكيلات أورا من الأزياء النسائية الفاخرة، المصممة بعناية فائقة لتبرز جمالكِ وأنوثتكِ في كل مناسبة.",
  openGraph: {
    title: "التشكيلة الكاملة | AURA",
    description: "استكشفي أحدث تشكيلات أورا من الأزياء النسائية الفاخرة.",
    url: "https://aura-fashion-virid.vercel.app/shop",
  },
  alternates: {
    canonical: "https://aura-fashion-virid.vercel.app/shop",
  },
};

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return children;
}
