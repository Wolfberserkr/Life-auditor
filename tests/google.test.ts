import { assertEquals } from 'jsr:@std/assert@1.0.13';
import { toBridge } from '../supabase/functions/_shared/google.ts';
import { resolveEntry, shiftEvent, type ShiftFormat } from '../supabase/functions/_shared/shifts.ts';

const F: ShiftFormat = { title: 'Surveillance Shift', descSuffix: 'Operations', location: 'Work', tz: 'America/Puerto_Rico' };
const BLUE = { name: 'Blue', emoji: '🔵', color_id: '9', start_time: '05:00', end_time: '14:00', aliases: [] };
const NIGHT = { name: 'Night', emoji: '🟣', color_id: '3', start_time: '21:00', end_time: '06:00', aliases: [] };

Deno.test('shift events reach the bridge as exact UTC instants', () => {
  const s = resolveEntry({ date: '2026-11-11', off: false, label: 'Blue' }, [BLUE]).shift!;
  assertEquals(toBridge(shiftEvent(s, F)), {
    title: '🔵 Surveillance Shift (05:00–14:00)',
    description: 'Blue shift – Operations',
    location: 'Work',
    colorId: '9',
    start: '2026-11-11T09:00:00.000Z', // matches the existing event (04:00−05:00 = 05:00 local)
    end: '2026-11-11T18:00:00.000Z',
    allDayStart: null,
    allDayEnd: null,
  });
});

Deno.test('overnight shifts end the next morning', () => {
  const s = resolveEntry({ date: '2026-11-30', off: false, label: 'Night' }, [NIGHT]).shift!;
  const b = toBridge(shiftEvent(s, F));
  assertEquals([b.start, b.end], ['2026-12-01T01:00:00.000Z', '2026-12-01T10:00:00.000Z']);
});

Deno.test('all-day and already-UTC times pass through', () => {
  assertEquals(toBridge({ summary: 'Trip', start: { date: '2026-12-24' }, end: { date: '2026-12-26' } }).allDayStart, '2026-12-24');
  assertEquals(
    toBridge({ summary: 'x', start: { dateTime: '2026-12-24T15:00:00.000Z' }, end: { dateTime: '2026-12-24T16:00:00Z' } }).start,
    '2026-12-24T15:00:00.000Z',
  );
});
