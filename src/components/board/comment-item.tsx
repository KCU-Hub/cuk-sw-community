import type { BoardSlug, CommentNode } from "@/lib/types";
import { formatRelativeKo } from "@/lib/format";
import { formatAuthorName } from "@/lib/author";
import { markQuestionSolvedAction } from "@/actions/posts";
import { CommentForm } from "./comment-form";
import { DeleteCommentButton } from "./delete-comment-button";

export function CommentItem({
  comment,
  postId,
  boardSlug,
  currentUserId,
  isAdmin,
  acceptedCommentId,
  canAcceptAnswer,
  allowReply,
}: {
  comment: CommentNode;
  postId: string;
  boardSlug: BoardSlug;
  currentUserId: string | null;
  isAdmin: boolean;
  acceptedCommentId: string | null;
  canAcceptAnswer: boolean;
  allowReply: boolean;
}) {
  const isOwn = currentUserId === comment.author_id;
  const canDelete = isOwn || isAdmin;
  const authorName = formatAuthorName(comment.author);
  const isAccepted = acceptedCommentId === comment.id;

  return (
    <div
      className={
        isAccepted
          ? "rounded-md border border-emerald-100 bg-emerald-50/60 p-3"
          : undefined
      }
    >
      <div className="flex items-baseline gap-2 text-xs">
        <span className="font-medium text-zinc-900">{authorName}</span>
        {isAccepted && (
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-800">
            채택됨
          </span>
        )}
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
          {canAcceptAnswer && boardSlug === "qna" && !isAccepted && (
            <form action={markQuestionSolvedAction}>
              <input type="hidden" name="postId" value={postId} />
              <input type="hidden" name="commentId" value={comment.id} />
              <input type="hidden" name="boardSlug" value={boardSlug} />
              <button
                type="submit"
                className="font-medium text-emerald-700 transition hover:text-emerald-900"
              >
                답변 채택
              </button>
            </form>
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
