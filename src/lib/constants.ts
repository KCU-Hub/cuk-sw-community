import type { BoardSlug } from "@/lib/types";

// board_slug enum 값 — DB 의 public.board_slug enum 과 동기화.
// 게시판의 name/description/is_admin_only 는 public.boards 테이블에서
// 가져옴 (src/lib/db/posts.ts:listBoards / getBoardBySlug).
export const BOARD_SLUGS: readonly BoardSlug[] = ["free", "qna", "notice"] as const;

export function isBoardSlug(value: string): value is BoardSlug {
  return (BOARD_SLUGS as readonly string[]).includes(value);
}

export const POST_PAGE_SIZE = 20;
export const COMMENT_REPLY_DEPTH_CAP = 3;

// Supabase Storage bucket id (server + client 공유). 정의는 0015 마이그레이션.
export const COURSE_FILES_BUCKET = "course-files";
