import { Metadata } from "next";
import { mockProducts } from "@/data/products";
import ProductDetailClient from "@/components/product/ProductDetailClient";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const product = mockProducts.find((p) => p.id === resolvedParams.id);

  if (!product) {
    return {
      title: "المنتج غير موجود | AURA",
      description: "المنتج الذي تبحثين عنه غير موجود.",
    };
  }

  return {
    title: `${product.title} | ${product.collection} - AURA`,
    description: product.description.substring(0, 160),
    openGraph: {
      title: `${product.title} | AURA`,
      description: product.description.substring(0, 160),
      url: `https://aura-fashion-virid.vercel.app/product/${product.id}`,
      siteName: "AURA",
      images: [
        {
          url: product.image,
          width: 800,
          height: 1000,
          alt: product.title,
        },
      ],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${product.title} | AURA`,
      description: product.description.substring(0, 160),
      images: [product.image],
    },
    alternates: {
      canonical: `https://aura-fashion-virid.vercel.app/product/${product.id}`,
    },
  };
}

export default async function ProductPage({ params }: PageProps) {
  const resolvedParams = await params;
  const product = mockProducts.find((p) => p.id === resolvedParams.id);

  if (!product) {
    return notFound();
  }

  // Create JSON-LD product schema
  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": product.title,
    "image": [
      product.image,
      product.hoverImage,
      ...(product.variants?.flatMap(v => v.images) || [])
    ].filter(Boolean),
    "description": product.description,
    "brand": {
      "@type": "Brand",
      "name": "AURA"
    },
    "offers": {
      "@type": "Offer",
      "url": `https://aura-fashion-virid.vercel.app/product/${product.id}`,
      "priceCurrency": "EGP",
      "price": product.price,
      "availability": "https://schema.org/InStock",
      "itemCondition": "https://schema.org/NewCondition"
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.9",
      "reviewCount": "24"
    }
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
      />
      <ProductDetailClient params={params} />
    </>
  );
}
