// Tools the Chief of Staff can use in chat. Inputs are validated with zod
// before anything runs. Deliberately absent: sending email, inviting people,
// anything that spends money. Those need the user, not a tool.
import { z } from 'npm:zod@4.6.7';
import type { ToolSpec } from './claude.ts';
import { getSettings } from './config.ts';
import { db } from './db.ts';
import { eventEndMs, eventStartMs, insertEvent, listEvents, searchMail } from './google.ts';
import { health, viking, weather } from './sources.ts';
import { addDays, isISODate, localParts, zonedToUtc } from './time.ts';

const AREA = z.enum(['training', 'work', 'home_family', 'relationships', 'general']);
const LOCAL_DT = z.string().regex(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/, 'YYYY-MM-DD or YYYY-MM-DDTHH:MM (local time)');

function tool<S extends z.ZodObject>(name: string, description: string, schema: S, run: (i: z.infer<S>) => Promise<unknown>): ToolSpec {
  const { $schema: _drop, ...input_schema } = z.toJSONSchema(schema) as Record<string, unknown>;
  return {
    name,
    description,
    input_schema: input_schema as ToolSpec['input_schema'],
    run: async (raw) => {
      const parsed = schema.safeParse(raw);
      if (!parsed.success) {
        throw new Error(`Invalid input: ${parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`);
      }
      const out = await run(parsed.data);
      return typeof out === 'string' ? out : JSON.stringify(out);
    },
  };
}

/** Local "YYYY-MM-DD" or "YYYY-MM-DDTHH:MM" → ISO UTC. Date-only means 09:00. */
async function localToIso(v: string): Promise<string> {
  const s = await getSettings();
  const [date, time = '09:00'] = v.split('T');
  return new Date(zonedToUtc(date, time, s.timezone)).toISOString();
}

async function fmtLocal(iso: string | null) {
  if (!iso) return null;
  const s = await getSettings();
  const p = localParts(Date.parse(iso), s.timezone);
  return `${p.weekday} ${p.date} ${p.time}`;
}

export function chiefTools(): ToolSpec[] {
  return [
    tool(
      'capture',
      'Save a task, note, idea or timed reminder into a life area.',
      z.object({
        kind: z.enum(['task', 'note', 'idea', 'reminder']),
        area: AREA,
        title: z.string().min(1).max(500),
        details: z.string().max(4000).optional(),
        due: LOCAL_DT.optional().describe('when it is due (local time)'),
        remind_at: LOCAL_DT.optional().describe('when to ping the user on Telegram (local time); required for kind=reminder'),
      }),
      async (i) => {
        if (i.kind === 'reminder' && !i.remind_at) throw new Error('remind_at is required for reminders');
        const row = {
          kind: i.kind,
          area: i.area,
          title: i.title,
          details: i.details ?? null,
          due_at: i.due ? await localToIso(i.due) : null,
          remind_at: i.remind_at ? await localToIso(i.remind_at) : null,
        };
        const { data, error } = await db().from('cos_items').insert(row).select('id').single();
        if (error) throw new Error(error.message);
        return { saved: true, id: data.id };
      },
    ),

    tool(
      'list_items',
      'List captured items. Defaults to open items in all areas.',
      z.object({
        area: AREA.optional(),
        kind: z.enum(['task', 'note', 'idea', 'reminder']).optional(),
        status: z.enum(['open', 'done', 'dropped']).default('open'),
        limit: z.number().int().min(1).max(50).default(25),
      }),
      async (i) => {
        let q = db().from('cos_items').select('id, kind, area, title, details, status, due_at, remind_at, created_at')
          .eq('status', i.status).order('due_at', { ascending: true, nullsFirst: false }).limit(i.limit);
        if (i.area) q = q.eq('area', i.area);
        if (i.kind) q = q.eq('kind', i.kind);
        const { data, error } = await q;
        if (error) throw new Error(error.message);
        return await Promise.all(
          (data ?? []).map(async (r) => ({ ...r, due_at: await fmtLocal(r.due_at), remind_at: await fmtLocal(r.remind_at) })),
        );
      },
    ),

    tool(
      'update_item',
      'Mark an item done/dropped/open, or change its title or due date.',
      z.object({
        id: z.string().uuid(),
        status: z.enum(['open', 'done', 'dropped']).optional(),
        title: z.string().min(1).max(500).optional(),
        due: LOCAL_DT.optional(),
      }),
      async (i) => {
        const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
        if (i.status) {
          patch.status = i.status;
          patch.completed_at = i.status === 'done' ? new Date().toISOString() : null;
        }
        if (i.title) patch.title = i.title;
        if (i.due) patch.due_at = await localToIso(i.due);
        const { data, error } = await db().from('cos_items').update(patch).eq('id', i.id).select('id, title, status').maybeSingle();
        if (error) throw new Error(error.message);
        return data ?? 'No item with that id.';
      },
    ),

    tool(
      'remember',
      'Store a lasting fact about the user, their people or preferences. pinned=true for facts needed in every conversation.',
      z.object({
        fact: z.string().min(1).max(1000),
        area: AREA.default('general'),
        pinned: z.boolean().default(false),
      }),
      async (i) => {
        const { error } = await db().from('cos_memory').insert(i);
        if (error) throw new Error(error.message);
        return 'Remembered.';
      },
    ),

    tool(
      'recall',
      'Search stored facts by keyword (case-insensitive).',
      z.object({
        query: z.string().min(1).max(100),
      }),
      async (i) => {
        const term = i.query.replace(/[%_,()]/g, ' ').trim();
        const { data } = await db().from('cos_memory').select('fact, area, created_at')
          .ilike('fact', `%${term}%`).order('created_at', { ascending: false }).limit(20);
        return data?.length ? data : 'Nothing stored about that.';
      },
    ),

    tool(
      'calendar',
      'List calendar events (shifts included) between two local dates, inclusive.',
      z.object({
        from: z.string().refine(isISODate, 'YYYY-MM-DD'),
        to: z.string().refine(isISODate, 'YYYY-MM-DD'),
        search: z.string().max(100).optional(),
      }),
      async (i) => {
        const s = await getSettings();
        if (i.to < i.from) throw new Error('to is before from');
        if (i.to > addDays(i.from, 62)) throw new Error('Range too long (max ~2 months)');
        const evs = await listEvents(
          s.calendar_id,
          new Date(zonedToUtc(i.from, '00:00', s.timezone)),
          new Date(zonedToUtc(addDays(i.to, 1), '00:00', s.timezone)),
          i.search,
        );
        return evs.map((e) => ({
          title: e.summary,
          type: e.eventType,
          start: e.start.date ?? `${localParts(eventStartMs(e), s.timezone).date} ${localParts(eventStartMs(e), s.timezone).time}`,
          end: e.end.date ?? localParts(eventEndMs(e), s.timezone).time,
          location: e.location,
        }));
      },
    ),

    tool(
      'add_calendar_block',
      'Add a personal event/block to the calendar (no attendees). Low-risk: do it without asking when the user wants something scheduled.',
      z.object({
        title: z.string().min(1).max(200),
        start: LOCAL_DT,
        end: LOCAL_DT.optional().describe('defaults to 1 hour after start; for all-day use date-only start'),
        description: z.string().max(2000).optional(),
      }),
      async (i) => {
        const s = await getSettings();
        const allDay = !i.start.includes('T');
        const body = allDay
          ? { summary: i.title, description: i.description, start: { date: i.start }, end: { date: addDays(i.end ?? i.start, 1) } }
          : {
            summary: i.title,
            description: i.description,
            start: { dateTime: `${i.start}:00`, timeZone: s.timezone },
            end: i.end?.includes('T')
              ? { dateTime: `${i.end}:00`, timeZone: s.timezone }
              : { dateTime: new Date(zonedToUtc(...(i.start.split('T') as [string, string]), s.timezone) + 3_600_000).toISOString() },
          };
        const ev = await insertEvent(s.calendar_id, body);
        return { created: true, id: ev.id, title: ev.summary };
      },
    ),

    tool(
      'health',
      'Garmin daily health data (sleep, HRV, body battery, readiness, resting HR, steps, stress), newest first.',
      z.object({
        days: z.number().int().min(1).max(30).default(7),
      }),
      async (i) => (await health(await getSettings(), i.days)) ?? 'No Garmin data synced yet.',
    ),

    tool(
      'viking',
      'Project Viking training status: recent weights and 7-day average, workouts, rides, nutrition.',
      z.object({}),
      async () => (await viking(await getSettings())) ?? 'Project Viking is not linked (viking_user_id not set).',
    ),

    tool(
      'search_email',
      'Search Gmail (read-only) with Gmail query syntax. Returns sender, subject and snippet.',
      z.object({
        query: z.string().min(1).max(200),
        max: z.number().int().min(1).max(15).default(8),
      }),
      async (i) => await searchMail(i.query, i.max),
    ),

    tool(
      'weather',
      'Current weather and today/tomorrow forecast.',
      z.object({}),
      async () => (await weather(await getSettings())) ?? 'Weather location not configured.',
    ),
  ];
}
