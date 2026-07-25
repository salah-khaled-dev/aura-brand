import { createClient } from '@/lib/supabase/client';
import type { Tables, TablesUpdate, Json } from '@/lib/supabase/database.types';
import { eventBus } from '@/lib/events/EventBus';

export interface FooterColumn {
  id: string;
  title: string;
  links: { id: string; label: string; url: string }[];
  order: number;
}

export interface FooterSettings {
  showNewsletter: boolean;
  newsletterTitle: string;
  newsletterSubtitle: string;
  showSocialIcons: boolean;
  showPaymentIcons: boolean;
  developerCredit: string;
  copyrightText: string;
  columns: FooterColumn[];
}

type FooterRow = Tables<'footer_settings'>;

const supabase = createClient();

function rowToFooter(row: FooterRow): FooterSettings {
  return {
    showNewsletter: row.show_newsletter,
    newsletterTitle: row.newsletter_title,
    newsletterSubtitle: row.newsletter_subtitle,
    showSocialIcons: row.show_social_icons,
    showPaymentIcons: row.show_payment_icons,
    developerCredit: row.developer_credit,
    copyrightText: row.copyright_text,
    columns: (row.columns as unknown as FooterColumn[]) ?? [],
  };
}

export const FooterService = {
  async getSettings(): Promise<FooterSettings> {
    const { data, error } = await supabase.from('footer_settings').select('*').eq('id', 1).single();
    if (error) throw error;
    return rowToFooter(data);
  },

  async updateSettings(updates: Partial<FooterSettings>): Promise<FooterSettings> {
    const patch: TablesUpdate<'footer_settings'> = {};
    if (updates.showNewsletter !== undefined) patch.show_newsletter = updates.showNewsletter;
    if (updates.newsletterTitle !== undefined) patch.newsletter_title = updates.newsletterTitle;
    if (updates.newsletterSubtitle !== undefined) patch.newsletter_subtitle = updates.newsletterSubtitle;
    if (updates.showSocialIcons !== undefined) patch.show_social_icons = updates.showSocialIcons;
    if (updates.showPaymentIcons !== undefined) patch.show_payment_icons = updates.showPaymentIcons;
    if (updates.developerCredit !== undefined) patch.developer_credit = updates.developerCredit;
    if (updates.copyrightText !== undefined) patch.copyright_text = updates.copyrightText;
    if (updates.columns !== undefined) patch.columns = updates.columns as unknown as Json;

    const { data, error } = await supabase.from('footer_settings').update(patch).eq('id', 1).select().single();
    if (error) throw error;
    eventBus.emit('website.changed', { area: 'footer' });
    return rowToFooter(data);
  },
};
