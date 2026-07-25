import { createClient } from '@/lib/supabase/client';

export interface ContentBlock {
  id: string;
  group: 'general' | 'checkout' | 'order_tracking' | 'emails' | 'pages';
  key: string;
  value: string;
  description: string;
}

const supabase = createClient();

export const ContentService = {
  async getAllContent(): Promise<ContentBlock[]> {
    const { data, error } = await supabase.from('content_blocks').select('*');
    if (error) throw error;
    return (data ?? []).map((row) => ({ id: row.id, group: row.group as ContentBlock['group'], key: row.key, value: row.value, description: row.description }));
  },

  async getContentByGroup(group: ContentBlock['group']): Promise<ContentBlock[]> {
    const { data, error } = await supabase.from('content_blocks').select('*').eq('group', group);
    if (error) throw error;
    return (data ?? []).map((row) => ({ id: row.id, group: row.group as ContentBlock['group'], key: row.key, value: row.value, description: row.description }));
  },

  async getByKey(key: string): Promise<string | null> {
    const { data, error } = await supabase.from('content_blocks').select('value').eq('key', key).maybeSingle();
    if (error) throw error;
    return data?.value ?? null;
  },

  async updateContent(id: string, value: string): Promise<ContentBlock> {
    const { data, error } = await supabase.from('content_blocks').update({ value }).eq('id', id).select().single();
    if (error) throw new Error('Content not found');
    return { id: data.id, group: data.group as ContentBlock['group'], key: data.key, value: data.value, description: data.description };
  },
};
