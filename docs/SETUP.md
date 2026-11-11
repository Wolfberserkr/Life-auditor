# Setup: Heimdall (Chief of Staff v1)

Everything runs in the Project Viking Supabase project; nothing here changes
Viking's tables or functions. With the Supabase connector, Claude can do most
of this for you. What only you can do is marked **(you)**.

> This repository is **public**. Personal details (names, workplace, chat id,
> user ids) and secrets live in Supabase (`cos_settings`, `cos_secrets`,
> function secrets), **never** in files here.

## Quick path (about 10 minutes of your time)

1. **(you) Telegram bot:** in @BotFather, `/newbot`; keep the token.
2. **Database:** run [`supabase/sql/001_cos_core.sql`](../supabase/sql/001_cos_core.sql)
   in the SQL editor (idempotent), then fill in `cos_settings` (below).
3. **Deploy:** `supabase functions deploy cos --project-ref <ref> --no-verify-jwt`
   (or via the Supabase connector; on `main`, `.github/workflows/deploy.yml` does it).
4. **Scheduler:** run [`supabase/sql/002_cos_cron.sql`](../supabase/sql/002_cos_cron.sql)
   with `<project-ref>` filled in. It also generates the internal secrets
   (webhook, cron, Google bridge) in `cos_secrets`; nothing to copy by hand.
5. **(you) Two keys** as Edge Function secrets (dashboard → Edge Functions →
   Secrets): `TELEGRAM_BOT_TOKEN` and `ANTHROPIC_API_KEY`, plus `GEMINI_API_KEY`
   if the project doesn't have it yet. Within 5 minutes the scheduler registers
   the Telegram webhook by itself.
6. **(you) Google, about 3 minutes:** see below.
7. **(you)** Send `/start` to the bot. The first private `/start` claims the
   bot; after that it answers only you.

## Settings (`cos_settings`)

```sql
insert into public.cos_settings (key, value) values
  ('user_name',          '"<what the assistant should call you>"'),
  ('assistant_name',     '"<the assistant''s own name>"'),
  ('timezone',           '"America/Puerto_Rico"'),          -- same as your shift events
  ('roster_names',       '["<your name as printed on the roster>"]'),
  ('shift_location',     '"<workplace, as on your shift events>"'),
  ('shift_desc_suffix',  '"<e.g. your department>"'),       -- "Blue shift – <this>"
  ('weather_lat',        '<latitude>'),
  ('weather_lon',        '<longitude>'),
  ('viking_user_id',     '"<your auth.users id>"'),
  ('pre_shift_lead_min', '60'),
  ('debrief_delay_min',  '20'),
  ('day_off_brief_time', '"08:00"')
on conflict (key) do update set value = excluded.value, updated_at = now();
```

Every key is optional; defaults are in [`_shared/config.ts`](../supabase/functions/_shared/config.ts).

## Google Calendar + Gmail (Apps Script bridge)

No Cloud project, consent screen or tokens. A small script runs inside your
own Google account and Heimdall talks to it with a shared secret.

1. Go to https://script.google.com and click **New project**. Name it `Heimdall bridge`.
2. Replace everything in `Code.gs` with [`google-bridge/Code.gs`](../google-bridge/Code.gs),
   and set `SECRET` to the value of `cos_secrets.google_bridge_secret`
   (`select value from cos_secrets where key = 'google_bridge_secret';`).
3. Click **Deploy → New deployment**, then the gear icon → **Web app**.
   Set **Execute as: Me** and **Who has access: Anyone**, then **Deploy**.
4. **Authorize access.** Google warns that the app isn't verified; it's your
   own script, so choose **Advanced → Go to Heimdall bridge (unsafe) → Allow**.
5. Copy the **Web app URL** (ends in `/exec`) and store it:

```sql
insert into public.cos_secrets (key, value) values ('google_bridge_url', '<web app url>')
on conflict (key) do update set value = excluded.value, updated_at = now();
```

Gmail access is read-only in practice: the script only searches and reads.
Google's consent screen says "full Gmail" because Apps Script has no read-only
Gmail service. If you edit the script later, use **Deploy → Manage deployments
→ Edit → New version** so the URL stays the same.

## Garmin (later)

Needs a one-time login on your own computer (Python):

```bash
pip install -r workers/garmin/requirements.txt
cd workers/garmin
SUPABASE_URL=https://<ref>.supabase.co SUPABASE_SERVICE_ROLE_KEY=... python login.py
```

Then add `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` as GitHub Actions
secrets on this repo. The **Garmin sync** workflow runs hourly. Briefings
work without Garmin; they just skip the health section.

## Try it

- `/brief`: a briefing now.
- Send a roster photo or PDF, check the preview, then tap **✅ Add to calendar**.
- "Remind me to call the bank tomorrow at 10": a Telegram ping at 10:00.
- Shift days: a briefing `pre_shift_lead_min` before the shift and a debrief
  after it. Days off: a briefing at `day_off_brief_time`.

## Troubleshooting

| Symptom | Check |
|---|---|
| Bot silent after `/start` | `select * from net._http_response order by created desc limit 3;` (the scheduler reports `webhook_error`); function logs in the dashboard |
| "Google is not connected yet" | `google_bridge_url` missing in `cos_secrets` |
| "Google bridge …: forbidden" | `SECRET` in the Apps Script doesn't match `google_bridge_secret` |
| No briefings | `select * from cron.job_run_details order by start_time desc limit 5;` |
| Someone else claimed the bot | `delete from cos_settings where key = 'telegram_owner_id';` then `/start` again |
| Roster rows from someone else | Set `roster_names` exactly as your name appears on the roster |
