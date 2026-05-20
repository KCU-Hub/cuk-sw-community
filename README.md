# cuk-sw-community

고려사이버대학교 소프트웨어학부 학생들을 위한 **커뮤니티 · 블로그 · 과목 자료실 · 개인 학점 관리** 플랫폼.

- **Stack**: Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · Supabase (Auth + Postgres + RLS + Storage)
- **별도 백엔드 없음**: Server Actions 가 API 역할, Supabase RLS 가 권한 경계.

---

## 한눈에 보기

- **Currently implemented** — Phase 1~5 (인증 / 포럼 / 블로그 / 과목 자료실 / 관리자) + 개인 학점 관리 (GPA 트래커). 마이그레이션 0001~0017, 테스트 47건 (sanitize 회귀 / rate-limit / 댓글 트리 / GPA), GitHub Actions CI (lint + typecheck + vitest).
- **Planned** — 프로덕션 배포. 베이스 row 타입을 `src/lib/types.generated.ts` 로 단일화 (`src/lib/types.ts` 는 `PostWithAuthor` / `CommentNode` 같은 도메인 타입만 유지).
- **Design intent** — Server Actions = API · Supabase RLS = 권한 경계. 자료실 카탈로그 (`courses`) 와 개인 학점 기록 (`user_courses`) 을 의도적으로 분리: 전자는 학부 공통 카탈로그, 후자는 사용자가 들은 임의 과목을 자유 입력 (학기 문자열도 자유 입력). 댓글 depth cap 은 UI + DB trigger 이중 가드. 폰트 (Pretendard) 는 self-host — 외부 CDN 요청 0건이 CSP 의 가드레일.
- **Non-goals** — 모바일 앱 · 실시간 채팅 · 다국어. 한국어 + CUK 학부 학생 한정. 익명 외부 사용자 / 공개 SaaS 가 아님.
- **Redacted** — 배포 도메인, 학교 인증 정책 (학생 검증 방식 등 배포 전 확정 사항).

---

## 기능 현황

| 영역 | 상태 | 내용 |
| --- | --- | --- |
| 1. 기반 + 인증 | ✅ | Next.js 셋업, Supabase 클라이언트, 이메일 회원가입/로그인, `/me`, profiles/boards/courses/tags 시드, error/loading/404, 이메일 확인 플로우, a11y |
| 2. 포럼 | ✅ | posts/comments/post_likes, RLS, 마크다운 (sanitize + highlight.js), 게시판 목록/상세/작성/수정, 댓글 트리 + depth cap, 좋아요 (optimistic), 조회수 dedupe |
| 3. 블로그 | ✅ | blog_posts / blog_series / blog_post_tags, velog 스타일 카드 + 태그 + 시리즈, draft, view count |
| 4. 과목 자료실 | ✅ | course_materials + tsvector 풀텍스트 검색, Supabase Storage 파일 업로드 (20 MB), 종류 필터 |
| 5. 관리자 + OAuth + 보안 | ✅ | Google/Kakao OAuth, rate limit (post/comment/like), admin ban + audit_logs, `/admin/users` 콘솔, CSP/보안 헤더, sanitize 회귀 테스트 |
| 6. 개인 학점 관리 | ✅ | `user_courses` 자유 입력 + 4.5 만점 GPA + P/NP 제외 + `is_excluded` 행 단위 제외 + 마일스톤 (B / B+ / 조기졸업 4.0 / A / A+) |
| CI | ✅ | `.github/workflows/ci.yml` — lint · typecheck · vitest |

배포 전 디버깅 라운드 진행 중.

---

## 최초 셋업 (Phase 1 까지 동작시키기)

### 1. 의존성 설치

```bash
npm install
```

### 2. Supabase 프로젝트 준비

#### 옵션 A — Supabase Cloud (권장, 가장 빠름)

1. https://supabase.com/dashboard 에서 새 프로젝트 생성
2. **Settings → API** 에서 다음 값을 복사:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` → `SUPABASE_SERVICE_ROLE_KEY` (관리자 작업용, 서버 전용)

#### 옵션 B — Supabase Local (Docker 필요)

```bash
# Supabase CLI 설치 (Mac)
brew install supabase/tap/supabase

# 로컬 인스턴스 시작
supabase start
```

`supabase start` 출력에서 `API URL`, `anon key`, `service_role key` 를 복사.

### 3. 환경 변수 파일 작성

```bash
cp .env.local.example .env.local
```

복사한 `.env.local` 을 열어 위에서 받은 값으로 채워주세요.

### 4. 마이그레이션 적용

#### 옵션 A (Cloud) — Supabase 대시보드의 SQL Editor 에서 차례로 실행

`supabase/migrations/` 안의 파일을 **숫자 순서대로** 실행 (`0001_init.sql` → … → `0017_user_courses.sql`).

#### 옵션 B (Local) — CLI 가 자동 적용

`supabase start` 시 `supabase/migrations/` 의 파일이 알파벳 순서로 자동 적용됩니다. 이미 시작했다면:

```bash
supabase db reset
```

### 5. (선택) 첫 관리자 promote

가입 후 본인 계정을 관리자로 만들고 싶다면 SQL Editor 에서:

```sql
update public.profiles set role = 'admin' where username = '내_사용자명';
```

이후로는 `/admin/users` 에서 관리.

### 6. 개발 서버 실행

```bash
npm run dev
```

http://localhost:3000 으로 접속.

### 7. (권장) OAuth 프로바이더 연결

학부 학생들의 가입 장벽을 줄이기 위해 **Google / Kakao** 소셜 로그인을
권장합니다. Supabase 대시보드 기준 세팅:

1. **Authentication → Providers** → `Google` / `Kakao` 활성화
2. 각 프로바이더 콘솔에서 OAuth 클라이언트 발급 후 Client ID/Secret 입력
3. **Redirect URL** 로 아래 두 개 모두 등록:
   - `http://localhost:3000/auth/callback` (개발)
   - `https://<배포-도메인>/auth/callback` (프로덕션)
4. Supabase 의 **Site URL** 을 배포 도메인으로 설정 (`.env.local` 의
   `NEXT_PUBLIC_SITE_URL` 과 일치해야 합니다 — OAuth 초기화가 이 값을
   `redirectTo` 로 보내기 때문).

코드 쪽은 이미 `signInWithProviderAction` + `<OAuthButtons>` 이 붙어
있어 프로바이더만 켜면 바로 `/login` / `/signup` 에서 버튼이 동작합니다.

### 8. (권장) 타입 생성

마이그레이션을 추가/수정한 뒤엔 Supabase 스키마와 TypeScript 타입의 드리프트를
막기 위해 타입을 재생성해주세요. 결과물 (`src/lib/types.generated.ts`) 은 커밋
대상입니다.

```bash
# 로컬 Supabase 를 쓸 때
npm run types:gen:local

# 클라우드 프로젝트에서 뽑아올 때
SUPABASE_PROJECT_ID=xxxxxxxx npm run types:gen:remote
```

현재 `src/lib/types.ts` 의 수동 타입과 병행 운용합니다. 앞으로 도메인 타입
(`PostWithAuthor`, `CommentNode`) 만 `types.ts` 에 남기고 베이스 row 타입은
generated 로 이관할 예정입니다.

---

## 동작 확인

### Phase 1 (기반 + 인증)

- [x] `/` 랜딩 페이지가 렌더됨
- [x] `/signup` 에서 이메일/비밀번호로 가입 → Supabase Studio 의 `auth.users` 와 `public.profiles` 양쪽에 row 생성
- [x] 이메일 확인이 켜져 있으면 `/auth/check-email` 로 이동, 메일 링크 클릭 → `/auth/callback` → `/me`
- [x] `/login` 으로 로그인 → 헤더에 사용자명 + 로그아웃 버튼 표시
- [x] `/me` 에 본인 프로필 정보 표시
- [x] 비로그인 상태로 `/me` 접근 → `/login` 으로 redirect
- [x] 로그아웃 → 홈으로 이동, 헤더가 다시 "로그인" 표시
- [x] Tab 키로 포커스 이동 시 좌상단에 "본문으로 건너뛰기" 링크 표시
- [x] 의도적으로 에러 발생시키면 `app/error.tsx` 의 reset 화면이 뜸

### Phase 2 (포럼)

- [x] `/board` 에서 자유/질문/공지 게시판 목록 표시
- [x] `/board/free` 등 게시판별 페이지 → 글이 없으면 빈 상태, 있으면 카드 리스트 + 페이지네이션
- [x] 비로그인 상태에선 "글쓰기" 버튼 숨김, 로그인 후 노출
- [x] notice 게시판은 admin 이 아니면 글쓰기 버튼 숨김 (admin 으로 promote 후 확인)
- [x] 글쓰기 → 마크다운 작성/미리보기 탭 → 게시 → 상세 페이지로 이동
- [x] 코드 블록 (```` ```ts ````) → highlight.js 로 색상 적용, GFM 표/체크박스 동작
- [x] 게시글 상세에서 좋아요 버튼 → optimistic 업데이트, 새로고침 후 카운트 유지
- [x] 조회수가 페이지 진입 시 1 증가 (mount-once), 동일 viewer 24h 재방문은 dedupe (0007)
- [x] 댓글 작성, 답글 (대댓글), 깊이 cap 3 까지 들여쓰기 (UI + DB trigger 이중 가드)
- [x] 본인 글/댓글에만 수정/삭제 노출, 다른 사용자 계정으로 시도 시 RLS 거부
- [x] 게시글/댓글 삭제 시 soft delete (`is_deleted=true`) 확인
- [x] 소프트 삭제된 글은 본인/관리자만 배너와 함께 열람 가능 (좋아요/댓글 비활성)
- [x] 탈퇴한 사용자의 게시글/댓글은 "탈퇴한 사용자" 로 렌더 (author_id = null)

### Phase 3 (블로그)

- [ ] `/blog` 에서 최신 발행글 카드 그리드 + 태그 클라우드
- [ ] `/blog/new` 에서 제목/본문/태그 입력 → 발행 → `/blog/{username}/{slug}` 이동
- [ ] slug 를 비우면 제목 기반으로 자동 생성 (한글 제목은 `post-xxxx` fallback)
- [ ] `/blog/{username}` 에서 저자 프로필 + 본인이면 draft 포함 목록
- [ ] 태그 클릭 → `/blog/tag/{slug}` 에서 해당 태그 글만
- [ ] 상세에서 마크다운 + 코드 하이라이트 + view 카운트 (24h dedupe)
- [ ] 시리즈 지정 시 상세 하단에 시리즈 목차 nav
- [ ] draft 저장 → 비로그인/타계정 방문 시 404, 본인은 DRAFT 배너와 함께 열람

### Phase 4 (과목 자료실)

- [ ] `/courses` 에 10 개 과목 (0003 시드) 카드 표시
- [ ] `/courses/{slug}` 에서 종류 필터 + 검색 (tsvector `simple` dict)
- [ ] `/courses/{slug}/new` 에서 파일 업로드 (20 MB 이내) → Supabase Storage 에 저장, 반환 path 가 hidden input 으로 서버 액션에 전달
- [ ] 상세에서 첨부파일 공개 URL / 외부 링크 / 마크다운 본문 표시
- [ ] 본인/admin 만 수정/삭제 노출
- [ ] ban 된 계정은 업로드 / 자료 등록 모두 RLS 거부

### Phase 5 (관리자 / 배포 준비)

- [ ] Google/Kakao OAuth 로 로그인 가능 (Supabase Dashboard 설정 필요 — 위 7번 항목)
- [ ] `/admin/users` 에서 사용자 검색 + ban(1d/7d/30d/permanent) + 사유 + 해제
- [ ] ban 된 계정으로 글/댓글/좋아요 시도 시 '권한이 없습니다'
- [ ] 같은 계정으로 1분 내 6번 글쓰기 → 6번째부터 rate limit 차단
- [ ] 브라우저 DevTools 에서 CSP / X-Frame-Options / Permissions-Policy 헤더 5개 확인
- [ ] jsdelivr.net 네트워크 요청 0건 (Pretendard self-host)
- [ ] `<script>`, `<img onerror>`, `javascript:` href 등 XSS 페이로드 입력 → 렌더 결과에서 제거됨 (sanitize 테스트 15건 회귀 가드)

### Phase 6 (개인 학점 관리)

- [ ] `/gpa` 에서 학기별 수강 목록 + 누적 GPA / 학기별 GPA / 마일스톤 진행도 표시
- [ ] `/gpa/new` 에서 과목명 · 학점 · 성적 (A+~F / P / NP) · 학기 자유 입력 → 목록에 추가
- [ ] P / NP 행은 평점 평균 계산에서 제외, 학점은 별도 누적
- [ ] `is_excluded` 토글 시 해당 행이 GPA 계산에서 빠지지만 목록에는 남음
- [ ] 본인 외 계정에서 `/gpa` 접근 / 타인 row 수정 시 RLS 거부

---

## 디렉토리 구조

```
cuk-sw-community/
├── proxy.ts                       # Next 16: middleware → proxy. Supabase 세션 갱신
├── next.config.ts                 # CSP + 보안 헤더 5종
├── .github/workflows/ci.yml       # lint + typecheck + vitest
├── supabase/
│   └── migrations/                # 0001 ~ 0017
└── src/
    ├── app/
    │   ├── layout.tsx             # Pretendard self-host + 메타데이터
    │   ├── page.tsx               # 랜딩
    │   ├── error.tsx, loading.tsx, not-found.tsx
    │   ├── fonts/                 # PretendardVariable.woff2 (self-hosted)
    │   ├── (auth)/                # 비로그인 영역 (login/signup + OAuth)
    │   ├── (authed)/              # 로그인 필요
    │   │   ├── me/
    │   │   ├── admin/users/       # ban/unban + audit
    │   │   ├── board/[slug]/{new, [postId]/edit}
    │   │   ├── blog/new, blog/[username]/[slug]/edit
    │   │   ├── courses/[slug]/{new, [materialId]/edit}
    │   │   └── gpa/{., new, [courseId]}   # 개인 학점 관리
    │   └── (public)/              # 누구나 읽기
    │       ├── board/{., [slug], [slug]/[postId]}
    │       ├── blog/{., [username], [username]/[slug], tag/[tag]}
    │       └── courses/{., [slug], [slug]/[materialId]}
    ├── components/
    │   ├── layout/site-header.tsx
    │   ├── auth/{user-menu, oauth-buttons}.tsx
    │   ├── markdown/{markdown-renderer, markdown-editor}.tsx
    │   ├── board/{post-card, comment-tree/item, comment-form, like-button, ...}.tsx
    │   ├── blog/{blog-card, blog-post-form, blog-view-tracker}.tsx
    │   ├── courses/{course-material-form, file-upload-input}.tsx
    │   ├── gpa/{gpa-summary-card, user-course-form}.tsx
    │   ├── admin/user-row.tsx
    │   └── ui/pagination.tsx
    ├── lib/
    │   ├── supabase/              # env / server / browser / proxy / admin 클라이언트
    │   ├── auth/                  # getCurrentUser, requireUser/Profile/Admin
    │   ├── db/                    # posts, comments, blog, courses, admin (PostgREST embed)
    │   ├── validation/            # zod (auth, post, comment, blog, course-material, user-course)
    │   ├── markdown/sanitize-schema.ts
    │   ├── __tests__/             # rate-limit, gpa 등
    │   ├── markdown/__tests__/sanitize.test.ts
    │   ├── db/__tests__/build-comment-tree.test.ts
    │   ├── rate-limit.ts          # sliding-window pure fn + enforcer
    │   ├── gpa.ts                 # GRADE_POINTS + GPA_MILESTONES + summarize
    │   ├── author.ts              # formatAuthorName (탈퇴 사용자 라벨)
    │   ├── format.ts              # Intl 한국어 날짜
    │   ├── errors.ts              # mapSupabaseError + SQLSTATE 상수
    │   ├── constants.ts           # BOARD_SLUGS/isBoardSlug, PAGE_SIZE, depth cap
    │   └── types.ts
    └── actions/                   # 'use server'
        ├── auth.ts (signIn / signUp / signInWithProvider)
        ├── posts.ts (create / update / delete / incrementView)
        ├── comments.ts (create / delete)
        ├── likes.ts (toggle)
        ├── blog.ts (create / update / delete / incrementBlogView)
        ├── course-material.ts (create / update / delete)
        ├── user-course.ts (create / update / delete / toggleExcluded)
        ├── admin.ts (banUser / unbanUser)
        └── README.md (revalidatePath 정책)
```

---

## Next 16 주의사항

이 프로젝트는 Next.js 16 의 새로운 컨벤션을 따릅니다:

- **`middleware.ts` → `proxy.ts`** (rename, 동작은 동일)
- **`cookies()` async**: `await cookies()`
- **`params` is Promise**: `params: Promise<{ slug: string }>` → `await params`
- **`searchParams` is Promise**: 동일
- **`PageProps<'/route'>` 글로벌 타입 헬퍼** 사용 가능
- **React 19 `useActionState`** (구 `useFormState` 대체)

## Scripts

```bash
npm run dev        # 개발 서버 (Turbopack)
npm run build      # 프로덕션 빌드
npm run start      # 빌드 결과 실행
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit
npm test           # vitest (watch)
npm run test:run   # vitest run (CI 동일)
```
