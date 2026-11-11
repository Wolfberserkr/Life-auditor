// Environment (secrets) and the cos_settings table (personal, non-secret
// configuration). Personal details live in the database, never in this
// public repository.
import { db } from './db.ts';

export function env(name: string, fallback?: string): string {
  const v = Deno.env.get(name) ?? fallback;
  if (v === undefined || v === '') throw new Error(`Missing env var ${name}`);
  return v;
}
export const optEnv = (name: string): string | undefined => Deno.env.get(name) || undefined;

export interface Settings {
  user_name: string | null; // how the butler addresses you
  assistant_name: string | null; // the Chief of Staff's own name
  telegram_owner_id: number | null; // claimed by the first /start
  timezone: string; // IANA zone for shifts and briefings
  calendar_id: string; // Google Calendar to read/write
  shift_title: string; // text that marks a calendar event as a shift
  shift_desc_suffix: string; // appended to "<Type> shift – " in descriptions
  shift_location: string | null; // location set on imported shift events
  roster_names: string[]; // how you appear on the roster (for multi-person rosters)
  pre_shift_lead_min: number; // brief this long before a shift starts
  debrief_delay_min: number; // debrief this long after a shift ends
  day_off_brief_time: string; // HH:MM local briefing time on days off
  weather_lat: number | null;
  weather_lon: number | null;
  viking_user_id: string | null; // your auth.users id in Project Viking
  gmail_query: string; // what counts as "inbox highlights"
}

export const DEFAULT_SETTINGS: Settings = {
  user_name: null,
  assistant_name: null,
  telegram_owner_id: null,
  timezone: 'America/Puerto_Rico',
  calendar_id: 'primary',
  shift_title: 'Surveillance Shift',
  shift_desc_suffix: '',
  shift_location: null,
  roster_names: [],
  pre_shift_lead_min: 60,
  debrief_delay_min: 20,
  day_off_brief_time: '08:00',
  weather_lat: null,
  weather_lon: null,
  viking_user_id: null,
  gmail_query: 'is:unread newer_than:1d category:primary',
};

let cached: { at: number; value: Settings } | null = null;
export const clearSettingsCache = () => {
  cached = null;
};

export async function getSettings(): Promise<Settings> {
  if (cached && Date.now() - cached.at < 60_000) return cached.value;
  const { data, error } = await db().from('cos_settings').select('key, value');
  if (error) throw new Error(`cos_settings read failed: ${error.message}`);
  const merged: Record<string, unknown> = { ...DEFAULT_SETTINGS };
  for (const row of data ?? []) {
    if (row.key in DEFAULT_SETTINGS) merged[row.key] = row.value;
  }
  cached = { at: Date.now(), value: merged as unknown as Settings };
  return cached.value;
}

// Model choices: a strong model for the Chief of Staff, a cheap one for
// extraction work (roster photos/PDFs).
export const CLAUDE_MODEL = () => optEnv('COS_CLAUDE_MODEL') ?? 'claude-opus-5-5';
export const GEMINI_MODEL = () => optEnv('COS_GEMINI_MODEL') ?? 'gemini-3.8-flash';
