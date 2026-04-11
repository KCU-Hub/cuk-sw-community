-- =====================================================================
-- 0001_init.sql — Phase 1 schema
-- profiles, boards, courses, tags + auth bootstrap helpers
-- =====================================================================

-- Extensions
create extension if not exists pgcrypto;
create extension if not exists moddatetime schema extensions;

-- =====================================================================
-- Enums
-- =====================================================================

do $$ begin
  create type public.user_role as enum ('user', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.board_slug as enum ('free', 'qna', 'notice');
exception when duplicate_object then null; end $$;

-- =====================================================================
-- profiles
-- =====================================================================

create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  username     text unique not null
                 check (char_length(username) between 2 and 30),
  display_name text,
  avatar_url   text,
  bio          text,
  role         public.user_role not null default 'user',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists idx_profiles_role on public.profiles(role);

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure extensions.moddatetime(updated_at);

-- Auto-create a profile row when a new auth.users row appears.
-- The username is derived from the email prefix + a random suffix to avoid
-- collisions on small instances.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  default_username text;
  default_display_name text;
begin
  default_username := coalesce(
    new.raw_user_meta_data ->> 'username',
    split_part(coalesce(new.email, 'user'), '@', 1)
      || '_'
      || substr(replace(new.id::text, '-', ''), 1, 4)
  );
  default_display_name := coalesce(
    new.raw_user_meta_data ->> 'display_name',
    new.raw_user_meta_data ->> 'name',
    default_username
  );

  begin
    insert into public.profiles (id, username, display_name)
    values (new.id, default_username, default_display_name);
  exception when unique_violation then
    -- Retry once with extra random suffix on username collision
    insert into public.profiles (id, username, display_name)
    values (
      new.id,
      default_username || '_' || substr(md5(random()::text), 1, 4),
      default_display_name
    );
  end;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Helper used by RLS policies in 0002_rls.sql
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- =====================================================================
-- boards (forum categories)
-- =====================================================================

create table if not exists public.boards (
  slug        public.board_slug primary key,
  name        text not null,
  description text,
  sort_order  smallint not null default 0
);

-- =====================================================================
-- courses
-- =====================================================================

create table if not exists public.courses (
  slug          text primary key check (slug ~ '^[a-z0-9-]+$'),
  name          text not null,
  code          text,
  description   text,
  semester_hint text,
  sort_order    smallint not null default 0
);

-- =====================================================================
-- tags (for blog posts in Phase 3)
-- =====================================================================

create table if not exists public.tags (
  slug text primary key check (slug ~ '^[a-z0-9-]+$'),
  name text not null
);
