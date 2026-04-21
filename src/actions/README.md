# actions/ — Server Actions

"use server" 로 선언된 RPC 엔드포인트들. 각 파일은 하나의 도메인 (auth,
posts, comments, likes) 을 담당하며, 다음 3 가지 규칙을 따릅니다.

## 1. 반환 vs. redirect

- **redirect 로 끝내는 flow** (예: `signInAction`, `signUpAction`,
  `signOutAction`): form submit 후 자연스럽게 다음 페이지로 이동하는
  UX. 쿼리스트링으로 에러 메시지를 전달하는 `redirectWithError` 헬퍼
  사용.
- **값을 반환하는 flow** (예: `toggleLikeAction`, `deletePostAction`
  변형들): 클라이언트가 useActionState / useTransition 으로 받아서
  optimistic UI 를 유지하는 경우.

## 2. revalidatePath 정책

Server Action 이 DB 를 바꾼 뒤에는 반드시 관련 경로의 RSC 캐시를
날려야 합니다. 정책은 다음 두 가지 분기만 기억하면 됩니다.

### 2-1. user-affecting mutation — `revalidatePath("/", "layout")`

세션/프로필이 바뀌는 액션. 사이트 헤더 (`<SiteHeader>`) 가 루트
layout 에 있고 로그인 사용자명을 렌더하기 때문에 **layout 전체를
invalidate** 하지 않으면 헤더가 stale 로 남습니다.

대상:
- `signInAction` / `signUpAction` / `signOutAction`
- 앞으로: 프로필 수정, 비밀번호 변경 등 profile/auth 관련 server action

### 2-2. content mutation — `revalidatePath("/board/[slug]")` 등

게시글/댓글/좋아요처럼 "한 경로의 콘텐츠" 만 바뀌는 액션. **해당
경로만** invalidate:
- 게시글 작성/수정/삭제: 목록 + 상세 (`/board/${slug}` + `/board/${slug}/${postId}`)
- 댓글 작성/삭제: 상세만
- 좋아요 토글: 상세만 (목록에도 like_count 가 보이면 목록도 추가)

layout 까지 invalidate 하면 모든 페이지의 RSC 캐시가 날아가 불필요한
재계산이 발생합니다.

## 3. 에러 메시지

Supabase 의 raw error 메시지는 계정 유무/권한 등 민감 정보를 노출할
수 있어 `src/lib/errors.ts:mapSupabaseError` 로 한 번 감쌉니다. 알려진
코드 (invalid_credentials, email_not_confirmed, rate_limit_exceeded)
만 친절한 한글 메시지로 변환하고 나머지는 generic "잠시 후 다시
시도해주세요" 로 흐립니다.
