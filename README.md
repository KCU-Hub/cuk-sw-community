# cuk-sw-community

고려사이버대학교 소프트웨어학부 학생들을 위한 **커뮤니티 + 블로그 + 과목 자료실** MVP.

- **Stack**: Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · Supabase (Auth + Postgres + RLS)
- **별도 백엔드 없음**: Server Actions 가 API 역할, Supabase RLS 가 권한 경계.
- **5단계 phase 로 점진적 구축** — 현재는 **Phase 1 (기반 + 인증)** 완료.

---

## Phase 진행 상황

| Phase | 상태 | 내용 |
| --- | --- | --- |
| 1. 기반 + 인증 | ✅ | Next.js 셋업, Supabase 클라이언트, 이메일 회원가입/로그인, /me, profiles/boards/courses/tags 시드 |
| 2. 포럼 | ⏳ | posts/comments/likes, 마크다운 렌더링 |
| 3. 블로그 | ⏳ | blog_posts/tags/시리즈, 코드 하이라이팅 (velog 스타일) |
| 4. 과목 자료실 | ⏳ | course_materials, 검색 |
| 5. 관리자 + OAuth + 마무리 | ⏳ | /admin, Google/Kakao OAuth, 테스트, 폴리싱 |

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

---

## 동작 확인 (Phase 1)

- [ ] `/` 랜딩 페이지가 렌더됨
- [ ] `/signup` 에서 이메일/비밀번호로 가입 → Supabase Studio 의 `auth.users` 와 `public.profiles` 양쪽에 row 생성
- [ ] `/login` 으로 로그인 → 헤더에 사용자명 + 로그아웃 버튼 표시
- [ ] `/me` 에 본인 프로필 정보 표시
- [ ] 비로그인 상태로 `/me` 접근 → `/login` 으로 redirect
- [ ] 로그아웃 → 홈으로 이동, 헤더가 다시 "로그인" 표시

---

## 디렉토리 구조 (Phase 1 시점)

```
cuk-sw-community/
├── proxy.ts                       # Next 16: middleware → proxy. Supabase 세션 갱신
├── supabase/
│   └── migrations/                # 0001/0002/0003 SQL
└── src/
    ├── app/
    │   ├── layout.tsx             # 사이트 헤더 + Pretendard
    │   ├── page.tsx               # 랜딩
    │   ├── (auth)/                # 비로그인 영역 (login, signup, signout 핸들러)
    │   └── (authed)/              # 로그인 필요 영역 (/me)
    ├── components/
    │   ├── layout/site-header.tsx
    │   └── auth/user-menu.tsx
    ├── lib/
    │   ├── supabase/              # server / browser / proxy / admin 클라이언트
    │   ├── auth/                  # getCurrentUser, requireUser
    │   ├── validation/            # zod 스키마
    │   └── types.ts
    └── actions/auth.ts            # 'use server' — signIn / signUp
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
