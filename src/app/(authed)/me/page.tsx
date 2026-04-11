import { requireProfile } from "@/lib/auth/require-user";

export const metadata = {
  title: "내 프로필",
};

export default async function MePage() {
  const profile = await requireProfile();

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">내 프로필</h1>
        <span className="inline-flex items-center rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700">
          {profile.role === "admin" ? "관리자" : "일반회원"}
        </span>
      </div>

      <dl className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
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
        <div>
          <dt className="text-sm font-medium text-zinc-500">자기소개</dt>
          <dd className="mt-1 whitespace-pre-wrap text-sm text-zinc-900">
            {profile.bio || "—"}
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
      </dl>

      <p className="mt-12 text-xs text-zinc-400">
        프로필 수정 기능은 곧 추가됩니다.
      </p>
    </main>
  );
}
