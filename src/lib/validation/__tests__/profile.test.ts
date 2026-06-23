import { describe, expect, it } from "vitest";
import { updateProfileSchema } from "@/lib/validation/profile";

function base(overrides: Record<string, unknown> = {}) {
  return {
    username: "student_01",
    display_name: "홍길동",
    bio: "자료구조 공부 중",
    avatar_url: "https://example.com/avatar.png",
    ...overrides,
  };
}

describe("updateProfileSchema", () => {
  it("accepts safe profile fields and trims optional text", () => {
    const parsed = updateProfileSchema.safeParse(
      base({
        display_name: "  길동  ",
        bio: "  알고리즘 관심  ",
      }),
    );

    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.display_name).toBe("길동");
    expect(parsed.data.bio).toBe("알고리즘 관심");
  });

  it("stores blank optional fields as null", () => {
    const parsed = updateProfileSchema.safeParse(
      base({
        display_name: " ",
        bio: "",
        avatar_url: "   ",
      }),
    );

    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.display_name).toBeNull();
    expect(parsed.data.bio).toBeNull();
    expect(parsed.data.avatar_url).toBeNull();
  });

  it("rejects path-breaking usernames and non-http avatar URLs", () => {
    for (const username of ["a", "/admin", "name/route", "한글", "-start"]) {
      expect(
        updateProfileSchema.safeParse(base({ username })).success,
        `username=${username} must be rejected`,
      ).toBe(false);
    }

    for (const avatar_url of ["javascript:alert(1)", "ftp://example.com/a.png"]) {
      expect(
        updateProfileSchema.safeParse(base({ avatar_url })).success,
        `avatar_url=${avatar_url} must be rejected`,
      ).toBe(false);
    }
  });
});
