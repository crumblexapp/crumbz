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
