import type { BoardSlug, CommentNode } from "@/lib/types";
import { formatRelativeKo } from "@/lib/format";
import { CommentForm } from "./comment-form";
import { DeleteCommentButton } from "./delete-comment-button";

export function CommentItem({
  comment,
  postId,
  boardSlug,
  currentUserId,
  isAdmin,
  allowReply,
}: {
  comment: CommentNode;
  postId: string;
  boardSlug: BoardSlug;
  currentUserId: string | null;
  isAdmin: boolean;
  allowReply: boolean;
}) {
  const isOwn = currentUserId === comment.author_id;
  const canDelete = isOwn || isAdmin;
  const authorName =
    comment.author?.display_name || comment.author?.username || "알 수 없음";

  return (
    <div>
      <div className="flex items-baseline gap-2 text-xs">
        <span className="font-medium text-zinc-900">{authorName}</span>
        <span aria-hidden className="text-zinc-400">
          ·
        </span>
        <time className="text-zinc-500" dateTime={comment.created_at}>
          {formatRelativeKo(comment.created_at)}
        </time>
      </div>

      <p
        className={`mt-1.5 whitespace-pre-wrap text-sm ${
          comment.is_deleted ? "italic text-zinc-400" : "text-zinc-800"
        }`}
      >
        {comment.content}
      </p>

      {!comment.is_deleted && (
        <div className="mt-2 flex items-center gap-3 text-xs">
          {allowReply && currentUserId && (
            <CommentForm
              postId={postId}
              boardSlug={boardSlug}
              parentId={comment.id}
            />
          )}
          {canDelete && (
            <DeleteCommentButton
              commentId={comment.id}
              postId={postId}
              boardSlug={boardSlug}
            />
          )}
        </div>
      )}
    </div>
  );
}
