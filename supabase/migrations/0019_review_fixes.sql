-- =====================================================================
-- 0019_review_fixes.sql
--   1. Keep denormalized post counters correct under RLS.
--   2. Hide draft/deleted blog course/tag links from public SELECT.
--   3. Hide deleted forum post course links from public SELECT.
-- =====================================================================

create or replace function public.sync_post_like_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform set_config('app.system_update', 'true', true);

  if tg_op = 'INSERT' then
    update public.posts set like_count = like_count + 1 where id = new.post_id;
  elsif tg_op = 'DELETE' then
    update public.posts set like_count = greatest(like_count - 1, 0) where id = old.post_id;
  end if;

  return null;
end;
$$;

create or replace function public.sync_post_comment_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform set_config('app.system_update', 'true', true);

  if tg_op = 'INSERT' and not new.is_deleted then
    update public.posts set comment_count = comment_count + 1 where id = new.post_id;
  elsif tg_op = 'DELETE' and not old.is_deleted then
    update public.posts set comment_count = greatest(comment_count - 1, 0) where id = old.post_id;
  elsif tg_op = 'UPDATE' then
    if old.is_deleted = false and new.is_deleted = true then
      update public.posts set comment_count = greatest(comment_count - 1, 0) where id = new.post_id;
    elsif old.is_deleted = true and new.is_deleted = false then
      update public.posts set comment_count = comment_count + 1 where id = new.post_id;
    end if;
  end if;

  return null;
end;
$$;

drop policy if exists post_courses_select_public on public.post_courses;
create policy post_courses_select_public
  on public.post_courses
  for select
  using (
    exists (
      select 1 from public.posts p
      where p.id = post_id
        and (
          p.is_deleted = false
          or p.author_id = auth.uid()
          or public.is_admin()
        )
    )
  );

drop policy if exists blog_post_courses_select_public on public.blog_post_courses;
create policy blog_post_courses_select_public
  on public.blog_post_courses
  for select
  using (
    exists (
      select 1 from public.blog_posts p
      where p.id = post_id
        and (
          (p.is_published = true and p.is_deleted = false)
          or p.author_id = auth.uid()
          or public.is_admin()
        )
    )
  );

drop policy if exists blog_post_tags_select_public on public.blog_post_tags;
create policy blog_post_tags_select_public
  on public.blog_post_tags
  for select
  using (
    exists (
      select 1 from public.blog_posts p
      where p.id = post_id
        and (
          (p.is_published = true and p.is_deleted = false)
          or p.author_id = auth.uid()
          or public.is_admin()
        )
    )
  );
