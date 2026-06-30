import { supabase } from '@/lib/supabase';

export async function appendEmailSubscriber(data: {
  email:     string;
  category?: string;
  source?:   string;
  ip?:       string;
}): Promise<void> {
  const { error } = await supabase.from('subscribers').upsert(
    {
      email:    data.email,
      category: data.category ?? 'All',
      source:   data.source ?? 'Website',
      ip:       data.ip ?? null,
    },
    { onConflict: 'email' },
  );
  if (error) throw new Error(`Failed to save subscriber: ${error.message}`);
}
