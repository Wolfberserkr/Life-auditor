// The one edge function behind Heimdall. Routes:
//   POST /cos/telegram   Telegram webhook (secret header checked inside)
//   POST /cos/scheduler  pg_cron heartbeat (x-cron-secret checked inside)
//   GET  /cos/health     setup status as yes/no flags (no values)
// Everything lives in one function so it deploys as one bundle.
import { db } from '../_shared/db.ts';
import { getSecret } from '../_shared/secrets.ts';
import { handleScheduler } from './scheduler.ts';
import { handleTelegram } from './telegram.ts';

Deno.serve((req) => {
  const path = new URL(req.url).pathname.replace(/\/+$/, '');
  if (path.endsWith('/telegram')) return handleTelegram(req);
  if (path.endsWith('/scheduler')) return handleScheduler(req);
  if (path.endsWith('/health')) return health();
  return new Response('Not found', { status: 404 });
});

async function health(): Promise<Response> {
  const has = async (k: string) => !!(await getSecret(k));
  const { error } = await db().from('cos_settings').select('key').limit(1);
  const { data: owner } = await db().from('cos_settings').select('key').eq('key', 'telegram_owner_id').maybeSingle();
  return Response.json({
    database: !error,
    telegram_bot_token: !!Deno.env.get('TELEGRAM_BOT_TOKEN'),
    anthropic_key: !!Deno.env.get('ANTHROPIC_API_KEY'),
    gemini_key: !!Deno.env.get('GEMINI_API_KEY'),
    cron_secret: await has('cos_cron_secret'),
    webhook_secret: await has('telegram_webhook_secret'),
    google_bridge: (await has('google_bridge_url')) && (await has('google_bridge_secret')),
    owner_claimed: !!owner,
  });
}
