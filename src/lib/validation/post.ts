import { z } from "zod";
import { BOARD_SLUGS } from "@/lib/constants";

const COURSE_SLUG_RE = /^[a-z0-9-]+$/;

export const postIdSchema = z
  .string()
  .uuid({ message: "올바른 게시글이 아닙니다." });

export const courseSlugListSchema = z
  .array(
    z
      .string()
      .trim()
      .regex(COURSE_SLUG_RE, {
        message: "과목 정보가 올바르지 않습니다.",
      }),
  )
  .max(3, { message: "과목은 최대 3개까지 연결할 수 있습니다." })
  .default([]);

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
  course_slugs: courseSlugListSchema,
});

export const updatePostSchema = createPostSchema.omit({ board_slug: true });

export type CreatePostInput = z.infer<typeof createPostSchema>;
export type UpdatePostInput = z.infer<typeof updatePostSchema>;
