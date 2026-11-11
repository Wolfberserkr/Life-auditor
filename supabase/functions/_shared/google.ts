// Google Calendar + Gmail (read-only) through the Apps Script bridge in
// google-bridge/Code.gs, which runs inside the user's own Google account.
// Its URL and shared secret live in cos_secrets (google_bridge_url,
// google_bridge_secret), so there is no OAuth client or refresh token.
import { getSecret } from './secrets.ts';
import { zonedToUtc } from './time.ts';

async function bridge<T>(op: string, args: Record<string, unknown> = {}): Promise<T> {
  const [url, secret] = await Promise.all([getSecret('google_bridge_url'), getSecret('google_bridge_secret')]);
  if (!url || !secret) throw new Error('Google is not connected yet (google_bridge_url / google_bridge_secret missing)');
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // avoids a CORS preflight; Apps Script reads the body as-is
    body: JSON.stringify({ secret, op, ...args }),
    redirect: 'follow',
  });
  const raw = await res.text();
  let j: Record<string, unknown>;
  try {
    j = JSON.parse(raw);
  } catch {
    throw new Error(`Google bridge ${op}: HTTP ${res.status} ${raw.slice(0, 120)}`);
  }
  if (j.error) throw new Error(`Google bridge ${op}: ${j.error}`);
  return j as T;
}

export const pingGoogle = () => bridge<{ ok: boolean; calendar: string }>('ping');

// ── Calendar ────────────────────────────────────────────────────────────────

export interface CalEvent {
  id: string;
  summary?: string;
  description?: string;
  location?: string;
  eventType?: string;
  colorId?: string;
  start: { dateTime?: string; date?: string; timeZone?: string };
  end: { dateTime?: string; date?: string; timeZone?: string };
}

/** A Calendar-API-style time ({dateTime, timeZone} or {date}) → bridge fields. */
function instant(t: { dateTime?: string; date?: string; timeZone?: string } | undefined): string | null {
  if (!t?.dateTime) return null;
  // Local wall-clock time with a zone (no offset) → UTC instant.
  if (t.timeZone && !/[zZ]|[+-]\d{2}:\d{2}$/.test(t.dateTime)) {
    const [date, time] = t.dateTime.split('T');
    return new Date(zonedToUtc(date, time.slice(0, 5), t.timeZone)).toISOString();
  }
  return new Date(t.dateTime).toISOString();
}

interface EventBody {
  summary?: string;
  description?: string;
  location?: string;
  colorId?: string;
  start?: { dateTime?: string; date?: string; timeZone?: string };
  end?: { dateTime?: string; date?: string; timeZone?: string };
}

export function toBridge(body: EventBody) {
  return {
    title: body.summary,
    description: body.description ?? null,
    location: body.location ?? null,
    colorId: body.colorId ?? null,
    start: instant(body.start),
    end: instant(body.end),
    allDayStart: body.start?.date ?? null,
    allDayEnd: body.end?.date ?? null,
  };
}

export async function listEvents(calendarId: string, timeMin: Date, timeMax: Date, q?: string): Promise<CalEvent[]> {
  const r = await bridge<{ items: CalEvent[] }>('list', {
    calendarId,
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    q: q ?? null,
  });
  return r.items.sort((a, b) => eventStartMs(a) - eventStartMs(b));
}

export async function insertEvent(calendarId: string, body: EventBody): Promise<CalEvent> {
  return (await bridge<{ item: CalEvent }>('insert', { calendarId, ...toBridge(body) })).item;
}

export async function patchEvent(calendarId: string, id: string, body: EventBody): Promise<CalEvent> {
  return (await bridge<{ item: CalEvent }>('patch', { calendarId, id, ...toBridge(body) })).item;
}

export async function deleteEvent(calendarId: string, id: string): Promise<void> {
  await bridge('delete', { calendarId, id });
}

export const eventStartMs = (e: CalEvent) => Date.parse(e.start.dateTime ?? `${e.start.date}T00:00:00Z`);
export const eventEndMs = (e: CalEvent) => Date.parse(e.end.dateTime ?? `${e.end.date}T00:00:00Z`);

// ── Gmail (read-only) ───────────────────────────────────────────────────────

export interface MailSummary {
  from: string;
  subject: string;
  snippet: string;
  date: string;
}

export async function searchMail(query: string, max = 10): Promise<MailSummary[]> {
  return (await bridge<{ items: MailSummary[] }>('mail', { query, max })).items;
}
