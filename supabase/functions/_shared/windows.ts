// Pure scheduler decisions: given "now", the shifts around it and what was
// already sent, which proactive messages are due? Tested in
// tests/windows.test.ts.
import { localParts, minutesOf } from './time.ts';

export interface ShiftSlot {
  id: string;
  title: string;
  start: number; // epoch ms
  end: number;
}

export type Due =
  | { key: string; kind: 'pre_shift'; shift: ShiftSlot }
  | { key: string; kind: 'post_shift'; shift: ShiftSlot }
  | { key: string; kind: 'day_off'; date: string };

export interface WindowOpts {
  now: number;
  tz: string;
  shifts: ShiftSlot[];
  preLeadMin: number;
  debriefDelayMin: number;
  dayOffTime: string; // HH:MM
  sent: Set<string>;
}

const MIN = 60_000;
/** How long after its ideal time a message is still worth sending (cron hiccups). */
export const GRACE_MIN = 120;

export function dueMessages(o: WindowOpts): Due[] {
  const out: Due[] = [];
  for (const s of o.shifts) {
    const pre = `pre:${s.id}:${s.start}`;
    // Pre-shift brief: from (start - lead) until the shift starts.
    if (!o.sent.has(pre) && o.now >= s.start - o.preLeadMin * MIN && o.now < s.start) {
      out.push({ key: pre, kind: 'pre_shift', shift: s });
    }
    const post = `post:${s.id}:${s.end}`;
    const postAt = s.end + o.debriefDelayMin * MIN;
    if (!o.sent.has(post) && o.now >= postAt && o.now < postAt + GRACE_MIN * MIN) {
      out.push({ key: post, kind: 'post_shift', shift: s });
    }
  }

  // Day-off brief: today (local) has no shift touching it at all.
  const today = localParts(o.now, o.tz);
  const touchesToday = o.shifts.some((s) => localParts(s.start, o.tz).date === today.date || localParts(s.end, o.tz).date === today.date);
  const key = `dayoff:${today.date}`;
  const nowMin = today.hour * 60 + today.minute;
  const at = minutesOf(o.dayOffTime);
  if (!touchesToday && !o.sent.has(key) && nowMin >= at && nowMin < at + GRACE_MIN) {
    out.push({ key, kind: 'day_off', date: today.date });
  }
  return out;
}
