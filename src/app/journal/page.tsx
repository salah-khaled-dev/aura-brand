"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { mockArticles, journalCategories } from "@/data/journal";

export default function JournalPage() {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const featuredArticle = mockArticles[0];
  const remainingArticles = mockArticles.slice(1);

  const filteredArticles = activeCategory
    ? mockArticles.filter((a) => a.category === activeCategory)
    : remainingArticles;

  return (
    <div className="bg-background-primary min-h-screen pb-24 flex flex-col items-center overflow-hidden">
      
      {/* Journal Hero Header */}
      <header className="w-full pt-16 pb-12 text-center flex flex-col items-center">
        <span className="font-english text-[10px] text-accent font-bold uppercase tracking-[0.3em] mb-4">
          AURA EDITORIAL
        </span>
        <h1 className="font-serif text-4xl md:text-6xl font-light text-text-primary mb-4">
          مجلة أورا
        </h1>
        <p className="font-sans text-sm font-light text-text-secondary max-w-md mx-auto text-center">
          قصص، رؤى أزياء، وإلهام للأسلوب الكلاسيكي الفاخر.
        </p>
      </header>

      {/* Featured Article Section (Only show if no category filter is applied) */}
      {!activeCategory && (
        <section className="w-full max-w-[1280px] px-6 md:px-12 mb-20">
          <Link href={`/journal/${featuredArticle.slug}`} className="block group">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              <div className="relative aspect-[4/3] lg:aspect-[4/5] w-full overflow-hidden border border-brand-border">
                <Image
                  src={featuredArticle.image}
                  alt={featuredArticle.title}
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover transition-transform duration-[2000ms] group-hover:scale-105"
                  priority
                />
              </div>
              <div className="flex flex-col text-right items-start pr-0 lg:pr-12" dir="rtl">
                <div className="flex items-center gap-4 mb-4">
                  <span className="text-[10px] font-sans font-bold text-accent uppercase">{featuredArticle.category}</span>
                  <span className="w-1 h-1 rounded-full bg-brand-border"></span>
                  <span className="text-[10px] font-sans text-text-secondary">{featuredArticle.readTime}</span>
                </div>
                <h2 className="font-sans text-3xl md:text-5xl font-light text-text-primary leading-tight mb-6 group-hover:text-accent transition-colors">
                  {featuredArticle.title}
                </h2>
                <p className="font-sans text-sm font-light text-text-secondary leading-relaxed mb-8 max-w-lg">
                  {featuredArticle.excerpt}
                </p>
                <span className="font-sans text-xs font-bold uppercase tracking-widest border-b border-text-primary pb-1 group-hover:border-accent group-hover:text-accent transition-colors">
                  اقرئي المقال
                </span>
              </div>
            </div>
          </Link>
        </section>
      )}

      {/* Categories Filter */}
      <section className="w-full max-w-[1280px] px-6 md:px-12 mb-12">
        <div className="flex flex-wrap items-center justify-center gap-4 border-y border-brand-border/40 py-6" dir="rtl">
          <button
            onClick={() => setActiveCategory(null)}
            className={`font-sans text-xs transition-colors ${!activeCategory ? "text-accent font-bold" : "text-text-secondary hover:text-text-primary"}`}
          >
            الكل
          </button>
          {journalCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`font-sans text-xs transition-colors ${activeCategory === cat ? "text-accent font-bold" : "text-text-secondary hover:text-text-primary"}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </section>

      {/* Articles Grid */}
      <section className="w-full max-w-[1280px] px-6 md:px-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-16" dir="rtl">
          {filteredArticles.map((article, index) => (
            <motion.div
              key={article.slug}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Link href={`/journal/${article.slug}`} className="flex flex-col group">
                <div className="relative aspect-[3/4] w-full overflow-hidden border border-brand-border mb-6">
                  <Image
                    src={article.image}
                    alt={article.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover transition-transform duration-[1500ms] group-hover:scale-105"
                  />
                </div>
                <div className="flex flex-col items-start">
                  <div className="flex items-center gap-3 mb-3 text-[10px]">
                    <span className="font-sans font-bold text-accent uppercase">{article.category}</span>
                    <span className="text-text-secondary">{article.publishDate}</span>
                  </div>
                  <h3 className="font-sans text-xl font-light text-text-primary leading-snug mb-3 group-hover:text-accent transition-colors line-clamp-2">
                    {article.title}
                  </h3>
                  <p className="font-sans text-xs font-light text-text-secondary leading-relaxed line-clamp-3">
                    {article.excerpt}
                  </p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
        
        {filteredArticles.length === 0 && (
          <div className="text-center py-20 text-text-secondary font-sans text-sm">
            لا توجد مقالات في هذا التصنيف حالياً.
          </div>
        )}
      </section>
    </div>
  );
}
