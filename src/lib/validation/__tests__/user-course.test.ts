import { describe, expect, it } from "vitest";
import { createUserCourseSchema } from "@/lib/validation/user-course";

// The form passes every field as a string (FormData). credits especially must
// be validated as a *plain decimal* — z.coerce.number() alone would let
// Number()-parseable garbage (hex/binary/octal/scientific) through.
function base(overrides: Record<string, unknown> = {}) {
  return {
    semester: "2024-1",
    course_name: "자료구조",
    course_code: "",
    credits: "3",
    grade: "A",
    is_excluded: false,
    memo: "",
    ...overrides,
  };
}

describe("createUserCourseSchema — credits", () => {
  it("accepts plain decimals", () => {
    expect(createUserCourseSchema.safeParse(base({ credits: "3" })).success).toBe(
      true,
    );
    expect(
      createUserCourseSchema.safeParse(base({ credits: "1.5" })).success,
    ).toBe(true);
  });

  it("rejects hex / binary / octal / scientific that Number() would accept", () => {
    // Number("0x5")===5, Number("0b101")===5, Number("0o7")===7,
    // Number("1e0")===1 — all in [0,9] and would have passed gt(0).lte(9).
    for (const credits of ["0x5", "0b101", "0o7", "1e0", "1e1", "0xff"]) {
      const r = createUserCourseSchema.safeParse(base({ credits }));
      expect(r.success, `credits=${credits} must be rejected`).toBe(false);
    }
  });

  it("rejects out-of-range, empty, and non-numeric", () => {
    expect(createUserCourseSchema.safeParse(base({ credits: "0" })).success).toBe(
      false,
    );
    expect(
      createUserCourseSchema.safeParse(base({ credits: "10" })).success,
    ).toBe(false);
    expect(
      createUserCourseSchema.safeParse(base({ credits: "abc" })).success,
    ).toBe(false);
    expect(createUserCourseSchema.safeParse(base({ credits: "" })).success).toBe(
      false,
    );
  });

  it("accepts the boundary 9 and rejects above it", () => {
    expect(createUserCourseSchema.safeParse(base({ credits: "9" })).success).toBe(
      true,
    );
    expect(
      createUserCourseSchema.safeParse(base({ credits: "9.5" })).success,
    ).toBe(false);
  });
});

describe("createUserCourseSchema — grade", () => {
  it("rejects an unknown grade", () => {
    expect(createUserCourseSchema.safeParse(base({ grade: "Z" })).success).toBe(
      false,
    );
  });

  it("accepts P / NP", () => {
    expect(createUserCourseSchema.safeParse(base({ grade: "P" })).success).toBe(
      true,
    );
    expect(createUserCourseSchema.safeParse(base({ grade: "NP" })).success).toBe(
      true,
    );
  });
});
