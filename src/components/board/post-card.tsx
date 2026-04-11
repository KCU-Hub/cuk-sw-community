import Link from "next/link";
import type { PostWithAuthor } from "@/lib/types";
import { formatRelativeKo } from "@/lib/format";

export function PostCard({ post }: { post: PostWithAuthor }) {
  const authorName =
    post.author?.display_name || post.author?.username || "알 수 없음";
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
              {post.title}
            </h2>
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
