-- =====================================================================
-- 0021_public_table_grants.sql
--   PostgREST needs both table privileges and RLS policies. Earlier
--   migrations defined the RLS surface but left most table grants absent,
--   which made anonymous/public routes fail with SQLSTATE 42501.
--
--   Keep profile system columns protected: public profile reads remain
--   column-scoped, and current-user/admin-only profile data stays behind
--   security-definer RPCs from 0020.
-- =====================================================================

-- Public catalogue/content reads. RLS still decides which rows are visible.
grant select on
  public.boards,
  public.courses,
  public.tags,
  public.posts,
  public.comments,
  public.blog_series,
  public.blog_posts,
  public.blog_post_tags,
  public.post_courses,
  public.blog_post_courses,
  public.course_materials
to anon, authenticated;

grant select on public.post_likes to authenticated;

-- Public profile columns only; do not grant table-wide profile SELECT.
grant select (
  id,
  username,
  display_name,
  avatar_url,
  bio,
  created_at,
  updated_at
) on public.profiles to anon, authenticated;

-- Authenticated writes. Each table already has RLS policies constraining
-- ownership, admin-only operations, banned users, and soft-delete rules.
grant insert, update, delete on
  public.boards,
  public.courses,
  public.tags
to authenticated;

grant insert, update on
  public.posts,
  public.comments,
  public.blog_series,
  public.blog_posts,
  public.course_materials
to authenticated;

grant insert, delete on public.post_likes to authenticated;

grant select, insert, update, delete on public.user_courses to authenticated;

-- Admin/audit and rate-limit tables are not public content. They still need
-- authenticated table privileges so their RLS policies and app actions can run.
grant select, insert on public.audit_logs to authenticated;
grant select, insert on public.rate_limit_events to authenticated;

-- The app only needs `post_likes` reads to collapse the current viewer's own
-- like row into `liked_by_me`. Public like totals live on `posts.like_count`.
drop policy if exists post_likes_select_visible_posts on public.post_likes;
create policy post_likes_select_own_visible_post
  on public.post_likes
  for select
  to authenticated
  using (
    auth.uid() = user_id
    and exists (
      select 1
      from public.posts p
      where p.id = post_id
        and (
          p.is_deleted = false
          or p.author_id = auth.uid()
          or public.is_admin()
        )
    )
  );
