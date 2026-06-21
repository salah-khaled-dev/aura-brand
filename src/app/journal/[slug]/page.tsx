import React from "react";
import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { mockArticles } from "@/data/journal";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const article = mockArticles.find((a) => a.slug === resolvedParams.slug);

  if (!article) return { title: "مقال غير موجود | AURA Journal" };

  return {
    title: `${article.title} | مجلة AURA`,
    description: article.excerpt,
    alternates: {
      canonical: `https://aura-fashion-virid.vercel.app/journal/${article.slug}`,
    },
    openGraph: {
      title: article.title,
      description: article.excerpt,
      type: "article",
      publishedTime: article.isoDate,
      url: `https://aura-fashion-virid.vercel.app/journal/${article.slug}`,
      images: [
        {
          url: article.image,
          width: 1200,
          height: 630,
          alt: article.title,
        },
      ],
      siteName: "AURA Couture",
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description: article.excerpt,
      images: [article.image],
    },
  };
}

export default async function ArticlePage({ params }: PageProps) {
  const resolvedParams = await params;
  const article = mockArticles.find((a) => a.slug === resolvedParams.slug);

  if (!article) notFound();

  // JSON-LD Schema
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    image: [article.image],
    datePublished: article.isoDate,
    author: [{
      "@type": "Organization",
      "name": "AURA Editorial",
      "url": "https://aura-fashion-virid.vercel.app"
    }]
  };

  const relatedArticles = mockArticles
    .filter((a) => a.category === article.category && a.slug !== article.slug)
    .slice(0, 3);

  return (
    <article className="bg-background-primary min-h-screen flex flex-col items-center overflow-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      
      {/* Editorial Hero */}
      <header className="w-full relative h-[60vh] md:h-[80vh] bg-black">
        <Image
          src={article.image}
          alt={article.title}
          fill
          sizes="100vw"
          className="object-cover opacity-70"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        
        <div className="absolute bottom-0 left-0 w-full p-6 md:p-16 flex flex-col items-center text-center text-white">
          <span className="font-sans text-[10px] md:text-xs font-bold uppercase tracking-widest text-[#D4AF37] mb-4">
            {article.category}
          </span>
          <h1 className="font-serif text-3xl md:text-5xl lg:text-7xl font-light leading-tight mb-6 max-w-4xl text-balance">
            {article.title}
          </h1>
          <div className="flex items-center justify-center gap-4 font-sans text-[10px] md:text-xs font-light text-white/80">
            <span>{article.publishDate}</span>
            <span className="w-1 h-1 rounded-full bg-white/50"></span>
            <span>مدة القراءة: {article.readTime}</span>
          </div>
        </div>
      </header>

      {/* Content Body */}
      <main className="w-full max-w-[760px] mx-auto px-6 py-16 md:py-24 text-right" dir="rtl">
        <div className="font-sans text-sm md:text-base font-light text-text-primary leading-[2.2] space-y-8"
          dangerouslySetInnerHTML={{ __html: article.content }}
        />

        {/* Editorial Divider & CTA */}
        <div className="mt-20 pt-10 border-t border-brand-border/40 text-center flex flex-col items-center">
          <p className="font-sans text-xs text-text-secondary italic mb-6">
            هل استلهمتِ إطلالتك القادمة؟
          </p>
          <div className="flex gap-4">
            <Link href="/shop" className="bg-[#111] text-white px-8 py-3 font-sans text-xs font-bold hover:bg-[#D4AF37] hover:text-[#111] transition-colors">
              استكشفي التشكيلة
            </Link>
            <Link href="/summer-fashion" className="bg-transparent border border-brand-border text-text-primary px-8 py-3 font-sans text-xs font-bold hover:border-text-primary transition-colors">
              أزياء الصيف
            </Link>
          </div>
        </div>
      </main>

      {/* Related Articles */}
      {relatedArticles.length > 0 && (
        <section className="w-full bg-background-secondary border-t border-brand-border py-16 md:py-24">
          <div className="max-w-[1280px] mx-auto px-6 md:px-12 text-center">
            <h3 className="font-serif text-2xl md:text-4xl font-light text-text-primary mb-12">
              اقرئي أيضاً
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8" dir="rtl">
              {relatedArticles.map((rel) => (
                <Link href={`/journal/${rel.slug}`} key={rel.slug} className="flex flex-col group text-right">
                  <div className="relative aspect-[3/4] overflow-hidden border border-brand-border mb-4">
                    <Image src={rel.image} alt={rel.title} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover transition-transform duration-[1500ms] group-hover:scale-105" />
                  </div>
                  <h4 className="font-sans text-lg font-light text-text-primary leading-snug group-hover:text-accent transition-colors">
                    {rel.title}
                  </h4>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </article>
  );
}
