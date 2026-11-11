-- ═══════════════════════════════════════════════════════════════════════════
-- 002_cos_cron.sql: runs the Chief of Staff scheduler every 5 minutes.
--
-- The scheduler decides by itself whether anything is due (pre-shift brief,
-- post-shift debrief, day-off brief, reminders), so a frequent tick is cheap.
--
-- Before running this file, store two secrets in Vault (once):
--   select vault.create_secret('https://<project-ref>.supabase.co', 'cos_project_url');
--   select vault.create_secret('<same value as the COS_CRON_SECRET function secret>', 'cos_cron_secret');
-- ═══════════════════════════════════════════════════════════════════════════

create extension if not exists pg_cron;
create extension if not exists pg_net;

do $$
begin
  perform cron.unschedule(jobid) from cron.job where jobname = 'cos-scheduler';
end $$;

select cron.schedule(
  'cos-scheduler',
  '*/5 * * * *',
  $job$
  select net.http_post(
    url     := (select decrypted_secret from vault.decrypted_secrets where name = 'cos_project_url')
               || '/functions/v1/cos-scheduler',
    headers := jsonb_build_object(
                 'Content-Type', 'application/json',
                 'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cos_cron_secret')),
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
