create or replace function public.notification_server_secret(p_name text)
returns text language sql security definer set search_path='' as $$
  select decrypted_secret
  from vault.decrypted_secrets
  where name=p_name
    and p_name in ('notification_vapid_private','notification_cron_secret','resend_api_key')
  limit 1
$$;
revoke execute on function public.notification_server_secret(text) from public,anon,authenticated;
grant execute on function public.notification_server_secret(text) to service_role;