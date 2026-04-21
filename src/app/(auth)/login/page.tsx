import Link from "next/link";
import { signInAction } from "@/actions/auth";
import { OAuthButtons } from "@/components/auth/oauth-buttons";

export const metadata = {
  title: "로그인",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-md flex-col justify-center px-4">
      <h1 className="text-2xl font-bold tracking-tight">로그인</h1>
        <p className="mt-2 text-sm text-zinc-500">
          CUK SW 커뮤니티에 오신 것을 환영합니다.
        </p>

        {error ? (
          <p className="mt-4 rounded-md border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <form action={signInAction} className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-zinc-700"
            >
              이메일
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="mt-1 block w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm placeholder:text-zinc-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-zinc-700"
            >
              비밀번호
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              minLength={8}
              className="mt-1 block w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm placeholder:text-zinc-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-zinc-800"
          >
            로그인
          </button>
        </form>

        <OAuthButtons intent="login" />

      <p className="mt-6 text-center text-sm text-zinc-500">
        아직 계정이 없으신가요?{" "}
        <Link
          href="/signup"
          className="font-medium text-brand-700 hover:text-brand-800"
        >
          회원가입
        </Link>
      </p>
    </main>
  );
}
