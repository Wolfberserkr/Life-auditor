// Schedule import: a roster photo / PDF / spreadsheet dropped in Telegram →
// extracted shifts → preview with buttons → Google Calendar sync.
import * as XLSX from 'npm:xlsx@0.18.5';
import { getSettings, type Settings } from './config.ts';
import { db } from './db.ts';
import { geminiJson, type GeminiPart, toBase64 } from './gemini.ts';
import { deleteEvent, insertEvent, listEvents, patchEvent } from './google.ts';
import {
  type DesiredShift,
  type LegendEntry,
  periodOf,
  planSync,
  resolveRoster,
  type RosterEntry,
  shiftEvent,
  type ShiftFormat,
  type ShiftType,
  type SyncPlan,
} from './shifts.ts';
import { escape, type Keyboard } from './telegram.ts';
import { addDays, dayLabel, isHHMM, isISODate, localParts, zonedToUtc } from './time.ts';

export interface Extraction {
  is_schedule: boolean;
  entries: RosterEntry[];
  legend: LegendEntry[];
  notes: string;
}

export interface ImportPayload {
  entries: RosterEntry[];
  legend: LegendEntry[];
  notes: string;
  period: { start: string; end: string };
}

export const ROSTER_SCHEMA = {
  type: 'OBJECT',
  properties: {
    is_schedule: { type: 'BOOLEAN', description: 'false if this is not a work roster/schedule at all' },
    entries: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          date: { type: 'STRING', description: 'YYYY-MM-DD' },
          off: { type: 'BOOLEAN', description: 'true for day off, leave, vacation, sick, or blank' },
          label: { type: 'STRING', nullable: true, description: 'shift name/code as printed, WITHOUT any times, e.g. "Blue", "B", "N"' },
          start: { type: 'STRING', nullable: true, description: 'HH:MM 24h if a start time is printed' },
          end: { type: 'STRING', nullable: true, description: 'HH:MM 24h if an end time is printed' },
        },
        required: ['date', 'off'],
      },
    },
    legend: {
      type: 'ARRAY',
      description: 'the roster key/legend if one is printed (e.g. "B = Blue 05:00-14:00"); empty if none',
      items: {
        type: 'OBJECT',
        properties: {
          code: { type: 'STRING' },
          name: { type: 'STRING', nullable: true },
          start: { type: 'STRING', nullable: true, description: 'HH:MM 24h' },
          end: { type: 'STRING', nullable: true, description: 'HH:MM 24h' },
        },
        required: ['code'],
      },
    },
    notes: { type: 'STRING', description: 'anything ambiguous the user should double-check; empty if none' },
  },
  required: ['is_schedule', 'entries', 'legend', 'notes'],
};

export function extractionPrompt(s: Settings, types: ShiftType[], today: string): string {
  const who = s.roster_names.length
    ? `The roster may list several people. Extract ONLY the row/column for the person named ${
      s.roster_names.map((n) => `"${n}"`).join(' or ')
    }.`
    : 'If the roster lists several people and it is unclear whose schedule this is, explain that in notes.';
  const known = types.map((t) => `- ${t.name}${t.aliases.length ? ` (codes: ${t.aliases.join(', ')})` : ''}: ${t.start_time}–${t.end_time}`)
    .join('\n');
  return [
    'You read work rosters / shift schedules and return one entry per calendar day.',
    who,
    `Today is ${today}. If the roster omits the year, pick the year that puts the dates closest to today (rosters are usually for the coming weeks); use printed weekdays only to choose between nearby years.`,
    'Known shift types:',
    known,
    'Rules: one entry per date that the roster covers (include days off with off=true). Copy the shift code/name as printed but put any printed times in start/end, never in the label.',
    'Give start/end only if times are actually printed for that day. Use 24h HH:MM. Never invent shifts.',
  ].join('\n');
}

export async function loadShiftTypes(): Promise<ShiftType[]> {
  const { data, error } = await db().from('cos_shift_types').select('name, emoji, color_id, start_time, end_time, aliases');
  if (error) throw new Error(`cos_shift_types read failed: ${error.message}`);
  return (data ?? []) as ShiftType[];
}

/** Turn a Telegram file into Gemini parts. Spreadsheets become CSV text. */
export function fileToParts(bytes: Uint8Array, mime: string, fileName = ''): GeminiPart[] {
  const isSheet = /sheet|excel|csv/.test(mime) || /\.(xlsx|xls|csv|ods)$/i.test(fileName);
  if (isSheet) {
    const wb = XLSX.read(bytes, { type: 'array' });
    const csv = wb.SheetNames.map((n) => `### Sheet: ${n}\n${XLSX.utils.sheet_to_csv(wb.Sheets[n])}`).join('\n\n');
    return [{ text: `Roster spreadsheet (as CSV):\n${csv.slice(0, 200_000)}` }];
  }
  return [{ inline_data: { mime_type: mime, data: toBase64(bytes) } }];
}

export async function extractRoster(parts: GeminiPart[], caption?: string): Promise<Extraction> {
  const s = await getSettings();
  const types = await loadShiftTypes();
  const today = localParts(Date.now(), s.timezone).date;
  const ask: GeminiPart[] = [...parts, { text: caption ? `User's note: ${caption}` : 'Extract this roster.' }];
  const out = await geminiJson<Extraction>(ask, ROSTER_SCHEMA, extractionPrompt(s, types, today));
  return { ...out, entries: cleanEntries(out.entries ?? []), legend: out.legend ?? [] };
}

/** Apply a free-text correction ("the 20th is Green, 21st off") to an extraction. */
export async function correctRoster(payload: ImportPayload, correction: string): Promise<Extraction> {
  const s = await getSettings();
  const types = await loadShiftTypes();
  const today = localParts(Date.now(), s.timezone).date;
  const out = await geminiJson<Extraction>(
    [{
      text: `Current extracted roster (JSON):\n${JSON.stringify({ entries: payload.entries, legend: payload.legend })}\n\n` +
        `Apply this correction from the user and return the full corrected roster:\n${correction}`,
    }],
    ROSTER_SCHEMA,
    extractionPrompt(s, types, today),
  );
  return { ...out, entries: cleanEntries(out.entries ?? []), legend: out.legend?.length ? out.legend : payload.legend };
}

function cleanEntries(entries: RosterEntry[]): RosterEntry[] {
  const byDate = new Map<string, RosterEntry>();
  for (const e of entries) {
    if (!isISODate(e.date)) continue;
    byDate.set(e.date, {
      date: e.date,
      off: !!e.off,
      label: e.label?.trim() || null,
      start: isHHMM(e.start) ? e.start : null,
      end: isHHMM(e.end) ? e.end : null,
    });
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export function formatOf(s: Settings): ShiftFormat {
  return { title: s.shift_title, descSuffix: s.shift_desc_suffix, location: s.shift_location, tz: s.timezone };
}

async function existingShifts(s: Settings, start: string, end: string) {
  const from = new Date(zonedToUtc(start, '00:00', s.timezone));
  const to = new Date(zonedToUtc(addDays(end, 1), '00:00', s.timezone));
  const evs = await listEvents(s.calendar_id, from, to, s.shift_title);
  return evs
    .filter((e) => e.start.dateTime && e.end.dateTime)
    .map((e) => ({ id: e.id, summary: e.summary ?? '', start: e.start.dateTime!, end: e.end.dateTime! }));
}

export async function planImport(payload: ImportPayload) {
  const s = await getSettings();
  const known = await loadShiftTypes();
  const { shifts, newTypes, problems } = resolveRoster(payload.entries, known, payload.legend ?? []);
  const existing = await existingShifts(s, payload.period.start, payload.period.end);
  const plan = planSync(shifts, existing, payload.period.start, payload.period.end, formatOf(s));
  return { s, shifts, newTypes, problems, plan };
}

export function previewText(
  payload: ImportPayload,
  shifts: DesiredShift[],
  newTypes: ShiftType[],
  problems: string[],
  plan: SyncPlan,
): string {
  const lines = [`<b>Roster ${dayLabel(payload.period.start)} → ${dayLabel(payload.period.end)}</b>`, ''];
  const byDate = new Map(shifts.map((x) => [x.date, x]));
  for (const e of payload.entries) {
    const x = byDate.get(e.date);
    lines.push(x ? `${x.type.emoji} ${dayLabel(e.date)}: ${escape(x.type.name)} ${x.start}–${x.end}` : `▫️ ${dayLabel(e.date)}: off`);
  }
  lines.push('');
  lines.push(
    `Calendar: ${plan.create.length} new, ${plan.update.length} changed, ${plan.remove.length} removed, ${plan.unchanged} already correct.`,
  );
  if (newTypes.length) {
    lines.push(
      `New shift type${newTypes.length > 1 ? 's' : ''} learned: ${
        newTypes.map((t) => `${t.emoji} ${escape(t.name)} ${t.start_time}–${t.end_time}`).join(', ')
      }`,
    );
  }
  for (const p of problems) lines.push(`⚠️ ${escape(p)}`);
  if (payload.notes) lines.push(`📝 ${escape(payload.notes)}`);
  return lines.join('\n');
}

export const previewKeyboard = (id: string): Keyboard => [[
  { text: '✅ Add to calendar', callback_data: `imp:ok:${id}` },
  { text: '✏️ Fix', callback_data: `imp:edit:${id}` },
  { text: '✖️ Cancel', callback_data: `imp:no:${id}` },
]];

/** Create a pending import and return its preview message. */
export async function stageImport(ex: Extraction): Promise<{ id: string; text: string; keyboard: Keyboard } | { error: string }> {
  const period = periodOf(ex.entries);
  if (!period) return { error: 'I could not find any dates on that roster.' };
  const payload: ImportPayload = { entries: ex.entries, legend: ex.legend ?? [], notes: ex.notes ?? '', period };
  const { shifts, newTypes, problems, plan } = await planImport(payload);
  const { data, error } = await db().from('cos_pending').insert({ kind: 'schedule_import', payload }).select('id').single();
  if (error) throw new Error(`cos_pending insert failed: ${error.message}`);
  return { id: data.id, text: previewText(payload, shifts, newTypes, problems, plan), keyboard: previewKeyboard(data.id) };
}

/** Replace a pending import's payload after a correction. */
export async function restageImport(id: string, ex: Extraction) {
  const period = periodOf(ex.entries);
  if (!period) return { error: 'After that correction there are no dates left.' } as const;
  const payload: ImportPayload = { entries: ex.entries, legend: ex.legend ?? [], notes: ex.notes ?? '', period };
  await db().from('cos_pending').update({ payload, updated_at: new Date().toISOString() }).eq('id', id);
  const { shifts, newTypes, problems, plan } = await planImport(payload);
  return { text: previewText(payload, shifts, newTypes, problems, plan), keyboard: previewKeyboard(id) } as const;
}

export async function loadPending(id: string): Promise<ImportPayload | null> {
  const { data } = await db().from('cos_pending').select('payload, status').eq('id', id).maybeSingle();
  if (!data || data.status !== 'pending') return null;
  return data.payload as ImportPayload;
}

/** Write the import to Google Calendar. Re-plans first, so it's always against the live calendar. */
export async function applyImport(id: string): Promise<string> {
  // Claim the import atomically so a double tap can't apply it twice.
  const { data: claimed } = await db().from('cos_pending')
    .update({ status: 'applied', updated_at: new Date().toISOString() })
    .eq('id', id).eq('status', 'pending').select('payload').maybeSingle();
  if (!claimed) return 'That import was already handled.';
  const payload = claimed.payload as ImportPayload;
  try {
    const { s, newTypes, plan } = await planImport(payload);
    if (newTypes.length) await db().from('cos_shift_types').upsert(newTypes, { onConflict: 'name', ignoreDuplicates: true });
    const f = formatOf(s);
    for (const x of plan.create) await insertEvent(s.calendar_id, shiftEvent(x, f));
    for (const u of plan.update) await patchEvent(s.calendar_id, u.id, shiftEvent(u.shift, f));
    for (const r of plan.remove) await deleteEvent(s.calendar_id, r.id);
    return `Done. ${plan.create.length} added, ${plan.update.length} updated, ${plan.remove.length} removed.`;
  } catch (e) {
    // Back to pending: the plan is recomputed from the live calendar, so
    // tapping ✅ again safely finishes a half-applied import.
    await db().from('cos_pending').update({ status: 'pending', updated_at: new Date().toISOString() }).eq('id', id);
    throw e;
  }
}

export async function cancelImport(id: string) {
  await db().from('cos_pending').update({ status: 'cancelled', updated_at: new Date().toISOString() }).eq('id', id).eq('status', 'pending');
}
