-- ═══════════════════════════════════════════════════════════════════════════
-- 002_cos_cron.sql: runs Heimdall's scheduler every 5 minutes.
--
-- The scheduler decides by itself whether anything is due (pre-shift brief,
-- post-shift debrief, day-off brief, reminders) and registers the Telegram
-- webhook on its first run, so a frequent tick is cheap.
--
-- The shared secret is generated in the database (cos_secrets.cos_cron_secret,
-- service-role only) and read by both this job and the function, so there is
-- nothing to copy by hand. Replace <project-ref> before running.
-- ═══════════════════════════════════════════════════════════════════════════

create extension if not exists pg_cron;
create extension if not exists pg_net;

insert into public.cos_secrets (key, value)
select k, encode(extensions.gen_random_bytes(32), 'hex')
from unnest(array['cos_cron_secret', 'telegram_webhook_secret', 'google_bridge_secret']) as k
on conflict (key) do nothing;

do $$
begin
  perform cron.unschedule(jobid) from cron.job where jobname = 'cos-scheduler';
end $$;

select cron.schedule(
  'cos-scheduler',
  '*/5 * * * *',
  $job$
  select net.http_post(
    url     := 'https://<project-ref>.supabase.co/functions/v1/cos/scheduler',
    headers := jsonb_build_object(
                 'Content-Type', 'application/json',
                 'x-cron-secret', (select value from public.cos_secrets where key = 'cos_cron_secret')),
    body    := '{}'::jsonb,
    timeout_milliseconds := 120000
  );
  $job$
);

-- Housekeeping: drop old Telegram update ids and sent-log rows nightly.
do $$
begin
  perform cron.unschedule(jobid) from cron.job where jobname = 'cos-housekeeping';
end $$;

select cron.schedule(
  'cos-housekeeping',
  '17 3 * * *',
  $job$
  delete from public.cos_tg_updates where received_at < now() - interval '7 days';
  delete from public.cos_sent_log   where sent_at     < now() - interval '60 days';
  $job$
);
