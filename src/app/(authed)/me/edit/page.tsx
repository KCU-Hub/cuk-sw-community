import Link from "next/link";
import { requireProfile } from "@/lib/auth/require-user";
import { ProfileForm } from "@/components/profile/profile-form";

export const metadata = {
  title: "프로필 수정",
};

export default async function EditProfilePage() {
  const profile = await requireProfile();

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <div>
        <Link
          href="/me"
          className="text-sm font-medium text-zinc-500 transition hover:text-zinc-900"
        >
          내 프로필
        </Link>
        <h1 className="mt-3 text-2xl font-bold tracking-tight">프로필 수정</h1>
        <p className="mt-1 text-sm text-zinc-500">
          작성자 표시와 공개 블로그에 보이는 기본 정보를 관리합니다.
        </p>
      </div>

      <section className="mt-8 rounded-xl border border-zinc-100 bg-white p-6">
        <ProfileForm profile={profile} />
      </section>
    </main>
  );
}
