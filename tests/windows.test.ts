import { assertEquals } from 'jsr:@std/assert@1.0.13';
import { addDays, localParts, tzOffsetMinutes, zonedToUtc } from '../supabase/functions/_shared/time.ts';
import { dueMessages, type ShiftSlot } from '../supabase/functions/_shared/windows.ts';

const TZ = 'America/Puerto_Rico';
const at = (date: string, time: string) => zonedToUtc(date, time, TZ);
const blue: ShiftSlot = { id: 'e1', title: '🔵 Shift (05:00–14:00)', start: at('2026-11-12', '05:00'), end: at('2026-11-12', '14:00') };
const base = { tz: TZ, preLeadMin: 60, debriefDelayMin: 20, dayOffTime: '08:00', sent: new Set<string>() };
const kinds = (now: number, shifts = [blue], sent = new Set<string>()) => dueMessages({ ...base, now, shifts, sent }).map((d) => d.kind);

Deno.test('time helpers: UTC−4 round trip, offsets, day arithmetic', () => {
  assertEquals(new Date(at('2026-11-12', '05:00')).toISOString(), '2026-11-12T09:00:00.000Z');
  assertEquals(tzOffsetMinutes(Date.now(), TZ), -240);
  assertEquals(localParts(at('2026-11-12', '23:59'), TZ).date, '2026-11-12');
  assertEquals(addDays('2026-12-31', 1), '2027-01-01');
  // DST zone sanity: New York in July is UTC−4, in January UTC−5.
  assertEquals(new Date(zonedToUtc('2026-07-01', '12:00', 'America/New_York')).toISOString(), '2026-07-01T16:00:00.000Z');
  assertEquals(new Date(zonedToUtc('2026-01-15', '12:00', 'America/New_York')).toISOString(), '2026-01-15T17:00:00.000Z');
});

Deno.test('pre-shift brief inside the lead window only', () => {
  assertEquals(kinds(at('2026-11-12', '03:59')), []);
  assertEquals(kinds(at('2026-11-12', '04:00')), ['pre_shift']);
  assertEquals(kinds(at('2026-11-12', '04:55')), ['pre_shift']);
  assertEquals(kinds(at('2026-11-12', '05:00')), []);
});

Deno.test('post-shift debrief after the delay, within the grace period', () => {
  assertEquals(kinds(at('2026-11-12', '14:10')), []);
  assertEquals(kinds(at('2026-11-12', '14:20')), ['post_shift']);
  assertEquals(kinds(at('2026-11-12', '16:19')), ['post_shift']);
  assertEquals(kinds(at('2026-11-12', '16:20')), []);
});

Deno.test('nothing is sent twice', () => {
  const sent = new Set([`pre:e1:${blue.start}`]);
  assertEquals(kinds(at('2026-11-12', '04:30'), [blue], sent), []);
});

Deno.test('day-off brief only on days without a shift', () => {
  assertEquals(kinds(at('2026-11-12', '08:05')), []); // shift day
  assertEquals(kinds(at('2026-11-13', '07:55')), []); // too early
  assertEquals(kinds(at('2026-11-13', '08:05')), ['day_off']);
  assertEquals(kinds(at('2026-11-13', '10:30')), []); // past grace
  assertEquals(kinds(at('2026-11-13', '08:05'), [blue], new Set(['dayoff:2026-11-13'])), []);
});

Deno.test('a night shift ending this morning makes today a shift day', () => {
  const night: ShiftSlot = { id: 'n', title: 'night', start: at('2026-11-13', '21:00'), end: at('2026-11-14', '06:00') };
  assertEquals(kinds(at('2026-11-14', '08:05'), [night]), ['post_shift']); // debrief still due, no day-off brief
  assertEquals(kinds(at('2026-11-14', '08:30'), [night]), []);
});
