-- Content reports for App Store moderation requirements.

create table if not exists public.content_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_email text not null,
  target_type text not null check (target_type in ('post', 'comment')),
  target_id text not null,
  post_id text not null,
  target_author_email text not null default '',
  target_author_name text not null default '',
  reason text not null,
  details text not null default '',
  content_preview text not null default '',
  status text not null default 'open' check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists content_reports_reporter_email_idx on public.content_reports(reporter_email);
create index if not exists content_reports_target_idx on public.content_reports(target_type, target_id);
create index if not exists content_reports_post_id_idx on public.content_reports(post_id);
create index if not exists content_reports_status_idx on public.content_reports(status);
create index if not exists content_reports_created_at_idx on public.content_reports(created_at desc);

alter table public.content_reports enable row level security;

drop policy if exists "users can insert own content reports" on public.content_reports;
create policy "users can insert own content reports"
on public.content_reports
for insert
to authenticated
with check (auth.jwt()->>'email' = reporter_email);

drop policy if exists "service role can manage content reports" on public.content_reports;
create policy "service role can manage content reports"
on public.content_reports
for all
to service_role
using (true)
with check (true);
