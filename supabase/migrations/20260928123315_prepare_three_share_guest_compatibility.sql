alter table match_private.guest_social_proofs drop constraint guest_social_proofs_kind_check;
alter table match_private.guest_social_proofs add constraint guest_social_proofs_kind_check check (kind in ('match','ask_ai','watch_match'));
grant execute on function public.claim_share_reward() to authenticated;
notify pgrst,'reload schema';