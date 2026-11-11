// Briefings: gather everything relevant (deterministically), then let the
// Chief of Staff write it up in one Claude call.
import { complete } from './claude.ts';
import { getSettings, type Settings } from './config.ts';
import { db } from './db.ts';
import { type CalEvent, eventEndMs, eventStartMs, listEvents, searchMail } from './google.ts';
import { BRIEFING_RULES, personaSystem } from './persona.ts';
import { isShiftEvent } from './shifts.ts';
import { health, viking, weather } from './sources.ts';
import type { Keyboard } from './telegram.ts';
import { addDays, localParts, zonedToUtc } from './time.ts';
import type { ShiftSlot } from './windows.ts';

export type BriefKind = 'pre_shift' | 'post_shift' | 'day_off' | 'on_demand';

const settle = async <T>(p: Promise<T>): Promise<T | { unavailable: string }> => {
  try {
    return await p;
  } catch (e) {
    return { unavailable: (e as Error).message.slice(0, 120) };
  }
};

function fmtEvent(e: CalEvent, s: Settings) {
  if (e.start.date) return { title: e.summary, all_day: e.start.date, type: e.eventType };
  const a = localParts(eventStartMs(e), s.timezone), b = localParts(eventEndMs(e), s.timezone);
  return { title: e.summary, when: `${a.weekday} ${a.date} ${a.time}–${b.time}`, location: e.location };
}

export async function shiftsAround(s: Settings, fromMs: number, toMs: number): Promise<ShiftSlot[]> {
  const evs = await listEvents(s.calendar_id, new Date(fromMs), new Date(toMs), s.shift_title);
  return evs
    .filter((e) => e.start.dateTime && isShiftEvent(e.summary, { title: s.shift_title }))
    .map((e) => ({ id: e.id, title: e.summary ?? '', start: eventStartMs(e), end: eventEndMs(e) }));
}

export async function gather(kind: BriefKind, shift?: ShiftSlot) {
  const s = await getSettings();
  const now = Date.now();
  const today = localParts(now, s.timezone);
  // Window: from local midnight today to the end of tomorrow (a debrief looks ahead).
  const from = zonedToUtc(today.date, '00:00', s.timezone);
  const to = zonedToUtc(addDays(today.date, 2), '00:00', s.timezone);
  const weekAhead = zonedToUtc(addDays(today.date, 8), '00:00', s.timezone);

  const [events, week, hl, vk, wx, mail, items, reminders] = await Promise.all([
    settle(listEvents(s.calendar_id, new Date(from), new Date(to))),
    settle(listEvents(s.calendar_id, new Date(now), new Date(weekAhead))),
    settle(health(s, 3)),
    settle(viking(s)),
    settle(weather(s)),
    kind === 'post_shift' ? Promise.resolve(null) : settle(searchMail(s.gmail_query, 12)),
    settle(openItems(s)),
    settle(upcomingReminders(s)),
  ]);

  const evList = Array.isArray(events) ? events : [];
  const weekList = Array.isArray(week) ? week : [];
  const nextShifts = weekList.filter((e) => isShiftEvent(e.summary, { title: s.shift_title })).slice(0, 4).map((e) => fmtEvent(e, s));
  const birthdays = weekList.filter((e) => e.eventType === 'birthday').map((e) => fmtEvent(e, s));

  return {
    kind,
    now_local: `${today.weekday} ${today.date} ${today.time}`,
    this_shift: shift
      ? { title: shift.title, start: localParts(shift.start, s.timezone).time, end: localParts(shift.end, s.timezone).time }
      : null,
    calendar_today_and_tomorrow: Array.isArray(events)
      ? evList.filter((e) => e.eventType !== 'birthday').map((e) => fmtEvent(e, s))
      : events,
    next_shifts: nextShifts,
    birthdays_next_7_days: birthdays,
    garmin_last_3_days: hl,
    project_viking: vk,
    weather: wx,
    inbox_unread: mail,
    open_tasks: items,
    reminders_next_24h: reminders,
  };
}

async function openItems(s: Settings) {
  const { data } = await db().from('cos_items').select('kind, area, title, due_at')
    .eq('status', 'open').in('kind', ['task', 'reminder'])
    .order('due_at', { ascending: true, nullsFirst: false }).limit(15);
  return (data ?? []).map((r) => ({
    ...r,
    due_at: r.due_at ? `${localParts(Date.parse(r.due_at), s.timezone).date} ${localParts(Date.parse(r.due_at), s.timezone).time}` : null,
  }));
}

async function upcomingReminders(s: Settings) {
  const { data } = await db().from('cos_items').select('title, remind_at')
    .is('reminded_at', null).gte('remind_at', new Date().toISOString())
    .lte('remind_at', new Date(Date.now() + 86_400_000).toISOString()).order('remind_at');
  return (data ?? []).map((r) => ({ title: r.title, at: localParts(Date.parse(r.remind_at), s.timezone).time }));
}

const KIND_BRIEF: Record<BriefKind, string> = {
  pre_shift:
    "This is the PRE-SHIFT BRIEFING, sent shortly before the shift starts. Focus: the shift, what is on after it, readiness/energy, anything urgent from the inbox, today's tasks.",
  post_shift:
    'This is the POST-SHIFT DEBRIEF, sent after the shift ended. Focus: wind-down, what is left today, training (has the Viking session been done?), sleep timing before the next shift, tomorrow at a glance. Keep it lighter. The message will carry quick-reply buttons for energy level and whether they trained, so end by asking for those.',
  day_off:
    'This is the DAY-OFF MORNING BRIEFING. Focus: making the day count: training, home and family, errands, people to reach out to, the next shift coming up.',
  on_demand: 'The user asked for a briefing right now. Cover the rest of today and the next shift.',
};

export async function composeBriefing(kind: BriefKind, shift?: ShiftSlot): Promise<string> {
  const s = await getSettings();
  const ctx = await gather(kind, shift);
  return await complete(
    `${personaSystem(s)}\n\n${BRIEFING_RULES}`,
    `${KIND_BRIEF[kind]}\n\nData (JSON):\n${JSON.stringify(ctx)}`,
    'medium',
  );
}

export const debriefKeyboard = (date: string): Keyboard => [
  [
    { text: '😫 Drained', callback_data: `ci:energy:1:${date}` },
    { text: '😐 OK', callback_data: `ci:energy:2:${date}` },
    { text: '💪 Strong', callback_data: `ci:energy:3:${date}` },
  ],
  [
    { text: '🏋️ Trained ✅', callback_data: `ci:trained:yes:${date}` },
    { text: 'Not today ❌', callback_data: `ci:trained:no:${date}` },
  ],
];
