import { describe, expect, it } from "vitest";
import { isSignupEmailDomainAllowed } from "@/lib/auth/email-domain";

describe("isSignupEmailDomainAllowed", () => {
  it("allows only the configured archive owner email when present", () => {
    expect(
      isSignupEmailDomainAllowed(
        "OWNER@Example.com",
        ["school.ac.kr"],
        true,
        "owner@example.com",
      ),
    ).toBe(true);
    expect(
      isSignupEmailDomainAllowed(
        "student@school.ac.kr",
        ["school.ac.kr"],
        true,
        "owner@example.com",
      ),
    ).toBe(false);
  });

  it("allows every email in local/dev mode when no allowlist is configured", () => {
    expect(isSignupEmailDomainAllowed("student@example.com", [], false)).toBe(
      true,
    );
  });

  it("fails closed in production mode when no allowlist is configured", () => {
    expect(isSignupEmailDomainAllowed("student@example.com", [], true)).toBe(
      false,
    );
  });

  it("allows exact configured domains case-insensitively", () => {
    expect(
      isSignupEmailDomainAllowed("student@School.Ac.Kr", ["school.ac.kr"]),
    ).toBe(true);
  });

  it("allows wildcard subdomains without allowing the root domain", () => {
    expect(
      isSignupEmailDomainAllowed("student@sw.school.ac.kr", [
        "*.school.ac.kr",
      ]),
    ).toBe(true);
    expect(
      isSignupEmailDomainAllowed("student@school.ac.kr", ["*.school.ac.kr"]),
    ).toBe(false);
  });

  it("rejects missing or non-allowlisted domains", () => {
    expect(isSignupEmailDomainAllowed(null, ["school.ac.kr"])).toBe(false);
    expect(isSignupEmailDomainAllowed("student@example.com", ["school.ac.kr"]))
      .toBe(false);
  });
});
