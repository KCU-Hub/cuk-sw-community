import { z } from "zod";

export const createCommentSchema = z.object({
  post_id: z.string().uuid({ message: "올바른 게시글이 아닙니다." }),
  parent_id: z.string().uuid().nullable().optional(),
  content: z
    .string()
    .trim()
    .min(1, { message: "댓글 내용을 입력해주세요." })
    .max(2000, { message: "댓글은 최대 2000자입니다." }),
});

export type CreateCommentInput = z.infer<typeof createCommentSchema>;
