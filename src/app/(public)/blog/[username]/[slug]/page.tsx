import Link from "next/link";
import { notFound } from "next/navigation";
import { getBlogPostByAuthorSlug, listBlogPosts } from "@/lib/db/blog";
import { getCurrentProfile } from "@/lib/auth/get-user";
import { MarkdownRenderer } from "@/components/markdown/markdown-renderer";
import { BlogViewTracker } from "@/components/blog/blog-view-tracker";
import { deleteBlogPostAction } from "@/actions/blog";
import { formatDateTimeKo } from "@/lib/format";
import { formatAuthorName } from "@/lib/author";
import type { BlogPostWithAuthor } from "@/lib/types";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string; slug: string }>;
}) {
  const { username, slug } = await params;
  const post = await getBlogPostByAuthorSlug(username, slug);
  return { title: post?.title ?? "글" };
}

export default async function BlogPostDetailPage({
  params,
}: {
  params: Promise<{ username: string; slug: string }>;
}) {
  const { username, slug } = await params;

  const [post, viewer] = await Promise.all([
    getBlogPostByAuthorSlug(username, slug),
    getCurrentProfile(),
  ]);
  if (!post) notFound();

  const isAuthor = viewer?.id === post.author_id;
  const isAdmin = viewer?.role === "admin";
  const canEdit = isAuthor || isAdmin;
  const displayDate = post.published_at ?? post.created_at;

  if (post.is_deleted && !canEdit) notFound();
  if (!post.is_published && !canEdit) notFound();

  // 같은 시리즈의 다른 글 목록 (시리즈가 있는 경우)
  const series = post.series_id
    ? await listBlogPosts({
        page: 1,
        pageSize: 50,
        seriesId: post.series_id,
      })
    : null;

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <BlogViewTracker postId={post.id} />

      {post.is_deleted && (
        <div
          role="status"
          className="mb-6 rounded-md border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700"
        >
          삭제된 글입니다. 본인 또는 관리자만 열람할 수 있습니다.
        </div>
      )}
      {!post.is_published && (
        <div
          role="status"
          className="mb-6 rounded-md border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800"
        >
          DRAFT — 아직 발행되지 않은 글입니다.
        </div>
      )}

      {post.series && (
        <div className="text-sm text-zinc-500">
          시리즈 ·{" "}
          <span className="font-medium text-zinc-700">{post.series.title}</span>
        </div>
      )}

      <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
        {post.title}
      </h1>

      <div className="mt-4 flex items-center gap-3 text-sm text-zinc-500">
        <Link
          href={`/blog/${username}`}
          className="font-medium text-zinc-700 hover:text-brand-700"
        >
          {formatAuthorName(post.author)}
        </Link>
        <span aria-hidden>·</span>
        <time dateTime={displayDate}>
          {formatDateTimeKo(displayDate)}
        </time>
        <span aria-hidden>·</span>
        <span>조회 {post.view_count}</span>
      </div>

      {post.tags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {post.tags.map((t) => (
            <Link
              key={t.slug}
              href={`/blog/tag/${t.slug}`}
              className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs text-zinc-700 transition hover:bg-zinc-200"
            >
              #{t.name}
            </Link>
          ))}
        </div>
      )}

      {post.courses.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {post.courses.map((course) => (
            <Link
              key={course.slug}
              href={`/courses/${course.slug}`}
              className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs text-brand-900 transition hover:bg-brand-100"
            >
              {course.name}
            </Link>
          ))}
        </div>
      )}

      {post.cover_image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={post.cover_image}
          alt=""
          className="mt-8 w-full rounded-lg border border-zinc-100 object-cover"
        />
      )}

      <article className="mt-8 border-y border-zinc-100 py-10">
        <MarkdownRenderer content={post.content} />
      </article>

      {canEdit && (
        <div className="mt-6 flex items-center justify-end gap-4 text-sm">
          <Link
            href={`/blog/${username}/${slug}/edit`}
            className="text-zinc-600 transition hover:text-zinc-900"
          >
            수정
          </Link>
          <form action={deleteBlogPostAction}>
            <input type="hidden" name="postId" value={post.id} />
            <button
              type="submit"
              className="text-red-600 transition hover:text-red-700"
            >
              삭제
            </button>
          </form>
        </div>
      )}

      {series && series.posts.length > 1 && (
        <SeriesNav postId={post.id} seriesPosts={series.posts} username={username} />
      )}
    </main>
  );
}

function SeriesNav({
  postId,
  seriesPosts,
  username,
}: {
  postId: string;
  seriesPosts: BlogPostWithAuthor[];
  username: string;
}) {
  const sorted = [...seriesPosts].sort(
    (a, b) =>
      new Date(a.published_at ?? a.created_at).getTime() -
      new Date(b.published_at ?? b.created_at).getTime(),
  );
  const idx = sorted.findIndex((p) => p.id === postId);

  return (
    <aside className="mt-12 rounded-lg border border-zinc-100 bg-zinc-50 p-5">
      <h2 className="text-sm font-semibold text-zinc-700">
        시리즈의 다른 글
      </h2>
      <ol className="mt-3 space-y-1 text-sm">
        {sorted.map((s, i) => (
          <li
            key={s.id}
            className={
              i === idx ? "font-medium text-brand-700" : "text-zinc-600"
            }
          >
            <Link
              href={`/blog/${username}/${s.slug}`}
              className="hover:underline"
            >
              {i + 1}. {s.title}
            </Link>
          </li>
        ))}
      </ol>
    </aside>
  );
}
