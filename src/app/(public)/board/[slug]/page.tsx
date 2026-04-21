import Link from "next/link";
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
  searchParams: Promise<{ page?: string }>;
}) {
  const { slug } = await params;
  if (!isBoardSlug(slug)) notFound();

  const { page: pageStr } = await searchParams;
  const page = Math.max(1, Number.parseInt(pageStr ?? "1", 10) || 1);

  const [board, { posts, total }, profile] = await Promise.all([
    getBoardBySlug(slug),
    getPostsByBoard(slug, { page, pageSize: POST_PAGE_SIZE }),
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
        basePath={`/board/${slug}`}
      />
    </main>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!isBoardSlug(slug)) return { title: "게시판" };
  const board = await getBoardBySlug(slug);
  return { title: board?.name ?? "게시판" };
}
