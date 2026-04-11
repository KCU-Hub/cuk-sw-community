import Link from "next/link";
import { listBoards } from "@/lib/db/posts";

export const metadata = {
  title: "게시판",
};

export default async function BoardListPage() {
  const boards = await listBoards();

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-bold tracking-tight">게시판</h1>
      <p className="mt-2 text-sm text-zinc-500">
        관심 있는 주제별로 글을 나눠 올릴 수 있습니다.
      </p>

      <ul className="mt-8 space-y-3">
        {boards.map((board) => (
          <li key={board.slug}>
            <Link
              href={`/board/${board.slug}`}
              className="block rounded-2xl border border-zinc-100 bg-white p-6 transition hover:border-brand-200 hover:shadow-sm"
            >
              <h2 className="text-base font-semibold text-zinc-900">
                {board.name}
              </h2>
              {board.description && (
                <p className="mt-1 text-sm text-zinc-500">
                  {board.description}
                </p>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
