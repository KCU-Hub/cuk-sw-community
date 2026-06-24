import Link from "next/link";
import { listBlogPosts, listTags } from "@/lib/db/blog";
import { getCurrentProfile } from "@/lib/auth/get-user";
import { BlogCard } from "@/components/blog/blog-card";
import { Pagination } from "@/components/ui/pagination";

export const metadata = { title: "Records" };

const PAGE_SIZE = 12;

export default async function BlogIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageStr } = await searchParams;
  const page = Math.max(1, Number.parseInt(pageStr ?? "1", 10) || 1);

  const [{ posts, total }, tags, profile] = await Promise.all([
    listBlogPosts({ page, pageSize: PAGE_SIZE }),
    listTags(),
    getCurrentProfile(),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <main className="mx-auto max-w-5xl px-4 py-12">
      <div className="flex items-baseline justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Records</h1>
          <p className="mt-1 text-sm text-zinc-500">
            공개 학습 노트, 프로젝트 회고, 생각의 초안을 모아 둡니다.
          </p>
        </div>
        {profile && (
          <Link
            href="/blog/new"
            className="shrink-0 rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-zinc-800"
          >
            글쓰기
          </Link>
        )}
      </div>

      {tags.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-2">
          {tags.map((t) => (
            <Link
              key={t.slug}
              href={`/blog/tag/${t.slug}`}
              className="rounded-full bg-zinc-50 px-3 py-1 text-xs text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900"
            >
              #{t.name}
            </Link>
          ))}
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {posts.length === 0 ? (
          <p className="col-span-full py-16 text-center text-sm text-zinc-400">
            아직 발행된 글이 없습니다.
          </p>
        ) : (
          posts.map((p) => <BlogCard key={p.id} post={p} />)
        )}
      </div>

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        basePath="/blog"
      />
    </main>
  );
}
