"use client";

import { useTransition } from "react";
import { deletePostAction } from "@/actions/posts";
import type { BoardSlug } from "@/lib/types";

export function DeletePostButton({
  postId,
  boardSlug,
}: {
  postId: string;
  boardSlug: BoardSlug;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        if (!window.confirm("정말 이 게시글을 삭제하시겠습니까?")) return;
        const fd = new FormData();
        fd.set("postId", postId);
        fd.set("boardSlug", boardSlug);
        startTransition(async () => {
          await deletePostAction(fd);
        });
      }}
      className="text-sm text-zinc-600 transition hover:text-red-600 disabled:opacity-50"
    >
      삭제
    </button>
  );
}
