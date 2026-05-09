create table if not exists public.native_push_tokens (
  token text primary key,
  author_email text not null,
  platform text not null check (platform in ('ios', 'android')),
  user_agent text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists native_push_tokens_author_email_idx on public.native_push_tokens(author_email);
create index if not exists native_push_tokens_platform_idx on public.native_push_tokens(platform);

alter table public.native_push_tokens enable row level security;

drop policy if exists "users can read own native push tokens" on public.native_push_tokens;
drop policy if exists "users can insert own native push tokens" on public.native_push_tokens;
drop policy if exists "users can delete own native push tokens" on public.native_push_tokens;
drop policy if exists "service role can manage native push tokens" on public.native_push_tokens;

create policy "users can read own native push tokens"
on public.native_push_tokens
for select
to authenticated
using (auth.jwt()->>'email' = author_email);

create policy "users can insert own native push tokens"
on public.native_push_tokens
for insert
to authenticated
with check (auth.jwt()->>'email' = author_email);

create policy "users can delete own native push tokens"
on public.native_push_tokens
for delete
to authenticated
using (auth.jwt()->>'email' = author_email);

create policy "service role can manage native push tokens"
on public.native_push_tokens
for all
to service_role
using (true)
with check (true);
