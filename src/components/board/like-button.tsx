"use client";

import { useOptimistic, useTransition } from "react";
import { toggleLikeAction } from "@/actions/likes";
import type { BoardSlug } from "@/lib/types";

type LikeState = { count: number; liked: boolean };

export function LikeButton({
  postId,
  boardSlug,
  initialLikeCount,
  initialLiked,
  disabled = false,
}: {
  postId: string;
  boardSlug: BoardSlug;
  initialLikeCount: number;
  initialLiked: boolean;
  disabled?: boolean;
}) {
  const [optimistic, toggle] = useOptimistic<LikeState, void>(
    { count: initialLikeCount, liked: initialLiked },
    (state) => ({
      count: state.count + (state.liked ? -1 : 1),
      liked: !state.liked,
    }),
  );
  const [isPending, startTransition] = useTransition();

  return (
    <form
      action={(formData) => {
        startTransition(async () => {
          toggle();
          await toggleLikeAction(formData);
        });
      }}
    >
      <input type="hidden" name="postId" value={postId} />
      <input type="hidden" name="boardSlug" value={boardSlug} />
      <button
        type="submit"
        disabled={disabled || isPending}
        aria-pressed={optimistic.liked}
        aria-label={optimistic.liked ? "좋아요 취소" : "좋아요"}
        className={`flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm transition ${
          optimistic.liked
            ? "border-brand-700 bg-brand-50 text-brand-900"
            : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300"
        } disabled:opacity-50`}
      >
        <span aria-hidden className="text-base leading-none">
          {optimistic.liked ? "♥" : "♡"}
        </span>
        <span className="font-medium">{optimistic.count}</span>
      </button>
    </form>
  );
}
