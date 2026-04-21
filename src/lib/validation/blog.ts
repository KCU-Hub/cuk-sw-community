import { z } from "zod";

// slug: 소문자/숫자/하이픈, 80자 이내 — DB check constraint 와 동일 (0014)
const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,79}$/;

// tag slug 는 posts tag_slug 와 동일 규칙 — tag route 가드 등에서 재사용.
export const TAG_SLUG_RE = /^[a-z0-9][a-z0-9-]{0,39}$/;
export function isTagSlug(value: string): boolean {
  return TAG_SLUG_RE.test(value);
}

export const blogPostIdSchema = z
  .string()
  .uuid({ message: "올바른 글이 아닙니다." });

export const createBlogPostSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, { message: "제목을 입력해주세요." })
    .max(200, { message: "제목은 최대 200자입니다." }),
  slug: z
    .string()
    .trim()
    .min(1, { message: "URL slug 를 입력해주세요." })
    .max(80, { message: "slug 는 최대 80자입니다." })
    .regex(SLUG_RE, {
      message: "slug 는 소문자/숫자/하이픈만 가능하며, 하이픈으로 시작할 수 없습니다.",
    }),
  content: z
    .string()
    .trim()
    .min(1, { message: "내용을 입력해주세요." }),
  excerpt: z
    .string()
    .trim()
    .max(300, { message: "요약은 최대 300자입니다." })
    .optional()
    .or(z.literal("")),
  cover_image: z
    .string()
    .trim()
    .url({ message: "커버 이미지는 URL 형식이어야 합니다." })
    .optional()
    .or(z.literal("")),
  is_published: z.boolean().default(true),
  series_id: z
    .string()
    .uuid()
    .optional()
    .or(z.literal("")),
  tags: z
    .array(
      z
        .string()
        .regex(TAG_SLUG_RE, { message: "tag slug 가 올바르지 않습니다." }),
    )
    .max(10, { message: "태그는 최대 10 개까지 달 수 있습니다." })
    .default([]),
});

export const updateBlogPostSchema = createBlogPostSchema;

export type CreateBlogPostInput = z.infer<typeof createBlogPostSchema>;
export type UpdateBlogPostInput = z.infer<typeof updateBlogPostSchema>;

// slug 자동 생성 — velog 처럼 title 기반 + 폴백
export function slugifyFallback(title: string): string {
  const normalized = title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
  if (SLUG_RE.test(normalized)) return normalized;
  // 한글 등으로 인해 비어있거나 규칙 실패 → 랜덤 suffix
  return `post-${Math.random().toString(36).slice(2, 10)}`;
}
