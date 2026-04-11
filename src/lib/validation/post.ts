import { z } from "zod";
import { BOARD_SLUGS } from "@/lib/constants";

export const postIdSchema = z
  .string()
  .uuid({ message: "올바른 게시글이 아닙니다." });

export const createPostSchema = z.object({
  board_slug: z.enum(BOARD_SLUGS as unknown as [string, ...string[]]),
  title: z
    .string()
    .trim()
    .min(1, { message: "제목을 입력해주세요." })
    .max(200, { message: "제목은 최대 200자입니다." }),
  content: z
    .string()
    .trim()
    .min(1, { message: "내용을 입력해주세요." }),
});

export const updatePostSchema = createPostSchema.omit({ board_slug: true });

export type CreatePostInput = z.infer<typeof createPostSchema>;
export type UpdatePostInput = z.infer<typeof updatePostSchema>;
