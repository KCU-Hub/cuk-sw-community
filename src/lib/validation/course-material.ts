import { z } from "zod";
import { MATERIAL_TYPES } from "@/lib/types";

export const courseMaterialIdSchema = z
  .string()
  .uuid({ message: "올바른 자료가 아닙니다." });

export const courseSlugSchema = z
  .string()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9-]+$/, { message: "잘못된 과목입니다." });

export const createCourseMaterialSchema = z.object({
  course_slug: courseSlugSchema,
  material_type: z.enum(MATERIAL_TYPES),
  title: z
    .string()
    .trim()
    .min(1, { message: "제목을 입력해주세요." })
    .max(200, { message: "제목은 최대 200자입니다." }),
  content: z.string().trim().max(20000).optional().default(""),
  external_url: z
    .string()
    .trim()
    .url({ message: "외부 링크는 URL 형식이어야 합니다." })
    .optional()
    .or(z.literal("")),
  // Storage 객체 상대 경로 (user_id/...). 첫 segment 는 반드시 UUID.
  // 서버는 이후 `profile.id` 와 실제로 일치하는지 추가 검증한다.
  file_path: z
    .string()
    .trim()
    .max(512)
    .regex(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/.+$/,
      { message: "업로드 경로가 올바르지 않습니다." },
    )
    .optional()
    .or(z.literal("")),
});

export const updateCourseMaterialSchema = createCourseMaterialSchema.omit({
  course_slug: true,
});

export type CreateCourseMaterialInput = z.infer<typeof createCourseMaterialSchema>;
export type UpdateCourseMaterialInput = z.infer<typeof updateCourseMaterialSchema>;
