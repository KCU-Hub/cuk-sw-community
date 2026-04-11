"use client";

import { useEffect } from "react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Phase 5: hook into an error reporter (Sentry, Logflare, etc.)
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-sm font-semibold text-zinc-500">예기치 못한 오류</p>
      <h1 className="text-2xl font-bold tracking-tight">
        문제가 발생했습니다
      </h1>
      <p className="text-sm text-zinc-500">
        잠시 후 다시 시도해주세요. 문제가 계속되면 관리자에게 알려주세요.
      </p>
      {error.digest ? (
        <p className="font-mono text-xs text-zinc-400">에러 ID: {error.digest}</p>
      ) : null}
      <button
        type="button"
        onClick={reset}
        className="mt-2 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800"
      >
        다시 시도
      </button>
    </main>
  );
}
