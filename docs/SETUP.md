# Setup: Chief of Staff v1

About 45 minutes, once. Everything runs in your existing Project Viking
Supabase project; nothing here changes Viking's tables or functions.

> This repository is **public**. Personal details (your name, workplace,
> Telegram id, user ids) go into Supabase secrets or the `cos_settings`
> table, **never** into files in this repo.

## 0. What you need

| Thing | Where |
|---|---|
| Supabase CLI, logged in | `npm i -g supabase` then `supabase login` |
| Deno 2 (for the Google sign-in script) | https://deno.com |
| Python 3.10+ (for the one-time Garmin login) | |
| Telegram bot token | @BotFather, then `/newbot` |
| Anthropic API key | console.anthropic.com |
| Gemini API key | aistudio.google.com (Viking may already have `GEMINI_API_KEY` set; function secrets are shared across the project) |
| Google OAuth client | step 3 |

Set this once in your shell for the commands below:

```bash
export PROJECT_REF=npqpzzarohlvexqpqurg
```

## 1. Database

In the Supabase dashboard, open **SQL editor**, paste
[`supabase/sql/001_cos_core.sql`](../supabase/sql/001_cos_core.sql) and run it.
It only creates `cos_*` tables and is safe to re-run.

These files are applied by hand on purpose. Viking's CI runs `supabase db push`,
and would fail if the project's migration history contained Life-auditor
migrations it doesn't know about.

Then fill in your settings (edit the values, then run):

```sql
insert into public.cos_settings (key, value) values
  ('user_name',          '"<what the butler should call you>"'),
  ('assistant_name',     '"<the assistant's own name>"'),
  ('timezone',           '"America/Puerto_Rico"'),          -- same as your shift events
  ('roster_names',       '["<your name as printed on the roster>", "<variant>"]'),
  ('shift_location',     '"<workplace, as on your shift events>"'),
  ('shift_desc_suffix',  '"<e.g. your department>"'),       -- "Blue shift – <this>"
  ('weather_lat',        '<latitude, e.g. 40.71>'),
  ('weather_lon',        '<longitude, e.g. -74.01>'),
  ('viking_user_id',     '"<your auth.users id>"'),          -- Authentication → Users in the dashboard
  ('pre_shift_lead_min', '60'),
  ('debrief_delay_min',  '20'),
  ('day_off_brief_time', '"08:00"')
on conflict (key) do update set value = excluded.value, updated_at = now();
```

Every key is optional. Defaults are in
[`_shared/config.ts`](../supabase/functions/_shared/config.ts).

## 2. Telegram bot

1. In @BotFather: `/newbot`, then copy the token.
2. Make up a webhook secret: `openssl rand -hex 32`.
3. Find your chat id. After step 5 you can message the bot and it replies with
   your id. Or message @userinfobot now.

## 3. Google (Calendar + Gmail)

1. https://console.cloud.google.com → new project (e.g. "chief-of-staff").
2. **APIs & Services → Library:** enable **Google Calendar API** and **Gmail API**.
3. **OAuth consent screen:** External; add your Gmail as a test user; add the
   scopes `calendar.events` and `gmail.readonly`.
4. Then click **Publish app** (to "In production"). Apps left in *Testing* have
   refresh tokens that expire after 7 days. You'll see an "unverified app"
   warning when you sign in; for a personal app that's expected (Advanced →
   continue).
5. **Credentials → Create credentials → OAuth client ID → Desktop app.** Copy
   the client id and secret.
6. On your computer:

```bash
GOOGLE_CLIENT_ID=... GOOGLE_CLIENT_SECRET=... deno run --allow-net --allow-env scripts/google-auth.ts
```

Open the printed URL, approve, and copy the refresh token it prints.

## 4. Secrets

```bash
supabase secrets set --project-ref $PROJECT_REF \
  TELEGRAM_BOT_TOKEN=... \
  TELEGRAM_WEBHOOK_SECRET=... \
  TELEGRAM_OWNER_ID=... \
  ANTHROPIC_API_KEY=... \
  GEMINI_API_KEY=... \
  GOOGLE_CLIENT_ID=... \
  GOOGLE_CLIENT_SECRET=... \
  GOOGLE_REFRESH_TOKEN=... \
  COS_CRON_SECRET=$(openssl rand -hex 32)
```

Optional: `COS_CLAUDE_MODEL` (default `claude-opus-5-5`) and `COS_GEMINI_MODEL`
(default `gemini-3.8-flash`).

## 5. Deploy the functions and connect Telegram

```bash
supabase functions deploy cos-telegram  --project-ref $PROJECT_REF --no-verify-jwt
supabase functions deploy cos-scheduler --project-ref $PROJECT_REF --no-verify-jwt
```

```bash
TELEGRAM_BOT_TOKEN=... TELEGRAM_WEBHOOK_SECRET=... PROJECT_REF=$PROJECT_REF ./scripts/set-webhook.sh
```

Message your bot `/start`. If `TELEGRAM_OWNER_ID` isn't right yet, it replies
with your chat id; set it and send `/start` again.

## 6. Scheduler (briefings and reminders)

In the SQL editor, store the two values the cron job needs (once):

```sql
select vault.create_secret('https://npqpzzarohlvexqpqurg.supabase.co', 'cos_project_url');
select vault.create_secret('<the COS_CRON_SECRET value from step 4>', 'cos_cron_secret');
```

Then run [`supabase/sql/002_cos_cron.sql`](../supabase/sql/002_cos_cron.sql).

If you didn't keep the COS_CRON_SECRET value, set a new one with
`supabase secrets set` and use that.

## 7. Garmin

On your computer:

```bash
pip install -r workers/garmin/requirements.txt
cd workers/garmin
SUPABASE_URL=https://$PROJECT_REF.supabase.co SUPABASE_SERVICE_ROLE_KEY=... python login.py
```

This stores Garmin session tokens (not your password) in `cos_secrets`. Then
in **GitHub → Settings → Secrets and variables → Actions** for this repo, add:

| Secret | Used by |
|---|---|
| `SUPABASE_URL` | Garmin sync |
| `SUPABASE_SERVICE_ROLE_KEY` | Garmin sync |
| `SUPABASE_ACCESS_TOKEN` | auto-deploy of functions on push to `main` |
| `SUPABASE_PROJECT_REF` | auto-deploy |

Run **Actions → Garmin sync → Run workflow** once to check it works. After
that it runs hourly.

## 8. Try it

- `/brief`: a briefing now.
- Send a roster photo or PDF. Check the preview, then tap **✅ Add to calendar**.
- "Remind me to call the bank tomorrow at 10": a Telegram ping at 10:00.
- "Add groceries: eggs, rice, coffee": captured under Home & Family.
- Shift days: a briefing `pre_shift_lead_min` before the shift and a debrief
  after it. Days off: a briefing at `day_off_brief_time`.

## Troubleshooting

| Symptom | Check |
|---|---|
| Bot silent | `supabase functions logs cos-telegram`; `getWebhookInfo` on the bot API |
| "Something went wrong: Google token refresh failed" | App still in *Testing* (7-day tokens): publish it and rerun step 3.6 |
| No briefings | `select * from cron.job_run_details order by start_time desc limit 5;` and `supabase functions logs cos-scheduler` |
| Health section missing | Garmin sync run in Actions; `select * from cos_health_daily order by date desc;` |
| Roster rows from someone else | Set `roster_names` exactly as your name appears on the roster |
