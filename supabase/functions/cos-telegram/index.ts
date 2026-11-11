// ═════════════════════════════════════════════════════════════════════════
// cos-telegram: Telegram webhook for the Chief of Staff.
//
// Security: Telegram must send the X-Telegram-Bot-Api-Secret-Token we set
// with setWebhook, and only TELEGRAM_OWNER_ID is served. Everyone else gets
// a one-line refusal (with their chat id, to help with first-time setup).
//
// Replies are produced after we've already answered Telegram with 200
// (EdgeRuntime.waitUntil), so slow model calls never trigger webhook retries.
// Update ids are de-duplicated in cos_tg_updates anyway.
// ═════════════════════════════════════════════════════════════════════════
import { composeBriefing, shiftsAround } from '../_shared/briefing.ts';
import { chat, resetHistory } from '../_shared/chat.ts';
import { getSettings } from '../_shared/config.ts';
import { clearState, db, getState, setState } from '../_shared/db.ts';
import {
  applyImport,
  cancelImport,
  correctRoster,
  extractRoster,
  fileToParts,
  loadPending,
  restageImport,
  stageImport,
} from '../_shared/schedule.ts';
import { answerCallback, downloadFile, editMessage, escape, ownerChatId, sendMessage, typing } from '../_shared/telegram.ts';
import { localParts } from '../_shared/time.ts';
import { toBase64 } from '../_shared/gemini.ts';

declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void } | undefined;

// deno-lint-ignore no-explicit-any
type Update = any;

const AWAITING_FIX = 'awaiting_import_fix';
const MAX_FILE_BYTES = 15 * 1024 * 1024;

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('ok');
  const secret = Deno.env.get('TELEGRAM_WEBHOOK_SECRET');
  if (!secret || req.headers.get('x-telegram-bot-api-secret-token') !== secret) {
    return new Response('Forbidden', { status: 403 });
  }
  const update: Update = await req.json().catch(() => null);
  if (!update?.update_id) return new Response('ok');

  const { error: dup } = await db().from('cos_tg_updates').insert({ update_id: update.update_id });
  if (dup) return new Response('ok'); // already handled (Telegram retry)

  const work = handle(update).catch((e) => reportError(e));
  if (typeof EdgeRuntime !== 'undefined') EdgeRuntime.waitUntil(work);
  else await work;
  return new Response('ok');
});

async function reportError(e: unknown) {
  console.error(e);
  if (!ownerChatId()) return;
  const msg = (e as Error)?.message ?? String(e);
  await sendMessage(ownerChatId(), `⚠️ Something went wrong: <code>${escape(msg.slice(0, 300))}</code>`).catch(() => {});
}

async function handle(u: Update) {
  if (u.callback_query) return await onCallback(u.callback_query);
  const m = u.message;
  if (!m?.chat) return;
  if (!ownerChatId() || m.chat.id !== ownerChatId()) {
    if (m.chat.type === 'private') {
      await sendMessage(m.chat.id, `This is a private assistant. (Your chat id is <code>${m.chat.id}</code>.)`);
    }
    return;
  }
  await typing(m.chat.id);

  const text: string = m.text ?? '';
  if (text.startsWith('/')) return await onCommand(text);

  if (m.photo || m.document) return await onFile(m);
  if (m.voice || m.audio || m.video_note) {
    return await sendMessage(m.chat.id, 'Voice notes are not on my duties list yet. Text will do nicely.');
  }
  if (!text) return;

  const fixing = await getState<{ id: string; message_id: number }>(AWAITING_FIX);
  if (fixing) return await onImportFix(fixing, text);

  const reply = await chat(text);
  await sendMessage(m.chat.id, reply);
}

// ── Commands ────────────────────────────────────────────────────────────────

async function onCommand(text: string) {
  const chatId = ownerChatId();
  const cmd = text.split(/[\s@]/)[0].toLowerCase();
  switch (cmd) {
    case '/start':
    case '/help':
      return await sendMessage(
        chatId,
        [
          '<b>At your service.</b>',
          '• Just talk to me: questions, tasks, things to remember, plans.',
          "• Send a roster photo, PDF or spreadsheet and I'll put the shifts in your calendar.",
          '• /brief: a briefing right now',
          '• /tasks: open tasks by area',
          '• /shifts: your next shifts',
          '• /reset: clear our chat history (memories and tasks stay)',
        ].join('\n'),
      );
    case '/brief':
      return await sendMessage(chatId, await composeBriefing('on_demand'));
    case '/tasks':
      return await sendMessage(chatId, await chat('List my open tasks and reminders grouped by area. Compact.'));
    case '/shifts': {
      const s = await getSettings();
      const shifts = await shiftsAround(s, Date.now() - 3_600_000, Date.now() + 14 * 86_400_000);
      if (!shifts.length) return await sendMessage(chatId, 'No shifts in the next two weeks. Send me the roster when you have it.');
      return await sendMessage(
        chatId,
        [
          '<b>Next shifts</b>',
          ...shifts.slice(0, 10).map((x) => {
            const p = localParts(x.start, s.timezone);
            return `• ${p.weekday} ${p.date.slice(5)}: ${escape(x.title)}`;
          }),
        ].join('\n'),
      );
    }
    case '/reset':
      await resetHistory();
      await clearState(AWAITING_FIX);
      return await sendMessage(chatId, 'Slate wiped. Tasks and memories untouched.');
    default:
      return await sendMessage(chatId, await chat(text));
  }
}

// ── Files: roster import (or anything else visual) ────────────────────────

// deno-lint-ignore no-explicit-any
async function onFile(m: any) {
  const chatId = ownerChatId();
  const caption: string | undefined = m.caption;
  let fileId: string, mime: string, name = '', size = 0;
  if (m.photo) {
    const best = m.photo[m.photo.length - 1];
    fileId = best.file_id;
    mime = 'image/jpeg';
    size = best.file_size ?? 0;
  } else {
    fileId = m.document.file_id;
    mime = m.document.mime_type ?? 'application/octet-stream';
    name = m.document.file_name ?? '';
    size = m.document.file_size ?? 0;
  }
  if (size > MAX_FILE_BYTES) return await sendMessage(chatId, 'That file is a bit large for me (15 MB max).');
  const supported = /^image\/|pdf|sheet|excel|csv/.test(mime) || /\.(xlsx|xls|csv|ods|pdf)$/i.test(name);
  if (!supported) return await sendMessage(chatId, "I can read rosters as photos, PDFs or spreadsheets. That one I can't open.");

  await sendMessage(chatId, '📋 Reading the roster…');
  const bytes = await downloadFile(fileId);
  const ex = await extractRoster(fileToParts(bytes, mime, name), caption);

  if (!ex.is_schedule || !ex.entries.length) {
    // Not a roster. If it's an image, hand it to the Chief of Staff.
    if (mime.startsWith('image/')) {
      const reply = await chat(caption || '(sent an image without a caption)', { data: toBase64(bytes), mime });
      return await sendMessage(chatId, reply);
    }
    return await sendMessage(chatId, `That doesn't look like a roster to me.${ex.notes ? ` ${escape(ex.notes)}` : ''}`);
  }

  const staged = await stageImport(ex);
  if ('error' in staged) return await sendMessage(chatId, staged.error);
  const msgId = await sendMessage(chatId, staged.text, staged.keyboard);
  await db().from('cos_pending').update({ tg_message_id: msgId }).eq('id', staged.id);
}

async function onImportFix(fixing: { id: string; message_id: number }, text: string) {
  const chatId = ownerChatId();
  await clearState(AWAITING_FIX);
  const payload = await loadPending(fixing.id);
  if (!payload) return await sendMessage(chatId, 'That import is no longer open.');
  const ex = await correctRoster(payload, text);
  const r = await restageImport(fixing.id, ex);
  if ('error' in r) return await sendMessage(chatId, r.error!);
  const msgId = await sendMessage(chatId, r.text, r.keyboard);
  await db().from('cos_pending').update({ tg_message_id: msgId }).eq('id', fixing.id);
}

// ── Buttons ─────────────────────────────────────────────────────────────────

// deno-lint-ignore no-explicit-any
async function onCallback(q: any) {
  if (!ownerChatId() || q.from?.id !== ownerChatId()) return await answerCallback(q.id, "Not for you, I'm afraid.");
  const chatId = q.message?.chat?.id ?? ownerChatId();
  const msgId: number = q.message?.message_id;
  const [ns, action, ...rest] = String(q.data ?? '').split(':');

  if (ns === 'imp') {
    const id = rest[0];
    if (action === 'ok') {
      await answerCallback(q.id, 'Updating your calendar…');
      try {
        const result = await applyImport(id);
        await editMessage(chatId, msgId, `${q.message?.text ? escape(q.message.text) : ''}\n\n✅ ${result}`);
      } catch (e) {
        await sendMessage(
          chatId,
          `⚠️ Calendar update failed: <code>${escape((e as Error).message.slice(0, 300))}</code>\nTap ✅ again to retry.`,
        );
      }
    } else if (action === 'edit') {
      await answerCallback(q.id);
      await setState(AWAITING_FIX, { id, message_id: msgId });
      await sendMessage(chatId, 'What needs fixing? e.g. "the 20th is Green" or "Friday is off".');
    } else if (action === 'no') {
      await cancelImport(id);
      await answerCallback(q.id, 'Cancelled');
      await editMessage(chatId, msgId, `${q.message?.text ? escape(q.message.text) : ''}\n\n✖️ Cancelled.`);
    }
    return;
  }

  if (ns === 'ci') {
    const [value, date] = rest;
    await db().from('cos_checkins').insert({ kind: action, value, local_date: date });
    const label = action === 'energy'
      ? ({ '1': 'drained', '2': 'OK', '3': 'strong' } as Record<string, string>)[value]
      : value === 'yes'
      ? 'trained'
      : 'rest day';
    await answerCallback(q.id, `Logged: ${label}`);
    return;
  }

  await answerCallback(q.id);
}
