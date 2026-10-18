create or replace function public.save_portfolio(
  p_saved_list jsonb,
  p_seen_list jsonb,
  p_disliked_list jsonb,
  p_user_ratings jsonb
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if jsonb_typeof(coalesce(p_saved_list,'[]'::jsonb)) <> 'array'
     or jsonb_typeof(coalesce(p_seen_list,'[]'::jsonb)) <> 'array'
     or jsonb_typeof(coalesce(p_disliked_list,'[]'::jsonb)) <> 'array'
     or jsonb_typeof(coalesce(p_user_ratings,'{}'::jsonb)) <> 'object'
  then raise exception 'invalid_portfolio_payload'; end if;

  insert into public.profiles(id,saved_list,seen_list,disliked_list,user_ratings)
  values(v_uid,coalesce(p_saved_list,'[]'::jsonb),coalesce(p_seen_list,'[]'::jsonb),coalesce(p_disliked_list,'[]'::jsonb),coalesce(p_user_ratings,'{}'::jsonb))
  on conflict(id) do update set
    saved_list=excluded.saved_list,
    seen_list=excluded.seen_list,
    disliked_list=excluded.disliked_list,
    user_ratings=excluded.user_ratings;
end;
$$;
revoke all on function public.save_portfolio(jsonb,jsonb,jsonb,jsonb) from public, anon;
grant execute on function public.save_portfolio(jsonb,jsonb,jsonb,jsonb) to authenticated;