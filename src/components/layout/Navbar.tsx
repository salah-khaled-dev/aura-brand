"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useStore } from "@/context/StoreContext";
import { Search, ShoppingBag, X, Plus, Minus, Menu, User, MessageCircle } from "lucide-react";
import { PiHouseThin, PiCompassThin, PiMagnifyingGlassThin, PiHeartThin, PiHandbagThin } from "react-icons/pi";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { mockProducts, Product } from "@/data/products";
import { Skeleton } from "@/components/ui/Skeleton";
import Logo from "@/components/Logo";
import { getWhatsAppUrl } from "@/config/whatsapp";

export default function Navbar() {
  const { cart, wishlist, cartCount, cartSubtotal, isCartOpen, setCartOpen, removeFromCart, updateQuantity } = useStore();
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSearchOpen, setSearchOpen] = useState(false);
  const pathname = usePathname();

  // Search overlay state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Lazy initializer — reads localStorage once on mount, no effect needed
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const saved = localStorage.getItem("aura_recent_searches");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const addRecentSearch = (query: string) => {
    if (!query.trim()) return;
    const cleanQuery = query.trim();
    setRecentSearches((prev) => {
      const filtered = prev.filter((q) => q !== cleanQuery);
      const updated = [cleanQuery, ...filtered].slice(0, 5);
      localStorage.setItem("aura_recent_searches", JSON.stringify(updated));
      return updated;
    });
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem("aura_recent_searches");
  };

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    if (!val.trim()) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    setSearchLoading(true);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      const queryLower = val.toLowerCase();
      const filtered = mockProducts.filter((p) =>
        p.title.toLowerCase().includes(queryLower) ||
        p.collection.toLowerCase().includes(queryLower) ||
        p.description.toLowerCase().includes(queryLower)
      );
      setSearchResults(filtered);
      setSearchLoading(false);
    }, 450);
  };

  const handleSuggestionClick = (term: string) => {
    setSearchQuery(term);
    addRecentSearch(term);
    setSearchLoading(true);
    setTimeout(() => {
      const queryLower = term.toLowerCase();
      const filtered = mockProducts.filter((p) =>
        p.title.toLowerCase().includes(queryLower) ||
        p.collection.toLowerCase().includes(queryLower) ||
        p.description.toLowerCase().includes(queryLower)
      );
      setSearchResults(filtered);
      setSearchLoading(false);
    }, 400);
  };

  const closeSearch = () => {
    setSearchOpen(false);
    setSearchQuery("");
    setSearchResults([]);
    setSearchLoading(false);
  };

  const leftLinks = [
    { name: "أزياء الشتاء", path: "/winter-fashion" },
    { name: "أزياء الصيف", path: "/summer-fashion" },
    { name: "التشكيلة", path: "/shop" },
    { name: "الفساتين", path: "/shop?category=dresses" },
    { name: "الأطقم", path: "/shop?category=sets" },
    { name: "مجلة AURA", path: "/journal" },
  ];

  const rightLinks = [
    { name: "الأتيليه", path: "/about" },
    { name: "آراء العملاء", path: "/reviews" },
    { name: "تواصل معنا", path: "/contact" },
  ];

  return (
    <>
      {/* 1. HEADER WRAPPER - SOLID BACKGROUND, NO GLASSMORPHISM */}
      <header className="sticky top-0 z-50 w-full bg-background-secondary border-b border-brand-border">
        <div className="max-w-[1440px] mx-auto px-4 md:px-12 h-16 md:h-32 flex items-center justify-between md:grid md:grid-cols-[1fr_auto_1fr]">
          
          {/* LEFT: Menu links on Desktop / Menu Button on Mobile */}
          <div className="flex-1 flex items-center justify-start gap-4 md:gap-6">
            {/* Mobile Hamburger */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 text-text-primary hover:text-accent transition-colors"
              aria-label="القائمة"
            >
              <Menu className="w-6 h-6 stroke-[1.5]" />
            </button>

            {/* Desktop Left Links */}
            <nav className="hidden md:flex items-center gap-5 lg:gap-7">
              {leftLinks.map((link) => {
                const isActive = pathname === link.path;
                return (
                  <Link
                    key={link.path}
                    href={link.path}
                    className={`font-sans text-[11px] font-semibold transition-colors relative py-2 ${
                      isActive ? "text-accent" : "text-text-primary hover:text-accent"
                    }`}
                  >
                    {link.name}
                    {isActive && (
                      <motion.span
                        layoutId="nav-underline-left"
                        className="absolute bottom-0 right-0 left-0 h-[1.5px] bg-accent"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* CENTER: Reusable Custom SVG Logo (Luxury serif editorial style) */}
          <div className="shrink-0 flex justify-center items-center">
            <Link href="/" className="flex justify-center items-center py-2 select-none" aria-label="AURA الصفحة الرئيسية">
              <Logo size="lg" variant="black" animated={true} />
            </Link>
          </div>

          {/* RIGHT: Desktop links + Actions */}
          <div className="flex-1 flex items-center justify-end gap-4 md:gap-6">
            {/* Desktop Right Links */}
            <nav className="hidden md:flex items-center gap-5 lg:gap-7 ml-4 lg:ml-8">
              {rightLinks.map((link) => {
                const isActive = pathname === link.path;
                return (
                  <Link
                    key={link.path}
                    href={link.path}
                    className={`font-sans text-[11px] font-semibold transition-colors relative py-2 ${
                      isActive ? "text-accent" : "text-text-primary hover:text-accent"
                    }`}
                  >
                    {link.name}
                    {isActive && (
                      <motion.span
                        layoutId="nav-underline-right"
                        className="absolute bottom-0 right-0 left-0 h-[1.5px] bg-accent"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* Action Icons - Premium Thin Styling */}
            <div className="hidden md:flex items-center gap-6 mr-2">
              {/* Search */}
              <button
                onClick={() => setSearchOpen(!isSearchOpen)}
                className="text-text-primary hover:text-accent transition-all duration-300 relative group"
                aria-label="بحث"
              >
                <PiMagnifyingGlassThin className="w-[26px] h-[26px] transition-transform duration-300 group-hover:scale-105" />
              </button>

              {/* Wishlist */}
              <Link href="/wishlist" className="text-text-primary hover:text-accent transition-all duration-300 relative group flex items-center justify-center" aria-label="المفضلة">
                <PiHeartThin className="w-[26px] h-[26px] transition-transform duration-300 group-hover:scale-105" />
                {wishlist.length > 0 && (
                  <span className="absolute -top-1 -right-2 flex min-w-[16px] h-[16px] px-1 items-center justify-center rounded-full bg-accent text-[9px] font-medium text-white shadow-sm border border-background-secondary leading-none">
                    {wishlist.length > 9 ? "9+" : wishlist.length}
                  </span>
                )}
              </Link>

              {/* Cart */}
              <button
                onClick={() => setCartOpen(true)}
                className="text-text-primary hover:text-accent transition-all duration-300 relative group flex items-center justify-center"
                aria-label="حقيبة التسوق"
              >
                <PiHandbagThin className="w-[26px] h-[26px] transition-transform duration-300 group-hover:scale-105" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-2 flex min-w-[16px] h-[16px] px-1 items-center justify-center rounded-full bg-accent text-[9px] font-medium text-white shadow-sm border border-background-secondary leading-none">
                    {cartCount > 9 ? "9+" : cartCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 2. MOBILE PREMIUM MENU DRAWER */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            {/* Premium Blur Backdrop Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 md:hidden"
            />
            {/* Fullscreen Drawer */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "tween", duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
              className="fixed top-0 right-0 bottom-0 w-[85vw] max-w-[400px] bg-background-secondary z-50 flex flex-col md:hidden shadow-[0_0_40px_rgba(0,0,0,0.1)]"
            >
              {/* Header: Logo and Close */}
              <div className="flex justify-between items-center px-6 py-8 border-b border-brand-border/30">
                <Link href="/" onClick={() => setMobileMenuOpen(false)} className="flex items-center">
                  <Logo size="md" variant="black" animated={false} />
                </Link>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 -ml-2 text-text-primary hover:text-accent transition-colors"
                  aria-label="إغلاق القائمة"
                >
                  <X className="w-7 h-7 stroke-[0.75]" />
                </button>
              </div>

              {/* Navigation Links with Stagger */}
              <motion.div 
                className="flex flex-col gap-8 px-8 mt-12 text-right overflow-y-auto"
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: { opacity: 0 },
                  visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } }
                }}
              >
                {[...leftLinks, ...rightLinks].map((link) => (
                  <motion.div key={link.path} variants={{
                    hidden: { opacity: 0, x: 20 },
                    visible: { opacity: 1, x: 0, transition: { duration: 0.8, ease: [0.25, 0.1, 0.25, 1] } }
                  }}>
                    <Link
                      href={link.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className="font-serif text-3xl font-light text-text-primary hover:text-accent transition-colors block"
                    >
                      {link.name}
                    </Link>
                  </motion.div>
                ))}
              </motion.div>

              {/* Footer Account / Cart Actions */}
              <motion.div 
                className="mt-auto px-8 pb-12 flex flex-col gap-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
              >
                <div className="flex justify-between items-center border-t border-brand-border/40 pt-8">
                  <Link href="/profile" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 text-text-secondary hover:text-text-primary transition-colors">
                    <User className="w-5 h-5 stroke-[1]" />
                    <span className="font-sans text-xs">حسابي</span>
                  </Link>
                  <a href={getWhatsAppUrl()} target="_blank" rel="noopener noreferrer" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 text-text-secondary hover:text-text-primary transition-colors">
                    <MessageCircle className="w-5 h-5 stroke-[1]" />
                    <span className="font-sans text-xs">واتساب</span>
                  </a>
                  <button onClick={() => { setCartOpen(true); setMobileMenuOpen(false); }} className="flex items-center gap-3 text-text-secondary hover:text-text-primary transition-colors relative">
                    <span className="font-sans text-xs">الحقيبة</span>
                    <ShoppingBag className="w-5 h-5 stroke-[1]" />
                    {cartCount > 0 && (
                      <span className="absolute -top-1.5 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[9px] font-bold text-background-secondary">
                        {cartCount}
                      </span>
                    )}
                  </button>
                </div>

                {/* Brand Info */}
                <div className="flex flex-col gap-2 text-[11px] font-sans text-text-secondary font-light">
                  <p className="font-medium text-text-primary">أتيلييه أورا الرئيسي</p>
                  <p>سان ستيفانو، الإسكندرية، مصر</p>
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 3. LUXURY SEARCH DRAWER - SOLID BACKGROUND */}
      <AnimatePresence>
        {isSearchOpen && (
          <>
            {/* Backdrop overlay for search */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={closeSearch}
              className="fixed inset-0 bg-text-primary/20 z-40"
            />
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="fixed top-24 left-0 right-0 bg-background-secondary border-b border-brand-border z-40 py-8 px-6 shadow-md max-h-[85vh] overflow-y-auto"
            >
              <div className="max-w-[1280px] mx-auto flex flex-col gap-6">
                
                {/* Input Bar */}
                <div className="flex items-center gap-4 border-b border-brand-border pb-2">
                  <Search className="w-5 h-5 text-accent shrink-0" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        addRecentSearch(searchQuery);
                      }
                    }}
                    placeholder="ابحثي عن فساتين، أطقم، بلوزات الكتان..."
                    className="w-full text-base font-sans font-light outline-none bg-transparent placeholder:text-text-secondary/40 text-right"
                    dir="rtl"
                    autoFocus
                  />
                  {searchQuery && (
                    <button
                      onClick={() => {
                        setSearchQuery("");
                        setSearchResults([]);
                        setSearchLoading(false);
                      }}
                      className="text-text-secondary hover:text-text-primary transition-colors p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Grid content: Suggestions vs Results */}
                <div className="grid grid-cols-1 md:grid-cols-[250px_1fr] gap-8 mt-2 text-right" dir="rtl">
                  
                  {/* Left Column: Popular & Recent */}
                  <div className="flex flex-col gap-6 border-l border-brand-border/40 pl-6">
                    {/* Popular Suggestions */}
                    <div>
                      <h4 className="font-sans text-[10px] text-accent font-bold uppercase mb-3">مقترحات شائعة</h4>
                      <div className="flex flex-wrap gap-2">
                        {["فستان حرير", "طقم كتان", "بلوزة", "عباءة"].map((term) => (
                          <button
                            key={term}
                            onClick={() => handleSuggestionClick(term)}
                            className="text-xs px-3 py-1.5 bg-background-primary border border-brand-border hover:border-accent text-text-secondary hover:text-accent transition-colors"
                          >
                            {term}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Recent Searches */}
                    {recentSearches.length > 0 && (
                      <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-center">
                          <h4 className="font-sans text-[10px] text-accent font-bold uppercase">عمليات البحث الأخيرة</h4>
                          <button
                            onClick={clearRecentSearches}
                            className="text-[9px] text-text-secondary hover:text-accent transition-colors underline"
                          >
                            مسح الكل
                          </button>
                        </div>
                        <ul className="flex flex-col gap-1">
                          {recentSearches.map((term, index) => (
                            <li key={index} className="flex items-center justify-between group">
                              <button
                                onClick={() => handleSuggestionClick(term)}
                                className="text-xs text-text-secondary hover:text-text-primary transition-colors text-right py-1 flex-grow"
                              >
                                {term}
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Search Results */}
                  <div className="flex flex-col gap-4">
                    {searchLoading ? (
                      /* Skeletons */
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        <div className="flex gap-3 items-center border border-brand-border/40 p-2"><Skeleton className="w-12 h-16 shrink-0" /><div className="flex flex-col gap-2 w-full"><Skeleton className="h-3 w-3/4" /><Skeleton className="h-3 w-1/4" /></div></div>
                        <div className="flex gap-3 items-center border border-brand-border/40 p-2"><Skeleton className="w-12 h-16 shrink-0" /><div className="flex flex-col gap-2 w-full"><Skeleton className="h-3 w-3/4" /><Skeleton className="h-3 w-1/4" /></div></div>
                        <div className="flex gap-3 items-center border border-brand-border/40 p-2"><Skeleton className="w-12 h-16 shrink-0" /><div className="flex flex-col gap-2 w-full"><Skeleton className="h-3 w-3/4" /><Skeleton className="h-3 w-1/4" /></div></div>
                      </div>
                    ) : searchQuery.trim() === "" ? (
                      <p className="text-xs text-text-secondary font-light">ابدئي بكتابة كلمات البحث لاستكشاف تصاميم أورا...</p>
                    ) : searchResults.length === 0 ? (
                      /* Premium empty state */
                      <div className="py-12 flex flex-col justify-center items-center gap-2 border border-dashed border-brand-border bg-background-primary">
                        <p className="font-sans text-sm font-medium text-text-primary">لم نجد ما تبحثين عنه</p>
                        <p className="text-xs text-text-secondary font-light">تأكدي من صحة الإملاء أو جربي مقترحات أخرى</p>
                      </div>
                    ) : (
                      /* Results list */
                      <div>
                        <h4 className="font-sans text-[10px] text-accent font-bold uppercase mb-4">القطع المطابقة ({searchResults.length})</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                          {searchResults.map((product) => (
                            <Link
                              href={`/product/${product.id}`}
                              key={product.id}
                              onClick={closeSearch}
                              className="flex gap-3 items-center border border-brand-border/40 hover:border-accent p-2 bg-background-primary transition-all duration-300 group"
                            >
                              <div className="relative w-12 h-16 shrink-0 bg-background-secondary border border-brand-border">
                                <Image src={product.image} alt={product.title} fill sizes="48px" className="object-cover" />
                              </div>
                              <div className="flex flex-col justify-center min-w-0">
                                <h5 className="font-sans text-xs font-medium text-text-primary group-hover:text-accent transition-colors truncate max-w-[160px]">
                                  {product.title}
                                </h5>
                                <span className="font-display text-xs text-accent font-semibold mt-1">
                                  {product.price.toLocaleString()} ج.م
                                </span>
                              </div>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                </div>

              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 4. SOLID CART DRAWER */}
      <AnimatePresence>
        {isCartOpen && (
          <>
            {/* Solid Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setCartOpen(false)}
              className="fixed inset-0 bg-text-primary/40 z-50"
            />
            {/* Drawer Container */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "tween", duration: 0.35, ease: "easeOut" }}
              className="fixed top-0 right-0 bottom-0 w-full max-w-[450px] bg-background-secondary z-50 p-6 md:p-8 flex flex-col"
            >
              <div className="flex justify-between items-center border-b border-brand-border pb-4">
                <div className="flex items-center gap-2">
                  <span className="font-sans text-base font-semibold">حقيبة التسوق</span>
                  <span className="font-display text-xs text-text-secondary">({cartCount} قطع)</span>
                </div>
                <button
                  onClick={() => setCartOpen(false)}
                  className="p-1 hover:text-accent transition-colors"
                  aria-label="إغلاق حقيبة التسوق"
                >
                  <X className="w-5 h-5 stroke-[1.5]" />
                </button>
              </div>

              {/* Items List */}
              <div className="flex-grow overflow-y-auto py-4 flex flex-col gap-4">
                {cart.length === 0 ? (
                  <div className="h-full flex flex-col justify-center items-center text-center gap-4 py-12">
                    <ShoppingBag className="w-12 h-12 stroke-[1] text-brand-border" />
                    <div>
                      <p className="font-sans text-base font-semibold">حقيبتكِ فارغة</p>
                      <p className="text-xs text-text-secondary font-light mt-1">لم تضيفي أي قطعة بعد</p>
                    </div>
                    <Link
                      href="/shop"
                      onClick={() => setCartOpen(false)}
                      className="inline-flex items-center justify-center bg-text-primary text-background-secondary font-sans text-xs min-h-[44px] px-8 hover:bg-accent transition-colors mt-4"
                    >
                      اكتشفي التشكيلة الجديدة
                    </Link>
                  </div>
                ) : (
                  cart.map((item) => (
                    <div
                      key={`${item.id}-${item.color}-${item.size}`}
                      className="flex gap-4 border-b border-brand-border pb-4"
                    >
                      <div className="relative w-20 h-24 shrink-0 bg-background-secondary border border-brand-border group-hover:border-accent transition-colors">
                        <Image src={item.image} alt={item.title} fill sizes="80px" className="object-cover" />
                      </div>
                      <div className="flex-grow flex flex-col justify-between">
                        <div>
                          <span className="text-[10px] text-accent font-semibold uppercase mb-1 block">
                            {item.collection || "كوتور"}
                          </span>
                          <h4 className="font-sans text-sm font-medium text-text-primary leading-snug">
                            {item.title}
                          </h4>
                          <div className="font-sans text-xs text-text-secondary flex flex-col gap-1 mt-2">
                            <div>اللون: <span className="text-text-primary font-medium">{item.color || "لم يحدد"}</span></div>
                            <div>المقاس: <span className="text-text-primary font-medium">{item.size || "لم يحدد"}</span></div>
                          </div>
                        </div>
                        <div className="flex justify-between items-center mt-2">
                          {/* Quantity control */}
                          <div className="flex items-center border border-brand-border bg-background-primary">
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity - 1, item.size, item.color)}
                              className="px-2 py-1 text-xs text-text-secondary hover:text-text-primary"
                              aria-label="تقليل الكمية"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="px-2 text-xs font-semibold w-8 text-center font-display">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity + 1, item.size, item.color)}
                              className="px-2 py-1 text-xs text-text-secondary hover:text-text-primary"
                              aria-label="زيادة الكمية"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                          <span className="text-sm font-bold font-display">
                            {(item.price * item.quantity).toLocaleString()} ج.م
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.id, item.size, item.color)}
                        className="self-start text-text-secondary hover:text-text-primary p-1"
                        aria-label="حذف المنتج"
                      >
                        <X className="w-4 h-4 stroke-[1.5]" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Summary Bottom */}
              {cart.length > 0 && (
                <div className="border-t border-brand-border pt-4 mt-auto">
                  <div className="flex justify-between items-center mb-4">
                    <span className="font-sans text-sm font-medium">المجموع الفرعي</span>
                    <span className="text-lg font-bold text-accent font-display">
                      {cartSubtotal.toLocaleString()} ج.م
                    </span>
                  </div>
                  <p className="text-[11px] font-sans text-text-secondary mb-4 leading-relaxed">
                    التغليف الفاخر والشحن السريع لجميع محافظات مصر مجانيان بالكامل.
                  </p>
                  <div className="flex flex-col gap-2">
                    <Link
                      href="/checkout"
                      onClick={() => setCartOpen(false)}
                      className="inline-flex items-center justify-center bg-text-primary text-background-secondary font-sans text-xs min-h-[46px] hover:bg-accent transition-all duration-500 text-center w-full"
                    >
                      إتمام الطلب
                    </Link>
                    <button
                      onClick={() => setCartOpen(false)}
                      className="text-center text-xs text-text-secondary hover:text-text-primary py-2 underline underline-offset-4"
                    >
                      مواصلة التسوق
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 5. MOBILE STICKY BOTTOM NAVIGATION - PREMIUM LUXURY STYLE */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 h-16 bg-background-secondary border-t border-brand-border flex items-center justify-around md:hidden px-2 shadow-[0_-4px_12px_rgba(0,0,0,0.03)] pb-safe">
        <Link
          href="/"
          className={`flex flex-col items-center justify-center gap-1 w-12 text-center transition-colors ${
            pathname === "/" ? "text-accent font-medium" : "text-text-secondary hover:text-accent"
          }`}
        >
          <PiHouseThin className="w-6 h-6" />
          <span className="text-[9px] font-sans">الرئيسية</span>
        </Link>

        <Link
          href="/shop"
          className={`flex flex-col items-center justify-center gap-1 w-12 text-center transition-colors ${
            pathname.startsWith("/shop") ? "text-accent font-medium" : "text-text-secondary hover:text-accent"
          }`}
        >
          <PiCompassThin className="w-6 h-6" />
          <span className="text-[9px] font-sans">التشكيلة</span>
        </Link>

        <button
          onClick={() => {
            setSearchOpen(!isSearchOpen);
            setMobileMenuOpen(false);
          }}
          className={`flex flex-col items-center justify-center gap-1 w-12 text-center transition-colors ${
            isSearchOpen ? "text-accent" : "text-text-secondary hover:text-accent"
          }`}
        >
          <PiMagnifyingGlassThin className="w-6 h-6" />
          <span className="text-[9px] font-sans">البحث</span>
        </button>

        <Link
          href="/wishlist"
          className={`flex flex-col items-center justify-center gap-1 w-12 text-center transition-colors relative ${
            pathname === "/wishlist" ? "text-accent font-medium" : "text-text-secondary hover:text-accent"
          }`}
        >
          <PiHeartThin className="w-6 h-6" />
          {wishlist.length > 0 && (
            <span className="absolute top-0.5 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[8px] font-bold text-background-secondary">
              {wishlist.length}
            </span>
          )}
          <span className="text-[9px] font-sans">المفضلة</span>
        </Link>

        <button
          onClick={() => {
            setCartOpen(true);
            setMobileMenuOpen(false);
          }}
          className={`flex flex-col items-center justify-center gap-1 w-12 text-center transition-colors relative ${
            isCartOpen ? "text-[#9A7355]" : "text-[#A89888] hover:text-[#9A7355]"
          }`}
        >
          <PiHandbagThin className="w-6 h-6" />
          {cartCount > 0 && (
            <motion.span
              key={cartCount}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 20 }}
              className="absolute top-0.5 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#9A7355] text-[8px] font-bold text-white"
            >
              {cartCount}
            </motion.span>
          )}
          <span className="text-[9px] font-sans">الحقيبة</span>
        </button>
      </nav>
    </>
  );
}

