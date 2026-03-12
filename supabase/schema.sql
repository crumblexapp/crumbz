create table if not exists public.app_state (
  id text primary key,
  accounts jsonb not null default '[]'::jsonb,
  posts jsonb not null default '[]'::jsonb,
  interactions jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

insert into public.app_state (id)
values ('crumbz-app-state')
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
