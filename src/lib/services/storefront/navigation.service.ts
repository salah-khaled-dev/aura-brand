import { createClient } from '@/lib/supabase/client';
import type { Json } from '@/lib/supabase/database.types';
import { eventBus } from '@/lib/events/EventBus';

export interface NavItem {
  id: string;
  label: string;
  url: string;
  order: number;
  icon?: string;
  badge?: string;
  openInNewTab: boolean;
  group: 'primary' | 'secondary';
  visibilityRules: ('public' | 'logged_in' | 'guests')[];
  children?: NavItem[];
}

export interface NavMenu {
  id: string;
  location: 'header' | 'footer' | 'mega_menu';
  items: NavItem[];
}

const supabase = createClient();

export const NavigationService = {
  async getMenus(): Promise<NavMenu[]> {
    const { data, error } = await supabase.from('nav_menus').select('*');
    if (error) throw error;
    return (data ?? []).map((row) => ({ id: row.id, location: row.location as NavMenu['location'], items: (row.items as unknown as NavItem[]) ?? [] }));
  },

  async getMenuByLocation(location: NavMenu['location']): Promise<NavMenu | undefined> {
    const { data, error } = await supabase.from('nav_menus').select('*').eq('location', location).maybeSingle();
    if (error) throw error;
    return data ? { id: data.id, location: data.location as NavMenu['location'], items: (data.items as unknown as NavItem[]) ?? [] } : undefined;
  },

  async updateMenu(id: string, items: NavItem[]): Promise<NavMenu> {
    const { data, error } = await supabase.from('nav_menus').update({ items: items as unknown as Json }).eq('id', id).select().single();
    if (error) throw new Error('Menu not found');
    eventBus.emit('website.changed', { area: 'navigation' });
    return { id: data.id, location: data.location as NavMenu['location'], items: (data.items as unknown as NavItem[]) ?? [] };
  },
};
