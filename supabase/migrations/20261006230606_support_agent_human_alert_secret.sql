create or replace function public.support_server_secret(p_name text)
returns text
language sql
security definer
set search_path = ''
as $$
  select decrypted_secret
  from vault.decrypted_secrets
  where name=p_name
    and p_name in (
      'resend_api_key',
      'resend_support_webhook_secret',
      'support_human_email',
      'whatsapp_support_access_token',
      'whatsapp_support_app_secret',
      'whatsapp_support_verify_token',
      'whatsapp_support_phone_number_id'
    )
  limit 1
$$;
revoke all on function public.support_server_secret(text) from public, anon, authenticated;
grant execute on function public.support_server_secret(text) to service_role;
