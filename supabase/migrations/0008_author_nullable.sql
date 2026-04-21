-- =====================================================================
-- 0008_author_nullable.sql
--   탈퇴한 사용자 UX 보존.
--
--   auth.users 삭제 → profiles cascade 는 그대로 두되 (계정 데이터 정리),
--   posts/comments 는 "탈퇴한 사용자" 로 남도록 author_id 를 nullable
--   + on delete set null 로 바꿈.
--
--   기존 on delete cascade 였던 동작:
--     auth.users 삭제 → profiles 삭제 → posts/comments 전멸
--   변경 후:
--     auth.users 삭제 → profiles 삭제 → posts/comments 의 author_id = null
--     → UI 에서 "탈퇴한 사용자" 로 렌더
--
--   post_likes 는 의도적으로 cascade 유지: 좋아요를 남긴 사용자가 탈퇴하면
--   like_count 에서 빠지는 게 맞음 (좋아요는 "누가" 보다 "몇명" 이 전부).
-- =====================================================================

-- ---------------------------------------------------------------------
-- posts.author_id
-- ---------------------------------------------------------------------

alter table public.posts alter column author_id drop not null;
alter table public.posts drop constraint if exists posts_author_id_fkey;
alter table public.posts
  add constraint posts_author_id_fkey
  foreign key (author_id)
  references public.profiles(id)
  on delete set null;

-- ---------------------------------------------------------------------
-- comments.author_id
-- ---------------------------------------------------------------------

alter table public.comments alter column author_id drop not null;
alter table public.comments drop constraint if exists comments_author_id_fkey;
alter table public.comments
  add constraint comments_author_id_fkey
  foreign key (author_id)
  references public.profiles(id)
  on delete set null;

-- ---------------------------------------------------------------------
-- RLS 영향 주석
-- ---------------------------------------------------------------------
--
-- 0005/0006 의 기존 정책들은 `auth.uid() = author_id` 형태.
-- author_id 가 null 이면 해당 식은 null (= false in USING/WITH CHECK).
-- 결과:
--   * insert  — `auth.uid() = author_id` 필수라 영향 없음
--   * update  — 원 작성자가 탈퇴했으면 해당 post/comment 를 수정 불가
--               (admin 은 is_admin() 분기로 여전히 가능)
--   * delete  — 위와 동일
--   * select  — posts_select_public 은 `is_deleted = false or ... or is_admin()`
--               이라 공개 게시글은 그대로 보이고, 삭제된 글은 admin 만 열람
-- 즉 "탈퇴한 사용자의 콘텐츠 = 읽기 전용 + admin 관리 가능" 상태.
