import { describe, expect, it } from "vitest";
import {
  createCourseMaterialSchema,
  updateCourseMaterialSchema,
} from "@/lib/validation/course-material";

const base = {
  course_slug: "data-structures",
  material_type: "other",
  title: "중간고사 정리",
  content: "",
  external_url: "",
  file_path: "",
};

describe("course material validation", () => {
  it("rejects title-only materials", () => {
    const result = createCourseMaterialSchema.safeParse(base);

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues[0]?.message).toBe(
      "본문, 외부 링크, 첨부 파일 중 하나는 입력해주세요.",
    );
  });

  it("accepts a material with markdown content", () => {
    expect(
      createCourseMaterialSchema.safeParse({
        ...base,
        content: "핵심 개념 정리",
      }).success,
    ).toBe(true);
  });

  it("accepts a material with an external URL", () => {
    expect(
      updateCourseMaterialSchema.safeParse({
        material_type: "link",
        title: "공식 문서",
        content: "",
        external_url: "https://example.com/reference",
        file_path: "",
      }).success,
    ).toBe(true);
  });

  it("accepts a material with an uploaded file path", () => {
    expect(
      createCourseMaterialSchema.safeParse({
        ...base,
        file_path: "123e4567-e89b-12d3-a456-426614174000/midterm.pdf",
      }).success,
    ).toBe(true);
  });
});
