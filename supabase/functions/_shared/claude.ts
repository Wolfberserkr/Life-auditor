// Claude client + a small manual tool-use loop for the Chief of Staff.
//
// Conversation history is kept as plain text turns (see cos_messages); the
// tool loop inside one turn is append-only, so thinking blocks are always
// passed back unchanged.
import Anthropic from 'npm:@anthropic-ai/sdk@1.3.0';
import { CLAUDE_MODEL, env } from './config.ts';

let client: Anthropic | null = null;
const anthropic = () => (client ??= new Anthropic({ apiKey: env('ANTHROPIC_API_KEY'), timeout: 110_000, maxRetries: 2 }));

export interface ToolSpec {
  name: string;
  description: string;
  input_schema: Anthropic.Beta.BetaTool.InputSchema;
  run: (input: unknown) => Promise<string>;
}

export interface AgentOptions {
  system: string;
  messages: Anthropic.Beta.BetaMessageParam[];
  tools?: ToolSpec[];
  effort?: 'low' | 'medium' | 'high';
  maxIterations?: number;
  maxTokens?: number;
}

const REFUSAL_REPLY = "I'm afraid I can't help with that one.";

/** Run Claude with tools until it answers. Returns the final text. */
export async function runAgent(o: AgentOptions): Promise<string> {
  const tools = o.tools ?? [];
  const messages = [...o.messages];
  const byName = new Map(tools.map((t) => [t.name, t]));
  const maxIterations = o.maxIterations ?? 8;

  for (let i = 0; i < maxIterations; i++) {
    const response = await anthropic().beta.messages.create({
      model: CLAUDE_MODEL(),
      max_tokens: o.maxTokens ?? 16000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: o.effort ?? 'medium' },
      cache_control: { type: 'ephemeral' },
      system: o.system,
      ...(tools.length ? { tools: tools.map(({ name, description, input_schema }) => ({ name, description, input_schema })) } : {}),
      messages,
    });

    if (response.stop_reason === 'refusal') return REFUSAL_REPLY;
    if (response.stop_reason === 'pause_turn') {
      messages.push({ role: 'assistant', content: response.content });
      continue;
    }

    const toolUses = response.content.filter((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === 'tool_use');
    if (response.stop_reason !== 'tool_use' || toolUses.length === 0) {
      const text = textOf(response.content);
      if (response.stop_reason === 'max_tokens') return `${text}\n\n(cut short)`;
      return text || 'Done.';
    }

    messages.push({ role: 'assistant', content: response.content });
    const results = await Promise.all(toolUses.map(async (tu): Promise<Anthropic.Beta.BetaToolResultBlockParam> => {
      const tool = byName.get(tu.name);
      if (!tool) return { type: 'tool_result', tool_use_id: tu.id, content: `Unknown tool ${tu.name}`, is_error: true };
      try {
        return { type: 'tool_result', tool_use_id: tu.id, content: await tool.run(tu.input) };
      } catch (e) {
        return { type: 'tool_result', tool_use_id: tu.id, content: `Error: ${(e as Error).message}`, is_error: true };
      }
    }));
    messages.push({ role: 'user', content: results });
  }
  return 'I went round in circles on that one. Could you rephrase?';
}

/** Single call without tools (briefings). */
export async function complete(system: string, user: string, effort: 'low' | 'medium' | 'high' = 'medium'): Promise<string> {
  return await runAgent({ system, messages: [{ role: 'user', content: user }], effort, maxIterations: 2 });
}

function textOf(content: Anthropic.Beta.BetaContentBlock[]): string {
  return content.filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text').map((b) => b.text).join('\n').trim();
}
