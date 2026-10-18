
select cron.schedule(
  'matchapp-notification-worker-hourly',
  '17 * * * *',
  $job$
  select net.http_post(
    url:='https://zkymvqrmbabngsqblyye.supabase.co/functions/v1/notification-worker',
    headers:=jsonb_build_object(
      'Content-Type','application/json',
      'x-matchapp-cron',(select decrypted_secret from vault.decrypted_secrets where name='notification_cron_secret')
    ),
    body:='{}'::jsonb,
    timeout_milliseconds:=30000
  );
  $job$
);
