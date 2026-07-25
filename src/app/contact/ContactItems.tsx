"use client";

import { useState, useEffect, useCallback } from "react";
import { IconMessageCircle as MessageCircle, IconMail as Mail, IconMapPin as MapPin, IconClock as Clock } from "@tabler/icons-react";
import { StoreService } from "@/lib/services/storefront/store.service";
import { useEventSubscribeMany } from "@/hooks/useEventBus";
import { getWhatsAppUrl, WHATSAPP_CONFIG } from "@/config/whatsapp";

const DEFAULT_ITEMS = [
  { icon: MessageCircle, title: "واتساب المستشارة", text: `+${WHATSAPP_CONFIG.phoneNumber}`, href: getWhatsAppUrl() },
  { icon: Mail,          title: "البريد الإلكتروني", text: "care@aura-brand-virid.vercel.app", href: "mailto:care@aura-brand-virid.vercel.app" },
  { icon: MapPin,        title: "أتيلييه AURA",      text: "المهندسين، الجيزة، مصر",            href: "#atelier" },
  { icon: Clock,         title: "مواعيد العناية",    text: "يوميًا من 11 صباحًا حتى 8 مساءً",  href: "#hours" },
];

type ContactItemEntry = typeof DEFAULT_ITEMS[number];

export function ContactItems() {
  const [items, setItems] = useState<ContactItemEntry[]>(DEFAULT_ITEMS);

  const loadContactInfo = useCallback(async () => {
    try {
      const info = await StoreService.getInfo();
      setItems([
        { icon: MessageCircle, title: "واتساب المستشارة",  text: info.whatsapp,     href: info.socialMedia.whatsapp || getWhatsAppUrl() },
        { icon: Mail,          title: "البريد الإلكتروني", text: info.email,         href: `mailto:${info.email}` },
        { icon: MapPin,        title: "أتيلييه AURA",      text: info.address,       href: "#atelier" },
        { icon: Clock,         title: "مواعيد العناية",    text: info.workingHours,  href: "#hours" },
      ]);
    } catch {
      // keep defaults
    }
  }, []);

  useEffect(() => { loadContactInfo(); }, [loadContactInfo]);
  useEventSubscribeMany(['website.changed'], loadContactInfo);

  return (
    <section className="grid grid-cols-1 gap-5 sm:grid-cols-2">
      {items.map(({ icon: Icon, title, text, href }) => (
        <a key={title} href={href} className="border border-brand-border bg-background-secondary p-6 transition-colors duration-300 hover:border-accent">
          <Icon className="h-5 w-5 text-accent stroke-[1.4]" aria-hidden="true" />
          <h2 className="mt-5 font-sans text-sm font-bold text-text-primary">{title}</h2>
          <p className="mt-2 font-sans text-xs font-light leading-relaxed text-text-secondary">{text}</p>
        </a>
      ))}
    </section>
  );
}
