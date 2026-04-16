# cuk-sw-community — Refactor plan

세션 간 작업 이어가기용. 이 파일은 **untracked** (repo root, `review.md` 옆).
`review.md`가 findings 소스 of truth, 이 파일은 **실행 계획 + 진행 상태**.

> **다음 세션 Claude에게**: 먼저 `review.md` + 이 파일을 둘 다 읽고 `git log --oneline -10`
> 및 `git branch` 로 현재 상태 확인 후 작업 재개.

---

## 전체 계획 (4 PR)

| PR | 범위 | 상태 | 브랜치 |
|---|---|---|---|
| **A** | P0 보안/데이터 무결성 3건 | **완료** | `refactor/pr-a-p0-security` (3 커밋, push 없음) |
| **B** | 데이터 모델 변경 4건 | 대기 | `refactor/pr-b-data-model` (예정) |
| **C** | 테스트 + 보안 헤더 품질 가드 3건 | 대기 | `refactor/pr-c-quality-gates` (예정) |
| **D** | UX/DX 마무리 5건 | 대기 | `refactor/pr-d-polish` (예정) |

각 PR은 main에서 분기. 순차 머지 전제 (A→B→C→D). 머지는 사용자 결정.

---

## PR A (완료) — P0 보안 수정

**브랜치**: `refactor/pr-a-p0-security` (main 에 3 커밋, push 없음)

```
3f80b5f fix(actions): stop leaking raw Supabase error messages to clients
9b7b097 fix(posts): dedupe post view counter via post_view_log
6ab9da6 fix(posts): honor 0006 author/admin visibility for soft-deleted posts
```

- tsc / lint 깨끗
- `/simplify` 리뷰 패스 (3 agent: reuse / quality / efficiency) 거침. cleanup 들은
  `git reset --soft` 후 원본 커밋에 fold 되어 최종 3 커밋 상태 유지. 주요 적용 건:
  - `idx_post_view_log_post` → `idx_post_view_log_viewed_on` (PK 이미 prefix 커버)
  - `incrementPostViewAction` 단일 `createClient`, `buildViewerKey(user)` 시그니처
  - post detail 단일 Promise.all + `DeletedPostView` 컴포넌트로 `is_deleted` 조기 분기
  - `PG_ERROR_CODES` / `PGRST_ERROR_CODES` named constants
  - 공유 `postIdSchema` (`validation/post.ts`) 를 `comment.ts` 도 재사용
  - `viewer_key` cap 80 → 64, 0007 migration 에 pg_cron retention 힌트 주석
- `review.md`의 P0 3건 중 실제로 열려있던 건들을 닫음

---

## PR B — 데이터 모델 변경

**브랜치명**: `refactor/pr-b-data-model`

### B.1 — 유저 탈퇴 시 콘텐츠 보존 (on delete cascade → set null)
- **Why**: 탈퇴 시 `auth.users` 삭제 → cascade로 `profiles` → `posts`/`comments` 전멸.
  대화가 증발하는 UX가 아니라 "탈퇴한 사용자" 표시가 되어야 함.
- **변경**:
  - `supabase/migrations/0008_author_nullable.sql` 신규:
    - `posts.author_id` / `comments.author_id` 를 nullable 로
    - `on delete cascade` → `on delete set null`
    - 필요 시 `alter table ... drop constraint ... add constraint ... references ... on delete set null`
  - `src/lib/types.ts`: `Post.author_id: string | null`, `Comment.author_id: string | null`
  - `PostWithAuthor.author` 도 nullable. 렌더 경로에서 `author?.display_name ?? "탈퇴한 사용자"`
  - `src/lib/db/posts.ts` / `comments.ts` 의 embed 쿼리는 그대로 두되, `author` 가 null 일 수 있음을 타입에 반영
  - 이미 존재하는 `post.author?.display_name || ... || "알 수 없음"` 패턴을 `"탈퇴한 사용자"` 로 의미 맞춤

### B.2 — `boards.is_admin_only` 컬럼 + `BOARD_LABELS` 제거
- **Why**: `BOARD_LABELS` 상수와 `boards` 테이블이 이중 소스. `adminOnly` 플래그는 코드 상수에만
  있고 RLS는 `board_slug <> 'notice'` 하드코딩. 게시판 추가 = 두 곳 + SQL 수정.
- **변경**:
  - `supabase/migrations/0009_boards_admin_flag.sql`:
    - `alter table boards add column is_admin_only boolean not null default false`
    - `update boards set is_admin_only = true where slug = 'notice'`
    - `posts_insert_authed` RLS 를 `(not (select is_admin_only from boards where slug = board_slug) or public.is_admin())` 로 재작성 (subquery 비용 미미)
  - `src/lib/constants.ts`: `BOARD_LABELS` 상수 제거, `BOARD_SLUGS`/`isBoardSlug` 는 `board_slug` enum 기반으로 유지 or 이것도 동적으로 뺄지 판단.
    - **권장**: `BOARD_SLUGS`/`isBoardSlug` 는 남겨둠(enum은 compile-time). 삭제 대상은 `BOARD_LABELS` 만.
  - `src/app/(authed)/board/[slug]/new/page.tsx`: `BOARD_LABELS[slug]` → `getBoardBySlug(slug)` 로 바꾸고 `board.is_admin_only` 로 체크
  - `src/app/(public)/board/[slug]/page.tsx`: 이미 `getBoardBySlug` 사용 중 — `canWrite` 로직에 `board.is_admin_only` 반영
  - `Board` 타입에 `is_admin_only: boolean` 필드 추가

### B.3 — `0006` 함수에 `set search_path = public`
- **Why**: `comment_depth` / `enforce_comment_depth_cap` 가 `set search_path` 없음.
  `security definer` 는 아니라 위험은 낮지만 일관성 + `stable` 함수의 함수 경로 하이재킹 차단.
- **변경**: `supabase/migrations/0010_function_search_path.sql` 로 두 함수 재정의하며 `set search_path = public` 추가. 또는 0006 을 수정하지 말고 신규 마이그레이션으로 `create or replace` 덮어쓰기 (마이그레이션 불변성 원칙).

### B.4 — Supabase 타입 생성 파이프라인
- **Why**: `src/lib/types.ts` 수동 타입이 DB 스키마와 드리프트 + `as unknown as PostWithAuthor[]` 강제 캐스팅 존재.
- **변경**:
  - `package.json` 에 `"types:gen": "supabase gen types typescript --local > src/lib/types.generated.ts"` 스크립트 추가.
  - 최초 한 번 실행 후 `src/lib/types.generated.ts` 커밋.
  - `src/lib/types.ts` 의 수동 타입들을 generated 로 리익스포트하거나, 도메인 타입(`PostWithAuthor`, `CommentNode`) 만 남기고 베이스는 generated 에서 import.
  - `src/lib/db/posts.ts:49,63` 의 `as unknown as PostWithAuthor[]` 제거 (generated 타입이 정확하면 cast 불필요).
  - `README.md` 에 types:gen 실행 시점 문서화.

**검증**: `supabase db reset` → `npm run build` → 로컬에서 회원가입/게시글/댓글/좋아요 한 사이클.

---

## PR C — 테스트 + 품질 가드

**브랜치명**: `refactor/pr-c-quality-gates`

### C.1 — Vitest 셋업 + sanitize-schema 회귀 가드
- `package.json`: `vitest`, `@vitest/coverage-v8`, `jsdom` (optional) devDep 추가
- `vitest.config.ts` 생성 (tsconfig paths 반영)
- `src/lib/markdown/__tests__/sanitize.test.ts`:
  - 알려진 XSS payload 차단 회귀 가드
  - `<script>`, `<img src=x onerror=alert(1)>`, `<a href="javascript:...">`, `<iframe>`, `<object>`, `data:text/html`, `<svg onload>`
  - 허용되어야 하는 것: `language-ts` 코드블럭, `hljs-*` span, heading id (rehype-slug), `<kbd>`
- `package.json` 에 `"test": "vitest"`, `"test:run": "vitest run"` 추가

### C.2 — `buildCommentTree` 단위 테스트
- `src/lib/db/__tests__/build-comment-tree.test.ts`:
  - flat → nested 기본 경로
  - orphan (parent_id 가리키는 부모 없음) → root promote
  - soft-deleted 부모 → tree 구조 유지
  - 빈 입력
- Supabase 의존성 없음 (순수함수). mock 불필요.

### C.3 — `next.config.ts` 보안 헤더 + Pretendard `next/font` 번들
- `headers()` 로 `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- CSP 는 Supabase URL 을 `connect-src` allow-list 해야 함. 최소:
  - `default-src 'self'`
  - `script-src 'self' 'unsafe-inline'` (Next inline bootstrap 필요)
  - `style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net` (Pretendard CDN 살려둘 경우)
  - `img-src 'self' data: https:`
  - `connect-src 'self' <SUPABASE_URL>`
- **더 나은 방안**: Pretendard 를 `next/font` 로 self-host → CDN 의존성 제거 + CSP 단순화
  - `npm i @fontsource-variable/pretendard` 또는 `next/font/local` 로 subset 파일 번들
  - `src/app/layout.tsx` 의 `<link>` 제거, `next/font` import
  - CSP 에서 `https://cdn.jsdelivr.net` 라인 제거

**검증**: `npm run build` → `curl -I http://localhost:3000/` 로 헤더 확인.

---

## PR D — UX/DX 마무리

**브랜치명**: `refactor/pr-d-polish`

### D.1 — `public/` 정리
- `next.svg`, `vercel.svg`, `globe.svg`, `window.svg`, `file.svg` 삭제.
- (선택) `favicon.ico` 브랜드로 교체, `opengraph-image.png` 추가.

### D.2 — `handle_new_user` 충돌 retry 강화
- `supabase/migrations/0011_signup_retry.sql` 로 `handle_new_user` 재정의:
  - 단일 `exception` 블록 대신 `loop` 5회, 매 회 suffix 길이 증가
  - 또는 단순하게 `default_username || '_' || replace(gen_random_uuid()::text, '-', '')` 로 충돌 확률 사실상 0

### D.3 — 데드 필드 / 데드 분기 정리
- `src/lib/types.ts` 의 `PostWithAuthor.liked_by_me` 필드 제거 (사용처 0). 혹은 `getPostById` 에서 `exists(select 1 from post_likes...)` embed 로 채우고 `hasUserLikedPost` 별도 쿼리 제거 → N+1 개선.
- **권장**: 후자 (embed 경로로 통일)

### D.4 — `revalidatePath` 정책 문서화
- `src/actions/README.md` 신규:
  - "user-affecting mutation (로그인/로그아웃/프로필) → `revalidatePath('/', 'layout')`"
  - "content mutation (글/댓글/좋아요) → path-only"
  - 이유: site-header 가 layout 에 있어 user 변경은 layout 날려야 함. content 는 해당 페이지만.

### D.5 — README 검증 체크리스트 tick
- Phase 1/2 셀프 검증 후 박스 채우기.
- Phase 2 에 "소프트 삭제된 글은 본인/관리자만 배너와 함께 열람 가능" 항목 추가.

### D.6 — 접근성 Tabs 패턴 보완 (선택)
- `MarkdownEditor` 의 tab 을 완전 WAI-ARIA Tabs 패턴으로:
  - 각 tab button 에 `role="tab"`, `aria-controls`, `id`
  - 각 panel 에 `role="tabpanel"`, `aria-labelledby`
  - Arrow key navigation

---

## 이연 (나중 Phase)

`review.md` 참조. 아래는 PR A~D 에 포함하지 않음:

- Rate limiting — Phase 5 admin ban/audit 와 함께
- 검색 (pg_trgm / tsvector) — Phase 3 blog 와 같이
- `post_likes.sync_post_like_count` 를 stored procedure 로 atomicize — 현재 insert-first + 23505 catch 패턴이 실용상 충분
- 댓글 원본 `original_content` 보존 — Phase 5 admin 복구 기능과 같이
- soft-delete 된 댓글 raw content 가 payload 에 포함되는 것 (review.md [P2]) — Phase 5

---

## 작업 재개 체크리스트

```bash
# 1. 현재 상태 확인
cd /Users/ren/IdeaProjects/App/cuk-sw-community
git status
git log --oneline -10
git branch

# 2. PR A 가 아직 브랜치에 있는지
git show refactor/pr-a-p0-security --stat | head -20

# 3. 어떤 PR 로 재개할지 결정 후
git checkout main
git checkout -b refactor/pr-b-data-model

# 4. 진행
npm run dev     # 동작 확인
npx tsc --noEmit
npm run lint
```
