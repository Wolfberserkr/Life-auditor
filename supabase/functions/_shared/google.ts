// Google Calendar + Gmail (read-only) via a long-lived OAuth refresh token.
// Get the token once with scripts/google-auth.ts.
import { env } from './config.ts';

let token: { value: string; exp: number } | null = null;

async function accessToken(): Promise<string> {
  if (token && Date.now() < token.exp - 60_000) return token.value;
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env('GOOGLE_CLIENT_ID'),
      client_secret: env('GOOGLE_CLIENT_SECRET'),
      refresh_token: env('GOOGLE_REFRESH_TOKEN'),
      grant_type: 'refresh_token',
    }),
  });
  const j = await res.json();
  if (!res.ok) throw new Error(`Google token refresh failed: ${j.error ?? res.status} ${j.error_description ?? ''}`);
  token = { value: j.access_token, exp: Date.now() + j.expires_in * 1000 };
  return token.value;
}

async function gfetch(url: string, init: RequestInit = {}): Promise<Response> {
  const res = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${await accessToken()}`, 'Content-Type': 'application/json', ...init.headers },
  });
  if (!res.ok && res.status !== 204 && res.status !== 410) {
    throw new Error(`Google API ${init.method ?? 'GET'} ${new URL(url).pathname} → ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  return res;
}

// ── Calendar ────────────────────────────────────────────────────────────────

export interface CalEvent {
  id: string;
  summary?: string;
  description?: string;
  location?: string;
  eventType?: string;
  start: { dateTime?: string; date?: string; timeZone?: string };
  end: { dateTime?: string; date?: string; timeZone?: string };
}

const CAL = 'https://www.googleapis.com/calendar/v3/calendars';

export async function listEvents(calendarId: string, timeMin: Date, timeMax: Date, q?: string): Promise<CalEvent[]> {
  const out: CalEvent[] = [];
  let pageToken: string | undefined;
  do {
    const p = new URLSearchParams({
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: 'true',
      orderBy: 'startTime',
      maxResults: '250',
    });
    for (const t of ['default', 'birthday', 'outOfOffice', 'focusTime', 'fromGmail']) p.append('eventTypes', t);
    if (q) p.set('q', q);
    if (pageToken) p.set('pageToken', pageToken);
    const j = await (await gfetch(`${CAL}/${encodeURIComponent(calendarId)}/events?${p}`)).json();
    out.push(...(j.items ?? []));
    pageToken = j.nextPageToken;
  } while (pageToken);
  return out.filter((e) => (e as { status?: string }).status !== 'cancelled');
}

export async function insertEvent(calendarId: string, body: Record<string, unknown>): Promise<CalEvent> {
  return await (await gfetch(`${CAL}/${encodeURIComponent(calendarId)}/events`, { method: 'POST', body: JSON.stringify(body) })).json();
}

export async function patchEvent(calendarId: string, id: string, body: Record<string, unknown>): Promise<CalEvent> {
  return await (await gfetch(`${CAL}/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })).json();
}

export async function deleteEvent(calendarId: string, id: string): Promise<void> {
  await gfetch(`${CAL}/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(id)}`, { method: 'DELETE' });
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

const GMAIL = 'https://gmail.googleapis.com/gmail/v1/users/me';

export async function searchMail(query: string, max = 10): Promise<MailSummary[]> {
  const list = await (await gfetch(`${GMAIL}/messages?${new URLSearchParams({ q: query, maxResults: String(max) })}`)).json();
  const ids: string[] = (list.messages ?? []).map((m: { id: string }) => m.id);
  return await Promise.all(ids.map(async (id) => {
    const p = new URLSearchParams({ format: 'metadata' });
    for (const h of ['From', 'Subject', 'Date']) p.append('metadataHeaders', h);
    const m = await (await gfetch(`${GMAIL}/messages/${id}?${p}`)).json();
    const h = (name: string) => m.payload?.headers?.find((x: { name: string }) => x.name === name)?.value ?? '';
    return { from: h('From'), subject: h('Subject'), date: h('Date'), snippet: decodeEntities(m.snippet ?? '') };
  }));
}

function decodeEntities(s: string) {
  return s.replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}
