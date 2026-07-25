import { createClient } from '@/lib/supabase/client';
import type { Tables, TablesInsert } from '@/lib/supabase/database.types';
import { eventBus } from '@/lib/events/EventBus';

export interface Banner {
  id: string;
  type: 'desktop' | 'tablet' | 'mobile' | 'popup' | 'announcement' | 'campaign' | 'season';
  status: 'active' | 'scheduled' | 'disabled';
  priority: number;
  schedule?: { start: string; end: string };
  targetUrl: string;
  overlayOpacity: number;
  animation: string;
  buttonText?: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  deviceVisibility: ('desktop' | 'tablet' | 'mobile')[];
}

type BannerRow = Tables<'banners'>;

const supabase = createClient();

function rowToBanner(row: BannerRow): Banner {
  return {
    id: row.id,
    type: row.type as Banner['type'],
    status: row.status as Banner['status'],
    priority: row.priority,
    schedule: row.schedule_start && row.schedule_end ? { start: row.schedule_start, end: row.schedule_end } : undefined,
    targetUrl: row.target_url,
    overlayOpacity: row.overlay_opacity,
    animation: row.animation,
    buttonText: row.button_text ?? undefined,
    mediaUrl: row.media_url,
    mediaType: row.media_type as Banner['mediaType'],
    deviceVisibility: row.device_visibility as Banner['deviceVisibility'],
  };
}

export const BannerService = {
  async getBanners(): Promise<Banner[]> {
    const { data, error } = await supabase.from('banners').select('*').order('priority', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(rowToBanner);
  },

  async getBanner(id: string): Promise<Banner | undefined> {
    const { data, error } = await supabase.from('banners').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? rowToBanner(data) : undefined;
  },

  async addBanner(banner: Omit<Banner, 'id'>): Promise<Banner> {
    const insertRow: TablesInsert<'banners'> = {
      type: banner.type,
      status: banner.status,
      priority: banner.priority,
      schedule_start: banner.schedule?.start ?? null,
      schedule_end: banner.schedule?.end ?? null,
      target_url: banner.targetUrl,
      overlay_opacity: banner.overlayOpacity,
      animation: banner.animation,
      button_text: banner.buttonText ?? null,
      media_url: banner.mediaUrl,
      media_type: banner.mediaType,
      device_visibility: banner.deviceVisibility,
    };
    const { data, error } = await supabase.from('banners').insert(insertRow).select().single();
    if (error) throw error;
    eventBus.emit('website.changed', { area: 'banners' });
    return rowToBanner(data);
  },

  async updateBanner(id: string, updates: Partial<Banner>): Promise<Banner> {
    const patch: Partial<TablesInsert<'banners'>> = {};
    if (updates.type !== undefined) patch.type = updates.type;
    if (updates.status !== undefined) patch.status = updates.status;
    if (updates.priority !== undefined) patch.priority = updates.priority;
    if (updates.schedule !== undefined) {
      patch.schedule_start = updates.schedule?.start ?? null;
      patch.schedule_end = updates.schedule?.end ?? null;
    }
    if (updates.targetUrl !== undefined) patch.target_url = updates.targetUrl;
    if (updates.overlayOpacity !== undefined) patch.overlay_opacity = updates.overlayOpacity;
    if (updates.animation !== undefined) patch.animation = updates.animation;
    if (updates.buttonText !== undefined) patch.button_text = updates.buttonText;
    if (updates.mediaUrl !== undefined) patch.media_url = updates.mediaUrl;
    if (updates.mediaType !== undefined) patch.media_type = updates.mediaType;
    if (updates.deviceVisibility !== undefined) patch.device_visibility = updates.deviceVisibility;

    const { data, error } = await supabase.from('banners').update(patch).eq('id', id).select().single();
    if (error) throw new Error('Banner not found');
    eventBus.emit('website.changed', { area: 'banners' });
    return rowToBanner(data);
  },

  async deleteBanner(id: string): Promise<void> {
    const { error } = await supabase.from('banners').delete().eq('id', id);
    if (error) throw error;
    eventBus.emit('website.changed', { area: 'banners' });
  },
};
