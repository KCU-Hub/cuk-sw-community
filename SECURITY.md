# Security Policy

## 지원 범위

`cuk-sw-community` 는 고려사이버대학교 소프트웨어학부 학생을 위한
사이트입니다. 본 정책은 본 레포의 main 브랜치에서 빌드된 배포본 +
`supabase/migrations/` 의 스키마/RLS 정책에만 해당합니다.

## 취약점 제보

다음 경로로 비공개 제보해주세요:

- **GitHub Security Advisories** (권장):
  <https://github.com/heznpc/cuk-sw-community/security/advisories/new>
- **이메일**: 본 레포 owner 의 GitHub 프로필에 공개된 연락처

48 시간 안에 1차 응답을 드립니다. Public issue 에 취약점을 직접 적지
말아주세요.

## 다루는 데이터

- `auth.users` — 이메일 + OAuth 식별자 (Supabase 가 관리)
- `public.profiles` — username, role, 가입 시각
- 게시글 / 댓글 / 블로그 / 자료실 업로드 본문 (사용자가 직접 게시한 콘텐츠)
- `user_courses` — 본인 학점 기록 (RLS 로 본인만 read/write)
- `audit_logs` — admin ban/unban 액션 기록 (admin 만 read)

## RLS·rate limit·sanitize

- 모든 user-write 테이블은 `supabase/migrations/` 에 RLS 정책 포함
- 마크다운 본문은 `rehype-sanitize` + `src/lib/markdown/sanitize-schema.ts`
  로 sanitize. 회귀 테스트 `src/lib/markdown/__tests__/sanitize.test.ts`
- POST / COMMENT / LIKE 액션은 `src/lib/rate-limit.ts` 의 sliding-window
  enforcer 사용
- 보안 헤더 (CSP / X-Frame-Options / Referrer-Policy / Permissions-Policy /
  X-Content-Type-Options) 는 `next.config.ts` 에서 모든 경로에 부여

## Out-of-scope

- 사용자가 본인 권한 안에서 자기 데이터에 한 행동 (예: 자기 글의 의도적
  스팸성 작성) — 운영 정책 영역
- Third-party 가 운영하는 인프라 (Supabase, Vercel) 자체의 취약점 — 각
  provider 에 직접 제보 부탁드립니다
