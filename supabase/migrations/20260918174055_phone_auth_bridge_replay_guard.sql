
create schema if not exists match_private;

create table if not exists match_private.phone_auth_proofs (
  proof_hash text primary key,
  phone_hash text not null,
  used_at timestamptz not null default now()
);

revoke all on table match_private.phone_auth_proofs from anon, authenticated;

create index if not exists phone_auth_proofs_used_at_idx
  on match_private.phone_auth_proofs(used_at);
