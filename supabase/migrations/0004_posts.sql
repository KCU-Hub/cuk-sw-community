-- =====================================================================
-- 0004_posts.sql — Phase 2 forum schema
-- posts, comments, post_likes + denormalized counts + view-count RPC
-- =====================================================================

-- =====================================================================
-- posts
-- =====================================================================

create table if not exists public.posts (
  id            uuid primary key default gen_random_uuid(),
  board_slug    public.board_slug not null references public.boards(slug) on delete restrict,
  author_id     uuid not null references public.profiles(id) on delete cascade,
  title         text not null check (char_length(title) between 1 and 200),
  content       text not null,
  view_count    integer not null default 0,
  like_count    integer not null default 0,
  comment_count integer not null default 0,
  is_pinned     boolean not null default false,
  is_deleted    boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_posts_board_created
  on public.posts(board_slug, created_at desc)
  where is_deleted = false;

create index if not exists idx_posts_author on public.posts(author_id);

drop trigger if exists posts_updated_at on public.posts;
create trigger posts_updated_at
  before update on public.posts
  for each row execute procedure extensions.moddatetime(updated_at);

-- =====================================================================
-- comments (adjacency list — parent_id self-ref for nesting)
-- =====================================================================

create table if not exists public.comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.posts(id) on delete cascade,
  parent_id  uuid references public.comments(id) on delete cascade,
  author_id  uuid not null references public.profiles(id) on delete cascade,
  content    text not null check (char_length(content) between 1 and 2000),
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_comments_post on public.comments(post_id, created_at);
create index if not exists idx_comments_parent on public.comments(parent_id);

drop trigger if exists comments_updated_at on public.comments;
create trigger comments_updated_at
  before update on public.comments
  for each row execute procedure extensions.moddatetime(updated_at);

-- =====================================================================
-- post_likes (composite PK)
-- =====================================================================

create table if not exists public.post_likes (
  post_id    uuid not null references public.posts(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create index if not exists idx_post_likes_user on public.post_likes(user_id);

-- =====================================================================
-- Denormalized count maintenance
-- =====================================================================

-- like_count
create or replace function public.sync_post_like_count()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    update public.posts set like_count = like_count + 1 where id = new.post_id;
  elsif tg_op = 'DELETE' then
    update public.posts set like_count = greatest(like_count - 1, 0) where id = old.post_id;
  end if;
  return null;
end;
$$;

drop trigger if exists post_likes_count on public.post_likes;
create trigger post_likes_count
  after insert or delete on public.post_likes
  for each row execute procedure public.sync_post_like_count();

-- comment_count (excluding soft-deleted)
create or replace function public.sync_post_comment_count()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' and not new.is_deleted then
    update public.posts set comment_count = comment_count + 1 where id = new.post_id;
  elsif tg_op = 'DELETE' and not old.is_deleted then
    update public.posts set comment_count = greatest(comment_count - 1, 0) where id = old.post_id;
  elsif tg_op = 'UPDATE' then
    -- soft delete toggled
    if old.is_deleted = false and new.is_deleted = true then
      update public.posts set comment_count = greatest(comment_count - 1, 0) where id = new.post_id;
    elsif old.is_deleted = true and new.is_deleted = false then
      update public.posts set comment_count = comment_count + 1 where id = new.post_id;
    end if;
  end if;
  return null;
end;
$$;

drop trigger if exists comments_count on public.comments;
create trigger comments_count
  after insert or update or delete on public.comments
  for each row execute procedure public.sync_post_comment_count();

-- =====================================================================
-- View count RPC (allows anon increment without RLS write privilege)
-- =====================================================================

create or replace function public.increment_post_view(p_post_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.posts set view_count = view_count + 1 where id = p_post_id;
$$;

grant execute on function public.increment_post_view(uuid) to anon, authenticated;
