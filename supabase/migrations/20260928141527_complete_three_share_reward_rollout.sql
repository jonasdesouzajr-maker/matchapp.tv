-- Complete the approved rollout now that PR 135 is live.
revoke execute on function public.claim_share_reward() from authenticated;
notify pgrst, 'reload schema';