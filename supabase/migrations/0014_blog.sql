-- =====================================================================
-- 0014_blog.sql — Phase 3 블로그 (velog 스타일)
--   blog_posts, blog_series, blog_post_tags + RLS + 업데이트 트리거
--
--   포럼 (posts/comments/post_likes) 과 완전히 분리된 테이블 세트.
--   태그는 0001 에서 만든 public.tags 를 재사용.
--
--   주요 정책:
--     * 공개 글 (is_published=true and is_deleted=false) 은 누구나 읽기
--     * draft (is_published=false) 는 작성자 본인만 열람
--     * 작성은 로그인 + ban 되지 않은 사용자
--     * 수정/삭제는 작성자 or admin
--     * slug 는 (author_id, slug) 단위 unique — velog 처럼 /@user/slug 라우팅
-- =====================================================================

-- ---------------------------------------------------------------------
-- blog_series — 시리즈 컨테이너 (한 시리즈 = 한 저자의 글 묶음)
-- ---------------------------------------------------------------------
create table if not exists public.blog_series (
  id          uuid primary key default gen_random_uuid(),
  author_id   uuid not null references public.profiles(id) on delete cascade,
  title       text not null check (char_length(title) between 1 and 120),
  description text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_blog_series_author
  on public.blog_series(author_id, created_at desc);

drop trigger if exists blog_series_updated_at on public.blog_series;
create trigger blog_series_updated_at
  before update on public.blog_series
  for each row execute procedure extensions.moddatetime(updated_at);

-- ---------------------------------------------------------------------
-- blog_posts — 본문 + 메타
-- ---------------------------------------------------------------------
create table if not exists public.blog_posts (
  id            uuid primary key default gen_random_uuid(),
  -- 탈퇴 시 글 유지 (forum 과 동일 정책) — author_id nullable + set null
  author_id     uuid references public.profiles(id) on delete set null,
  series_id     uuid references public.blog_series(id) on delete set null,
  slug          text not null check (slug ~ '^[a-z0-9][a-z0-9-]{0,79}$'),
  title         text not null check (char_length(title) between 1 and 200),
  content       text not null,
  -- 자동 생성되는 짧은 요약 (마크다운 stripping 은 앱 레이어에서)
  excerpt       text,
  cover_image   text,
  is_published  boolean not null default true,
  is_deleted    boolean not null default false,
  like_count    integer not null default 0,
  view_count    integer not null default 0,
  published_at  timestamptz not null default now(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- 한 저자 범위에서 slug 유일 — velog 의 /@user/my-post 라우팅이 유효하게
create unique index if not exists uq_blog_posts_author_slug
  on public.blog_posts(author_id, slug)
  where author_id is not null;

create index if not exists idx_blog_posts_published
  on public.blog_posts(published_at desc)
  where is_published = true and is_deleted = false;

create index if not exists idx_blog_posts_author
  on public.blog_posts(author_id, published_at desc);

create index if not exists idx_blog_posts_series
  on public.blog_posts(series_id, created_at)
  where series_id is not null;

drop trigger if exists blog_posts_updated_at on public.blog_posts;
create trigger blog_posts_updated_at
  before update on public.blog_posts
  for each row execute procedure extensions.moddatetime(updated_at);

-- ---------------------------------------------------------------------
-- blog_post_tags — 0001 의 public.tags 와 M:N 조인
-- ---------------------------------------------------------------------
create table if not exists public.blog_post_tags (
  post_id  uuid not null references public.blog_posts(id) on delete cascade,
  tag_slug text not null references public.tags(slug) on delete cascade,
  primary key (post_id, tag_slug)
);

create index if not exists idx_blog_post_tags_tag
  on public.blog_post_tags(tag_slug);

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------

-- blog_series
alter table public.blog_series enable row level security;

drop policy if exists blog_series_select_public on public.blog_series;
create policy blog_series_select_public
  on public.blog_series
  for select
  using (true);

drop policy if exists blog_series_insert_authed on public.blog_series;
create policy blog_series_insert_authed
  on public.blog_series
  for insert
  to authenticated
  with check (auth.uid() = author_id and not public.is_user_banned());

drop policy if exists blog_series_update_own_or_admin on public.blog_series;
create policy blog_series_update_own_or_admin
  on public.blog_series
  for update
  to authenticated
  using (auth.uid() = author_id or public.is_admin())
  with check (auth.uid() = author_id or public.is_admin());

drop policy if exists blog_series_delete_own_or_admin on public.blog_series;
create policy blog_series_delete_own_or_admin
  on public.blog_series
  for delete
  to authenticated
  using (auth.uid() = author_id or public.is_admin());

-- blog_posts
alter table public.blog_posts enable row level security;

drop policy if exists blog_posts_select_public on public.blog_posts;
create policy blog_posts_select_public
  on public.blog_posts
  for select
  using (
    (is_published = true and is_deleted = false)
    or auth.uid() = author_id
    or public.is_admin()
  );

drop policy if exists blog_posts_insert_authed on public.blog_posts;
create policy blog_posts_insert_authed
  on public.blog_posts
  for insert
  to authenticated
  with check (
    auth.uid() = author_id
    and not public.is_user_banned()
  );

drop policy if exists blog_posts_update_own_or_admin on public.blog_posts;
create policy blog_posts_update_own_or_admin
  on public.blog_posts
  for update
  to authenticated
  using (auth.uid() = author_id or public.is_admin())
  with check (auth.uid() = author_id or public.is_admin());

drop policy if exists blog_posts_delete_own_or_admin on public.blog_posts;
create policy blog_posts_delete_own_or_admin
  on public.blog_posts
  for delete
  to authenticated
  using (auth.uid() = author_id or public.is_admin());

-- blog_post_tags — 연결만. post 권한과 정렬되어야 하므로 post 테이블 권한
-- 체크를 subquery 로 재사용.
alter table public.blog_post_tags enable row level security;

drop policy if exists blog_post_tags_select_public on public.blog_post_tags;
create policy blog_post_tags_select_public
  on public.blog_post_tags
  for select
  using (true);

drop policy if exists blog_post_tags_insert_own on public.blog_post_tags;
create policy blog_post_tags_insert_own
  on public.blog_post_tags
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.blog_posts p
      where p.id = post_id
        and (p.author_id = auth.uid() or public.is_admin())
    )
  );

drop policy if exists blog_post_tags_delete_own on public.blog_post_tags;
create policy blog_post_tags_delete_own
  on public.blog_post_tags
  for delete
  to authenticated
  using (
    exists (
      select 1 from public.blog_posts p
      where p.id = post_id
        and (p.author_id = auth.uid() or public.is_admin())
    )
  );

-- ---------------------------------------------------------------------
-- 뷰 카운트 RPC (forum 과 동일 패턴) — 0007 의 post_view_log 와 충돌
-- 없도록 blog_post_view_log 별도
-- ---------------------------------------------------------------------
create table if not exists public.blog_post_view_log (
  post_id    uuid not null references public.blog_posts(id) on delete cascade,
  viewer_key text not null check (char_length(viewer_key) between 3 and 64),
  viewed_on  date not null default current_date,
  primary key (post_id, viewer_key, viewed_on)
);

create index if not exists idx_blog_post_view_log_viewed_on
  on public.blog_post_view_log(viewed_on);

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
  insert into public.blog_post_view_log (post_id, viewer_key)
  values (p_post_id, p_viewer_key)
  on conflict do nothing;

  if found then
    update public.blog_posts
      set view_count = view_count + 1
      where id = p_post_id;
  end if;
end;
$$;

grant execute on function public.increment_blog_post_view(uuid, text)
  to anon, authenticated;
