-- =====================================================================
-- 0020_public_beta_blockers.sql
--   Public beta hardening:
--     1) expose only public profile columns through direct table SELECT
--     2) move current-profile/admin-user reads behind security-definer RPCs
--     3) scope comments/likes to visible, live parent posts
--     4) make course file bucket private and enforce storage limits
--     5) add SQL-side parity checks for course/tag link RPCs
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) profiles: direct table SELECT must not expose moderation/trust fields.
-- ---------------------------------------------------------------------

revoke select on public.profiles from anon, authenticated;

grant select (
  id,
  username,
  display_name,
  avatar_url,
  bio,
  created_at,
  updated_at
) on public.profiles to anon, authenticated;

grant update (username, display_name, avatar_url, bio)
  on public.profiles to authenticated;

create or replace function public.get_current_profile()
returns table (
  id uuid,
  username text,
  display_name text,
  avatar_url text,
  bio text,
  role public.user_role,
  is_banned boolean,
  banned_until timestamptz,
  ban_reason text,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id,
    p.username,
    p.display_name,
    p.avatar_url,
    p.bio,
    p.role,
    p.is_banned,
    p.banned_until,
    p.ban_reason,
    p.created_at,
    p.updated_at
  from public.profiles p
  where p.id = auth.uid()
$$;

revoke all on function public.get_current_profile() from public;
grant execute on function public.get_current_profile() to authenticated;

create or replace function public.admin_list_users(
  p_search text default '',
  p_limit integer default 30,
  p_offset integer default 0
)
returns table (
  id uuid,
  username text,
  display_name text,
  avatar_url text,
  bio text,
  role public.user_role,
  is_banned boolean,
  banned_until timestamptz,
  ban_reason text,
  created_at timestamptz,
  updated_at timestamptz,
  post_count bigint,
  comment_count bigint,
  total_count bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_search text := trim(coalesce(p_search, ''));
  v_limit integer := greatest(1, least(coalesce(p_limit, 30), 100));
  v_offset integer := greatest(0, coalesce(p_offset, 0));
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;

  return query
  with filtered as (
    select p.*
    from public.profiles p
    where (
      v_search = ''
      or p.username ilike ('%' || v_search || '%')
      or p.display_name ilike ('%' || v_search || '%')
    )
  ),
  counted as (
    select count(*)::bigint as total from filtered
  ),
  page_rows as (
    select *
    from filtered
    order by created_at desc
    limit v_limit
    offset v_offset
  )
  select
    p.id,
    p.username,
    p.display_name,
    p.avatar_url,
    p.bio,
    p.role,
    p.is_banned,
    p.banned_until,
    p.ban_reason,
    p.created_at,
    p.updated_at,
    (select count(*)::bigint from public.posts po where po.author_id = p.id) as post_count,
    (select count(*)::bigint from public.comments c where c.author_id = p.id) as comment_count,
    counted.total as total_count
  from page_rows p
  cross join counted;
end;
$$;

revoke all on function public.admin_list_users(text, integer, integer) from public;
grant execute on function public.admin_list_users(text, integer, integer) to authenticated;

-- ---------------------------------------------------------------------
-- 2) comments / likes: child rows follow parent post visibility.
-- ---------------------------------------------------------------------

drop policy if exists comments_select_public on public.comments;
create policy comments_select_public
  on public.comments
  for select
  using (
    exists (
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

drop policy if exists comments_insert_authed on public.comments;
create policy comments_insert_authed
  on public.comments
  for insert
  to authenticated
  with check (
    auth.uid() = author_id
    and not public.is_user_banned()
    and exists (
      select 1
      from public.posts p
      where p.id = post_id
        and p.is_deleted = false
    )
  );

drop policy if exists comments_update_own_or_admin on public.comments;
create policy comments_update_own_or_admin
  on public.comments
  for update
  to authenticated
  using (
    (
      auth.uid() = author_id
      and exists (
        select 1
        from public.posts p
        where p.id = post_id
          and p.is_deleted = false
      )
    )
    or public.is_admin()
  )
  with check (
    (
      auth.uid() = author_id
      and exists (
        select 1
        from public.posts p
        where p.id = post_id
          and p.is_deleted = false
      )
    )
    or public.is_admin()
  );

drop policy if exists post_likes_select_all on public.post_likes;
drop policy if exists post_likes_select_visible_posts on public.post_likes;
create policy post_likes_select_visible_posts
  on public.post_likes
  for select
  using (
    exists (
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

drop policy if exists post_likes_insert_own on public.post_likes;
create policy post_likes_insert_own
  on public.post_likes
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and not public.is_user_banned()
    and exists (
      select 1
      from public.posts p
      where p.id = post_id
        and p.is_deleted = false
    )
  );

-- ---------------------------------------------------------------------
-- 3) storage: keep app-level read behavior, but stop permanent public URLs.
-- ---------------------------------------------------------------------

update storage.buckets
set
  public = false,
  file_size_limit = 20971520,
  allowed_mime_types = array[
    'application/pdf',
    'application/zip',
    'application/x-zip-compressed',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'image/png',
    'image/jpeg',
    'image/webp',
    'text/plain',
    'text/markdown'
  ]
where id = 'course-files';

-- ---------------------------------------------------------------------
-- 4) SQL-side validation parity for link replacement RPCs.
-- ---------------------------------------------------------------------

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
  v_is_deleted boolean;
  v_tag text;
  v_tags text[] := coalesce(p_tags, array[]::text[]);
begin
  select author_id, is_deleted into v_author_id, v_is_deleted
  from public.blog_posts
  where id = p_post_id;

  if v_author_id is null then
    raise exception 'blog post not found' using errcode = 'P0002';
  end if;

  if v_is_deleted then
    raise exception 'deleted blog posts cannot be retagged' using errcode = '42501';
  end if;

  if cardinality(v_tags) > 10 then
    raise exception 'too many tags' using errcode = '23514';
  end if;

  if auth.uid() is null or (auth.uid() <> v_author_id and not public.is_admin()) then
    raise exception 'not allowed to edit blog tags' using errcode = '42501';
  end if;

  delete from public.blog_post_tags
  where post_id = p_post_id;

  foreach v_tag in array v_tags loop
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
  v_is_deleted boolean;
  v_course_slug text;
  v_course_slugs text[] := coalesce(p_course_slugs, array[]::text[]);
begin
  select author_id, is_deleted into v_author_id, v_is_deleted
  from public.posts
  where id = p_post_id;

  if v_author_id is null then
    raise exception 'post not found' using errcode = 'P0002';
  end if;

  if v_is_deleted then
    raise exception 'deleted posts cannot be relinked' using errcode = '42501';
  end if;

  if cardinality(v_course_slugs) > 3 then
    raise exception 'too many courses' using errcode = '23514';
  end if;

  if auth.uid() is null or (auth.uid() <> v_author_id and not public.is_admin()) then
    raise exception 'not allowed to edit post courses' using errcode = '42501';
  end if;

  delete from public.post_courses
  where post_id = p_post_id;

  foreach v_course_slug in array v_course_slugs loop
    if v_course_slug !~ '^[a-z0-9-]+$' then
      raise exception 'invalid course slug' using errcode = '23514';
    end if;

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
  v_is_deleted boolean;
  v_course_slug text;
  v_course_slugs text[] := coalesce(p_course_slugs, array[]::text[]);
begin
  select author_id, is_deleted into v_author_id, v_is_deleted
  from public.blog_posts
  where id = p_post_id;

  if v_author_id is null then
    raise exception 'blog post not found' using errcode = 'P0002';
  end if;

  if v_is_deleted then
    raise exception 'deleted blog posts cannot be relinked' using errcode = '42501';
  end if;

  if cardinality(v_course_slugs) > 3 then
    raise exception 'too many courses' using errcode = '23514';
  end if;

  if auth.uid() is null or (auth.uid() <> v_author_id and not public.is_admin()) then
    raise exception 'not allowed to edit blog post courses' using errcode = '42501';
  end if;

  delete from public.blog_post_courses
  where post_id = p_post_id;

  foreach v_course_slug in array v_course_slugs loop
    if v_course_slug !~ '^[a-z0-9-]+$' then
      raise exception 'invalid course slug' using errcode = '23514';
    end if;

    insert into public.blog_post_courses(post_id, course_slug)
    values (p_post_id, v_course_slug)
    on conflict do nothing;
  end loop;
end;
$$;

revoke all on function public.set_blog_post_tags(uuid, text[]) from public;
revoke all on function public.set_post_courses(uuid, text[]) from public;
revoke all on function public.set_blog_post_courses(uuid, text[]) from public;
grant execute on function public.set_blog_post_tags(uuid, text[]) to authenticated;
grant execute on function public.set_post_courses(uuid, text[]) to authenticated;
grant execute on function public.set_blog_post_courses(uuid, text[]) to authenticated;
