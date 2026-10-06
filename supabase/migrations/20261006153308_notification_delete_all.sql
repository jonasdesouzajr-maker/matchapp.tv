create or replace function public.notifications_delete_all()
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
declare
  uid uuid:=auth.uid();
  deleted_count integer:=0;
begin
  if uid is null or not exists(
    select 1 from auth.users where id=uid and coalesce(is_anonymous,false)=false
  ) then
    raise exception 'Registered sign in required';
  end if;

  delete from match_private.user_notifications
  where user_id=uid;

  get diagnostics deleted_count = row_count;
  return jsonb_build_object('deleted',deleted_count);
end
$$;

revoke all on function public.notifications_delete_all() from public, anon;
grant execute on function public.notifications_delete_all() to authenticated;
