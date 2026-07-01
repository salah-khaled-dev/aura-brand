"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Logo from "@/components/Logo";
import { motion } from "framer-motion";
import { IconPlus as Plus, IconMinus as Minus, IconBrandFacebook, IconBrandInstagram } from "@tabler/icons-react";
import { useNotification } from "@/context/NotificationContext";
import { SocialIconButton } from "@/components/ui/AnimatedIcon";
import { FooterService, FooterSettings } from "@/lib/services/storefront/footer.service";
import { StoreService } from "@/lib/services/storefront/store.service";
import { useEventSubscribeMany } from "@/hooks/useEventBus";

/* ─────────────── Social SVG icons ─────────────── */
const SocialIcons = {
  Facebook: () => <IconBrandFacebook stroke={1.4} className="w-5 h-5" />,
  Instagram: () => <IconBrandInstagram stroke={1.4} className="w-5 h-5" />,
  TikTok: () => (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.32 6.32 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.75a4.85 4.85 0 0 1-1.01-.06z" />
    </svg>
  ),
  Pinterest: () => (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z" />
    </svg>
  ),

  WhatsApp: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  ),
};

type NavColumnData = { title: string; links: { label: string; href: string }[] };
type SocialEntry = { Icon: React.FC; label: string; href: string };

const DEFAULT_NAV_DATA: NavColumnData[] = [
  {
    title: "المتجر",
    links: [
      { label: "كل المنتجات",       href: "/shop"                 },
      { label: "أزياء الشتاء",      href: "/shop?category=winter" },
      { label: "أزياء الصيف",       href: "/shop?category=summer" },
    ],
  },
  {
    title: "دار أورا",
    links: [
      { label: "قصتنا وحرفيتنا",    href: "/about"        },
      { label: "تتبع طلبكِ",        href: "/tracking"     },
      { label: "تواصلي معنا",        href: "/contact"      },
    ],
  },
  {
    title: "خدمتكِ",
    links: [
      { label: "الشحن والتوصيل",    href: "/shipping"   },
      { label: "الاستبدال والإرجاع", href: "/returns"    },
      { label: "الشروط والأحكام",   href: "/terms"      },
      { label: "سياسة الخصوصية",   href: "/privacy"    },
    ],
  },
];

const DEFAULT_SOCIALS: SocialEntry[] = [
  { Icon: SocialIcons.Facebook,  label: "Facebook",  href: "https://www.facebook.com/AuraFashionEgypt" },
  { Icon: SocialIcons.Instagram, label: "Instagram", href: "https://www.instagram.com/aurafashionegy/" },
  { Icon: SocialIcons.WhatsApp,  label: "WhatsApp",  href: "https://wa.me/201000000000?text=%D9%85%D8%B1%D8%AD%D8%A8%D8%A7%D9%8B%D8%8C%20%D8%A3%D8%B1%D9%8A%D8%AF%20%D8%A7%D9%84%D8%A7%D8%B3%D8%AA%D9%81%D8%B3%D8%A7%D8%B1%20%D8%B9%D9%86%20%D9%85%D9%86%D8%AA%D8%AC%D8%A7%D8%AA%20AURA" },
  { Icon: SocialIcons.TikTok,    label: "TikTok",    href: "https://www.tiktok.com/@aurabrand.eg" },
  { Icon: SocialIcons.Pinterest, label: "Pinterest", href: "https://www.pinterest.com/aurabrandeg" },
];

/* ─────────────── Reusable animated link ─────────────── */
function FooterLink({ label, href }: { label: string; href: string }) {
  return (
    <li>
      <Link
        href={href}
        className="group relative inline-block font-sans text-xs font-light text-text-secondary hover:text-text-primary transition-colors duration-300 leading-relaxed min-h-[36px] md:min-h-0 flex items-center md:inline-flex"
      >
        {label}
        <span className="absolute bottom-0 start-0 w-0 h-px bg-accent group-hover:w-full transition-all duration-500 ease-out" />
      </Link>
    </li>
  );
}

/* ─────────────── Accordion column (mobile) ─────────────── */
function NavColumn({ title, links, delay }: { title: string; links: { label: string; href: string }[]; delay: number }) {
  const [open, setOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "60px" }}
      transition={{ duration: 0.7, delay, ease: [0.25, 0.1, 0.25, 1] }}
    >
      {/* Title / toggle */}
      <button
        onClick={() => setOpen((p) => !p)}
        className="w-full flex justify-between items-center py-4 md:py-0 md:pointer-events-none border-b border-brand-border md:border-none text-right"
        aria-expanded={open}
      >
        <span className="font-sans text-[10px] uppercase tracking-[0.22em] text-accent font-bold">
          {title}
        </span>
        <span className="md:hidden text-text-secondary/60">
          {open
            ? <Minus className="w-3.5 h-3.5" />
            : <Plus  className="w-3.5 h-3.5" />}
        </span>
      </button>

      {/* Links list */}
      <motion.ul
        initial={false}
        animate={{ height: open ? "auto" : 0, opacity: open ? 1 : 0 }}
        transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
        className="overflow-hidden md:!h-auto md:!opacity-100 flex flex-col gap-3 pb-2 md:pb-0 md:mt-5"
      >
        {links.map((l) => <FooterLink key={l.href} {...l} />)}
      </motion.ul>
    </motion.div>
  );
}

/* ─────────────── Main Footer ─────────────── */
export default function Footer() {
  const { showNotification } = useNotification();
  const [email, setEmail] = useState("");
  const [navData, setNavData] = useState<NavColumnData[]>(DEFAULT_NAV_DATA);
  const [socials, setSocials] = useState<SocialEntry[]>(DEFAULT_SOCIALS);
  const [newsletterTitle, setNewsletterTitle] = useState('صالون أورا البريدي');
  const [newsletterSubtitle, setNewsletterSubtitle] = useState('دعوات خاصة وتحديثات الأتيلييه');
  const [copyrightText, setCopyrightText] = useState('© ٢٠٢٦ دار أورا للأزياء الراقية');
  const [developerCredit, setDeveloperCredit] = useState('صلاح خالد');
  const [showNewsletter, setShowNewsletter] = useState(true);
  const [showSocialIcons, setShowSocialIcons] = useState(true);

  const SOCIAL_ICON_MAP: Record<string, React.FC> = {
    facebook: SocialIcons.Facebook,
    instagram: SocialIcons.Instagram,
    whatsapp: SocialIcons.WhatsApp,
    tiktok: SocialIcons.TikTok,
    pinterest: SocialIcons.Pinterest,
  };

  const loadFooterData = useCallback(async () => {
    try {
      const [footerSettings, storeInfo] = await Promise.all([
        FooterService.getSettings(),
        StoreService.getInfo(),
      ]);

      if (footerSettings.columns?.length) {
        setNavData(footerSettings.columns
          .sort((a, b) => a.order - b.order)
          .map(col => ({
            title: col.title,
            links: col.links.map(l => ({ label: l.label, href: l.url })),
          })));
      }

      if (footerSettings.newsletterTitle) setNewsletterTitle(footerSettings.newsletterTitle);
      if (footerSettings.newsletterSubtitle) setNewsletterSubtitle(footerSettings.newsletterSubtitle);
      if (footerSettings.copyrightText) setCopyrightText(footerSettings.copyrightText);
      if (footerSettings.developerCredit) setDeveloperCredit(footerSettings.developerCredit);
      setShowNewsletter(footerSettings.showNewsletter ?? true);
      setShowSocialIcons(footerSettings.showSocialIcons ?? true);

      if (storeInfo?.socialMedia) {
        const sm = storeInfo.socialMedia;
        const built: SocialEntry[] = Object.entries(sm)
          .filter(([key]) => SOCIAL_ICON_MAP[key] && (sm as any)[key])
          .map(([key, href]) => ({
            Icon: SOCIAL_ICON_MAP[key],
            label: key.charAt(0).toUpperCase() + key.slice(1),
            href: href as string,
          }));
        if (built.length) setSocials(built);
      }
    } catch {
      // keep defaults
    }
  }, []);

  useEffect(() => { loadFooterData(); }, [loadFooterData]);
  useEventSubscribeMany(['website.changed'], loadFooterData);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    showNotification("شكرًا لانضمامكِ إلى صالون AURA البريدي الخاص", "success");
    setEmail("");
  };

  return (
    <footer
      aria-label="تذييل الصفحة — دار أورا"
      className="w-full bg-[#FAF8F5] border-t border-[#EAE3D9]"
    >

      {/* ══════════════════════════════
          HERO BRAND ROW
      ══════════════════════════════ */}
      <div className="max-w-[1280px] mx-auto px-6 md:px-12">
        <div className="py-14 md:py-20 flex flex-col md:flex-row md:items-end md:justify-between gap-8">

          {/* Logo + tagline */}
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "60px" }}
            transition={{ duration: 1, ease: [0.25, 0.1, 0.25, 1] }}
            className="flex flex-col items-start gap-4"
          >
            <Link href="/" aria-label="AURA – الصفحة الرئيسية">
              <Logo size="lg" variant="black" animated={false} className="hover:opacity-70 transition-opacity duration-500" />
            </Link>
            <p className="font-serif text-base md:text-lg font-light text-text-secondary leading-relaxed max-w-[300px]">
              صُممت لأجلكِ — دار أزياء نسائية مصرية راقية
            </p>
          </motion.div>

          {/* Newsletter */}
          {showNewsletter && (
            <motion.div
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "60px" }}
              transition={{ duration: 1, delay: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
              className="flex flex-col gap-3 w-full md:max-w-[380px]"
            >
              <span className="font-sans text-[10px] uppercase tracking-[0.22em] text-accent font-bold">
                {newsletterTitle}
              </span>
              <h3 className="font-serif text-lg md:text-xl font-light text-text-primary leading-snug">
                {newsletterSubtitle}
              </h3>
              <form
                onSubmit={handleSubscribe}
                className="flex mt-1"
              >
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="بريدكِ الإلكتروني..."
                  required
                  dir="rtl"
                  className="flex-1 h-12 bg-white border border-[#EAE3D9] border-l-0 text-xs font-sans
                             text-text-primary px-5 outline-none placeholder:text-text-secondary/40
                             focus:border-accent transition-colors duration-300"
                />
                <button
                  type="submit"
                  className="h-12 shrink-0 bg-text-primary text-background-secondary text-xs font-sans
                             font-semibold px-7 hover:bg-accent transition-colors duration-500"
                >
                  انضمام
                </button>
              </form>
            </motion.div>
          )}
        </div>

        {/* Thin separator */}
        <div className="h-px bg-[#EAE3D9]" />
      </div>

      {/* ══════════════════════════════
          NAV COLUMNS
      ══════════════════════════════ */}
      <div className="max-w-[1280px] mx-auto px-6 md:px-12 py-10 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-0 md:gap-12 lg:gap-20">
          {navData.map((col, i) => (
            <NavColumn key={col.title} title={col.title} links={col.links} delay={i * 0.1} />
          ))}
        </div>
      </div>

      {/* Thin separator */}
      <div className="max-w-[1280px] mx-auto px-6 md:px-12">
        <div className="h-px bg-[#EAE3D9]" />
      </div>

      {/* ══════════════════════════════
          BOTTOM BAR
      ══════════════════════════════ */}
      <div className="max-w-[1280px] mx-auto px-6 md:px-12">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="py-6 md:py-8 flex flex-col-reverse md:flex-row items-center justify-between gap-5"
        >

          {/* Copyright */}
          <div className="flex flex-col items-center md:items-start gap-2.5">
            <div className="flex flex-col sm:flex-row items-center gap-3 text-[10px] font-sans font-light text-text-secondary">
              <span>{copyrightText}</span>
              <span className="hidden sm:block text-[#EAE3D9]">|</span>
              <address className="not-italic flex gap-1">
                <span>صُممت لتُرى —</span>
                <span className="text-accent font-medium">صنع بكل فخر في مصر</span>
              </address>
            </div>
            {/* Developer Attribution */}
            <div className="text-[10px] font-sans font-light text-text-secondary/90 flex items-center gap-1.5 select-none">
              <span>تجربة رقمية من تصميم وتطوير</span>
              <a
                href="https://salahkhaled.com/en"
                target="_blank"
                rel="noopener noreferrer"
                className="font-normal text-text-secondary hover:text-accent opacity-90 hover:opacity-100 transition-all duration-300 relative py-0.5 group focus:outline-none focus-visible:ring-1 focus-visible:ring-accent rounded px-1 -mx-1"
              >
                {developerCredit}
                <span className="absolute bottom-0 end-0 w-0 h-[1px] bg-accent group-hover:w-full transition-all duration-300 ease-out motion-reduce:transition-none" />
              </a>
            </div>
          </div>

          {/* Social icons */}
          {showSocialIcons && (
            <div className="flex items-center gap-0">
              {socials.map(({ Icon, label, href }) => (
                <SocialIconButton key={label} href={href} label={label} size="md">
                  <Icon />
                </SocialIconButton>
              ))}
            </div>
          )}
        </motion.div>
      </div>

    </footer>
  );
}
