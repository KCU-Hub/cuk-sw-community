-- =====================================================================
-- 0013_admin_ban.sql
--   무료 배포 전 필수 블로커: admin 이 사용자를 ban 해 글/댓글/좋아요
--   생성을 막을 수 있어야 함. 삭제 (auth.users) 보다 한 단계 약한
--   조치로, 복구 가능.
--
--   구성:
--     1) profiles.is_banned / banned_until
--     2) audit_logs 테이블 (관리자 액션 기록)
--     3) public.is_user_banned() 헬퍼
--     4) posts/comments/post_likes insert 정책에 is_user_banned() 추가
--     5) admin 전용 server action 에서 사용할 RPC 는 없음 — server action
--        에서 직접 update + audit insert 을 수행 (RLS 는 is_admin() 허용)
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) profiles ban 컬럼
-- ---------------------------------------------------------------------

alter table public.profiles
  add column if not exists is_banned    boolean     not null default false,
  add column if not exists banned_until timestamptz,
  add column if not exists ban_reason   text;

create index if not exists idx_profiles_banned
  on public.profiles(is_banned) where is_banned = true;

-- ---------------------------------------------------------------------
-- 2) audit_logs — admin 액션 감사 로그
-- ---------------------------------------------------------------------

do $$ begin
  create type public.audit_action as enum (
    'user_ban',
    'user_unban',
    'post_hard_delete',
    'comment_hard_delete',
    'role_promote',
    'role_demote'
  );
exception when duplicate_object then null; end $$;

create table if not exists public.audit_logs (
  id             uuid primary key default gen_random_uuid(),
  admin_id       uuid references public.profiles(id) on delete set null,
  target_user_id uuid references public.profiles(id) on delete set null,
  action         public.audit_action not null,
  reason         text,
  metadata       jsonb not null default '{}'::jsonb,
  created_at     timestamptz not null default now()
);

create index if not exists idx_audit_logs_target
  on public.audit_logs(target_user_id, created_at desc);
create index if not exists idx_audit_logs_admin
  on public.audit_logs(admin_id, created_at desc);

alter table public.audit_logs enable row level security;

-- admin 만 읽기. 쓰기는 admin 만, 수정/삭제 불가 (append-only).
drop policy if exists audit_logs_select_admin on public.audit_logs;
create policy audit_logs_select_admin
  on public.audit_logs
  for select
  to authenticated
  using (public.is_admin());

drop policy if exists audit_logs_insert_admin on public.audit_logs;
create policy audit_logs_insert_admin
  on public.audit_logs
  for insert
  to authenticated
  with check (public.is_admin() and auth.uid() = admin_id);

-- ---------------------------------------------------------------------
-- 3) is_user_banned() — auth.uid() 기반 체크
--    * is_banned = true 이면 영구 ban
--    * banned_until > now() 이면 임시 ban
-- ---------------------------------------------------------------------

create or replace function public.is_user_banned()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and (is_banned = true or (banned_until is not null and banned_until > now()))
  );
$$;

-- ---------------------------------------------------------------------
-- 4) posts / comments / post_likes insert 정책에 not is_user_banned() 추가
-- ---------------------------------------------------------------------

drop policy if exists posts_insert_authed on public.posts;
create policy posts_insert_authed
  on public.posts
  for insert
  to authenticated
  with check (
    auth.uid() = author_id
    and not public.is_user_banned()
    and (
      not coalesce(
        (select b.is_admin_only from public.boards b where b.slug = board_slug),
        false
      )
      or public.is_admin()
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
  );

drop policy if exists post_likes_insert_own on public.post_likes;
create policy post_likes_insert_own
  on public.post_likes
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and not public.is_user_banned()
  );

-- rate_limit_events insert 는 일부러 ban 체크 안 함 — ban 된 사용자도
-- 페이지 이동 중 rate log 가 쌓일 수 있는데 이건 정상 동작.
