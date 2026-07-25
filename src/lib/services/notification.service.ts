import { createClient } from '@/lib/supabase/client';
import type { Tables } from '@/lib/supabase/database.types';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'order' | 'customer' | 'system' | 'review' | 'promotion' | 'stock' | 'account';
  severity: 'info' | 'warning' | 'critical';
  date: string;
  isRead: boolean;
  link?: string;
}

type NotificationRow = Tables<'notifications'>;

const supabase = createClient();

function rowToNotification(row: NotificationRow): Notification {
  return {
    id: row.id,
    title: row.title,
    message: row.message,
    type: (row.type as Notification['type']) ?? 'system',
    severity: (row.severity as Notification['severity']) ?? 'info',
    date: row.created_at,
    isRead: row.is_read,
    link: row.link ?? undefined,
  };
}

/**
 * Admin notification feed — reads `public.notifications` where
 * `for_admins = true`. Rows are written automatically by the event-driven
 * triggers in 20260715000009/20260715000010 (product/coupon/order/profile/
 * roles/store_settings CRUD, login/logout); this service is read/manage-state
 * only, it never inserts notifications itself. RLS already restricts
 * `sensitive = true` rows to super_admin — whatever this returns is exactly
 * what the current admin is allowed to see, no client-side filtering needed.
 */
export const NotificationService = {
  async getNotifications(): Promise<Notification[]> {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('for_admins', true)
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) throw error;
    return (data ?? []).map(rowToNotification);
  },

  async getUnreadCount(): Promise<number> {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('for_admins', true)
      .eq('is_read', false);
    if (error) throw error;
    return count ?? 0;
  },

  async markAsRead(id: string): Promise<void> {
    const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    if (error) throw error;
  },

  async markAllAsRead(): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('for_admins', true)
      .eq('is_read', false);
    if (error) throw error;
  },

  async deleteNotification(id: string): Promise<void> {
    const { error } = await supabase.from('notifications').delete().eq('id', id);
    if (error) throw error;
  },
};
