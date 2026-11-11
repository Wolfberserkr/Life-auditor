// Service-role Supabase client. Every cos_* table is service-role only.
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.118.0';

let client: SupabaseClient | null = null;

export function db(): SupabaseClient {
  if (!client) {
    const url = Deno.env.get('SUPABASE_URL');
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !key) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set');
    client = createClient(url, key, { auth: { persistSession: false } });
  }
  return client;
}

export async function getState<T>(key: string): Promise<T | null> {
  const { data } = await db().from('cos_state').select('value').eq('key', key).maybeSingle();
  return (data?.value as T) ?? null;
}

export async function setState(key: string, value: unknown): Promise<void> {
  await db().from('cos_state').upsert({ key, value, updated_at: new Date().toISOString() });
}

export async function clearState(key: string): Promise<void> {
  await db().from('cos_state').delete().eq('key', key);
}

/** Records `key` as sent. Returns false if it was already sent (lost the race). */
export async function markSent(key: string): Promise<boolean> {
  const { error } = await db().from('cos_sent_log').insert({ key });
  return !error;
}

export async function unmarkSent(key: string): Promise<void> {
  await db().from('cos_sent_log').delete().eq('key', key);
}
