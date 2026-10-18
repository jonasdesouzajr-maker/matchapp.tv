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