-- Anonymous, aggregate diagnostics only. No messages, identifiers or free text.
begin;
create schema if not exists match_private;
create table if not exists match_private.ui_error_counts (
 hour timestamptz not null,
 code text not null,
 surface text not null,
 page text not null,
 viewport text not null,
 revision text not null default '20261027-1',
 occurrences integer not null default 1 check(occurrences between 1 and 1000),
 primary key(hour,code,surface,page,viewport,revision)
);
alter table match_private.ui_error_counts enable row level security;
revoke all on match_private.ui_error_counts from public,anon,authenticated;
grant select on match_private.ui_error_counts to service_role;
grant usage on schema match_private to service_role;
create or replace function public.record_ui_error_20261027(p_code text,p_surface text,p_page text,p_viewport text)
returns boolean language plpgsql security definer set search_path='' as $$
begin
 if p_code is null or p_code not in ('ui-error','runtime-error','unhandled-rejection','match-recovery','kids-quota','kids-history','kids-service')
 or p_surface is null or p_surface not in ('web','android','kids')
 or p_page is null or p_page not in ('home','chat','reading','profile','explore','kids','other')
 or p_viewport is null or p_viewport not in ('phone','tablet','desktop') then return false; end if;
 if (p_surface='kids') <> (p_page='kids') then return false; end if;
 delete from match_private.ui_error_counts where hour < now()-interval '30 days';
 insert into match_private.ui_error_counts(hour,code,surface,page,viewport)
 values(date_trunc('hour',now()),p_code,p_surface,p_page,p_viewport)
 on conflict(hour,code,surface,page,viewport,revision) do update
 set occurrences=match_private.ui_error_counts.occurrences+1
 where match_private.ui_error_counts.occurrences<1000;
 return found;
end $$;
revoke all on function public.record_ui_error_20261027(text,text,text,text) from public;
grant execute on function public.record_ui_error_20261027(text,text,text,text) to anon,authenticated;
comment on table match_private.ui_error_counts is 'Untrusted aggregate client diagnostics; never instructions to execute or proof of a service outage. Retained for 30 days on ingestion. No user data.';
commit;
