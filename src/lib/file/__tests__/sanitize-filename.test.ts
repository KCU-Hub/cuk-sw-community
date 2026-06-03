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

  it("never emits a path separator or NUL for any fuzz-corpus input", () => {
    // Property guard: whatever the input, the output must not contain a byte
    // that could break out of the "{userId}/" prefix. Catches a future regex
    // regression (e.g. a normalization step re-introducing a separator) that
    // a fixed-literal test might miss.
    const corpus = [
      "../../../etc/passwd",
      "foo\\bar\\baz",
      "a/b\\c\x00d",
      "..\\..\\win",
      "/leading",
      "trailing/",
      "／fullwidth-solidus", // U+FF0F should NOT fold to "/"
      "\u{1D400}/\u{1D401}",
    ];
    for (const input of corpus) {
      expect(sanitizeFilename(input)).not.toMatch(/[/\\\x00]/);
    }
  });
});

describe("sanitizeFilename — trims and bounds", () => {
  it("trims leading and trailing dashes introduced by substitution", () => {
    expect(sanitizeFilename("---hi---")).toBe("hi");
    expect(sanitizeFilename("name!!!")).toBe("name");
    // Interior dashes survive; only the edges are trimmed. Asserted against a
    // concrete literal (not the trim regex itself) so a future change to the
    // pipeline surfaces a real diff instead of comparing the impl to itself.
    expect(sanitizeFilename("...---abc")).toBe("...---abc");
  });

  it("caps length at exactly FILENAME_MAX_LENGTH for over-long input", () => {
    const out = sanitizeFilename("a".repeat(FILENAME_MAX_LENGTH + 50));
    expect(out).toBe("a".repeat(FILENAME_MAX_LENGTH));
  });

  it("does NOT leave a trailing dash when the cap lands right after one", () => {
    // Regression guard for the trim-vs-slice ordering. A single disallowed
    // char sits so that, after substitution, the slice boundary falls
    // immediately after the dash it became. Trim MUST run after slice or the
    // Storage key ends in "-".
    const input = "a".repeat(FILENAME_MAX_LENGTH - 1) + "?" + "b".repeat(50);
    const out = sanitizeFilename(input);
    expect(out).not.toMatch(/-$/);
    expect(out).toBe("a".repeat(FILENAME_MAX_LENGTH - 1));
  });

  it("collapses a run of disallowed chars into a single dash", () => {
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

  it("strips emoji entirely (outside \\p{L}/\\p{N}) → falls back to FILENAME_FALLBACK", () => {
    // Emoji never reach the slice step: the whole run collapses to a single
    // dash, trims to empty, and falls back. (An earlier version of this test
    // claimed emoji exercised the surrogate-split path — they don't.)
    expect(sanitizeFilename("🎯".repeat(FILENAME_MAX_LENGTH))).toBe(
      FILENAME_FALLBACK,
    );
  });

  it("caps at the UTF-16 code-unit boundary; an SMP LETTER at the cut may split a surrogate pair", () => {
    // SMP letters (e.g. U+1D400 MATHEMATICAL BOLD CAPITAL A) DO survive the
    // \p{L} filter, so they exercise the real slice path. A 1-char ASCII
    // prefix forces the cap onto an odd boundary, leaving a lone surrogate at
    // the end. Acceptable: the value is a Storage object id, never rendered as
    // user-facing text, and the length stays bounded.
    const out = sanitizeFilename("a" + "\u{1D400}".repeat(70));
    expect(out.length).toBeLessThanOrEqual(FILENAME_MAX_LENGTH);
    expect(out.startsWith("a")).toBe(true);
  });
});
