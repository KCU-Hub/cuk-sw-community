import Link from "next/link";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { getBoardBySlug, getPostsByBoard } from "@/lib/db/posts";
import { getCurrentProfile } from "@/lib/auth/get-user";
import { PostCard } from "@/components/board/post-card";
import { Pagination } from "@/components/ui/pagination";
import { POST_PAGE_SIZE, isBoardSlug } from "@/lib/constants";

export default async function BoardPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string; status?: string }>;
}) {
  const { slug } = await params;
  if (!isBoardSlug(slug)) notFound();

  const { page: pageStr, status } = await searchParams;
  const page = Math.max(1, Number.parseInt(pageStr ?? "1", 10) || 1);
  const questionStatus =
    slug === "qna" && (status === "open" || status === "solved")
      ? status
      : undefined;

  const [board, { posts, total }, profile] = await Promise.all([
    getBoardBySlug(slug),
    getPostsByBoard(slug, {
      page,
      pageSize: POST_PAGE_SIZE,
      questionStatus,
    }),
    getCurrentProfile(),
  ]);

  if (!board) notFound();

  const canWrite =
    profile && (!board.is_admin_only || profile.role === "admin");
  const totalPages = Math.max(1, Math.ceil(total / POST_PAGE_SIZE));

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <div className="flex items-baseline justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{board.name}</h1>
          {board.description && (
            <p className="mt-1 text-sm text-zinc-500">{board.description}</p>
          )}
        </div>
        {canWrite && (
          <Link
            href={`/board/${slug}/new`}
            className="shrink-0 rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-zinc-800"
          >
            글쓰기
          </Link>
        )}
      </div>

      {slug === "qna" && (
        <div className="mt-6 flex flex-wrap gap-2 text-sm">
          <StatusLink href="/board/qna" active={!questionStatus}>
            전체
          </StatusLink>
          <StatusLink
            href="/board/qna?status=open"
            active={questionStatus === "open"}
          >
            미해결
          </StatusLink>
          <StatusLink
            href="/board/qna?status=solved"
            active={questionStatus === "solved"}
          >
            해결됨
          </StatusLink>
        </div>
      )}

      <div className="mt-8 border-t border-zinc-100">
        {posts.length === 0 ? (
          <div className="py-16 text-center text-sm text-zinc-400">
            아직 게시글이 없습니다.
          </div>
        ) : (
          posts.map((post) => <PostCard key={post.id} post={post} />)
        )}
      </div>

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        basePath={
          questionStatus
            ? `/board/${slug}?status=${questionStatus}`
            : `/board/${slug}`
        }
      />
    </main>
  );
}

function StatusLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={
        active
          ? "rounded-full bg-zinc-900 px-3 py-1.5 font-medium text-white"
          : "rounded-full border border-zinc-200 bg-white px-3 py-1.5 font-medium text-zinc-600 transition hover:bg-zinc-50 hover:text-zinc-900"
      }
    >
      {children}
    </Link>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!isBoardSlug(slug)) return { title: "Logbook" };
  const board = await getBoardBySlug(slug);
  return { title: board?.name ?? "Logbook" };
}
