import Link from "next/link";
import { notFound } from "next/navigation";
import { listBlogPosts } from "@/lib/db/blog";
import { BlogCard } from "@/components/blog/blog-card";
import { Pagination } from "@/components/ui/pagination";
import { isTagSlug } from "@/lib/validation/blog";

const PAGE_SIZE = 12;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tag: string }>;
}) {
  const { tag } = await params;
  return { title: `#${tag}` };
}

export default async function BlogTagPage({
  params,
  searchParams,
}: {
  params: Promise<{ tag: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { tag } = await params;
  if (!isTagSlug(tag)) notFound();

  const { page: pageStr } = await searchParams;
  const page = Math.max(1, Number.parseInt(pageStr ?? "1", 10) || 1);

  const { posts, total } = await listBlogPosts({
    page,
    pageSize: PAGE_SIZE,
    tag,
  });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <main className="mx-auto max-w-5xl px-4 py-12">
      <div className="text-sm text-zinc-500">
        <Link href="/blog" className="hover:text-brand-700">
          블로그
        </Link>
      </div>
      <h1 className="mt-2 text-2xl font-bold tracking-tight">#{tag}</h1>
      <p className="mt-1 text-sm text-zinc-500">
        총 {total.toLocaleString()}개의 글
      </p>

      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {posts.length === 0 ? (
          <p className="col-span-full py-16 text-center text-sm text-zinc-400">
            해당 태그의 글이 아직 없습니다.
          </p>
        ) : (
          posts.map((p) => <BlogCard key={p.id} post={p} />)
        )}
      </div>

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        basePath={`/blog/tag/${tag}`}
      />
    </main>
  );
}
