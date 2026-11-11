// Minimal Telegram Bot API client. Replies use parse_mode=HTML with a
// sanitiser, and fall back to plain text if Telegram still rejects them.
import { clearSettingsCache, env, getSettings } from './config.ts';
import { db } from './db.ts';

export interface InlineButton {
  text: string;
  callback_data: string;
}
export type Keyboard = InlineButton[][];

const api = (method: string) => `https://api.telegram.org/bot${env('TELEGRAM_BOT_TOKEN')}/${method}`;

async function call<T = unknown>(method: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(api(method), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({ ok: false, description: `HTTP ${res.status}` }));
  if (!json.ok) throw new TelegramError(method, json.description ?? 'unknown error');
  return json.result as T;
}

export class TelegramError extends Error {
  constructor(public method: string, public description: string) {
    super(`Telegram ${method}: ${description}`);
  }
}

const ALLOWED = /&lt;(\/?)(b|strong|i|em|u|ins|s|strike|del|code|pre|blockquote|tg-spoiler)&gt;/g;
const LINK_OPEN = /&lt;a href=(?:&quot;|")(https?:\/\/[^"&<>\s]+)(?:&quot;|")&gt;/g;

/** Escape everything, then re-allow the small tag set Telegram supports. */
export function sanitizeHtml(text: string): string {
  const escaped = text.replace(/&(?!(amp|lt|gt|quot|#\d+);)/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return escaped
    .replace(ALLOWED, (_m, slash, tag) => `<${slash}${tag}>`)
    .replace(LINK_OPEN, (_m, href) => `<a href="${href}">`)
    .replace(/&lt;\/a&gt;/g, '</a>');
}

export function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
}

/** Split on paragraph boundaries to stay under Telegram's 4096-char limit. */
export function chunk(text: string, max = 3900): string[] {
  if (text.length <= max) return [text];
  const parts: string[] = [];
  let cur = '';
  for (const para of text.split(/\n\n/)) {
    if ((cur + '\n\n' + para).length > max && cur) {
      parts.push(cur);
      cur = para;
    } else cur = cur ? `${cur}\n\n${para}` : para;
    while (cur.length > max) {
      parts.push(cur.slice(0, max));
      cur = cur.slice(max);
    }
  }
  if (cur) parts.push(cur);
  return parts;
}

interface SentMessage {
  message_id: number;
}

export async function sendMessage(chatId: number | string, text: string, keyboard?: Keyboard): Promise<number> {
  const parts = chunk(sanitizeHtml(text));
  let lastId = 0;
  for (let i = 0; i < parts.length; i++) {
    const markup = i === parts.length - 1 && keyboard ? { reply_markup: { inline_keyboard: keyboard } } : {};
    try {
      const m = await call<SentMessage>('sendMessage', {
        chat_id: chatId,
        text: parts[i],
        parse_mode: 'HTML',
        link_preview_options: { is_disabled: true },
        ...markup,
      });
      lastId = m.message_id;
    } catch (e) {
      if (!(e instanceof TelegramError) || !/parse|entit/i.test(e.description)) throw e;
      const m = await call<SentMessage>('sendMessage', { chat_id: chatId, text: stripTags(parts[i]), ...markup });
      lastId = m.message_id;
    }
  }
  return lastId;
}

export async function editMessage(chatId: number | string, messageId: number, text: string, keyboard?: Keyboard) {
  await call('editMessageText', {
    chat_id: chatId,
    message_id: messageId,
    text: sanitizeHtml(text).slice(0, 4096),
    parse_mode: 'HTML',
    reply_markup: { inline_keyboard: keyboard ?? [] },
  }).catch((e) => {
    if (!(e instanceof TelegramError) || !/not modified/i.test(e.description)) throw e;
  });
}

export const answerCallback = (id: string, text?: string) =>
  call('answerCallbackQuery', { callback_query_id: id, ...(text ? { text } : {}) }).catch(() => {});

export const typing = (chatId: number | string) => call('sendChatAction', { chat_id: chatId, action: 'typing' }).catch(() => {});

export async function downloadFile(fileId: string): Promise<Uint8Array> {
  const f = await call<{ file_path: string }>('getFile', { file_id: fileId });
  const res = await fetch(`https://api.telegram.org/file/bot${env('TELEGRAM_BOT_TOKEN')}/${f.file_path}`);
  if (!res.ok) throw new Error(`Telegram file download failed: HTTP ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
}

// The one chat this bot serves: TELEGRAM_OWNER_ID if set, otherwise whoever
// claimed it with the first /start (cos_settings.telegram_owner_id). 0 = unclaimed.
let owner = 0;
export const ownerChatId = () => owner;

export async function loadOwner(): Promise<number> {
  const s = await getSettings();
  owner = Number(Deno.env.get('TELEGRAM_OWNER_ID') || s.telegram_owner_id || 0);
  return owner;
}

/** Atomically claim ownership for chatId if nobody owns the bot yet. */
export async function claimOwner(chatId: number): Promise<boolean> {
  await db().from('cos_settings').upsert({ key: 'telegram_owner_id', value: chatId }, { onConflict: 'key', ignoreDuplicates: true });
  const { data } = await db().from('cos_settings').select('value').eq('key', 'telegram_owner_id').maybeSingle();
  clearSettingsCache();
  owner = Number(data?.value ?? 0);
  return owner === chatId;
}

export async function setWebhook(url: string, secret: string) {
  await call('setWebhook', { url, secret_token: secret, allowed_updates: ['message', 'callback_query'] });
  await call('setMyCommands', {
    commands: [
      { command: 'brief', description: 'Briefing right now' },
      { command: 'tasks', description: 'Open tasks by area' },
      { command: 'shifts', description: 'Your next shifts' },
      { command: 'reset', description: 'Clear chat history' },
      { command: 'help', description: 'What I can do' },
    ],
  });
}

export function escape(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
