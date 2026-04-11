import type { BoardSlug } from "@/lib/types";

export const BOARD_SLUGS: readonly BoardSlug[] = ["free", "qna", "notice"] as const;

export const BOARD_LABELS: Record<
  BoardSlug,
  { name: string; description: string; adminOnly: boolean }
> = {
  free: {
    name: "자유게시판",
    description: "자유롭게 이야기 나누는 공간",
    adminOnly: false,
  },
  qna: {
    name: "질문게시판",
    description: "공부하다 막힐 때 질문해보세요",
    adminOnly: false,
  },
  notice: {
    name: "공지사항",
    description: "학부 및 커뮤니티 공지",
    adminOnly: true,
  },
};

export function isBoardSlug(value: string): value is BoardSlug {
  return (BOARD_SLUGS as readonly string[]).includes(value);
}

export const POST_PAGE_SIZE = 20;
export const COMMENT_REPLY_DEPTH_CAP = 3;
