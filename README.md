# cuk-sw-community

고려사이버대학교 소프트웨어학부 학생들을 위한 **커뮤니티 + 블로그 + 과목 자료실** 플랫폼.

- **Stack**: Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · Supabase (Auth + Postgres + RLS)
- **별도 백엔드 없음**: Server Actions 가 API 역할, Supabase RLS 가 권한 경계.
- **5단계 phase 로 점진적 구축** — 현재 **Phase 2 (포럼)** 완료.

---

## Phase 진행 상황

| Phase | 상태 | 내용 |
| --- | --- | --- |
| 1. 기반 + 인증 | ✅ | Next.js 셋업, Supabase 클라이언트, 이메일 회원가입/로그인, /me, profiles/boards/courses/tags 시드, error/loading/404, 이메일 확인 플로우, a11y |
| 2. 포럼 | ✅ | posts/comments/post_likes, RLS, 마크다운 렌더링 (react-markdown + sanitize + highlight.js), 게시판 목록/상세/작성/수정, 댓글 트리, 좋아요 (optimistic), 조회수 RPC |
| 3. 블로그 | ⏳ | blog_posts/tags/시리즈, velog 스타일 |
| 4. 과목 자료실 | ⏳ | course_materials, 검색 |
| 5. 관리자 + OAuth + 마무리 | ⏳ | 고급 admin 콘솔 (사용자 ban/삭제/리셋 + audit_logs), Google/Kakao OAuth, 테스트, 폴리싱 |

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

`supabase/migrations/` 안의 파일을 **숫자 순서대로** 실행:

1. `0001_init.sql`
2. `0002_rls.sql`
3. `0003_seed.sql`

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

이후로는 `/admin/users` (Phase 5 에서 추가 예정) 에서 관리.

### 6. 개발 서버 실행

```bash
npm run dev
```

http://localhost:3000 으로 접속.

### 7. (권장) 타입 생성

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

---

## 디렉토리 구조 (Phase 2 시점)

```
cuk-sw-community/
├── proxy.ts                       # Next 16: middleware → proxy. Supabase 세션 갱신
├── supabase/
│   └── migrations/                # 0001~0005 SQL (Phase 1 init/RLS/seed + Phase 2 forum/RLS)
└── src/
    ├── app/
    │   ├── layout.tsx             # 사이트 헤더 + Pretendard + 메타데이터
    │   ├── page.tsx               # 랜딩
    │   ├── error.tsx              # 클라이언트 에러 바운더리
    │   ├── loading.tsx            # 로딩 스켈레톤
    │   ├── not-found.tsx          # 404
    │   ├── (auth)/                # 비로그인 영역
    │   │   ├── login, signup
    │   │   └── auth/{callback, signout, check-email}
    │   ├── (authed)/              # 로그인 필요
    │   │   ├── me/
    │   │   └── board/[slug]/{new, [postId]/edit}
    │   └── (public)/              # 누구나 읽기
    │       └── board/{., [slug], [slug]/[postId]}
    ├── components/
    │   ├── layout/site-header.tsx
    │   ├── auth/user-menu.tsx
    │   ├── markdown/{markdown-renderer, markdown-editor}.tsx
    │   ├── board/{post-card, comment-tree/item, comment-form, like-button, ...}.tsx
    │   └── ui/pagination.tsx
    ├── lib/
    │   ├── supabase/              # env / server / browser / proxy / admin 클라이언트
    │   ├── auth/                  # getCurrentUser, requireUser/Profile/Admin
    │   ├── db/                    # posts.ts, comments.ts (PostgREST embed)
    │   ├── validation/            # zod 스키마 (auth, post, comment)
    │   ├── markdown/sanitize-schema.ts
    │   ├── format.ts              # Intl 기반 한국어 날짜
    │   ├── constants.ts           # BOARD_LABELS, isBoardSlug 가드, PAGE_SIZE
    │   └── types.ts
    └── actions/                   # 'use server'
        ├── auth.ts (signIn / signUp)
        ├── posts.ts (create / update / delete / incrementView)
        ├── comments.ts (create / delete)
        └── likes.ts (toggle)
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
npm run dev      # 개발 서버 (Turbopack)
npm run build    # 프로덕션 빌드
npm run start    # 빌드 결과 실행
npm run lint     # ESLint
```
