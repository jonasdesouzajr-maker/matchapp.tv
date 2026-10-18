CREATE TABLE IF NOT EXISTS public.jonas_speech_daily_limits (
  bucket text NOT NULL,
  period date NOT NULL,
  used integer NOT NULL DEFAULT 0 CHECK (used >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (bucket, period)
);
ALTER TABLE public.jonas_speech_daily_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.jonas_speech_daily_limits FROM anon, authenticated, public;
GRANT SELECT, INSERT, UPDATE ON public.jonas_speech_daily_limits TO service_role;
CREATE OR REPLACE FUNCTION public.jonas_speech_reserve(p_bucket text, p_limit integer, p_global_limit integer DEFAULT 400)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_day date := (now() at time zone 'UTC')::date;
DECLARE v_bucket_used integer; v_global_used integer;
BEGIN
 IF p_bucket IS NULL OR length(p_bucket)<10 OR length(p_bucket)>120 OR p_limit NOT BETWEEN 1 AND 50 OR p_global_limit NOT BETWEEN 1 AND 1000 THEN
  RETURN false;
 END IF;
 PERFORM pg_advisory_xact_lock(hashtext('jonas_speech_global_quota'));
 INSERT INTO public.jonas_speech_daily_limits (bucket,period,used)
   VALUES ('global',v_day,0) ON CONFLICT DO NOTHING;
 INSERT INTO public.jonas_speech_daily_limits (bucket,period,used)
   VALUES (p_bucket,v_day,0) ON CONFLICT DO NOTHING;
 SELECT used INTO v_global_used FROM public.jonas_speech_daily_limits WHERE bucket='global' AND period=v_day FOR UPDATE;
 SELECT used INTO v_bucket_used FROM public.jonas_speech_daily_limits WHERE bucket=p_bucket AND period=v_day FOR UPDATE;
 IF v_global_used >= p_global_limit OR v_bucket_used >= p_limit THEN RETURN false; END IF;
 UPDATE public.jonas_speech_daily_limits SET used=used+1,updated_at=now()
 WHERE period=v_day AND bucket IN ('global',p_bucket);
 RETURN true;
END;$$;
REVOKE ALL ON FUNCTION public.jonas_speech_reserve(text,integer,integer) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.jonas_speech_reserve(text,integer,integer) TO service_role;