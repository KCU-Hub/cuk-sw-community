-- =====================================================================
-- 0015_course_materials.sql — Phase 4 과목 자료실
--
--   구성:
--     * course_materials — 과목별 자료 (강의/과제/시험/링크/기타)
--     * tsv generated column + gin index → 풀텍스트 검색 (simple 사전)
--     * storage bucket `course-files` + 정책
--
--   자료 본문은 마크다운. external_url / file_path 는 선택 (둘 다 비워도
--   본문만으로도 유효). file_path 가 들어오면 Storage 의
--   course-files/{path} 를 가리킴.
-- =====================================================================

-- ---------------------------------------------------------------------
-- enum + table
-- ---------------------------------------------------------------------

do $$ begin
  create type public.material_type as enum (
    'lecture',     -- 강의 자료
    'assignment',  -- 과제
    'exam',        -- 시험
    'link',        -- 외부 링크
    'other'        -- 기타
  );
exception when duplicate_object then null; end $$;

create table if not exists public.course_materials (
  id            uuid primary key default gen_random_uuid(),
  course_slug   text not null references public.courses(slug) on delete restrict,
  author_id     uuid references public.profiles(id) on delete set null,
  material_type public.material_type not null default 'other',
  title         text not null check (char_length(title) between 1 and 200),
  content       text not null default '',
  external_url  text,
  -- storage path 상대 경로. Storage bucket 'course-files' 기준.
  -- null ⇢ 외부 링크만 있거나 첨부 없음
  file_path     text,
  -- 검색용 tsvector — generated column 으로 title 가중 A, content B
  tsv           tsvector
                  generated always as (
                    setweight(to_tsvector('simple', coalesce(title, '')), 'A')
                    || setweight(to_tsvector('simple', coalesce(content, '')), 'B')
                  ) stored,
  is_deleted    boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_course_materials_course_created
  on public.course_materials(course_slug, created_at desc)
  where is_deleted = false;

create index if not exists idx_course_materials_author
  on public.course_materials(author_id, created_at desc);

-- 풀텍스트 검색 index
create index if not exists idx_course_materials_tsv
  on public.course_materials using gin(tsv);

drop trigger if exists course_materials_updated_at on public.course_materials;
create trigger course_materials_updated_at
  before update on public.course_materials
  for each row execute procedure extensions.moddatetime(updated_at);

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------

alter table public.course_materials enable row level security;

drop policy if exists course_materials_select_public on public.course_materials;
create policy course_materials_select_public
  on public.course_materials
  for select
  using (
    is_deleted = false
    or auth.uid() = author_id
    or public.is_admin()
  );

drop policy if exists course_materials_insert_authed on public.course_materials;
create policy course_materials_insert_authed
  on public.course_materials
  for insert
  to authenticated
  with check (
    auth.uid() = author_id
    and not public.is_user_banned()
  );

drop policy if exists course_materials_update_own_or_admin on public.course_materials;
create policy course_materials_update_own_or_admin
  on public.course_materials
  for update
  to authenticated
  using (auth.uid() = author_id or public.is_admin())
  with check (auth.uid() = author_id or public.is_admin());

drop policy if exists course_materials_delete_own_or_admin on public.course_materials;
create policy course_materials_delete_own_or_admin
  on public.course_materials
  for delete
  to authenticated
  using (auth.uid() = author_id or public.is_admin());

-- ---------------------------------------------------------------------
-- Storage bucket + policies
-- ---------------------------------------------------------------------

-- 1) bucket 생성 (공개 read). 존재하면 그대로 두기.
insert into storage.buckets (id, name, public)
values ('course-files', 'course-files', true)
on conflict (id) do nothing;

-- 2) 정책:
--    - anon/authenticated 모두 read (bucket public=true 와 일관)
--    - authenticated 만 upload/update/delete, 본인 파일만 update/delete
--    - 업로드 경로 prefix = user_id 로 샌드박스
--
-- storage.objects 의 owner (uuid) = auth.uid() 를 기본으로 씀.

drop policy if exists "course-files public read" on storage.objects;
create policy "course-files public read"
  on storage.objects
  for select
  using (bucket_id = 'course-files');

drop policy if exists "course-files authed upload" on storage.objects;
create policy "course-files authed upload"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'course-files'
    and not public.is_user_banned()
    -- path 의 첫 segment 는 업로더 user_id 와 일치해야 함
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "course-files owner update" on storage.objects;
create policy "course-files owner update"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'course-files' and owner = auth.uid())
  with check (bucket_id = 'course-files' and owner = auth.uid());

drop policy if exists "course-files owner delete" on storage.objects;
create policy "course-files owner delete"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'course-files'
    and (owner = auth.uid() or public.is_admin())
  );
