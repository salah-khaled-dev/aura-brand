import { Metadata } from "next";
import { SITE_URL } from "@/lib/constants/site";

export const metadata: Metadata = {
  title: "المفضلة | AURA",
  description: "القطع التي حفظتِها من تشكيلات أورا الفاخرة لمراجعتها لاحقاً.",
  openGraph: {
    title: "المفضلة | AURA",
    description: "القطع التي حفظتِها من تشكيلات أورا الفاخرة.",
    url: `${SITE_URL}/wishlist`,
  },
  alternates: {
    canonical: `${SITE_URL}/wishlist`,
  },
};

export default function WishlistLayout({ children }: { children: React.ReactNode }) {
  return children;
}
