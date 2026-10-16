-- 001_schema.sql
-- Phase 2: types, tables, indexes, triggers, RLS, storage bucket.
-- Design reference: docs/database.md
-- Safe to run more than once. Run in the Supabase SQL editor.

-- ---------------------------------------------------------------------------
-- 1. Extensions
-- ---------------------------------------------------------------------------
create extension if not exists postgis;
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- 2. Types
-- ---------------------------------------------------------------------------
do $$ begin
  create type issue_type as enum ('water_interruption', 'pipe_leak', 'drain_blockage', 'dirty_toilet');
exception when duplicate_object then null; end $$;

do $$ begin
  create type issue_status as enum ('reported', 'verified', 'in_progress', 'resolved', 'rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type user_role as enum ('citizen', 'admin');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- 3. Tables
-- ---------------------------------------------------------------------------
create table if not exists wards (
  id     serial primary key,
  name   text not null unique,
  center geography(Point, 4326) not null
);

create table if not exists profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  full_name  text not null default '',
  role       user_role not null default 'citizen',
  created_at timestamptz not null default now()
);

create table if not exists issues (
  id           uuid primary key default gen_random_uuid(),
  reporter_id  uuid not null references profiles (id),
  type         issue_type not null,
  description  text not null check (char_length(description) between 10 and 500),
  location     geography(Point, 4326) not null,
  address_text text,
  ward_id      int references wards (id),
  photo_path   text,
  status       issue_status not null default 'reported',
  upvote_count int not null default 0 check (upvote_count >= 0),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  resolved_at  timestamptz
);

create table if not exists upvotes (
  issue_id   uuid not null references issues (id) on delete cascade,
  user_id    uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (issue_id, user_id)
);

create table if not exists status_history (
  id         bigserial primary key,
  issue_id   uuid not null references issues (id) on delete cascade,
  old_status issue_status,
  new_status issue_status not null,
  changed_by uuid references profiles (id),
  remark     text check (remark is null or char_length(remark) <= 300),
  changed_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 4. Indexes
-- ---------------------------------------------------------------------------
create index if not exists issues_location_gist     on issues using gist (location);
create index if not exists issues_status_created    on issues (status, created_at desc);
create index if not exists issues_type_created      on issues (type, created_at desc);
create index if not exists issues_ward              on issues (ward_id);
create index if not exists issues_reporter_created  on issues (reporter_id, created_at desc);
create index if not exists status_history_timeline  on status_history (issue_id, changed_at);

-- ---------------------------------------------------------------------------
-- 5. Triggers
-- ---------------------------------------------------------------------------

-- 5.1 New auth user -> profiles row (role citizen). Admin is set manually later.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Users who signed up before this script ran (for example while testing Phase 1).
insert into profiles (id, full_name)
select u.id, coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name', '')
from auth.users u
on conflict (id) do nothing;

-- 5.2 Keep issues.upvote_count in sync with the upvotes table.
create or replace function sync_upvote_count()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    update issues set upvote_count = upvote_count + 1 where id = new.issue_id;
    return new;
  elsif tg_op = 'DELETE' then
    update issues set upvote_count = greatest(upvote_count - 1, 0) where id = old.issue_id;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists upvotes_sync_count on upvotes;
create trigger upvotes_sync_count
  after insert or delete on upvotes
  for each row execute function sync_upvote_count();

-- ---------------------------------------------------------------------------
-- 6. Row level security: enabled everywhere, no public policies.
--    All access goes through the Express API using the service role key.
-- ---------------------------------------------------------------------------
alter table wards          enable row level security;
alter table profiles       enable row level security;
alter table issues         enable row level security;
alter table upvotes        enable row level security;
alter table status_history enable row level security;

-- Defense in depth: the browser roles get no table privileges at all.
revoke all on wards, profiles, issues, upvotes, status_history from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 7. Storage bucket for photos: public read, writes only with the service role.
--    No storage policies are created, so anon and authenticated cannot upload.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('issue-photos', 'issue-photos', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
