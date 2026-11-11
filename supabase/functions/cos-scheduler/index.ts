// ═════════════════════════════════════════════════════════════════════════
// cos-scheduler: the Chief of Staff's heartbeat. pg_cron calls it every 5
// minutes (supabase/sql/002_cos_cron.sql) with x-cron-secret.
//
// Each tick:
//   1. pre-shift briefing   (pre_shift_lead_min before a shift starts)
//   2. post-shift debrief   (debrief_delay_min after it ends, with check-in buttons)
//   3. day-off briefing     (day_off_brief_time on days with no shift)
//   4. due reminders        (cos_items.remind_at)
// cos_sent_log makes every message go out at most once.
// ═════════════════════════════════════════════════════════════════════════
import { composeBriefing, debriefKeyboard, shiftsAround } from '../_shared/briefing.ts';
import { getSettings } from '../_shared/config.ts';
import { db, markSent, unmarkSent } from '../_shared/db.ts';
import { escape, ownerChatId, sendMessage } from '../_shared/telegram.ts';
import { localParts } from '../_shared/time.ts';
import { dueMessages } from '../_shared/windows.ts';

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const secret = Deno.env.get('COS_CRON_SECRET');
  if (!secret || req.headers.get('x-cron-secret') !== secret) return new Response('Forbidden', { status: 403 });

  const report: Record<string, unknown> = {};
  try {
    report.briefings = await briefings();
  } catch (e) {
    console.error('briefings', e);
    report.briefings_error = (e as Error).message;
  }
  try {
    report.reminders = await reminders();
  } catch (e) {
    console.error('reminders', e);
    report.reminders_error = (e as Error).message;
  }
  return Response.json(report);
});

async function briefings(): Promise<string[]> {
  const s = await getSettings();
  const now = Date.now();
  const shifts = await shiftsAround(s, now - 36 * 3_600_000, now + 36 * 3_600_000);
  const keys = shifts.flatMap((x) => [`pre:${x.id}:${x.start}`, `post:${x.id}:${x.end}`]);
  keys.push(`dayoff:${localParts(now, s.timezone).date}`);
  const { data: sentRows } = await db().from('cos_sent_log').select('key').in('key', keys);
  const sent = new Set((sentRows ?? []).map((r) => r.key));

  const due = dueMessages({
    now,
    tz: s.timezone,
    shifts,
    sent,
    preLeadMin: s.pre_shift_lead_min,
    debriefDelayMin: s.debrief_delay_min,
    dayOffTime: s.day_off_brief_time,
  });

  const done: string[] = [];
  for (const d of due) {
    if (!(await markSent(d.key))) continue; // another tick got there first
    try {
      const text = await composeBriefing(d.kind, d.kind === 'day_off' ? undefined : d.shift);
      const keyboard = d.kind === 'post_shift' ? debriefKeyboard(localParts(d.shift.end, s.timezone).date) : undefined;
      await sendMessage(ownerChatId(), text, keyboard);
      done.push(d.key);
    } catch (e) {
      await unmarkSent(d.key); // let the next tick retry
      throw e;
    }
  }
  return done;
}

async function reminders(): Promise<number> {
  const { data } = await db().from('cos_items')
    .select('id, title, details, area')
    .is('reminded_at', null).eq('status', 'open')
    .lte('remind_at', new Date().toISOString())
    .order('remind_at').limit(10);
  let n = 0;
  for (const r of data ?? []) {
    // Claim first so a slow send can't double-fire on the next tick.
    const { data: claimed } = await db().from('cos_items').update({ reminded_at: new Date().toISOString() })
      .eq('id', r.id).is('reminded_at', null).select('id').maybeSingle();
    if (!claimed) continue;
    await sendMessage(ownerChatId(), `⏰ <b>Reminder:</b> ${escape(r.title)}${r.details ? `\n${escape(r.details)}` : ''}`);
    n++;
  }
  return n;
}
