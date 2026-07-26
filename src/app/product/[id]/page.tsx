import { Metadata } from "next";
import { Suspense } from "react";
import { getPublishedProductById } from "@/lib/services/storefront/storefront-product.service";
import { ReviewService } from "@/lib/services/review.service";
import { primaryImage, resolveStockStatus } from "@/data/mock/products";
import ProductDetailClient from "@/components/product/ProductDetailClient";
import { ProductDetailSkeleton } from "@/components/ui/Skeleton";
import { notFound } from "next/navigation";
import { SITE_URL } from "@/lib/constants/site";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const product = await getPublishedProductById(resolvedParams.id);

  if (!product) {
    return {
      title: "المنتج غير موجود | AURA",
      description: "المنتج الذي تبحثين عنه غير موجود.",
    };
  }

  return {
    title: `${product.name} | ${product.collection} - AURA`,
    description: product.description.substring(0, 160),
    openGraph: {
      title: `${product.name} | AURA`,
      description: product.description.substring(0, 160),
      url: `${SITE_URL}/product/${product.id}`,
      siteName: "AURA",
      images: [
        {
          url: primaryImage(product),
          width: 800,
          height: 1000,
          alt: product.name,
        },
      ],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${product.name} | AURA`,
      description: product.description.substring(0, 160),
      images: [primaryImage(product)],
    },
    alternates: {
      canonical: `${SITE_URL}/product/${product.id}`,
    },
  };
}

export default async function ProductPage({ params }: PageProps) {
  const resolvedParams = await params;
  const product = await getPublishedProductById(resolvedParams.id);

  if (!product) {
    return notFound();
  }

  // Real aggregate rating from approved reviews only — omitted entirely when
  // there are none, since Google's structured-data guidelines forbid
  // publishing an aggregateRating that isn't backed by actual review data.
  const approvedReviews = await ReviewService.getReviews({ status: 'approved', productId: product.id }).catch(() => []);
  const aggregateRating = approvedReviews.length > 0
    ? {
        "@type": "AggregateRating",
        "ratingValue": (approvedReviews.reduce((sum, r) => sum + r.rating, 0) / approvedReviews.length).toFixed(1),
        "reviewCount": String(approvedReviews.length),
      }
    : undefined;

  // Individual Review entries alongside the aggregate — capped so the payload
  // stays reasonable; newest first (already the default order of getReviews).
  const reviewEntries = approvedReviews.slice(0, 10).map((r) => ({
    "@type": "Review",
    "author": { "@type": "Person", "name": r.customerName },
    "reviewRating": { "@type": "Rating", "ratingValue": String(r.rating), "bestRating": "5", "worstRating": "1" },
    "reviewBody": r.content,
    "datePublished": r.createdAt,
  }));

  // Create JSON-LD product schema
  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": product.name,
    "image": [
      primaryImage(product),
      product.hoverImage,
      ...(product.colorVariants?.flatMap(v => v.images) || [])
    ].filter(Boolean),
    "description": product.description,
    "brand": {
      "@type": "Brand",
      "name": "AURA"
    },
    "offers": {
      "@type": "Offer",
      "url": `${SITE_URL}/product/${product.id}`,
      "priceCurrency": "EGP",
      "price": product.price,
      "availability":
        resolveStockStatus(product) === "out_of_stock"
          ? "https://schema.org/OutOfStock"
          : "https://schema.org/InStock",
      "itemCondition": "https://schema.org/NewCondition"
    },
    ...(aggregateRating ? { aggregateRating } : {}),
    ...(reviewEntries.length > 0 ? { review: reviewEntries } : {}),
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "الرئيسية",
        "item": `${SITE_URL}/`
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "المتجر",
        "item": `${SITE_URL}/shop`
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": product.name,
        "item": `${SITE_URL}/product/${product.id}`
      }
    ]
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <Suspense fallback={<ProductDetailSkeleton />}>
        <ProductDetailClient params={params} />
      </Suspense>
    </>
  );
}
