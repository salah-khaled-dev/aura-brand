import { createClient } from '@/lib/supabase/client';
import type { Tables, TablesUpdate, Json } from '@/lib/supabase/database.types';
import { eventBus } from '@/lib/events/EventBus';

export interface AnnouncementBarSettings {
  enabled: boolean;
  text: string;
  link: string;
  bgColor: string;
  textColor: string;
}

export interface StoreInfo {
  storeName: string;
  phone: string;
  whatsapp: string;
  email: string;
  supportEmail: string;
  address: string;
  googleMapsUrl: string;
  workingHours: string;
  commercialRegistration: string;
  taxNumber: string;
  socialMedia: {
    instagram: string;
    facebook: string;
    whatsapp: string;
    tiktok: string;
    pinterest: string;
  };
  announcementBar: AnnouncementBarSettings;
}

type StoreInfoRow = Tables<'website_store_info'>;

const supabase = createClient();

const DEFAULT_SOCIAL = { instagram: '', facebook: '', whatsapp: '', tiktok: '', pinterest: '' };
const DEFAULT_ANNOUNCEMENT: AnnouncementBarSettings = { enabled: false, text: '', link: '/shop', bgColor: '#1C1C1B', textColor: '#FAF8F5' };

function rowToStoreInfo(row: StoreInfoRow): StoreInfo {
  return {
    storeName: row.store_name,
    phone: row.phone,
    whatsapp: row.whatsapp,
    email: row.email,
    supportEmail: row.support_email,
    address: row.address,
    googleMapsUrl: row.google_maps_url,
    workingHours: row.working_hours,
    commercialRegistration: row.commercial_registration,
    taxNumber: row.tax_number,
    socialMedia: { ...DEFAULT_SOCIAL, ...(row.social_media as unknown as StoreInfo['socialMedia']) },
    announcementBar: { ...DEFAULT_ANNOUNCEMENT, ...(row.announcement_bar as unknown as AnnouncementBarSettings) },
  };
}

let cache: StoreInfo | null = null;

export const StoreService = {
  async getInfo(): Promise<StoreInfo> {
    const { data, error } = await supabase.from('website_store_info').select('*').eq('id', 1).single();
    if (error) throw error;
    cache = rowToStoreInfo(data);
    return cache;
  },

  /**
   * Synchronous counterpart of `getInfo`, for seeding initial render state without an
   * async gap (avoids a CLS-causing pop-in of the announcement bar). Returns the last
   * fetched value, or safe empty defaults before the first fetch completes.
   */
  getInfoSync(): StoreInfo {
    return cache ?? {
      storeName: '', phone: '', whatsapp: '', email: '', supportEmail: '', address: '',
      googleMapsUrl: '', workingHours: '', commercialRegistration: '', taxNumber: '',
      socialMedia: { ...DEFAULT_SOCIAL }, announcementBar: { ...DEFAULT_ANNOUNCEMENT },
    };
  },

  async updateInfo(updates: Partial<StoreInfo>): Promise<StoreInfo> {
    const patch: TablesUpdate<'website_store_info'> = {};
    if (updates.storeName !== undefined) patch.store_name = updates.storeName;
    if (updates.phone !== undefined) patch.phone = updates.phone;
    if (updates.whatsapp !== undefined) patch.whatsapp = updates.whatsapp;
    if (updates.email !== undefined) patch.email = updates.email;
    if (updates.supportEmail !== undefined) patch.support_email = updates.supportEmail;
    if (updates.address !== undefined) patch.address = updates.address;
    if (updates.googleMapsUrl !== undefined) patch.google_maps_url = updates.googleMapsUrl;
    if (updates.workingHours !== undefined) patch.working_hours = updates.workingHours;
    if (updates.commercialRegistration !== undefined) patch.commercial_registration = updates.commercialRegistration;
    if (updates.taxNumber !== undefined) patch.tax_number = updates.taxNumber;
    if (updates.socialMedia !== undefined) patch.social_media = { ...DEFAULT_SOCIAL, ...updates.socialMedia } as unknown as Json;
    if (updates.announcementBar !== undefined) patch.announcement_bar = { ...DEFAULT_ANNOUNCEMENT, ...updates.announcementBar } as unknown as Json;

    const { data, error } = await supabase.from('website_store_info').update(patch).eq('id', 1).select().single();
    if (error) throw error;
    cache = rowToStoreInfo(data);
    eventBus.emit('website.changed', { area: 'store' });
    return cache;
  },
};
