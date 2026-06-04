import { z } from "zod";
import { GRADES } from "@/lib/types";

export const userCourseIdSchema = z
  .string()
  .uuid({ message: "올바른 과목이 아닙니다." });

const SEMESTER_RE = /^[0-9A-Za-z가-힣\-_/. ]{1,20}$/;

export const createUserCourseSchema = z.object({
  semester: z
    .string()
    .trim()
    .min(1, { message: "학기를 입력해주세요." })
    .regex(SEMESTER_RE, { message: "학기는 20자 이내의 영문/숫자/한글/구분자만 가능합니다." }),
  course_name: z
    .string()
    .trim()
    .min(1, { message: "과목명을 입력해주세요." })
    .max(80, { message: "과목명은 최대 80자입니다." }),
  course_code: z
    .string()
    .trim()
    .max(40)
    .optional()
    .or(z.literal("")),
  // Gate the string format BEFORE numeric coercion. z.coerce.number() delegates
  // to Number(), which happily parses "0x5"→5, "0b101"→5, "1e1"→10 — garbage for
  // a credits field that the <input type=number> never produces but a direct
  // server-action POST could. Only plain decimals pass.
  credits: z
    .string()
    .trim()
    .regex(/^\d+(\.\d+)?$/, { message: "학점은 숫자여야 합니다." })
    .transform(Number)
    .pipe(
      z
        .number()
        .gt(0, { message: "학점은 0보다 커야 합니다." })
        .lte(9, { message: "학점은 9를 넘을 수 없습니다." }),
    ),
  grade: z.enum(GRADES as unknown as [string, ...string[]]),
  is_excluded: z.boolean().default(false),
  memo: z
    .string()
    .trim()
    .max(200, { message: "메모는 최대 200자입니다." })
    .optional()
    .or(z.literal("")),
});

export const updateUserCourseSchema = createUserCourseSchema;

export type CreateUserCourseInput = z.infer<typeof createUserCourseSchema>;
export type UpdateUserCourseInput = z.infer<typeof updateUserCourseSchema>;
