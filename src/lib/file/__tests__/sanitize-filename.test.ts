import { describe, expect, it } from "vitest";
import {
  FILENAME_FALLBACK,
  FILENAME_MAX_LENGTH,
  sanitizeFilename,
} from "@/lib/file/sanitize-filename";

describe("sanitizeFilename — preserves safe input", () => {
  it("keeps ASCII letters, digits, dot, dash, underscore", () => {
    expect(sanitizeFilename("report_v2.final-1.pdf")).toBe(
      "report_v2.final-1.pdf",
    );
  });

  it("keeps Korean (Unicode letter class)", () => {
    expect(sanitizeFilename("자료실_과제1.pdf")).toBe("자료실_과제1.pdf");
  });

  it("keeps Japanese", () => {
    expect(sanitizeFilename("資料-課題1.pdf")).toBe("資料-課題1.pdf");
  });
});

describe("sanitizeFilename — strips path separators (the main RLS-prefix defense)", () => {
  it("replaces forward slash with dash", () => {
    // Storage RLS guards by '{userId}/' prefix. A filename that smuggled '/'
    // would let callers compose a key under a different user's directory if
    // the prefix concatenation were ever rewritten. Strip them.
    expect(sanitizeFilename("../../../etc/passwd")).toBe("..-..-..-etc-passwd");
  });

  it("replaces backslash with dash", () => {
    expect(sanitizeFilename("foo\\bar\\baz.txt")).toBe("foo-bar-baz.txt");
  });

  it("replaces NUL byte with dash", () => {
    expect(sanitizeFilename("foo\x00.txt")).toBe("foo-.txt");
  });

  it("replaces shell metacharacters", () => {
    expect(sanitizeFilename("a;b|c&d`e$f.txt")).toBe("a-b-c-d-e-f.txt");
  });
});

describe("sanitizeFilename — trims and bounds", () => {
  it("trims leading and trailing dashes after substitution", () => {
    expect(sanitizeFilename("---hi---")).toBe("hi");
    expect(sanitizeFilename("...---abc")).toBe("...---abc".replace(/^-+|-+$/g, ""));
    // Concretely: leading dots are kept (they're in the allow set);
    // trailing dashes from substitution would be trimmed.
    expect(sanitizeFilename("name!!!")).toBe("name");
  });

  it("caps length at FILENAME_MAX_LENGTH", () => {
    const long = "a".repeat(FILENAME_MAX_LENGTH + 50);
    const out = sanitizeFilename(long);
    expect(out.length).toBeLessThanOrEqual(FILENAME_MAX_LENGTH);
  });

  it("collapses a run of disallowed chars into a single dash, then trims", () => {
    // 'a' + 50× '?' + 'b' → 'a-b' (single dash between)
    expect(sanitizeFilename(`a${"?".repeat(50)}b`)).toBe("a-b");
  });
});

describe("sanitizeFilename — fallback when nothing survives", () => {
  it("returns FILENAME_FALLBACK for empty input", () => {
    expect(sanitizeFilename("")).toBe(FILENAME_FALLBACK);
  });

  it("returns FILENAME_FALLBACK when all chars are forbidden", () => {
    expect(sanitizeFilename("///")).toBe(FILENAME_FALLBACK);
    expect(sanitizeFilename("???")).toBe(FILENAME_FALLBACK);
    expect(sanitizeFilename("\x00\x01\x02")).toBe(FILENAME_FALLBACK);
  });

  it("returns FILENAME_FALLBACK when input is only dashes (trimmed away)", () => {
    expect(sanitizeFilename("---")).toBe(FILENAME_FALLBACK);
  });
});

describe("sanitizeFilename — quirks worth documenting", () => {
  it("keeps multiple dots (e.g. '...' or 'a..b'); Storage treats them as opaque key segments", () => {
    expect(sanitizeFilename("...")).toBe("...");
    expect(sanitizeFilename("a..b")).toBe("a..b");
  });

  it("slice operates on UTF-16 code units (acceptable: storage key, not user-visible truncation)", () => {
    // A 4-byte emoji is 2 UTF-16 code units. Sliced at FILENAME_MAX_LENGTH
    // can split a surrogate pair, producing a lone surrogate. Documented
    // here so future readers know the trade-off is intentional — keys are
    // never rendered, only echoed in `<span class="font-mono">{path}</span>`
    // where lone surrogates render as a single replacement glyph.
    const emojiHeavy = "🎯".repeat(FILENAME_MAX_LENGTH);
    const out = sanitizeFilename(emojiHeavy);
    expect(out.length).toBeLessThanOrEqual(FILENAME_MAX_LENGTH);
  });
});
