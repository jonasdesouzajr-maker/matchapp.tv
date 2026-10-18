create or replace function public.daily_match_checkin()
returns jsonb language plpgsql security definer set search_path='public'
as $$
declare v_uid uuid:=auth.uid(); v public.daily_match_checkins%rowtype; v_new int; v_reward boolean:=false; v_balance int;
begin
 if v_uid is null then return jsonb_build_object('ok',false,'reason','not_authenticated'); end if;
 insert into public.daily_match_checkins(user_id) values(v_uid) on conflict(user_id) do nothing;
 select * into v from public.daily_match_checkins where user_id=v_uid for update;
 if v.last_checkin=current_date then
   select coalesce(purchased_matches,0) into v_balance from public.profiles where id=v_uid;
   return jsonb_build_object('ok',true,'already_checked',true,'streak',v.streak,'rewarded',false,'matches',coalesce(v_balance,0));
 end if;
 v_new:=case when v.last_checkin=current_date-1 then (case when v.streak>=7 then 1 else v.streak+1 end) else 1 end;
 if v_new=7 then
   insert into public.profiles(id,purchased_matches) values(v_uid,5)
   on conflict(id) do update set purchased_matches=coalesce(public.profiles.purchased_matches,0)+5;
   select purchased_matches into v_balance from public.profiles where id=v_uid;
   insert into public.match_pack_ledger(user_id,delta,balance,pack) values(v_uid,5,v_balance,'weekly_checkin');
   v_reward:=true;
 end if;
 update public.daily_match_checkins set streak=v_new,last_checkin=current_date,total_checkins=total_checkins+1,
   completed_weeks=completed_weeks+(case when v_reward then 1 else 0 end),updated_at=now() where user_id=v_uid;
 return jsonb_build_object('ok',true,'already_checked',false,'streak',v_new,'rewarded',v_reward,'matches',coalesce(v_balance,(select coalesce(purchased_matches,0) from public.profiles where id=v_uid)));
end $$;