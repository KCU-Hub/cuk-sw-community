-- =====================================================================
-- 0017_user_courses.sql — 개인 학점 관리
--   user_courses: 사용자가 직접 기록하는 수강 과목 + 학점.
--   학부 'courses' (자료실용 카탈로그) 와 의도적으로 분리 — 사용자는
--   본인이 들은 임의 과목을 자유 입력. course_code 만 카탈로그를
--   참조용 prefix 로 쓸 수 있어 nullable.
--
--   GPA 계산은 앱 레이어 (src/lib/gpa.ts) 의 GRADE_POINTS 로. P/NP 는
--   평점 계산에서 제외. 재수강 / 졸업학점 정책은 학교마다 다르므로
--   기본 정책은 모든 행 포함이며, is_excluded 플래그로 사용자가
--   개별 행을 GPA 계산에서 빼낼 수 있음.
-- =====================================================================

do $$ begin
  create type public.grade as enum (
    'A+', 'A',
    'B+', 'B',
    'C+', 'C',
    'D+', 'D',
    'F',
    'P', 'NP'
  );
exception when duplicate_object then null; end $$;

create table if not exists public.user_courses (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  -- "2024-1", "2024-2", "2024-여름" 등 자유 입력. 정렬용 sort key 는
  -- semester_order (yyyymm 류) 로 별도 계산하지 않고, semester 문자열
  -- 자연 정렬 (오름차순) 이면 충분.
  semester     text not null check (char_length(semester) between 1 and 20),
  course_name  text not null check (char_length(course_name) between 1 and 80),
  course_code  text check (course_code is null or char_length(course_code) between 1 and 40),
  credits      numeric(3,1) not null check (credits > 0 and credits <= 9),
  grade        public.grade not null,
  is_excluded  boolean not null default false,
  memo         text check (memo is null or char_length(memo) <= 200),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists idx_user_courses_user_semester
  on public.user_courses(user_id, semester);

drop trigger if exists user_courses_updated_at on public.user_courses;
create trigger user_courses_updated_at
  before update on public.user_courses
  for each row execute procedure extensions.moddatetime(updated_at);

-- ---------------------------------------------------------------------
-- RLS — 본인만 접근. admin 도 의도적으로 제외 (개인 학점은 사생활).
-- ---------------------------------------------------------------------
alter table public.user_courses enable row level security;

drop policy if exists user_courses_select_own on public.user_courses;
create policy user_courses_select_own
  on public.user_courses
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists user_courses_insert_own on public.user_courses;
create policy user_courses_insert_own
  on public.user_courses
  for insert
  to authenticated
  with check (auth.uid() = user_id and not public.is_user_banned());

drop policy if exists user_courses_update_own on public.user_courses;
create policy user_courses_update_own
  on public.user_courses
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists user_courses_delete_own on public.user_courses;
create policy user_courses_delete_own
  on public.user_courses
  for delete
  to authenticated
  using (auth.uid() = user_id);
