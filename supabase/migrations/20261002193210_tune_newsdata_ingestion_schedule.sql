do $$
begin
  if exists (select 1 from cron.job where jobname='matchapp-news-breaking-30s') then
    perform cron.unschedule('matchapp-news-breaking-30s');
  end if;
  if exists (select 1 from cron.job where jobname='matchapp-news-general-5m') then
    perform cron.unschedule('matchapp-news-general-5m');
  end if;
  if exists (select 1 from cron.job where jobname='matchapp-news-breaking-30m') then
    perform cron.unschedule('matchapp-news-breaking-30m');
  end if;
  if exists (select 1 from cron.job where jobname='matchapp-news-general-15m') then
    perform cron.unschedule('matchapp-news-general-15m');
  end if;
end $$;

select cron.schedule(
  'matchapp-news-breaking-30m',
  '*/30 * * * *',
  $$select net.http_post(
      url:='https://zkymvqrmbabngsqblyye.supabase.co/functions/v1/news-ingest',
      headers:=jsonb_build_object(
        'Content-Type','application/json',
        'x-matchapp-scheduler-token',(select token from public.news_scheduler_auth where id=1)
      ),
      body:='{"mode":"breaking"}'::jsonb,
      timeout_milliseconds:=20000
    );$$
);

select cron.schedule(
  'matchapp-news-general-15m',
  '*/15 * * * *',
  $$select net.http_post(
      url:='https://zkymvqrmbabngsqblyye.supabase.co/functions/v1/news-ingest',
      headers:=jsonb_build_object(
        'Content-Type','application/json',
        'x-matchapp-scheduler-token',(select token from public.news_scheduler_auth where id=1)
      ),
      body:='{"mode":"general"}'::jsonb,
      timeout_milliseconds:=20000
    );$$
);