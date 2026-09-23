-- Fix: portfolio_action('list') crashed for signed-in users with legacy
-- exclusion keys: "invalid regular expression: invalid repetition count(s)".
-- Postgres caps a regex repetition bound at 255, so '{1,300}' can never
-- compile. The failure broke loading a signed-in user's match history
-- (seen / saved / disliked titles) on Home and in Kids Mode.
--
-- Same rule as before (letters and digits only, at most 300 characters),
-- written so the regex compiles. Only that one condition changes; the rest of
-- match_private.portfolio_impl is re-created exactly as it is deployed.
-- Idempotent: does nothing if the old pattern is no longer present.
do $migration$
declare
  def text := pg_get_functiondef('match_private.portfolio_impl(text,jsonb)'::regprocedure);
  old_cond constant text := $c$t ~ '^[[:alnum:]]{1,300}$'$c$;
  new_cond constant text := $c$t ~ '^[[:alnum:]]+$' and char_length(t) <= 300$c$;
begin
  if position(old_cond in def) > 0 then
    execute replace(def, old_cond, new_cond);
  end if;
end
$migration$;
