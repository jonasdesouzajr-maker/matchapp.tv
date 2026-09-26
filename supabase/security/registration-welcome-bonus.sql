-- One-time, additive registration welcome offer.
-- Launch date permits same-day signups; pre-existing accounts are not eligible.
-- Included 3/5/10/50 shared daily quota stays unchanged. Extra Matches and
-- Ask AI credits are distinct balances, redeemed after included actions.
--
-- Client-side guest exhaustion is DISPLAY ONLY. It is easily reset and must
-- never be trusted as an entitlement. All newly verified eligible accounts
-- receive this same one-time grant regardless of signup method or device.

CREATE UNIQUE INDEX IF NOT EXISTS credit_ledger_registration_bonus_2026_once
  ON public.credit_ledger (user_id)
  WHERE reason = 'registration_welcome_bonus_2026';

CREATE OR REPLACE FUNCTION public.claim_registration_welcome_bonus()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_created timestamptz;
  v_verified boolean;
  v_anonymous boolean;
  v_matches integer;
  v_ai integer;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok',false,'reason','not_authenticated');
  END IF;

  -- All authorization decisions use server-owned Auth records, not
  -- user_metadata or a forged browser flag.
  SELECT u.created_at,
         u.email_confirmed_at IS NOT NULL OR u.phone_confirmed_at IS NOT NULL,
         COALESCE(u.is_anonymous,false)
    INTO v_created, v_verified, v_anonymous
    FROM auth.users AS u
   WHERE u.id = v_uid;

  IF NOT FOUND OR v_anonymous OR v_created < TIMESTAMPTZ '2026-09-26 00:00:00+00' THEN
    RETURN jsonb_build_object('ok',true,'granted',false,'reason','not_eligible');
  END IF;
  IF NOT v_verified THEN
    RETURN jsonb_build_object('ok',true,'granted',false,'reason','verification_required');
  END IF;

  INSERT INTO public.profiles (id)
    VALUES (v_uid) ON CONFLICT (id) DO NOTHING;
  -- Serialize concurrent calls from tabs / devices using the account row.
  PERFORM 1 FROM public.profiles WHERE id = v_uid FOR UPDATE;

  IF EXISTS (
    SELECT 1 FROM public.credit_ledger
    WHERE user_id = v_uid AND reason = 'registration_welcome_bonus_2026'
  ) THEN
    SELECT COALESCE(p.purchased_matches,0), COALESCE(p.credits,0)
      INTO v_matches,v_ai FROM public.profiles p WHERE p.id = v_uid;
    RETURN jsonb_build_object('ok',true,'granted',false,'reason','already_claimed',
                              'purchased_matches',v_matches,'credits',v_ai);
  END IF;

  UPDATE public.profiles
     SET purchased_matches = COALESCE(purchased_matches,0) + 10,
         credits = COALESCE(credits,0) + 10
   WHERE id = v_uid
   RETURNING purchased_matches,credits INTO v_matches,v_ai;

  -- Both ledgers + balances commit together, or none do. An additional
  -- partial unique index prevents accidental duplicate grants.
  INSERT INTO public.credit_ledger(user_id,delta,balance,reason,pack)
    VALUES(v_uid,10,v_ai,'registration_welcome_bonus_2026','new_member_welcome');
  INSERT INTO public.match_pack_ledger(user_id,delta,balance,pack)
    VALUES(v_uid,10,v_matches,'registration_welcome_bonus_2026');

  RETURN jsonb_build_object('ok',true,'granted',true,'extra_matches',10,
                            'ask_ai_credits',10,'purchased_matches',v_matches,
                            'credits',v_ai);
END;
$$;

-- This intentionally exposed, narrow RPC accepts NO user id or amount.
-- It acts only on the verified caller and is safe to retry.
REVOKE ALL ON FUNCTION public.claim_registration_welcome_bonus() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_registration_welcome_bonus() TO authenticated;
