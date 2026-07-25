import { createClient } from '@/lib/supabase/client';
import type { Tables, TablesUpdate, Json } from '@/lib/supabase/database.types';
import { eventBus } from '@/lib/events/EventBus';

export interface StoreAppearance {
  logoUrl: string;
  faviconUrl: string;
  loadingScreenType: 'spinner' | 'logo' | 'pulse';
  themePreset: 'luxury' | 'modern' | 'minimal' | 'playful';
  borderRadius: 'none' | 'sm' | 'md' | 'lg' | 'full';
  containerWidth: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  buttonStyle: 'solid' | 'outline' | 'ghost';
  cardRadius: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  animationSpeed: 'slow' | 'normal' | 'fast';
  accentColor: string;
  textPrimaryColor: string;
  backgroundPrimaryColor: string;
  effects: {
    hoverScale: boolean;
    pageTransitions: boolean;
  };
}

type AppearanceRow = Tables<'appearance_settings'>;

const supabase = createClient();

const DEFAULT_EFFECTS = { hoverScale: true, pageTransitions: true };

function rowToAppearance(row: AppearanceRow): StoreAppearance {
  return {
    logoUrl: row.logo_url,
    faviconUrl: row.favicon_url,
    loadingScreenType: row.loading_screen_type as StoreAppearance['loadingScreenType'],
    themePreset: row.theme_preset as StoreAppearance['themePreset'],
    borderRadius: row.border_radius as StoreAppearance['borderRadius'],
    containerWidth: row.container_width as StoreAppearance['containerWidth'],
    buttonStyle: row.button_style as StoreAppearance['buttonStyle'],
    cardRadius: row.card_radius as StoreAppearance['cardRadius'],
    animationSpeed: row.animation_speed as StoreAppearance['animationSpeed'],
    accentColor: row.accent_color,
    textPrimaryColor: row.text_primary_color,
    backgroundPrimaryColor: row.background_primary_color,
    effects: { ...DEFAULT_EFFECTS, ...(row.effects as unknown as StoreAppearance['effects']) },
  };
}

export const AppearanceService = {
  async getSettings(): Promise<StoreAppearance> {
    const { data, error } = await supabase.from('appearance_settings').select('*').eq('id', 1).single();
    if (error) throw error;
    return rowToAppearance(data);
  },

  async updateSettings(updates: Partial<StoreAppearance>): Promise<StoreAppearance> {
    const patch: TablesUpdate<'appearance_settings'> = {};
    if (updates.logoUrl !== undefined) patch.logo_url = updates.logoUrl;
    if (updates.faviconUrl !== undefined) patch.favicon_url = updates.faviconUrl;
    if (updates.loadingScreenType !== undefined) patch.loading_screen_type = updates.loadingScreenType;
    if (updates.themePreset !== undefined) patch.theme_preset = updates.themePreset;
    if (updates.borderRadius !== undefined) patch.border_radius = updates.borderRadius;
    if (updates.containerWidth !== undefined) patch.container_width = updates.containerWidth;
    if (updates.buttonStyle !== undefined) patch.button_style = updates.buttonStyle;
    if (updates.cardRadius !== undefined) patch.card_radius = updates.cardRadius;
    if (updates.animationSpeed !== undefined) patch.animation_speed = updates.animationSpeed;
    if (updates.accentColor !== undefined) patch.accent_color = updates.accentColor;
    if (updates.textPrimaryColor !== undefined) patch.text_primary_color = updates.textPrimaryColor;
    if (updates.backgroundPrimaryColor !== undefined) patch.background_primary_color = updates.backgroundPrimaryColor;
    if (updates.effects !== undefined) patch.effects = { ...DEFAULT_EFFECTS, ...updates.effects } as unknown as Json;

    const { data, error } = await supabase.from('appearance_settings').update(patch).eq('id', 1).select().single();
    if (error) throw error;
    eventBus.emit('website.changed', { area: 'appearance' });
    return rowToAppearance(data);
  },
};
