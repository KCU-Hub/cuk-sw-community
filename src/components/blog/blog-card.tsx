import Link from "next/link";
import type { BlogPostWithAuthor } from "@/lib/types";
import { formatRelativeKo } from "@/lib/format";
import { formatAuthorName } from "@/lib/author";

export function BlogCard({ post }: { post: BlogPostWithAuthor }) {
  const authorName = formatAuthorName(post.author);
  const username = post.author?.username ?? null;
  const href = username ? `/blog/${username}/${post.slug}` : "#";
  const displayDate = post.published_at ?? post.created_at;

  return (
    <article className="group overflow-hidden rounded-xl border border-zinc-100 bg-white transition hover:border-brand-200 hover:shadow-sm">
      <Link href={href} className="block">
        {post.cover_image ? (
          // next/image 를 쓰면 external URL 에 remotePatterns 설정이 필요해
          // MVP 는 그냥 img 태그.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.cover_image}
            alt=""
            className="aspect-[16/9] w-full object-cover"
          />
        ) : (
          <div className="aspect-[16/9] w-full bg-gradient-to-br from-zinc-50 to-zinc-100" />
        )}
        <div className="p-5">
          <h2 className="line-clamp-2 text-base font-semibold text-zinc-900 group-hover:text-brand-700">
            {post.title}
          </h2>
          {post.excerpt && (
            <p className="mt-2 line-clamp-2 text-sm text-zinc-500">
              {post.excerpt}
            </p>
          )}

          {post.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {post.tags.slice(0, 4).map((t) => (
                <span
                  key={t.slug}
                  className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600"
                >
                  {t.name}
                </span>
              ))}
            </div>
          )}

          {post.courses.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {post.courses.slice(0, 3).map((course) => (
                <span
                  key={course.slug}
                  className="rounded-full bg-brand-50 px-2 py-0.5 text-xs text-brand-900"
                >
                  {course.name}
                </span>
              ))}
            </div>
          )}

          <div className="mt-4 flex items-center gap-2 text-xs text-zinc-500">
            <span className="font-medium text-zinc-700">{authorName}</span>
            <span aria-hidden>·</span>
            <time dateTime={displayDate}>
              {formatRelativeKo(displayDate)}
            </time>
            {post.like_count > 0 && (
              <>
                <span aria-hidden>·</span>
                <span>♥ {post.like_count}</span>
              </>
            )}
          </div>
        </div>
      </Link>
    </article>
  );
}
