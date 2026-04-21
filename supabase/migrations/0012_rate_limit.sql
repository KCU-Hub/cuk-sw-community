-- =====================================================================
-- 0012_rate_limit.sql
--   포스트/댓글/좋아요 server action 에 대한 slidind-window rate limit.
--
--   전략:
--     * rate_limit_events (user_id, action, created_at) append-only 테이블
--     * server action 진입 시 최근 1분/1시간 count 로 검증 후 event 기록
--     * 과거 기록은 24h 뒤 삭제 — pg_cron 으로 주기 정리 (주석 참조)
--
--   범위:
--     Phase 5 admin ban 과 함께 도입되지만 rate-limit 부분만 먼저 반영.
--     ban 은 별도 마이그레이션으로 이어짐.
-- =====================================================================

do $$ begin
  create type public.rate_limit_action as enum (
    'post_create',
    'comment_create',
    'like_toggle'
  );
exception when duplicate_object then null; end $$;

create table if not exists public.rate_limit_events (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  action     public.rate_limit_action not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_rate_limit_user_action_time
  on public.rate_limit_events(user_id, action, created_at desc);

-- ---------------------------------------------------------------------
-- RLS — append-only, 본인/admin 만 열람
-- ---------------------------------------------------------------------
alter table public.rate_limit_events enable row level security;

drop policy if exists rate_limit_insert_own on public.rate_limit_events;
create policy rate_limit_insert_own
  on public.rate_limit_events
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists rate_limit_select_own on public.rate_limit_events
;
create policy rate_limit_select_own
  on public.rate_limit_events
  for select
  to authenticated
  using (auth.uid() = user_id or public.is_admin());

-- 의도적으로 update/delete 정책 없음 → append-only.
-- 정리는 아래 pg_cron job (supabase 대시보드에서 설정) 으로.

-- ---------------------------------------------------------------------
-- 정리 함수 — 24h 이상 지난 이벤트 삭제
-- ---------------------------------------------------------------------
create or replace function public.prune_rate_limit_events()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.rate_limit_events
  where created_at < now() - interval '24 hours';
$$;

-- 실행 예시 (Supabase Dashboard → Database → Extensions → pg_cron 활성화 후):
--
--   select cron.schedule(
--     'prune-rate-limit-hourly',
--     '0 * * * *',
--     $$ select public.prune_rate_limit_events() $$
--   );
--
-- pg_cron 이 없는 환경이면 생략해도 무방 — 하루 ~수십만 row 수준이라
-- 성능 이슈는 없지만 스토리지만 증가.
