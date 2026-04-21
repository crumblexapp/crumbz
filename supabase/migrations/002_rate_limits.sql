-- =====================================================
-- RATE LIMITING TABLE MIGRATION
-- Run this in Supabase SQL Editor
-- =====================================================

-- Create rate limits table
create table if not exists public.rate_limits (
  id uuid primary key default gen_random_uuid(),
  user_email text not null,
  action_type text not null,
  created_at timestamptz not null default now()
);

-- Enable RLS
alter table public.rate_limits enable row level security;

-- Drop existing policies if any
drop policy if exists "users can read own rate limits" on public.rate_limits;
drop policy if exists "service role can insert rate limits" on public.rate_limits;
drop policy if exists "service role can delete rate limits" on public.rate_limits;

-- Indexes for fast lookups
create index if not exists rate_limits_email_idx on public.rate_limits(user_email);
create index if not exists rate_limits_type_idx on public.rate_limits(action_type);
create index if not exists rate_limits_created_at_idx on public.rate_limits(created_at);

-- Users can only read their own rate limit data
create policy "users can read own rate limits"
on public.rate_limits
for select
to authenticated
using (auth.jwt()->>'email' = user_email);

-- Only service role can insert (done via API)
create policy "service role can insert rate limits"
on public.rate_limits
for insert
to service_role
with check (true);

-- Only service role can delete (cleanup)
create policy "service role can delete rate limits"
on public.rate_limits
for delete
to service_role
using (true);
