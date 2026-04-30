-- =====================================================================
-- 0016_view_log_rls.sql
--   0014 가 blog_post_view_log 에 RLS 를 활성화하지 않아 anon/authenticated
--   가 직접 INSERT/DELETE 로 view_count 를 조작할 수 있는 누락을 봉합.
--   forum 의 0007 (post_view_log) 패턴과 일치시킴.
--
--   정책을 별도로 만들지 않으면 RLS 활성화 후 PostgREST 경로의 직접
--   접근은 모두 차단되고, increment_blog_post_view RPC 가 security
--   definer 로 들어와 트리거를 통해서만 row 가 들어가도록 보장.
-- =====================================================================

alter table public.blog_post_view_log enable row level security;

-- 의도적으로 정책 없음: PostgREST 직접 접근 차단,
-- security-definer RPC 만 row 를 만들 수 있도록.
