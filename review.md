# cuk-sw-community — review

조사 일자: 2026-04-11 (재검증)
대상 커밋: `ff1ee3b` (Phase 2 완료) · fix branch `fix/likes-race-and-rls` → PR #1
스택: Next.js 16.2.3 (App Router) · React 19.2.4 · TypeScript strict · Supabase SSR 0.10 (Auth + Postgres + RLS) · Tailwind v4

---

## 1. 원격 상태 (heznpc/cuk-sw-community)

- 미해결 이슈: **0건**
- 미해결 PR: **1건** — #1 "fix: likes race + view dedupe + soft-delete RLS + depth cap" (fix/likes-race-and-rls)
- 브랜치 모델: `main` 단일, Phase 단위로 직선 커밋

→ 외부에서 들어온 보고/요청은 없음. fix TODO는 모두 내부 self-review 결과임. PR #1은 본 review의 P0/P1/P3 항목 일부를 반영함.

---

## 2. 코드 품질 종합

### 강점 (변경 불필요, 회귀 방지 가치)

- **Next 16 컨벤션 준수**: `proxy.ts`, `await cookies()`, `Promise<{ params }>` 모두 정확. AGENTS.md의 가이드와 일치.
- **권한 모델 2-layer**: edge proxy에서는 세션 갱신만, 라우트 가드는 `(authed)/layout.tsx` server component로 분리. RLS와 server action `requireProfile()`까지 합쳐 3중 방어.
- **RLS가 진짜로 동작함**: `posts_insert_authed` `with check (auth.uid() = author_id and (board_slug <> 'notice' or public.is_admin()))` — admin 게시판 보호가 DB에 박혀 있음. server action을 우회해도 못 뚫음.
- **XSS 표면 1개로 한정**: 모든 UGC 마크다운이 `sanitize-schema.ts`의 화이트리스트를 통과. 화이트리스트에 명시적으로 적힌 attribute 외에는 stripped. 코드블럭 highlight class까지 정규식 화이트리스트(`/^hljs-/`).
- **N+1 회피**: `fetchUserAndProfile`을 `react.cache`로 감싸 트리당 1회 hit으로 dedupe. layout/page에서 동일 user를 가져와도 1쿼리.
- **denormalized count + trigger**: `like_count`, `comment_count`를 트리거로 maintain. soft delete 토글까지 처리하는 `sync_post_comment_count` 분기 깔끔.
- **부분 인덱스**: `idx_posts_board_created on (board_slug, created_at desc) where is_deleted = false` — 목록 쿼리에 정확히 매치.
- **React 19 활용**: `useOptimistic`로 좋아요 즉시 반영, `useTransition`으로 UI freeze 방지.

### Fix TODO (우선순위순)

> **PR #1 처리 현황** (fix/likes-race-and-rls):
> - ✅ 좋아요 race (insert-first + 23505 catch)
> - ⚠️ view count (client-side TTL dedupe만, server-side throttle는 여전히 열려있음)
> - ✅ soft delete 본인 가시성
> - ✅ comment depth cap (DB trigger)
> - ✅ orphan comment 분기 주석 명시
> - ✅ MarkdownRenderer PluggableList 타입

**[P0] 좋아요 토글의 race** *(PR #1에서 닫힘)*
- 위치: `src/actions/likes.ts:19-38`
- 증상: `select existing` → `insert/delete`가 비원자적. 사용자가 더블클릭하거나 두 탭에서 동시에 누르면 unique violation 에러가 사용자에게 노출됨.
- Fix:
  - DB 함수로 atomicize: `create function toggle_post_like(p_post_id uuid) returns ...` 안에서 `insert ... on conflict do nothing returning ... ; if not found then delete ...` 패턴.
  - 또는 server action에서 unique violation(`23505`)을 catch해서 idempotent 처리.

**[P0] view count 무한 증가 가능** *(PR #1에서 client-side만 부분 처리, server-side 필요)*
- 위치: `src/actions/posts.ts:98-101` + `0004_posts.sql:127` (`increment_post_view` RPC)
- 증상: anon에게 RPC execute 권한이 열려 있어 누구나 무제한 호출 가능. 봇이 한 게시글의 view count를 임의로 부풀릴 수 있음.
- Fix:
  - 옵션 A: post_id + IP/세션 기반 dedupe를 24h window로 (별도 `post_view_log` 테이블 + unique constraint).
  - 옵션 B: 일단 client-side `localStorage` flag로 같은 브라우저 재방문 무시 + 후순위로 server 측 throttle.
  - 옵션 C: `view_count`를 분석 도구(Plausible/PostHog)로 outsource.

**[P0] 본인 글 soft delete 후 조회 불가** *(PR #1에서 닫힘)*
- 위치: `0005_posts_rls.sql:11-14` (`posts_select_public using (is_deleted = false)`)
- 증상: 작성자 본인도 본인이 삭제한 글을 못 봄. 복구/admin 사후 검토가 막힘.
- Fix: `using (is_deleted = false or auth.uid() = author_id or public.is_admin())`로 확장. 단 list 쿼리는 `getPostsByBoard`에서 명시적으로 `is_deleted=false` 필터 유지.

**[P1] comment depth cap이 클라이언트에만 존재** *(PR #1에서 닫힘)*
- 위치: `src/components/board/comment-tree.tsx:38` (`COMMENT_REPLY_DEPTH_CAP=3`) — DB측 제약 없음
- 증상: API/RLS만 직접 때리면 무한 depth 생성 가능. UI는 멀쩡해 보이지만 트리 빌드 비용이 폭발할 수 있음.
- Fix: trigger 또는 check constraint로 `parent depth + 1 <= 3` 강제. recursive CTE로 depth 산출하는 trigger 권장.

**[P1] rate limiting 부재**
- 위치: `src/actions/{posts,comments,likes}.ts` 전부
- 증상: 글/댓글/좋아요 모두 spam 가능. 학부 규모라 당장은 안 터지지만 OAuth 붙는 Phase 5에서 가입 봇이 들어오면 즉시 문제.
- Fix:
  - Supabase Edge Function의 `pg_net` + `rate_limit` 테이블 패턴, 또는
  - server action 진입점에서 `profile.id + action` 기반 sliding window를 Postgres에 기록 (`upsert + count where created_at > now() - interval '1 minute'`).
  - Phase 5와 묶어서 admin 콘솔의 ban 기능과 같이 들여놓는 것이 자연스러움.

**[P1] orphan 댓글이 root로 떠오르는 동작** *(PR #1에서 주석으로 명시)*
- 위치: `src/lib/db/comments.ts:24-49` (`buildCommentTree`)
- 증상: 부모가 hard delete된 자식이 root로 promote됨. soft delete 정책상 부모는 보통 살아있지만, 의도된 동작인지 코드에 명시 없음. 또한 부모 hard delete 경로는 `comments` 테이블의 `on delete cascade`로 자식까지 삭제되므로 사실상 도달 불가능. 데드 코드 또는 의도 미스.
- Fix: 주석을 "soft delete만 사용하므로 이 분기는 hard delete된 (관리자 직접 삭제) 케이스만 다룬다" 라고 명확히 기록하거나, 해당 분기를 제거하고 `parent_id` 조회 실패 시 throw.

**[P1] tests 없음 (소스 영역)**
- 위치: `src/**` 전체. test 파일 0개.
- Fix: Phase 5의 "테스트, 폴리싱"으로 미루지 말고 다음 함수들은 지금 unit test 대상:
  - `buildCommentTree` — 트리 구축 + orphan 케이스
  - `sanitizeSchema` — 알려진 XSS payload (`<img onerror>`, `javascript:` href, `<iframe>`) 차단 회귀 가드
  - `isBoardSlug`, `createPostSchema`, `createCommentSchema`, `signUpSchema` — 경계값
  - `handle_new_user` (pg-tap 또는 supabase test client) — username collision retry
- 권장 도구: vitest + `@testing-library/react` + msw, RLS는 supabase local + pgTAP.

**[P2] cookie revalidate 경로 일관성**
- 위치: `src/actions/auth.ts:27` 은 `revalidatePath("/", "layout")`, `posts.ts:41,71` 은 path만.
- 증상: site-header(로그인 유저명)는 layout 렌더링이라, 글쓰기 후 헤더 갱신이 누락되는 경계 케이스가 생길 수 있음. 큰 버그는 아님.
- Fix: 정책 문서화. user-affecting mutation은 `revalidatePath("/", "layout")`, content mutation은 path-only.

**[P2] `getCommentsByPost`가 soft-deleted 댓글의 원본 content를 같이 가져옴**
- 위치: `src/lib/db/comments.ts:9-20`
- 증상: `is_deleted=true` 인 댓글의 `content` 필드가 RLS에 의해 마스킹되지 않은 채 클라이언트에 전송됨. (UI는 "[삭제된 댓글]" 표시지만 raw payload에는 원본이 들어 있음.) 삭제 액션이 `content="[삭제된 댓글]"`로 update 하므로 실제로는 마스킹되지만, **원작자가 다시 살리거나 admin이 복구하는 경로가 없으면 데이터 유실**. 의도/비의도 결정이 필요.
- Fix: 원본 보존이 필요하면 `original_content` 컬럼 추가, 필요 없으면 현재 동작 유지하되 주석으로 명시.

**[P2] `username` 충돌 retry 1회 한정**
- 위치: `0001_init.sql:73-81` (`handle_new_user`)
- 증상: 두 번째도 충돌하면 가입 자체 fail. 학부 규모에선 거의 안 터지지만 흔한 prefix(`hong`, `kim`)에선 가능.
- Fix: `loop` 으로 최대 5회까지, `random()` suffix 길이 점진 증가.

**[P2] 검색 부재**
- 위치: 글 목록 페이지에 검색 UI 없음.
- 증상: 게시글이 수십 개 넘어가면 발견성 급락. Phase 4의 "검색"이 자료실 한정이라면 forum 검색은 별도 trello 필요.
- Fix: Postgres `tsvector` + `tsquery`로 한국어 검색 (`pg_trgm` + `simple` 사전), 또는 Supabase의 `pgvector + 임베딩`으로 세만틱 검색. 게시판이 작을 때 도입 비용 낮음.

**[P3] React Markdown 플러그인 `as any` cast** *(PR #1에서 닫힘)*
- 위치: `src/components/markdown/markdown-renderer.tsx:25`
- 증상: rehype 플러그인 튜플 타입과 react-markdown 타입 사이의 구조적 불일치. eslint disable 1개. 해결책은 명시적 타입 단언 (`PluggableList`).
- Fix: `import type { PluggableList } from "unified"` → `const rehypePlugins: PluggableList = [...]`.

**[P3] README 검증 체크리스트가 빈 박스**
- 위치: `README.md:103-126`
- Fix: Phase 1/2 셀프 verification 후 체크표시. 외부 contributor가 와도 검증 상태를 빠르게 파악 가능.

---

## 3. 테스트 상태

- **소스 영역 테스트: 0개.** (`node_modules` 내부 의존성 테스트는 카운트 제외)
- 엉터리 테스트는 없음 — 애초에 존재하지 않음.
- README의 Phase 5에 "테스트" 항목이 있으므로 의도된 deferral. 다만 위 P1 항목 참조.

---

## 4. 시장 가치 (2026-04-11 기준, 글로벌 관점)

**한 줄 평**: 글로벌 시장 가치 거의 0 — 의도적으로 한 학교 한 학부에 묶인 internal tool. 단, 같은 코드베이스를 그대로 SaaS화할 여지는 비교적 큼.

**근거**

- 글로벌 Social Learning Platforms 시장은 2025 USD 124.8B → 2035 USD 254.8B (CAGR 7.4%)로 성장 중. ([Spherical Insights](https://www.sphericalinsights.com/blogs/top-25-companies-in-global-social-learning-platforms-market-worldwide-2025-market-research-report-2026-2035))
- Higher-ed community 부문 dominant player: **Disco, Circle, Mighty Networks, Bettermode, Kajabi, Heartbeat, Slack, Discord**. ([Disco](https://www.disco.co/blog/best-community-platforms-universities-2026), [LearnWorlds](https://www.learnworlds.com/blog/community-building/best-community-platforms/))
- 이들은 **"한 캠퍼스" 단위가 아니라 "한 강사/한 코호트" 단위**의 SaaS. 가격은 월 $50–500 구간.
- 본 레포의 차별점은 **(1) 한국 사이버대학 컨텍스트** (2) **OSS 자체 호스팅** (3) **Supabase 기반 풀스택**.
- **글로벌 수요 매칭 가능성**:
  - 그대로: 0. 한국어 UI, board slug 한국어, 단일 학과 가정.
  - 일반화 후(테넌트 분리, i18n, 학부/학과 도메인 모델 추상화): 자체 호스팅 community starter kit으로 niche 가치 있음. 비교 대상은 [BuddyBoss](https://buddyboss.com/blog/top-social-learning-platforms-online-courses/), [Bettermode](https://www.mightynetworks.com/resources/community-platforms) 의 self-hosted 변종.
- **국내 가치**: 고려사이버대학 소프트웨어학부 내부에서 실제 사용된다면 직접 가치 있음. 캡스톤/포트폴리오 측면에서는 Supabase RLS, Next 16 마이그레이션, 마크다운 sanitization 패턴이 최신 stack.
- **결론**: 글로벌 SaaS 진출은 의도가 아니며, 권하지 않음. 코드 자체는 "Supabase + Next 16 풀스택 starter"로 OSS 공개해도 통할 품질.

---

## 5. 한 줄 요약

> Phase 2 까지의 코드 품질은 1인 풀스택이 만든 것 치고 매우 깔끔하나, **좋아요 race / view RPC 무방비 / RLS의 본인 삭제글 가시성** 3개는 Phase 3 진입 전에 닫고 가는 것이 좋음. 테스트는 Phase 5에 미루더라도 sanitize-schema 회귀 가드만은 지금 박아둘 것.

## Sources

- [Top 7 Community Platforms for Universities 2026 — Disco](https://www.disco.co/blog/best-community-platforms-universities-2026)
- [Best Community Platforms for Higher Education 2026 — Disco](https://www.disco.co/blog/best-community-platforms-higher-education-2026)
- [21 Best Community Platforms 2026 — LearnWorlds](https://www.learnworlds.com/blog/community-building/best-community-platforms/)
- [Top 25 Companies in Global Social Learning Platforms — Spherical Insights](https://www.sphericalinsights.com/blogs/top-25-companies-in-global-social-learning-platforms-market-worldwide-2025-market-research-report-2026-2035)
- [Top Social Learning Platforms — BuddyBoss](https://buddyboss.com/blog/top-social-learning-platforms-online-courses/)
- [20 Best Online Community Platforms — Mighty Networks](https://www.mightynetworks.com/resources/community-platforms)
