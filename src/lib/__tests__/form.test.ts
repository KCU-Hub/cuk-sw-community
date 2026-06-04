import { describe, expect, it } from "vitest";
import { firstError, formBool } from "@/lib/form";

function fd(entries: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(entries)) f.append(k, v);
  return f;
}

describe("formBool", () => {
  it("returns the default when the key is absent (unchecked checkbox)", () => {
    // A native HTML checkbox omits its field entirely when unchecked, so the
    // default MUST encode the unchecked meaning. is_published defaults false
    // (unchecked = draft); is_excluded defaults false (unchecked = included).
    // A true default here would silently publish a post the user unchecked.
    expect(formBool(fd({}), "is_published", false)).toBe(false);
    expect(formBool(fd({}), "is_excluded", false)).toBe(false);
  });

  it("treats a present 'on' (checked checkbox) as true", () => {
    expect(formBool(fd({ k: "on" }), "k", false)).toBe(true);
  });

  it("accepts 'true' and '1' as true", () => {
    expect(formBool(fd({ k: "true" }), "k", false)).toBe(true);
    expect(formBool(fd({ k: "1" }), "k", false)).toBe(true);
  });

  it("treats any other present value as false, overriding a true default", () => {
    expect(formBool(fd({ k: "off" }), "k", true)).toBe(false);
    expect(formBool(fd({ k: "false" }), "k", true)).toBe(false);
    expect(formBool(fd({ k: "" }), "k", true)).toBe(false);
  });
});

describe("firstError", () => {
  it("returns the first issue message", () => {
    expect(firstError({ issues: [{ message: "A" }, { message: "B" }] })).toBe(
      "A",
    );
  });

  it("falls back when there are no issues", () => {
    expect(firstError({ issues: [] })).toBe("입력값을 확인해주세요.");
  });
});
