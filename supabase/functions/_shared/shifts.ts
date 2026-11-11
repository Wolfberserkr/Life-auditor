// Pure shift logic: matching roster entries to shift types, building
// calendar events in the existing format, and planning a calendar sync.
// No I/O here, so it's fully covered by tests/shifts.test.ts.
import { addDays, isHHMM, localParts, minutesOf, zonedToUtc } from './time.ts';

export interface ShiftType {
  name: string;
  emoji: string;
  color_id: string;
  start_time: string; // HH:MM
  end_time: string; // HH:MM
  aliases: string[];
}

/** One row as extracted from a roster (before matching). */
export interface RosterEntry {
  date: string; // YYYY-MM-DD
  off: boolean; // day off / leave
  label?: string | null; // what the roster calls it ("Blue", "B", "Night")
  start?: string | null; // HH:MM if printed
  end?: string | null; // HH:MM if printed
}

export interface DesiredShift {
  date: string;
  type: ShiftType;
  start: string;
  end: string;
}

export interface ShiftFormat {
  title: string; // e.g. "Surveillance Shift"
  descSuffix: string; // e.g. "Operations" → "Blue shift – Operations"
  location: string | null;
  tz: string;
}

export interface ExistingEvent {
  id: string;
  summary: string;
  start: string; // ISO with offset
  end: string;
}

const NEW_TYPE_EMOJIS = ['🟣', '🟠', '🔴', '🟡', '🟤', '⚫', '⚪'];
const NEW_TYPE_COLORS = ['3', '6', '11', '5', '4', '8', '8'];

const TIME_RANGE = /\(?\s*\d{1,2}[:.]?\d{2}\s*[-–]\s*\d{1,2}[:.]?\d{2}\s*\)?/g;
/** Normalise a roster label: drop printed times and a trailing "shift". */
export const cleanLabel = (s: string) => s.replace(TIME_RANGE, ' ').replace(/\s+/g, ' ').trim();
const norm = (s: string) => cleanLabel(s).toLowerCase().replace(/\s+shift$/, '');

/** A roster's key, e.g. "N = Night 21:00-06:00". */
export interface LegendEntry {
  code: string;
  name?: string | null;
  start?: string | null;
  end?: string | null;
}

export interface Resolved {
  shift: DesiredShift | null;
  newType: ShiftType | null; // set when a type had to be invented
  problem: string | null; // human-readable reason when shift is null
}

/**
 * Match a roster entry to a known shift type. Order: label (name or alias),
 * then printed times. Unknown label + printed times → a new type is invented
 * (and should be saved by the caller). Unknown label without times → problem.
 */
export function resolveEntry(e: RosterEntry, types: ShiftType[]): Resolved {
  if (e.off) return { shift: null, newType: null, problem: null };
  const start = isHHMM(e.start) ? e.start : null;
  const end = isHHMM(e.end) ? e.end : null;

  if (e.label) {
    const l = norm(e.label);
    const t = types.find((t) => norm(t.name) === l || t.aliases.some((a) => norm(a) === l));
    if (t) {
      return {
        shift: { date: e.date, type: t, start: start ?? t.start_time, end: end ?? t.end_time },
        newType: null,
        problem: null,
      };
    }
  }
  if (start && end) {
    const t = types.find((t) => t.start_time === start && t.end_time === end);
    if (t) return { shift: { date: e.date, type: t, start, end }, newType: null, problem: null };
    const i = types.length % NEW_TYPE_EMOJIS.length;
    const label = e.label ? cleanLabel(e.label) : '';
    const name = label ? titleCase(label) : `${start}-${end}`;
    const newType: ShiftType = {
      name,
      emoji: NEW_TYPE_EMOJIS[i],
      color_id: NEW_TYPE_COLORS[i],
      start_time: start,
      end_time: end,
      aliases: label && label !== name ? [label] : [],
    };
    return { shift: { date: e.date, type: newType, start, end }, newType, problem: null };
  }
  return {
    shift: null,
    newType: null,
    problem: `${e.date}: couldn't tell what "${e.label ?? '?'}" means (no times on the roster)`,
  };
}

/**
 * Expand a roster code through the roster's own legend: "N" → "Night" with
 * the legend's times when the day itself shows none.
 */
export function applyLegend(e: RosterEntry, legend: LegendEntry[]): RosterEntry {
  if (e.off || !e.label) return e;
  const l = norm(e.label);
  const hit = legend.find((x) => norm(x.code) === l || (x.name && norm(x.name) === l));
  if (!hit) return e;
  const hasTimes = isHHMM(e.start) && isHHMM(e.end);
  return {
    ...e,
    label: hit.name?.trim() || hit.code,
    start: hasTimes ? e.start : (isHHMM(hit.start) ? hit.start : null),
    end: hasTimes ? e.end : (isHHMM(hit.end) ? hit.end : null),
  };
}

/**
 * Resolve a whole roster. Entries are processed in date order and types
 * invented along the way are reused, so "N 21:00-06:00" on one day teaches
 * what a bare "N" means on the next.
 */
export function resolveRoster(entries: RosterEntry[], known: ShiftType[], legend: LegendEntry[] = []) {
  const types = known.map((t) => ({ ...t, aliases: [...t.aliases] })); // never mutate the caller's types
  const shifts: DesiredShift[] = [];
  const newTypes: ShiftType[] = [];
  const problems: string[] = [];
  for (const raw of [...entries].sort((a, b) => a.date.localeCompare(b.date))) {
    const e = applyLegend(raw, legend);
    const r = resolveEntry(e, types);
    // Remember the code the roster used, so later days with just the code match.
    if (
      r.shift && raw.label && norm(raw.label) !== norm(r.shift.type.name) &&
      !r.shift.type.aliases.some((a) => norm(a) === norm(raw.label!))
    ) {
      r.shift.type.aliases.push(cleanLabel(raw.label));
    }
    if (r.newType) {
      types.push(r.newType);
      newTypes.push(r.newType);
    }
    if (r.shift) shifts.push(r.shift);
    if (r.problem) problems.push(r.problem);
  }
  return { shifts, newTypes, problems };
}

function titleCase(s: string) {
  return s.replace(/\w\S*/g, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase());
}

export function shiftTitle(s: DesiredShift, f: ShiftFormat): string {
  return `${s.type.emoji} ${f.title} (${s.start}–${s.end})`;
}

export function shiftEndDate(s: DesiredShift): string {
  return minutesOf(s.end) <= minutesOf(s.start) ? addDays(s.date, 1) : s.date;
}

export function shiftUtc(s: DesiredShift, tz: string): { start: number; end: number } {
  return { start: zonedToUtc(s.date, s.start, tz), end: zonedToUtc(shiftEndDate(s), s.end, tz) };
}

/** Google Calendar event body in the same shape as the existing shift events. */
export function shiftEvent(s: DesiredShift, f: ShiftFormat) {
  const desc = f.descSuffix ? `${s.type.name} shift – ${f.descSuffix}` : `${s.type.name} shift`;
  return {
    summary: shiftTitle(s, f),
    description: desc,
    ...(f.location ? { location: f.location } : {}),
    colorId: s.type.color_id,
    start: { dateTime: `${s.date}T${s.start}:00`, timeZone: f.tz },
    end: { dateTime: `${shiftEndDate(s)}T${s.end}:00`, timeZone: f.tz },
  };
}

export function isShiftEvent(summary: string | undefined, f: Pick<ShiftFormat, 'title'>): boolean {
  return !!summary && summary.toLowerCase().includes(f.title.toLowerCase());
}

export interface SyncPlan {
  create: DesiredShift[];
  update: { id: string; shift: DesiredShift }[];
  remove: ExistingEvent[];
  unchanged: number;
}

/**
 * Plan how to make the calendar match the roster for [periodStart, periodEnd]
 * (local dates, inclusive). Existing shift events are matched by the local
 * date they start on; duplicates on one day are removed; days the roster
 * marks off (or doesn't list) inside the period lose their shift.
 */
export function planSync(
  desired: DesiredShift[],
  existing: ExistingEvent[],
  periodStart: string,
  periodEnd: string,
  f: ShiftFormat,
): SyncPlan {
  const plan: SyncPlan = { create: [], update: [], remove: [], unchanged: 0 };
  const byDate = new Map<string, ExistingEvent[]>();
  for (const ev of existing) {
    if (!isShiftEvent(ev.summary, f)) continue;
    const d = localParts(Date.parse(ev.start), f.tz).date;
    if (d < periodStart || d > periodEnd) continue;
    byDate.set(d, [...(byDate.get(d) ?? []), ev]);
  }
  const wanted = new Map(desired.map((s) => [s.date, s]));

  for (const [date, evs] of byDate) {
    const s = wanted.get(date);
    const [first, ...dupes] = evs;
    plan.remove.push(...dupes);
    if (!s) {
      plan.remove.push(first);
      continue;
    }
    const t = shiftUtc(s, f.tz);
    const same = first.summary === shiftTitle(s, f) &&
      Date.parse(first.start) === t.start && Date.parse(first.end) === t.end;
    if (same) plan.unchanged++;
    else plan.update.push({ id: first.id, shift: s });
    wanted.delete(date);
  }
  plan.create.push(...[...wanted.values()].sort((a, b) => a.date.localeCompare(b.date)));
  return plan;
}

export function periodOf(entries: RosterEntry[]): { start: string; end: string } | null {
  if (!entries.length) return null;
  const dates = entries.map((e) => e.date).sort();
  return { start: dates[0], end: dates[dates.length - 1] };
}
