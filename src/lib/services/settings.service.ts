import { createClient } from '@/lib/supabase/client';
import type { Tables, TablesUpdate } from '@/lib/supabase/database.types';
import { Settings } from '@/data/mock/settings';

const SETTINGS_ID = 1;

const supabase = createClient();

// `payment.currencyFormat` is a display-format string with no `store_settings`
// column — kept client-side only until a real column exists for it.
const DEFAULT_CURRENCY_FORMAT = '{value} جنيه';

function rowToSettings(row: Tables<'store_settings'>): Settings {
  return {
    store: {
      storeNameAr: row.store_name_ar,
      storeNameEn: row.store_name_en,
      description: row.store_description,
      storeEmail: row.contact_email ?? '',
      storePhone: row.contact_phone ?? '',
      whatsapp: row.whatsapp_number ?? '',
      address: (row.address as { formatted?: string } | null)?.formatted ?? '',
      workingHours: (row.working_hours as unknown as Settings['store']['workingHours']) ?? [],
      logo: row.logo_url ?? '',
      favicon: row.favicon_url ?? '',
      socialLinks: (row.social_links as unknown as Settings['store']['socialLinks']) ?? {
        instagram: '', facebook: '', tiktok: '',
      },
    },
    management: {
      maintenanceMode: row.maintenance_mode,
      maintenanceMessage: row.maintenance_message ?? '',
      defaultCurrency: row.currency,
    },
    payment: {
      currencyFormat: DEFAULT_CURRENCY_FORMAT,
      taxRate: row.tax_rate,
      enableCOD: row.enable_cod,
      enableVodafoneCash: row.enable_vodafone_cash,
      enableInstapay: row.enable_instapay,
      shippingCost: row.shipping_fee,
      freeShippingThreshold: row.free_shipping_threshold ?? 0,
      estimatedDeliveryDays: row.estimated_delivery_days,
    },
    seo: {
      metaTitle: row.seo_title ?? '',
      metaDescription: row.seo_description ?? '',
      metaKeywords: (row.seo_keywords ?? []).join(', '),
      ogImage: row.og_image_url ?? '',
      googleAnalyticsId: row.google_analytics_id ?? '',
      googleSearchConsoleCode: row.google_search_console_code ?? '',
      robotsTxt: row.robots_txt,
      sitemapEnabled: row.sitemap_enabled,
    },
  };
}

function settingsToUpdateRow(data: Partial<Settings>): TablesUpdate<'store_settings'> {
  const update: TablesUpdate<'store_settings'> = {};

  if (data.store) {
    const s = data.store;
    update.store_name_ar = s.storeNameAr;
    update.store_name_en = s.storeNameEn;
    update.store_description = s.description;
    update.contact_email = s.storeEmail;
    update.contact_phone = s.storePhone;
    update.whatsapp_number = s.whatsapp;
    update.address = { formatted: s.address };
    update.working_hours = s.workingHours as unknown as TablesUpdate<'store_settings'>['working_hours'];
    update.logo_url = s.logo;
    update.favicon_url = s.favicon;
    update.social_links = s.socialLinks as unknown as TablesUpdate<'store_settings'>['social_links'];
  }

  if (data.management) {
    const m = data.management;
    update.maintenance_mode = m.maintenanceMode;
    update.maintenance_message = m.maintenanceMessage;
    update.currency = m.defaultCurrency;
  }

  if (data.payment) {
    const p = data.payment;
    update.tax_rate = p.taxRate;
    update.enable_cod = p.enableCOD;
    update.enable_vodafone_cash = p.enableVodafoneCash;
    update.enable_instapay = p.enableInstapay;
    update.shipping_fee = p.shippingCost;
    update.free_shipping_threshold = p.freeShippingThreshold;
    update.estimated_delivery_days = p.estimatedDeliveryDays;
  }

  if (data.seo) {
    const seo = data.seo;
    update.seo_title = seo.metaTitle;
    update.seo_description = seo.metaDescription;
    update.seo_keywords = seo.metaKeywords.split(',').map(k => k.trim()).filter(Boolean);
    update.og_image_url = seo.ogImage;
    update.google_analytics_id = seo.googleAnalyticsId;
    update.google_search_console_code = seo.googleSearchConsoleCode;
    update.robots_txt = seo.robotsTxt;
    update.sitemap_enabled = seo.sitemapEnabled;
  }

  return update;
}

export const SettingsService = {
  async getSettings(): Promise<Settings> {
    const { data, error } = await supabase
      .from('store_settings')
      .select('*')
      .eq('id', SETTINGS_ID)
      .single();
    if (error) throw error;
    return rowToSettings(data);
  },

  async updateSettings(data: Partial<Settings>): Promise<Settings> {
    const { data: row, error } = await supabase
      .from('store_settings')
      .update(settingsToUpdateRow(data))
      .eq('id', SETTINGS_ID)
      .select('*')
      .single();
    if (error) throw error;
    return rowToSettings(row);
  },
};
