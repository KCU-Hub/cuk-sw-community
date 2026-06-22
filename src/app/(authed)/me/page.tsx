import Link from "next/link";
import { requireProfile } from "@/lib/auth/require-user";

export const metadata = {
  title: "내 프로필",
};

export default async function MePage() {
  const profile = await requireProfile();
  const displayName = profile.display_name || profile.username;
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-4">
          {profile.avatar_url ? (
            <div
              aria-hidden="true"
              className="h-16 w-16 rounded-full border border-zinc-100 bg-cover bg-center"
              style={{
                backgroundImage: `url(${JSON.stringify(profile.avatar_url)})`,
              }}
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-50 text-lg font-semibold text-brand-900">
              {initials}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{displayName}</h1>
            <p className="mt-1 text-sm text-zinc-500">@{profile.username}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-900">
            {profile.role === "admin" ? "관리자" : "일반회원"}
          </span>
          <Link
            href="/me/edit"
            className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-zinc-800"
          >
            프로필 수정
          </Link>
        </div>
      </div>

      <section className="mt-8 rounded-xl border border-zinc-100 bg-white p-6">
        <h2 className="text-sm font-semibold text-zinc-900">공개 프로필</h2>
        <p className="mt-1 text-sm text-zinc-500">
          게시글, 댓글, 블로그 작성자 영역에 표시되는 정보입니다.
        </p>

        <dl className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <dt className="text-sm font-medium text-zinc-500">사용자명</dt>
            <dd className="mt-1 text-sm text-zinc-900">{profile.username}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-zinc-500">표시 이름</dt>
            <dd className="mt-1 text-sm text-zinc-900">
              {profile.display_name || "—"}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-sm font-medium text-zinc-500">자기소개</dt>
            <dd className="mt-1 whitespace-pre-wrap text-sm text-zinc-900">
              {profile.bio || "—"}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-sm font-medium text-zinc-500">아바타 URL</dt>
            <dd className="mt-1 break-all text-sm text-zinc-900">
              {profile.avatar_url || "—"}
            </dd>
          </div>
        </dl>
      </section>

      <section className="mt-6 rounded-xl border border-zinc-100 bg-white p-6">
        <h2 className="text-sm font-semibold text-zinc-900">계정 상태</h2>
        <dl className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <dt className="text-sm font-medium text-zinc-500">권한</dt>
            <dd className="mt-1 text-sm text-zinc-900">
              {profile.role === "admin" ? "관리자" : "일반회원"}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-zinc-500">가입일</dt>
            <dd className="mt-1 text-sm text-zinc-900">
              {new Date(profile.created_at).toLocaleDateString("ko-KR", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-zinc-500">프로필 공개</dt>
            <dd className="mt-1 text-sm text-zinc-900">
              커뮤니티 작성자 정보로 공개
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-zinc-500">블로그</dt>
            <dd className="mt-1 text-sm text-zinc-900">
              <Link
                href={`/blog/${profile.username}`}
                className="font-medium text-brand-700 transition hover:text-brand-900"
              >
                @{profile.username} 블로그 보기
              </Link>
            </dd>
          </div>
        </dl>
      </section>

    </main>
  );
}
