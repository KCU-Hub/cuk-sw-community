-- =====================================================================
-- 0006_visibility_and_depth.sql
--   1. Allow authors / admins to read their own soft-deleted posts.
--   2. Enforce comment reply depth cap (3) at the database level so that
--      direct API callers cannot bypass the client-side guard in
--      src/components/board/comment-tree.tsx.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. posts SELECT visibility
-- ---------------------------------------------------------------------

drop policy if exists posts_select_public on public.posts;
create policy posts_select_public
  on public.posts
  for select
  using (
    is_deleted = false
    or auth.uid() = author_id
    or public.is_admin()
  );

-- list pages still need to filter `is_deleted = false` explicitly in
-- src/lib/db/posts.ts (getPostsByBoard already does this) so the author's
-- own deleted posts only surface on the detail / restore path.

-- ---------------------------------------------------------------------
-- 2. comments depth cap
-- ---------------------------------------------------------------------

-- Walks the parent chain of a comment and returns its depth (root = 0).
-- Stops walking after 8 hops to keep the worst case bounded; deeper than
-- that is already invalid by the cap below.
create or replace function public.comment_depth(p_comment_id uuid)
returns integer
language plpgsql
stable
as $$
declare
  d integer := 0;
  current_id uuid := p_comment_id;
  parent uuid;
begin
  for i in 1..8 loop
    select parent_id into parent
    from public.comments
    where id = current_id;
    if parent is null then
      return d;
    end if;
    d := d + 1;
    current_id := parent;
  end loop;
  return d;
end;
$$;

create or replace function public.enforce_comment_depth_cap()
returns trigger
language plpgsql
as $$
declare
  parent_depth integer;
begin
  if new.parent_id is null then
    return new;
  end if;
  -- New comment will sit at parent_depth + 1; cap (matching
  -- COMMENT_REPLY_DEPTH_CAP = 3 in src/lib/constants.ts) means parent_depth
  -- itself must be < 3.
  parent_depth := public.comment_depth(new.parent_id);
  if parent_depth >= 3 then
    raise exception 'comment reply depth exceeds cap (3)' using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists comments_depth_cap on public.comments;
create trigger comments_depth_cap
  before insert on public.comments
  for each row execute procedure public.enforce_comment_depth_cap();
