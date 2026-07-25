import { createClient } from '@/lib/supabase/server';

const DEFAULT_MESSAGE = 'المتجر تحت الصيانة حالياً، سنعود قريباً.';

export default async function MaintenancePage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('store_settings')
    .select('maintenance_message, store_name_ar')
    .eq('id', 1)
    .single();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center bg-background-primary text-text-primary">
      <span className="font-display text-3xl tracking-wide text-accent">
        {data?.store_name_ar || 'AURA'}
      </span>
      <h1 className="text-xl font-medium">{data?.maintenance_message || DEFAULT_MESSAGE}</h1>
    </div>
  );
}
