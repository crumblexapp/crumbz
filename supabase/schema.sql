create table if not exists public.app_state (
  id text primary key,
  accounts jsonb not null default '[]'::jsonb,
  posts jsonb not null default '[]'::jsonb,
  interactions jsonb not null default '{}'::jsonb,
  announcements jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.app_state
add column if not exists announcements jsonb not null default '[]'::jsonb;

insert into public.app_state (id)
values ('crumbz-app-state')
on conflict (id) do nothing;

insert into public.app_state (id)
values ('crumbz-accounts-state')
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('crumbz-media', 'crumbz-media', true)
on conflict (id) do nothing;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'public can read crumbz media'
  ) then
    create policy "public can read crumbz media"
    on storage.objects
    for select
    to public
    using (bucket_id = 'crumbz-media');
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'service role manages crumbz media'
  ) then
    create policy "service role manages crumbz media"
    on storage.objects
    for all
    to service_role
    using (bucket_id = 'crumbz-media')
    with check (bucket_id = 'crumbz-media');
  end if;
end $$;

create table if not exists public.places (
  id text primary key,
  name text not null,
  kind text not null default '',
  address text not null default '',
  city text not null default '',
  lat double precision,
  lon double precision,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.place_reviews (
  post_id text primary key,
  place_id text not null references public.places(id) on delete cascade,
  author_email text not null,
  author_name text not null default '',
  caption text not null default '',
  taste_tag text not null default '',
  price_tag text not null default '',
  photo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists place_reviews_place_id_idx on public.place_reviews(place_id);
create index if not exists place_reviews_author_email_idx on public.place_reviews(author_email);
create index if not exists places_city_idx on public.places(city);

create table if not exists public.push_subscriptions (
  endpoint text primary key,
  author_email text not null,
  subscription jsonb not null,
  user_agent text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists push_subscriptions_author_email_idx on public.push_subscriptions(author_email);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================
-- Enable RLS on all tables - this ensures even if someone gets the anon key,
-- they can only access data they're authorized to see.

alter table public.app_state enable row level security;
alter table public.places enable row level security;
alter table public.place_reviews enable row level security;
alter table public.push_subscriptions enable row level security;

-- app_state: Read-only for authenticated users
-- This table contains ALL app data (accounts, posts, interactions)
-- Read access is handled via API routes, not direct table access
create policy "authenticated users can read app_state"
on public.app_state
for select
to authenticated
using (true);

-- app_state: No direct writes from clients
-- All writes must go through API routes with proper auth/validation
-- Service role can still write (used by server-side code)
create policy "service role can write app_state"
on public.app_state
for all
to service_role
using (true)
with check (true);

-- places: Read-only for everyone (public food spot data)
create policy "anyone can read places"
on public.places
for select
to authenticated, anon
using (true);

-- places: Only service role can write (synced from posts via API)
create policy "service role can write places"
on public.places
for all
to service_role
using (true)
with check (true);

-- place_reviews: Read-only for everyone
create policy "anyone can read place_reviews"
on public.place_reviews
for select
to authenticated, anon
using (true);

-- place_reviews: Only service role can write (synced from posts via API)
create policy "service role can write place_reviews"
on public.place_reviews
for all
to service_role
using (true)
with check (true);

-- push_subscriptions: Users can only read their own subscriptions
create policy "users can read own push subscriptions"
on public.push_subscriptions
for select
to authenticated
using (auth.jwt()->>'email' = author_email);

-- push_subscriptions: Users can insert their own subscriptions
create policy "users can insert own push subscriptions"
on public.push_subscriptions
for insert
to authenticated
with check (auth.jwt()->>'email' = author_email);

-- push_subscriptions: Users can delete their own subscriptions
create policy "users can delete own push subscriptions"
on public.push_subscriptions
for delete
to authenticated
using (auth.jwt()->>'email' = author_email);

-- push_subscriptions: Service role has full access
create policy "service role can manage push subscriptions"
on public.push_subscriptions
for all
to service_role
using (true)
with check (true);

-- =====================================================
-- RATE LIMITING TABLE
-- =====================================================

create table if not exists public.rate_limits (
  id uuid primary key default gen_random_uuid(),
  user_email text not null,
  action_type text not null,
  created_at timestamptz not null default now()
);

create index if not exists rate_limits_email_idx on public.rate_limits(user_email);
create index if not exists rate_limits_type_idx on public.rate_limits(action_type);
create index if not exists rate_limits_created_at_idx on public.rate_limits(created_at);

-- Rate limits: Users can only read their own rate limit data
create policy "users can read own rate limits"
on public.rate_limits
for select
to authenticated
using (auth.jwt()->>'email' = user_email);

-- Rate limits: Only service role can insert (done via API)
create policy "service role can insert rate limits"
on public.rate_limits
for insert
to service_role
with check (true);

-- Rate limits: Only service role can delete (cleanup)
create policy "service role can delete rate limits"
on public.rate_limits
for delete
to service_role
using (true);
