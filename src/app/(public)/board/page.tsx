import Link from "next/link";
import { listBoards } from "@/lib/db/posts";

export const metadata = {
  title: "Logbook",
};

export default async function BoardListPage() {
  const boards = await listBoards();

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-bold tracking-tight">Logbook</h1>
      <p className="mt-2 text-sm text-zinc-500">
        짧은 기록, 문제 풀이, 운영 노트를 나눠 보관합니다.
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
