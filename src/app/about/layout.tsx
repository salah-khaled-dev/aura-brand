import { Metadata } from "next";

export const metadata: Metadata = {
  title: "من نحن | AURA",
  description: "قصتنا وفلسفتنا الإبداعية. نحن نؤمن في أورا بأن الثوب هو تجسيد ملموس لشخصيتكِ.",
  openGraph: {
    title: "من نحن | AURA",
    description: "قصة دار الأزياء المصرية أورا للکوتور النسائي الفاخر.",
    url: "https://aura-fashion-virid.vercel.app/about",
  },
  alternates: {
    canonical: "https://aura-fashion-virid.vercel.app/about",
  },
};

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
