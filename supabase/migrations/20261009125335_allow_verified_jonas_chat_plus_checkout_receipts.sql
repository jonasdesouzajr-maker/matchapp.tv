-- Applied to production Supabase on 20261009125335; source-controlled for reproducibility.
alter table match_private.billing_receipts drop constraint if exists billing_receipts_plan_check;
alter table match_private.billing_receipts
 add constraint billing_receipts_plan_check check(plan in (
 'ad_free','vip_monthly','vip_annual','business',
 'credits_25','credits_75','credits_200','credits_500',
 'matches_5','matches_25','matches_50',
 'kids_matches_5','kids_matches_25','kids_matches_50',
 'kids_credits_25','kids_credits_75','kids_credits_200',
 'jonas_chat_monthly'
 ));
