"use client";

import { useTransition } from "react";
import { deleteCommentAction } from "@/actions/comments";
import type { BoardSlug } from "@/lib/types";

export function DeleteCommentButton({
  commentId,
  postId,
  boardSlug,
}: {
  commentId: string;
  postId: string;
  boardSlug: BoardSlug;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        if (!window.confirm("댓글을 삭제하시겠습니까?")) return;
        const fd = new FormData();
        fd.set("commentId", commentId);
        fd.set("postId", postId);
        fd.set("boardSlug", boardSlug);
        startTransition(async () => {
          await deleteCommentAction(fd);
        });
      }}
      className="text-xs text-zinc-500 transition hover:text-red-600 disabled:opacity-50"
    >
      삭제
    </button>
  );
}
