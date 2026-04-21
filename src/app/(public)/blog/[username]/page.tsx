import Link from "next/link";
import { notFound } from "next/navigation";
import { listBlogPosts, getProfileByUsername } from "@/lib/db/blog";
import { getCurrentProfile } from "@/lib/auth/get-user";
import { BlogCard } from "@/components/blog/blog-card";
import { Pagination } from "@/components/ui/pagination";
import { formatAuthorName } from "@/lib/author";

const PAGE_SIZE = 12;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const profile = await getProfileByUsername(username);
  return { title: profile?.display_name ?? `@${username}` };
}

export default async function BlogAuthorPage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { username } = await params;

  const [author, viewer] = await Promise.all([
    getProfileByUsername(username),
    getCurrentProfile(),
  ]);
  if (!author) notFound();

  const { page: pageStr } = await searchParams;
  const page = Math.max(1, Number.parseInt(pageStr ?? "1", 10) || 1);
  const isOwner = viewer?.id === author.id;

  const { posts, total } = await listBlogPosts({
    page,
    pageSize: PAGE_SIZE,
    authorId: author.id,
    includeDrafts: isOwner,
  });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <main className="mx-auto max-w-5xl px-4 py-12">
      <header className="flex items-start gap-4">
        <div className="h-16 w-16 shrink-0 rounded-full bg-gradient-to-br from-zinc-100 to-zinc-200" />
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold tracking-tight">
            {formatAuthorName(author)}
          </h1>
          <p className="text-sm text-zinc-500">@{author.username}</p>
          {author.bio && (
            <p className="mt-2 text-sm text-zinc-700">{author.bio}</p>
          )}
        </div>
        {isOwner && (
          <Link
            href="/blog/new"
            className="shrink-0 rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-zinc-800"
          >
            글쓰기
          </Link>
        )}
      </header>

      <p className="mt-8 text-sm text-zinc-500">
        총 {total.toLocaleString()}개의 글
        {isOwner && total > 0 ? " (초안 포함)" : ""}
      </p>

      <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {posts.length === 0 ? (
          <p className="col-span-full py-16 text-center text-sm text-zinc-400">
            아직 발행된 글이 없습니다.
          </p>
        ) : (
          posts.map((p) => (
            <div key={p.id} className="relative">
              <BlogCard post={p} />
              {!p.is_published && (
                <span className="absolute right-3 top-3 rounded-full bg-yellow-50 px-2 py-0.5 text-xs font-medium text-yellow-800 ring-1 ring-yellow-200">
                  DRAFT
                </span>
              )}
            </div>
          ))
        )}
      </div>

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        basePath={`/blog/${username}`}
      />
    </main>
  );
}
