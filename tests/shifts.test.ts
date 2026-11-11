import { assert, assertEquals } from 'jsr:@std/assert@1.0.13';
import {
  type ExistingEvent,
  planSync,
  resolveEntry,
  resolveRoster,
  shiftEvent,
  type ShiftFormat,
  shiftTitle,
  type ShiftType,
} from '../supabase/functions/_shared/shifts.ts';
import { zonedToUtc } from '../supabase/functions/_shared/time.ts';

const TZ = 'America/Puerto_Rico'; // UTC−4, no DST
const BLUE: ShiftType = { name: 'Blue', emoji: '🔵', color_id: '9', start_time: '05:00', end_time: '14:00', aliases: ['B'] };
const GREEN: ShiftType = { name: 'Green', emoji: '🟢', color_id: '10', start_time: '13:00', end_time: '22:00', aliases: ['G'] };
const TYPES = [BLUE, GREEN];
const F: ShiftFormat = { title: 'Surveillance Shift', descSuffix: 'Operations', location: 'Work', tz: TZ };

Deno.test('label matches by name, alias and "X shift"', () => {
  assertEquals(resolveEntry({ date: '2026-11-20', off: false, label: 'blue' }, TYPES).shift?.type.name, 'Blue');
  assertEquals(resolveEntry({ date: '2026-11-20', off: false, label: 'G' }, TYPES).shift?.type.name, 'Green');
  assertEquals(resolveEntry({ date: '2026-11-20', off: false, label: 'Green shift' }, TYPES).shift?.start, '13:00');
});

Deno.test('times match a known type when the label is unknown', () => {
  const r = resolveEntry({ date: '2026-11-20', off: false, label: '??', start: '05:00', end: '14:00' }, TYPES);
  assertEquals(r.shift?.type.name, 'Blue');
  assertEquals(r.newType, null);
});

Deno.test('unknown label with times invents one new type, reused across days', () => {
  const { shifts, newTypes, problems } = resolveRoster([
    { date: '2026-11-21', off: false, label: 'night', start: '21:00', end: '06:00' },
    { date: '2026-11-22', off: false, label: 'Night' },
    { date: '2026-11-23', off: true },
  ], TYPES);
  assertEquals(newTypes.length, 1);
  assertEquals(newTypes[0].name, 'Night');
  assertEquals(shifts.map((s) => s.type.name), ['Night', 'Night']);
  assertEquals(shifts[1].start, '21:00'); // second day takes times from the learned type
  assertEquals(problems, []);
});

Deno.test('unknown label without times is reported, not guessed', () => {
  const { shifts, problems } = resolveRoster([{ date: '2026-11-21', off: false, label: 'X' }], TYPES);
  assertEquals(shifts, []);
  assertEquals(problems.length, 1);
});

Deno.test('event matches the existing calendar format', () => {
  const s = resolveEntry({ date: '2026-11-11', off: false, label: 'Blue' }, TYPES).shift!;
  assertEquals(shiftTitle(s, F), '🔵 Surveillance Shift (05:00–14:00)');
  assertEquals(shiftEvent(s, F), {
    summary: '🔵 Surveillance Shift (05:00–14:00)',
    description: 'Blue shift – Operations',
    location: 'Work',
    colorId: '9',
    start: { dateTime: '2026-11-11T05:00:00', timeZone: TZ },
    end: { dateTime: '2026-11-11T14:00:00', timeZone: TZ },
  });
});

Deno.test('overnight shift ends the next day', () => {
  const night: ShiftType = { name: 'Night', emoji: '🟣', color_id: '3', start_time: '21:00', end_time: '06:00', aliases: [] };
  const s = resolveEntry({ date: '2026-11-30', off: false, label: 'Night' }, [night]).shift!;
  assertEquals(shiftEvent(s, F).end.dateTime, '2026-12-01T06:00:00');
});

const ev = (id: string, date: string, start: string, end: string, emoji = '🔵'): ExistingEvent => ({
  id,
  summary: `${emoji} Surveillance Shift (${start}–${end})`,
  start: new Date(zonedToUtc(date, start, TZ)).toISOString(),
  end: new Date(zonedToUtc(date, end, TZ)).toISOString(),
});

Deno.test('planSync: create, keep, change, remove and de-duplicate', () => {
  const { shifts } = resolveRoster([
    { date: '2026-11-17', off: false, label: 'Blue' }, // exists identically → unchanged
    { date: '2026-11-18', off: false, label: 'Green' }, // exists as Blue → update
    { date: '2026-11-19', off: true }, // exists → remove
    { date: '2026-11-20', off: false, label: 'Blue' }, // missing → create
    { date: '2026-11-21', off: false, label: 'Blue' }, // exists twice → keep one, remove dupe
  ], TYPES);
  const existing = [
    ev('a', '2026-11-17', '05:00', '14:00'),
    ev('b', '2026-11-18', '05:00', '14:00'),
    ev('c', '2026-11-19', '05:00', '14:00'),
    ev('d1', '2026-11-21', '05:00', '14:00'),
    ev('d2', '2026-11-21', '05:00', '14:00'),
    ev('outside', '2026-11-25', '05:00', '14:00'), // outside the roster period → untouched
    {
      id: 'dentist',
      summary: 'Dentist',
      start: ev('x', '2026-11-19', '09:00', '10:00').start,
      end: ev('x', '2026-11-19', '09:00', '10:00').end,
    },
  ];
  const plan = planSync(shifts, existing, '2026-11-17', '2026-11-21', F);
  assertEquals(plan.unchanged, 2);
  assertEquals(plan.update.map((u) => [u.id, u.shift.type.name]), [['b', 'Green']]);
  assertEquals(plan.remove.map((r) => r.id).sort(), ['c', 'd2']);
  assertEquals(plan.create.map((c) => c.date), ['2026-11-20']);
});

Deno.test('planSync is idempotent once applied', () => {
  const { shifts } = resolveRoster([{ date: '2026-11-17', off: false, label: 'Green' }], TYPES);
  const plan = planSync(shifts, [ev('a', '2026-11-17', '13:00', '22:00', '🟢')], '2026-11-17', '2026-11-17', F);
  assert(plan.create.length === 0 && plan.update.length === 0 && plan.remove.length === 0);
});

Deno.test('times printed inside a label are stripped, and the code is learned for later days', () => {
  const { shifts, newTypes } = resolveRoster([
    { date: '2026-11-20', off: false, label: 'N 21:00-06:00', start: '21:00', end: '06:00' },
    { date: '2026-11-21', off: false, label: 'N' },
  ], TYPES);
  assertEquals(newTypes.map((t) => t.name), ['N']);
  assertEquals(shifts.map((s) => `${s.type.name} ${s.start}-${s.end}`), ['N 21:00-06:00', 'N 21:00-06:00']);
});

Deno.test('the roster legend names codes and supplies times', () => {
  const legend = [{ code: 'N', name: 'Night', start: '21:00', end: '06:00' }, { code: 'B', name: 'Blue' }];
  const { shifts, newTypes, problems } = resolveRoster(
    [
      { date: '2026-11-20', off: false, label: 'N' },
      { date: '2026-11-21', off: false, label: 'B' },
    ],
    TYPES,
    legend,
  );
  assertEquals(problems, []);
  assertEquals(newTypes.map((t) => [t.name, t.aliases]), [['Night', ['N']]]);
  assertEquals(shifts.map((s) => `${s.type.name} ${s.start}-${s.end}`), ['Night 21:00-06:00', 'Blue 05:00-14:00']);
  assertEquals(TYPES[0].aliases, ['B']); // caller's types are not mutated
});
