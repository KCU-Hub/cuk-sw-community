-- =====================================================================
-- 0005_posts_rls.sql — Phase 2 RLS for forum tables
-- =====================================================================

-- ---------------------------------------------------------------------
-- posts
-- ---------------------------------------------------------------------
alter table public.posts enable row level security;

drop policy if exists posts_select_public on public.posts;
create policy posts_select_public
  on public.posts
  for select
  using (is_deleted = false);

-- Authors writing to their own posts; notice board restricted to admins
drop policy if exists posts_insert_authed on public.posts;
create policy posts_insert_authed
  on public.posts
  for insert
  to authenticated
  with check (
    auth.uid() = author_id
    and (board_slug <> 'notice' or public.is_admin())
  );

drop policy if exists posts_update_own_or_admin on public.posts;
create policy posts_update_own_or_admin
  on public.posts
  for update
  to authenticated
  using (auth.uid() = author_id or public.is_admin())
  with check (auth.uid() = author_id or public.is_admin());

drop policy if exists posts_delete_own_or_admin on public.posts;
create policy posts_delete_own_or_admin
  on public.posts
  for delete
  to authenticated
  using (auth.uid() = author_id or public.is_admin());

-- ---------------------------------------------------------------------
-- comments
-- ---------------------------------------------------------------------
alter table public.comments enable row level security;

drop policy if exists comments_select_public on public.comments;
create policy comments_select_public
  on public.comments
  for select
  using (true);

drop policy if exists comments_insert_authed on public.comments;
create policy comments_insert_authed
  on public.comments
  for insert
  to authenticated
  with check (auth.uid() = author_id);

drop policy if exists comments_update_own_or_admin on public.comments;
create policy comments_update_own_or_admin
  on public.comments
  for update
  to authenticated
  using (auth.uid() = author_id or public.is_admin())
  with check (auth.uid() = author_id or public.is_admin());

drop policy if exists comments_delete_own_or_admin on public.comments;
create policy comments_delete_own_or_admin
  on public.comments
  for delete
  to authenticated
  using (auth.uid() = author_id or public.is_admin());

-- ---------------------------------------------------------------------
-- post_likes
-- ---------------------------------------------------------------------
alter table public.post_likes enable row level security;

drop policy if exists post_likes_select_all on public.post_likes;
create policy post_likes_select_all
  on public.post_likes
  for select
  using (true);

drop policy if exists post_likes_insert_own on public.post_likes;
create policy post_likes_insert_own
  on public.post_likes
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists post_likes_delete_own on public.post_likes;
create policy post_likes_delete_own
  on public.post_likes
  for delete
  to authenticated
  using (auth.uid() = user_id);
