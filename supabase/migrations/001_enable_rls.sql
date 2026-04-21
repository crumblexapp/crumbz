-- =====================================================
-- ROW LEVEL SECURITY (RLS) MIGRATION
-- Run this in Supabase SQL Editor to enable RLS policies
-- =====================================================

-- Enable RLS on all tables
alter table public.app_state enable row level security;
alter table public.places enable row level security;
alter table public.place_reviews enable row level security;
alter table public.push_subscriptions enable row level security;

-- Drop any existing policies to avoid conflicts
drop policy if exists "authenticated users can read app_state" on public.app_state;
drop policy if exists "service role can write app_state" on public.app_state;
drop policy if exists "anyone can read places" on public.places;
drop policy if exists "service role can write places" on public.places;
drop policy if exists "anyone can read place_reviews" on public.place_reviews;
drop policy if exists "service role can write place_reviews" on public.place_reviews;
drop policy if exists "users can read own push subscriptions" on public.push_subscriptions;
drop policy if exists "users can insert own push subscriptions" on public.push_subscriptions;
drop policy if exists "users can delete own push subscriptions" on public.push_subscriptions;
drop policy if exists "service role can manage push subscriptions" on public.push_subscriptions;

-- app_state: Read-only for authenticated users
create policy "authenticated users can read app_state"
on public.app_state
for select
to authenticated
using (true);

-- app_state: Only service role can write
create policy "service role can write app_state"
on public.app_state
for all
to service_role
using (true)
with check (true);

-- places: Read-only for everyone
create policy "anyone can read places"
on public.places
for select
to authenticated, anon
using (true);

-- places: Only service role can write
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

-- place_reviews: Only service role can write
create policy "service role can write place_reviews"
on public.place_reviews
for all
to service_role
using (true)
with check (true);

-- push_subscriptions: Users can only manage their own subscriptions
create policy "users can read own push subscriptions"
on public.push_subscriptions
for select
to authenticated
using (auth.jwt()->>'email' = author_email);

create policy "users can insert own push subscriptions"
on public.push_subscriptions
for insert
to authenticated
with check (auth.jwt()->>'email' = author_email);

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
