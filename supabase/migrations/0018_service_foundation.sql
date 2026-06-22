-- =====================================================================
-- 0018_service_foundation.sql
--   Full-service foundation:
--     1) lock profile/admin-owned fields behind RPC
--     2) protect system-maintained forum/blog fields
--     3) enforce comment and blog cross-row integrity
--     4) connect posts/blog posts to courses
--     5) add Q&A solved state
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) profiles: users may edit public profile fields only.
--    Admin ban/unban moves to security-definer RPCs so role/ban columns are
--    never writable through the owner profile policy.
-- ---------------------------------------------------------------------

create or replace function public.protect_profile_system_fields()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.role() = 'service_role' or public.is_admin() then
    return new;
  end if;

  if new.role is distinct from old.role
    or new.is_banned is distinct from old.is_banned
    or new.banned_until is distinct from old.banned_until
    or new.ban_reason is distinct from old.ban_reason then
    raise exception 'profile system fields are admin-only' using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_protect_system_fields on public.profiles;
create trigger profiles_protect_system_fields
  before update on public.profiles
  for each row execute procedure public.protect_profile_system_fields();

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

revoke update on public.profiles from authenticated;
grant update (username, display_name, avatar_url, bio)
  on public.profiles to authenticated;

create or replace function public.admin_set_user_ban(
  p_target_user_id uuid,
  p_duration text,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_id uuid := auth.uid();
  v_duration text := coalesce(p_duration, 'permanent');
  v_reason text := nullif(left(trim(coalesce(p_reason, '')), 500), '');
  v_banned_until timestamptz;
begin
  if v_admin_id is null or not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;

  if p_target_user_id = v_admin_id then
    raise exception 'cannot ban yourself' using errcode = '23514';
  end if;

  if v_duration = 'permanent' then
    v_banned_until := null;
  elsif v_duration = '1d' then
    v_banned_until := now() + interval '1 day';
  elsif v_duration = '7d' then
    v_banned_until := now() + interval '7 days';
  elsif v_duration = '30d' then
    v_banned_until := now() + interval '30 days';
  else
    raise exception 'invalid ban duration' using errcode = '22023';
  end if;

  update public.profiles
    set is_banned = (v_duration = 'permanent'),
        banned_until = v_banned_until,
        ban_reason = v_reason
    where id = p_target_user_id;

  if not found then
    raise exception 'target user not found' using errcode = 'P0002';
  end if;

  insert into public.audit_logs (
    admin_id,
    target_user_id,
    action,
    reason,
    metadata
  )
  values (
    v_admin_id,
    p_target_user_id,
    'user_ban',
    v_reason,
    jsonb_build_object('duration', v_duration, 'banned_until', v_banned_until)
  );
end;
$$;

create or replace function public.admin_clear_user_ban(p_target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_id uuid := auth.uid();
begin
  if v_admin_id is null or not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;

  update public.profiles
    set is_banned = false,
        banned_until = null,
        ban_reason = null
    where id = p_target_user_id;

  if not found then
    raise exception 'target user not found' using errcode = 'P0002';
  end if;

  insert into public.audit_logs (
    admin_id,
    target_user_id,
    action,
    reason,
    metadata
  )
  values (v_admin_id, p_target_user_id, 'user_unban', null, '{}'::jsonb);
end;
$$;

revoke all on function public.admin_set_user_ban(uuid, text, text) from public;
revoke all on function public.admin_clear_user_ban(uuid) from public;
grant execute on function public.admin_set_user_ban(uuid, text, text) to authenticated;
grant execute on function public.admin_clear_user_ban(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- 2) forum posts/comments: owners can edit content or soft-delete, but
--    system counters, ownership, pinning, and board assignment are locked.
-- ---------------------------------------------------------------------

create or replace function public.protect_post_system_fields()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_setting('app.system_update', true) = 'true' then
    return new;
  end if;

  if auth.role() = 'service_role' or public.is_admin() then
    return new;
  end if;

  if new.author_id is distinct from old.author_id
    or new.board_slug is distinct from old.board_slug
    or new.view_count is distinct from old.view_count
    or new.like_count is distinct from old.like_count
    or new.comment_count is distinct from old.comment_count
    or new.is_pinned is distinct from old.is_pinned then
    raise exception 'post system fields are admin-only' using errcode = '42501';
  end if;

  if new.is_deleted is distinct from old.is_deleted
    and not (old.is_deleted = false and new.is_deleted = true) then
    raise exception 'posts can only be soft-deleted by their owner' using errcode = '42501';
  end if;

  if old.is_deleted = true and public.is_admin() = false then
    raise exception 'deleted posts are read-only for non-admin users' using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists posts_protect_system_fields on public.posts;
create trigger posts_protect_system_fields
  before update on public.posts
  for each row execute procedure public.protect_post_system_fields();

create or replace function public.enforce_comment_integrity()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_parent_post_id uuid;
begin
  if new.parent_id is not null then
    select post_id into v_parent_post_id
    from public.comments
    where id = new.parent_id;

    if v_parent_post_id is null or v_parent_post_id <> new.post_id then
      raise exception 'parent comment must belong to the same post' using errcode = '23514';
    end if;
  end if;

  if tg_op = 'UPDATE' then
    if auth.role() = 'service_role' or public.is_admin() then
      return new;
    end if;

    if new.post_id is distinct from old.post_id
      or new.parent_id is distinct from old.parent_id
      or new.author_id is distinct from old.author_id then
      raise exception 'comment relationship fields are immutable' using errcode = '42501';
    end if;

    if new.is_deleted is distinct from old.is_deleted
      and not (old.is_deleted = false and new.is_deleted = true) then
      raise exception 'comments can only be soft-deleted by their owner' using errcode = '42501';
    end if;

    if new.content is distinct from old.content
      and not (old.is_deleted = false and new.is_deleted = true) then
      raise exception 'comment edits are not enabled' using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists comments_integrity on public.comments;
create trigger comments_integrity
  before insert or update on public.comments
  for each row execute procedure public.enforce_comment_integrity();

-- ---------------------------------------------------------------------
-- 3) blog integrity: series ownership, publish timestamps, safe view RPC,
--    and atomic tag replacement.
-- ---------------------------------------------------------------------

alter table public.blog_posts
  alter column published_at drop not null;

create or replace function public.enforce_blog_post_integrity()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_series_author_id uuid;
begin
  if current_setting('app.system_update', true) = 'true' then
    return new;
  end if;

  if new.series_id is not null then
    select author_id into v_series_author_id
    from public.blog_series
    where id = new.series_id;

    if v_series_author_id is null
      or new.author_id is null
      or v_series_author_id <> new.author_id then
      raise exception 'blog series must belong to the same author' using errcode = '23514';
    end if;
  end if;

  if tg_op = 'INSERT' then
    if new.is_published then
      new.published_at := coalesce(new.published_at, now());
    else
      new.published_at := null;
    end if;
  elsif tg_op = 'UPDATE' then
    if auth.role() <> 'service_role' and public.is_admin() = false then
      if new.author_id is distinct from old.author_id
        or new.view_count is distinct from old.view_count
        or new.like_count is distinct from old.like_count then
        raise exception 'blog system fields are admin-only' using errcode = '42501';
      end if;

      if new.is_deleted is distinct from old.is_deleted
        and not (old.is_deleted = false and new.is_deleted = true) then
        raise exception 'blog posts can only be soft-deleted by their owner' using errcode = '42501';
      end if;
    end if;

    if new.is_published and not old.is_published then
      new.published_at := now();
    elsif new.is_published then
      new.published_at := old.published_at;
    else
      new.published_at := null;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists blog_posts_integrity on public.blog_posts;
create trigger blog_posts_integrity
  before insert or update on public.blog_posts
  for each row execute procedure public.enforce_blog_post_integrity();

create or replace function public.sync_post_like_count()
returns trigger
language plpgsql
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

create or replace function public.increment_post_view(
  p_post_id uuid,
  p_viewer_key text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_viewer_key is null or length(p_viewer_key) = 0 then
    return;
  end if;

  insert into public.post_view_log(post_id, viewer_key, viewed_on)
  values (p_post_id, p_viewer_key, current_date)
  on conflict (post_id, viewer_key, viewed_on) do nothing;

  if found then
    perform set_config('app.system_update', 'true', true);

    update public.posts
    set view_count = view_count + 1
    where id = p_post_id and is_deleted = false;
  end if;
end;
$$;

grant execute on function public.increment_post_view(uuid, text)
  to anon, authenticated;

create or replace function public.increment_blog_post_view(
  p_post_id uuid,
  p_viewer_key text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_viewer_key is null or length(p_viewer_key) = 0 then
    return;
  end if;

  insert into public.blog_post_view_log (post_id, viewer_key)
  values (p_post_id, p_viewer_key)
  on conflict do nothing;

  if found then
    perform set_config('app.system_update', 'true', true);

    update public.blog_posts
      set view_count = view_count + 1
      where id = p_post_id
        and is_published = true
        and is_deleted = false;
  end if;
end;
$$;

grant execute on function public.increment_blog_post_view(uuid, text)
  to anon, authenticated;

create or replace function public.set_blog_post_tags(
  p_post_id uuid,
  p_tags text[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_author_id uuid;
  v_tag text;
begin
  select author_id into v_author_id
  from public.blog_posts
  where id = p_post_id;

  if v_author_id is null then
    raise exception 'blog post not found' using errcode = 'P0002';
  end if;

  if auth.uid() is null or (auth.uid() <> v_author_id and not public.is_admin()) then
    raise exception 'not allowed to edit blog tags' using errcode = '42501';
  end if;

  delete from public.blog_post_tags
  where post_id = p_post_id;

  foreach v_tag in array coalesce(p_tags, array[]::text[]) loop
    if v_tag !~ '^[a-z0-9][a-z0-9-]{0,39}$' then
      raise exception 'invalid tag slug' using errcode = '23514';
    end if;

    insert into public.tags(slug, name)
    values (v_tag, v_tag)
    on conflict (slug) do nothing;

    insert into public.blog_post_tags(post_id, tag_slug)
    values (p_post_id, v_tag)
    on conflict do nothing;
  end loop;
end;
$$;

revoke all on function public.set_blog_post_tags(uuid, text[]) from public;
grant execute on function public.set_blog_post_tags(uuid, text[]) to authenticated;

-- ---------------------------------------------------------------------
-- 4) Course-linked community spine.
-- ---------------------------------------------------------------------

create table if not exists public.post_courses (
  post_id uuid not null references public.posts(id) on delete cascade,
  course_slug text not null references public.courses(slug) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, course_slug)
);

create index if not exists idx_post_courses_course
  on public.post_courses(course_slug, created_at desc);

alter table public.post_courses enable row level security;

drop policy if exists post_courses_select_public on public.post_courses;
create policy post_courses_select_public
  on public.post_courses
  for select
  using (true);

drop policy if exists post_courses_insert_own on public.post_courses;
create policy post_courses_insert_own
  on public.post_courses
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.posts p
      where p.id = post_id
        and (p.author_id = auth.uid() or public.is_admin())
        and p.is_deleted = false
    )
  );

drop policy if exists post_courses_delete_own on public.post_courses;
create policy post_courses_delete_own
  on public.post_courses
  for delete
  to authenticated
  using (
    exists (
      select 1 from public.posts p
      where p.id = post_id
        and (p.author_id = auth.uid() or public.is_admin())
    )
  );

create table if not exists public.blog_post_courses (
  post_id uuid not null references public.blog_posts(id) on delete cascade,
  course_slug text not null references public.courses(slug) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, course_slug)
);

create index if not exists idx_blog_post_courses_course
  on public.blog_post_courses(course_slug, created_at desc);

alter table public.blog_post_courses enable row level security;

drop policy if exists blog_post_courses_select_public on public.blog_post_courses;
create policy blog_post_courses_select_public
  on public.blog_post_courses
  for select
  using (true);

drop policy if exists blog_post_courses_insert_own on public.blog_post_courses;
create policy blog_post_courses_insert_own
  on public.blog_post_courses
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.blog_posts p
      where p.id = post_id
        and (p.author_id = auth.uid() or public.is_admin())
        and p.is_deleted = false
    )
  );

drop policy if exists blog_post_courses_delete_own on public.blog_post_courses;
create policy blog_post_courses_delete_own
  on public.blog_post_courses
  for delete
  to authenticated
  using (
    exists (
      select 1 from public.blog_posts p
      where p.id = post_id
        and (p.author_id = auth.uid() or public.is_admin())
    )
  );

create or replace function public.set_post_courses(
  p_post_id uuid,
  p_course_slugs text[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_author_id uuid;
  v_course_slug text;
begin
  select author_id into v_author_id
  from public.posts
  where id = p_post_id;

  if v_author_id is null then
    raise exception 'post not found' using errcode = 'P0002';
  end if;

  if auth.uid() is null or (auth.uid() <> v_author_id and not public.is_admin()) then
    raise exception 'not allowed to edit post courses' using errcode = '42501';
  end if;

  delete from public.post_courses
  where post_id = p_post_id;

  foreach v_course_slug in array coalesce(p_course_slugs, array[]::text[]) loop
    insert into public.post_courses(post_id, course_slug)
    values (p_post_id, v_course_slug)
    on conflict do nothing;
  end loop;
end;
$$;

create or replace function public.set_blog_post_courses(
  p_post_id uuid,
  p_course_slugs text[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_author_id uuid;
  v_course_slug text;
begin
  select author_id into v_author_id
  from public.blog_posts
  where id = p_post_id;

  if v_author_id is null then
    raise exception 'blog post not found' using errcode = 'P0002';
  end if;

  if auth.uid() is null or (auth.uid() <> v_author_id and not public.is_admin()) then
    raise exception 'not allowed to edit blog post courses' using errcode = '42501';
  end if;

  delete from public.blog_post_courses
  where post_id = p_post_id;

  foreach v_course_slug in array coalesce(p_course_slugs, array[]::text[]) loop
    insert into public.blog_post_courses(post_id, course_slug)
    values (p_post_id, v_course_slug)
    on conflict do nothing;
  end loop;
end;
$$;

revoke all on function public.set_post_courses(uuid, text[]) from public;
revoke all on function public.set_blog_post_courses(uuid, text[]) from public;
grant execute on function public.set_post_courses(uuid, text[]) to authenticated;
grant execute on function public.set_blog_post_courses(uuid, text[]) to authenticated;

-- ---------------------------------------------------------------------
-- 5) Q&A solved loop.
-- ---------------------------------------------------------------------

do $$ begin
  create type public.question_status as enum ('open', 'solved');
exception when duplicate_object then null; end $$;

alter table public.posts
  add column if not exists question_status public.question_status,
  add column if not exists accepted_comment_id uuid;

alter table public.posts
  drop constraint if exists posts_accepted_comment_id_fkey;
alter table public.posts
  add constraint posts_accepted_comment_id_fkey
  foreign key (accepted_comment_id)
  references public.comments(id)
  on delete set null;

update public.posts
  set question_status = 'open'
  where board_slug = 'qna' and question_status is null;

create index if not exists idx_posts_qna_status_created
  on public.posts(question_status, created_at desc)
  where board_slug = 'qna' and is_deleted = false;

create or replace function public.enforce_question_state()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_comment_post_id uuid;
begin
  if new.board_slug <> 'qna' then
    new.question_status := null;
    new.accepted_comment_id := null;
    return new;
  end if;

  new.question_status := coalesce(new.question_status, 'open');

  if new.accepted_comment_id is not null then
    select post_id into v_comment_post_id
    from public.comments
    where id = new.accepted_comment_id
      and is_deleted = false;

    if v_comment_post_id is null or v_comment_post_id <> new.id then
      raise exception 'accepted comment must belong to this post' using errcode = '23514';
    end if;

    new.question_status := 'solved';
  elsif new.question_status = 'solved' then
    raise exception 'solved questions need an accepted comment' using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists posts_question_state on public.posts;
create trigger posts_question_state
  before insert or update on public.posts
  for each row execute procedure public.enforce_question_state();
