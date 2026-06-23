import Link from "next/link";
import type { PostWithAuthor } from "@/lib/types";
import { formatRelativeKo } from "@/lib/format";
import { formatAuthorName } from "@/lib/author";

export function PostCard({ post }: { post: PostWithAuthor }) {
  const authorName = formatAuthorName(post.author);
  const href = `/board/${post.board_slug}/${post.id}`;

  return (
    <article className="border-b border-zinc-100 py-4">
      <Link href={href} className="group block">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h2 className="line-clamp-1 text-base font-semibold text-zinc-900 group-hover:text-brand-700">
              {post.is_pinned ? (
                <span className="mr-1.5 inline-flex items-center rounded bg-brand-50 px-1.5 py-0.5 text-xs font-medium text-brand-900">
                  고정
                </span>
              ) : null}
              {post.board_slug === "qna" && post.question_status && (
                <span
                  className={
                    post.question_status === "solved"
                      ? "mr-1.5 inline-flex items-center rounded bg-emerald-50 px-1.5 py-0.5 text-xs font-medium text-emerald-800"
                      : "mr-1.5 inline-flex items-center rounded bg-amber-50 px-1.5 py-0.5 text-xs font-medium text-amber-800"
                  }
                >
                  {post.question_status === "solved" ? "해결" : "미해결"}
                </span>
              )}
              {post.title}
            </h2>
            {post.courses.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1.5">
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
            <div className="mt-1 flex items-center gap-2 text-xs text-zinc-500">
              <span className="font-medium text-zinc-700">{authorName}</span>
              <span aria-hidden>·</span>
              <time dateTime={post.created_at}>
                {formatRelativeKo(post.created_at)}
              </time>
              <span aria-hidden>·</span>
              <span>조회 {post.view_count}</span>
              {post.like_count > 0 ? (
                <>
                  <span aria-hidden>·</span>
                  <span>좋아요 {post.like_count}</span>
                </>
              ) : null}
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-0.5 text-xs text-zinc-500">
            <span className="text-base font-semibold text-zinc-700">
              {post.comment_count}
            </span>
            <span>댓글</span>
          </div>
        </div>
      </Link>
    </article>
  );
}
