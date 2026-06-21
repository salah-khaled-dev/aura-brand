import type { Metadata } from "next";
import { Inter, Alexandria, El_Messiri, Playfair_Display } from "next/font/google";
import "./globals.css";
import dynamic from "next/dynamic";
import { StoreProvider } from "@/context/StoreContext";
import { NotificationProvider } from "@/context/NotificationContext";
import Navbar from "@/components/layout/Navbar";
import WhatsAppButton from "@/components/ui/WhatsAppButton";

// Lazy load Footer for faster initial page render (TTI)
const Footer = dynamic(() => import("@/components/layout/Footer"), { ssr: true });
import ScrollToTop from "@/components/ui/ScrollToTopClient";
import ScrollProgressClient from "@/components/ui/ScrollProgressClient";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const alexandria = Alexandria({
  variable: "--font-alexandria",
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "600"],
  display: "swap",
});

const elMessiri = El_Messiri({
  variable: "--font-el-messiri",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const playfairDisplay = Playfair_Display({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://aura-fashion-virid.vercel.app"),
  title: "AURA | دار الأزياء المصرية الراقية",
  description: "أورا - دار أزياء نسائية مصرية فاخرة تقدم مفهومًا متطورًا للأناقة والأنوثة العصرية بأيدي حرفية متقنة وتفاصيل فريدة.",
  keywords: ["AURA", "أورا", "أزياء نسائية", "كوتور", "ملابس فاخرة", "أزياء مصرية"],
  authors: [{ name: "AURA Fashion House" }],
  openGraph: {
    title: "AURA | دار الأزياء المصرية الراقية",
    description: "تجسيد الفخامة والأناقة الهادئة بتصاميم عصرية.",
    url: "/",
    siteName: "AURA",
    images: [
      {
        url: "/aura_hero_campaign.png",
        width: 1200,
        height: 630,
        alt: "AURA Luxury Campaign",
      },
    ],
    locale: "ar_EG",
    type: "website",
    countryName: "Egypt",
  },
  twitter: {
    card: "summary_large_image",
    title: "AURA | دار الأزياء المصرية الراقية",
    description: "تجسيد الفخامة والأناقة الهادئة بتصاميم عصرية.",
    images: ["/aura_hero_campaign.png"],
  },
  icons: {
    icon: "/logo.svg",
    apple: "/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${inter.variable} ${alexandria.variable} ${elMessiri.variable} ${playfairDisplay.variable} h-full antialiased overflow-x-hidden`}
    >
      <body className="min-h-full flex flex-col bg-background-primary text-text-primary selection:bg-accent selection:text-background-secondary overflow-x-hidden w-full">
        <NotificationProvider>
          <StoreProvider>
            <ScrollProgressClient />
            <Navbar />
            <main className="flex-grow">{children}</main>
            <Footer />
            <WhatsAppButton />
            <ScrollToTop />
          </StoreProvider>
        </NotificationProvider>
      </body>
    </html>
  );
}
