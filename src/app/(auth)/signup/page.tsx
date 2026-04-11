import Link from "next/link";
import { signUpAction } from "@/actions/auth";

export const metadata = {
  title: "회원가입",
};

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-md flex-col justify-center px-4">
      <h1 className="text-2xl font-bold tracking-tight">회원가입</h1>
        <p className="mt-2 text-sm text-zinc-500">
          이메일과 비밀번호로 가입하세요. 닉네임은 가입 후 마이페이지에서
          수정할 수 있습니다.
        </p>

        {error ? (
          <p className="mt-4 rounded-md border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <form action={signUpAction} className="mt-6 space-y-4">
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
              autoComplete="new-password"
              required
              minLength={8}
              className="mt-1 block w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm placeholder:text-zinc-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              placeholder="최소 8자, 영문/숫자 포함"
            />
            <p className="mt-1 text-xs text-zinc-400">
              영문과 숫자를 포함해 8자 이상 입력해주세요.
            </p>
          </div>
          <button
            type="submit"
            className="w-full rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-zinc-800"
          >
            회원가입
          </button>
        </form>

      <p className="mt-6 text-center text-sm text-zinc-500">
        이미 계정이 있으신가요?{" "}
        <Link
          href="/login"
          className="font-medium text-brand-700 hover:text-brand-800"
        >
          로그인
        </Link>
      </p>
    </main>
  );
}
