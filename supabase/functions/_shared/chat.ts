// Two-way chat with the Chief of Staff.
//
// History is stored as plain text turns. Volatile context (time, today's
// shift, pinned facts) rides on the newest user message, so the system
// prompt and tool list stay byte-identical and cache well.
import type Anthropic from 'npm:@anthropic-ai/sdk@1.3.0';
import { shiftsAround } from './briefing.ts';
import { runAgent } from './claude.ts';
import { getSettings } from './config.ts';
import { db } from './db.ts';
import { personaSystem } from './persona.ts';
import { localParts } from './time.ts';
import { chiefTools } from './tools.ts';

const HISTORY_TURNS = 20;

async function contextBlock(): Promise<string> {
  const s = await getSettings();
  const now = Date.now();
  const p = localParts(now, s.timezone);
  const lines = [`Now: ${p.weekday} ${p.date} ${p.time} (${s.timezone})`];
  try {
    const shifts = await shiftsAround(s, now - 12 * 3_600_000, now + 7 * 86_400_000);
    const cur = shifts.find((x) => x.start <= now && now < x.end);
    if (cur) lines.push(`On shift now: ${cur.title}`);
    const next = shifts.find((x) => x.start > now);
    if (next) {
      const n = localParts(next.start, s.timezone);
      lines.push(`Next shift: ${n.weekday} ${n.date}: ${next.title}`);
    }
  } catch {
    lines.push('(calendar unavailable right now)');
  }
  const { data: pinned } = await db().from('cos_memory').select('fact').eq('pinned', true).order('created_at').limit(40);
  if (pinned?.length) lines.push('Pinned facts:', ...pinned.map((m) => `- ${m.fact}`));
  return lines.join('\n');
}

async function history(): Promise<Anthropic.Beta.BetaMessageParam[]> {
  const { data } = await db().from('cos_messages').select('role, content')
    .order('id', { ascending: false }).limit(HISTORY_TURNS);
  const rows = (data ?? []).reverse() as { role: 'user' | 'assistant'; content: string }[];
  // The API needs alternating roles starting with user; merge any repeats.
  const out: { role: 'user' | 'assistant'; content: string }[] = [];
  for (const r of rows) {
    if (!out.length && r.role !== 'user') continue;
    const last = out[out.length - 1];
    if (last && last.role === r.role) last.content += `\n\n${r.content}`;
    else out.push({ ...r });
  }
  if (out.length && out[out.length - 1].role === 'user') out.pop(); // unanswered turn
  return out;
}

export interface ImageInput {
  data: string;
  mime: string;
} // base64

export async function chat(text: string, image?: ImageInput): Promise<string> {
  const s = await getSettings();
  const [ctx, past] = await Promise.all([contextBlock(), history()]);
  const prompt = `<context>\n${ctx}\n</context>\n\n${text}`;
  const content: Anthropic.Beta.BetaContentBlockParam[] = image
    ? [
      { type: 'image', source: { type: 'base64', media_type: image.mime as 'image/jpeg', data: image.data } },
      { type: 'text', text: prompt },
    ]
    : [{ type: 'text', text: prompt }];
  const reply = await runAgent({
    system: personaSystem(s),
    tools: chiefTools(),
    messages: [...past, { role: 'user', content }],
    effort: 'medium',
  });
  // Only text is kept in history; images are not stored.
  const stored = image ? `[sent an image] ${text}` : text;
  await db().from('cos_messages').insert([{ role: 'user', content: stored }, { role: 'assistant', content: reply }]);
  return reply;
}

export async function resetHistory() {
  await db().from('cos_messages').delete().gte('id', 0);
}
