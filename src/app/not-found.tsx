import Link from "next/link";

export const metadata = {
  title: "404",
};

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-sm font-semibold text-brand-700">404</p>
      <h1 className="text-2xl font-bold tracking-tight">
        페이지를 찾을 수 없어요
      </h1>
      <p className="text-sm text-zinc-500">
        요청하신 페이지가 존재하지 않거나 이동되었을 수 있습니다.
      </p>
      <Link
        href="/"
        className="mt-2 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800"
      >
        홈으로 가기
      </Link>
    </main>
  );
}
