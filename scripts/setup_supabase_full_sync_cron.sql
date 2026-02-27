-- Supabase scheduled full sync for BLW Dashboard.
-- Run this in Supabase SQL Editor after replacing placeholders.
--
-- Required replacements:
-- 1) https://YOUR_APP_DOMAIN -> your deployed app URL (no trailing slash)
-- 2) YOUR_SYNC_CRON_TOKEN   -> optional shared token if you add auth on /api/sync/full

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

do $$
declare
  existing_job_id bigint;
begin
  select jobid
  into existing_job_id
  from cron.job
  where jobname = 'blw-full-sync-6h'
  limit 1;

  if existing_job_id is not null then
    perform cron.unschedule(existing_job_id);
  end if;
end $$;

-- Every 6 hours at minute 5.
select cron.schedule(
  'blw-full-sync-6h',
  '5 */6 * * *',
  $$
  select net.http_post(
    url := 'https://blwdashboard.vercel.app/api/sync/full',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer YOUR_SYNC_CRON_TOKEN'
    ),
    body := '{"trigger":"supabase_cron"}'::jsonb
  );
  $$
);

-- Optional daily schedule instead of 6-hourly:
-- select cron.schedule(
--   'blw-full-sync-daily',
--   '15 2 * * *',
--   $$
--   select net.http_post(
--     url := 'https://YOUR_APP_DOMAIN/api/sync/full',
--     headers := jsonb_build_object(
--       'Content-Type', 'application/json',
--       'Authorization', 'Bearer YOUR_SYNC_CRON_TOKEN'
--     ),
--     body := '{"trigger":"supabase_cron_daily"}'::jsonb
--   );
--   $$
-- );

-- Verify schedule:
-- select jobid, jobname, schedule, active from cron.job order by jobid desc;
