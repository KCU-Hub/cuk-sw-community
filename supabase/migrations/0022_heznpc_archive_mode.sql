-- =====================================================================
-- 0022_heznpc_archive_mode.sql
--   Reframe the app from a student community into Heznpc Archive:
--   public readers, owner/admin writers, private personal metrics.
--
--   This migration intentionally leaves public SELECT policies in place.
--   It tightens authenticated write paths so a production config mistake
--   cannot silently turn the archive back into an open community.
-- =====================================================================

create or replace function public.is_archive_writer()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin();
$$;

revoke all on function public.is_archive_writer() from public;
grant execute on function public.is_archive_writer() to authenticated;

update public.boards
set
  name = case slug
    when 'free' then 'Logbook'
    when 'qna' then 'Problem Log'
    when 'notice' then 'Archive Notes'
    else name
  end,
  description = case slug
    when 'free' then '짧은 생각, 진행 기록, 임시 메모를 보관합니다.'
    when 'qna' then '막혔던 문제와 해결 과정을 다시 찾을 수 있게 남깁니다.'
    when 'notice' then '아카이브 운영 변경과 공개 안내를 남깁니다.'
    else description
  end;

-- ---------------------------------------------------------------------
-- Forum writes: admin/owner only.
-- ---------------------------------------------------------------------

drop policy if exists posts_insert_authed on public.posts;
create policy posts_insert_authed
  on public.posts
  for insert
  to authenticated
  with check (
    (select public.is_archive_writer())
    and auth.uid() = author_id
    and not public.is_user_banned()
  );

drop policy if exists posts_update_own_or_admin on public.posts;
create policy posts_update_own_or_admin
  on public.posts
  for update
  to authenticated
  using ((select public.is_archive_writer()))
  with check ((select public.is_archive_writer()));

drop policy if exists comments_insert_authed on public.comments;
create policy comments_insert_authed
  on public.comments
  for insert
  to authenticated
  with check (
    (select public.is_archive_writer())
    and auth.uid() = author_id
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
  using ((select public.is_archive_writer()))
  with check ((select public.is_archive_writer()));

drop policy if exists post_likes_insert_own on public.post_likes;
create policy post_likes_insert_own
  on public.post_likes
  for insert
  to authenticated
  with check (
    (select public.is_archive_writer())
    and auth.uid() = user_id
    and not public.is_user_banned()
    and exists (
      select 1
      from public.posts p
      where p.id = post_id
        and p.is_deleted = false
    )
  );

drop policy if exists post_likes_delete_own on public.post_likes;
create policy post_likes_delete_own
  on public.post_likes
  for delete
  to authenticated
  using ((select public.is_archive_writer()));

-- ---------------------------------------------------------------------
-- Blog writes: admin/owner only.
-- ---------------------------------------------------------------------

drop policy if exists blog_series_insert_authed on public.blog_series;
create policy blog_series_insert_authed
  on public.blog_series
  for insert
  to authenticated
  with check (
    (select public.is_archive_writer())
    and auth.uid() = author_id
    and not public.is_user_banned()
  );

drop policy if exists blog_series_update_own_or_admin on public.blog_series;
create policy blog_series_update_own_or_admin
  on public.blog_series
  for update
  to authenticated
  using ((select public.is_archive_writer()))
  with check ((select public.is_archive_writer()));

drop policy if exists blog_posts_insert_authed on public.blog_posts;
create policy blog_posts_insert_authed
  on public.blog_posts
  for insert
  to authenticated
  with check (
    (select public.is_archive_writer())
    and auth.uid() = author_id
    and not public.is_user_banned()
  );

drop policy if exists blog_posts_update_own_or_admin on public.blog_posts;
create policy blog_posts_update_own_or_admin
  on public.blog_posts
  for update
  to authenticated
  using ((select public.is_archive_writer()))
  with check ((select public.is_archive_writer()));

-- ---------------------------------------------------------------------
-- Course/material writes: admin/owner only, with SQL-side file validation.
-- ---------------------------------------------------------------------

create or replace function public.validate_course_material_archive_fields()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_extension text;
  v_first_segment text;
begin
  if new.file_path is not null then
    new.file_path := nullif(btrim(new.file_path), '');
  end if;

  if nullif(btrim(coalesce(new.content, '')), '') is null
    and nullif(btrim(coalesce(new.external_url, '')), '') is null
    and new.file_path is null then
    raise exception 'course material needs content, external_url, or file_path'
      using errcode = '23514';
  end if;

  if tg_op = 'UPDATE' and coalesce(auth.role(), '') <> 'service_role' then
    if new.id is distinct from old.id
      or new.author_id is distinct from old.author_id
      or new.course_slug is distinct from old.course_slug
      or new.created_at is distinct from old.created_at then
      raise exception 'course material identity fields are immutable'
        using errcode = '42501';
    end if;

    if old.is_deleted = true and new.is_deleted = false then
      raise exception 'deleted course materials cannot be restored directly'
        using errcode = '42501';
    end if;
  end if;

  if new.file_path is not null
    and (tg_op = 'INSERT' or new.file_path is distinct from old.file_path)
    and coalesce(auth.role(), '') <> 'service_role' then
    if new.file_path !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/.+$' then
      raise exception 'invalid course material file path'
        using errcode = '23514';
    end if;

    v_first_segment := split_part(new.file_path, '/', 1);
    if new.author_id is null or v_first_segment <> new.author_id::text then
      raise exception 'course material file path owner mismatch'
        using errcode = '42501';
    end if;

    v_extension := lower(substring(new.file_path from '\.([A-Za-z0-9]+)$'));
    if v_extension is null or v_extension <> all(array[
      'pdf', 'zip', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
      'png', 'jpg', 'jpeg', 'webp', 'txt', 'md'
    ]) then
      raise exception 'unsupported course material file extension'
        using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists course_materials_validate_archive_fields
  on public.course_materials;
create trigger course_materials_validate_archive_fields
  before insert or update on public.course_materials
  for each row execute procedure public.validate_course_material_archive_fields();

drop policy if exists course_materials_insert_authed on public.course_materials;
create policy course_materials_insert_authed
  on public.course_materials
  for insert
  to authenticated
  with check (
    (select public.is_archive_writer())
    and auth.uid() = author_id
    and not public.is_user_banned()
  );

drop policy if exists course_materials_update_own_or_admin on public.course_materials;
create policy course_materials_update_own_or_admin
  on public.course_materials
  for update
  to authenticated
  using ((select public.is_archive_writer()))
  with check ((select public.is_archive_writer()));

drop policy if exists course_materials_delete_own_or_admin on public.course_materials;
create policy course_materials_delete_own_or_admin
  on public.course_materials
  for delete
  to authenticated
  using ((select public.is_archive_writer()));

-- ---------------------------------------------------------------------
-- Link replacement RPCs: existing authors are no longer enough.
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

  if auth.uid() is null or not public.is_archive_writer() then
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

  if auth.uid() is null or not public.is_archive_writer() then
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

  if auth.uid() is null or not public.is_archive_writer() then
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
