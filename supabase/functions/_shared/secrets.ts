// Internal secrets the system generates and stores itself (cos_secrets,
// service-role only): Telegram webhook secret, cron secret, Google bridge
// URL + secret. The table wins; an environment variable of the same name in
// UPPER_CASE is only a fallback when the table has no value.
import { db } from './db.ts';

const cache = new Map<string, { at: number; value: string | null }>();
const TTL = 60_000;

export async function getSecret(key: string): Promise<string | null> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.value;
  const { data, error } = await db().from('cos_secrets').select('value').eq('key', key).maybeSingle();
  if (error) console.error(`cos_secrets read failed for ${key}: ${error.message}`);
  const value = (data?.value as string | undefined) || Deno.env.get(key.toUpperCase()) || null;
  if (!error) cache.set(key, { at: Date.now(), value });
  return value;
}

/** Constant-time string comparison for shared secrets. */
export function safeEqual(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
