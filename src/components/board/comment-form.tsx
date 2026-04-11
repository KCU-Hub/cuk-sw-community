"use client";

import { useState, useTransition } from "react";
import { createCommentAction } from "@/actions/comments";
import type { BoardSlug } from "@/lib/types";

export function CommentForm({
  postId,
  boardSlug,
  parentId,
}: {
  postId: string;
  boardSlug: BoardSlug;
  parentId?: string;
}) {
  const isReply = !!parentId;
  const [open, setOpen] = useState(!isReply);
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (isReply && !open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs font-medium text-zinc-500 hover:text-zinc-900"
      >
        답글
      </button>
    );
  }

  return (
    <form
      action={(formData) => {
        setError(null);
        startTransition(async () => {
          try {
            await createCommentAction(formData);
            setContent("");
            if (isReply) setOpen(false);
          } catch (e) {
            setError(e instanceof Error ? e.message : "댓글 작성에 실패했습니다.");
          }
        });
      }}
      className={isReply ? "mt-2" : ""}
    >
      <input type="hidden" name="post_id" value={postId} />
      <input type="hidden" name="boardSlug" value={boardSlug} />
      {parentId && <input type="hidden" name="parent_id" value={parentId} />}
      <textarea
        name="content"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={isReply ? "답글을 입력해주세요" : "댓글을 입력해주세요"}
        rows={isReply ? 2 : 3}
        required
        minLength={1}
        maxLength={2000}
        disabled={isPending}
        className="block w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm placeholder:text-zinc-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:opacity-50"
      />
      {error && (
        <p
          role="alert"
          className="mt-1 text-xs text-red-600"
        >
          {error}
        </p>
      )}
      <div className="mt-2 flex items-center justify-end gap-2">
        {isReply && (
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setContent("");
              setError(null);
            }}
            disabled={isPending}
            className="text-xs font-medium text-zinc-500 hover:text-zinc-900"
          >
            취소
          </button>
        )}
        <button
          type="submit"
          disabled={isPending || content.trim().length === 0}
          className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-zinc-800 disabled:opacity-50"
        >
          {isPending ? "작성 중…" : isReply ? "답글 작성" : "댓글 작성"}
        </button>
      </div>
    </form>
  );
}
