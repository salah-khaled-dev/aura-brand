import { createClient } from '@/lib/supabase/client';
import type { Tables } from '@/lib/supabase/database.types';

export interface ActivityLogEntry {
  id: string;
  actorId: string | null;
  actorEmail: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  beforeData: unknown;
  afterData: unknown;
  metadata: unknown;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: string;
}

type ActivityLogRow = Tables<'activity_log'>;

const supabase = createClient();

function rowToEntry(row: ActivityLogRow): ActivityLogEntry {
  return {
    id: row.id,
    actorId: row.actor_id,
    actorEmail: row.actor_email,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    beforeData: row.before_data,
    afterData: row.after_data,
    metadata: row.metadata,
    userAgent: row.user_agent,
    ipAddress: row.ip_address,
    createdAt: row.created_at,
  };
}

const PAGE_SIZE = 50;

/**
 * Read-only viewer over `public.activity_log` — every row is written by the
 * event-driven triggers in 20260715000009_event_driven_activity_log.sql
 * (or log_auth_event() for login/logout); this service never writes.
 */
export const ActivityLogService = {
  async getEntries(opts?: { entityType?: string; page?: number }): Promise<{ entries: ActivityLogEntry[]; hasMore: boolean }> {
    const page = opts?.page ?? 0;
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = supabase
      .from('activity_log')
      .select('*')
      .order('created_at', { ascending: false })
      .range(from, to);

    if (opts?.entityType) {
      query = query.eq('entity_type', opts.entityType);
    }

    const { data, error } = await query;
    if (error) throw error;

    const entries = (data ?? []).map(rowToEntry);
    return { entries, hasMore: entries.length === PAGE_SIZE };
  },

  async getEntityTypes(): Promise<string[]> {
    const { data, error } = await supabase.from('activity_log').select('entity_type');
    if (error) throw error;
    return Array.from(new Set((data ?? []).map((r) => r.entity_type))).sort();
  },

  /** All audit entries for one specific row (e.g. a single product or order's history). */
  async getEntriesForEntity(entityType: string, entityId: string): Promise<ActivityLogEntry[]> {
    const { data, error } = await supabase
      .from('activity_log')
      .select('*')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(rowToEntry);
  },
};
