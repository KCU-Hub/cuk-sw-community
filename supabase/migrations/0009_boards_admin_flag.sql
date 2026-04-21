-- =====================================================================
-- 0009_boards_admin_flag.sql
--   게시판 admin-only 플래그를 코드 상수가 아닌 테이블 컬럼으로.
--
--   기존:
--     - boards 는 slug/name/description/sort_order 만
--     - adminOnly 여부는 src/lib/constants.ts:BOARD_LABELS 상수
--     - RLS 는 `board_slug <> 'notice'` 로 하드코딩
--   변경:
--     - boards.is_admin_only 컬럼 추가
--     - RLS subquery 로 플래그 조회 (subquery 비용은 실측 캐시 덕분에 미미)
--     - 코드 상수 BOARD_LABELS 는 B.2 의 app 레이어 패치로 제거
--
--   이로써 게시판 추가 시 SQL + 상수 + RLS 3 곳을 고치던 걸
--   SQL 1 곳만 고치면 되게 됨 (insert into boards + 플래그만 세팅).
-- =====================================================================

alter table public.boards
  add column if not exists is_admin_only boolean not null default false;

-- 기존 notice 게시판은 admin-only 로 플래그 켜둠
update public.boards set is_admin_only = true where slug = 'notice';

-- RLS 재작성: 하드코딩된 'notice' 대신 플래그 subquery
drop policy if exists posts_insert_authed on public.posts;
create policy posts_insert_authed
  on public.posts
  for insert
  to authenticated
  with check (
    auth.uid() = author_id
    and (
      not coalesce(
        (select b.is_admin_only from public.boards b where b.slug = board_slug),
        false
      )
      or public.is_admin()
    )
  );
