import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  mapSupabaseError,
  PG_ERROR_CODES,
  PGRST_ERROR_CODES,
} from "@/lib/errors";

// errors.ts is the single surface that translates Supabase / PostgREST errors
// into user-facing Korean messages. Two contracts:
//   1. RLS / schema details never reach the user (caller-facing return value)
//   2. The structured log carries `{ code, message }` only — never the raw
//      error object (which can include `hint` / `details` with policy names)
//
// Regressions in either contract have security implications, so we pin both.

describe("mapSupabaseError — null-safe", () => {
  it("returns generic message for null", () => {
    expect(mapSupabaseError(null)).toBe(
      "요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.",
    );
  });

  it("returns generic message for undefined", () => {
    expect(mapSupabaseError(undefined)).toBe(
      "요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.",
    );
  });

  it("does NOT log when error is falsy", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    mapSupabaseError(null);
    mapSupabaseError(undefined);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe("mapSupabaseError — SQLSTATE branches", () => {
  it("maps 23505 unique violation", () => {
    expect(mapSupabaseError({ code: PG_ERROR_CODES.UNIQUE_VIOLATION })).toBe(
      "이미 존재하는 데이터입니다.",
    );
  });

  it("maps 23503 foreign key violation", () => {
    expect(
      mapSupabaseError({ code: PG_ERROR_CODES.FOREIGN_KEY_VIOLATION }),
    ).toBe("참조된 데이터가 존재하지 않습니다.");
  });

  it("maps 23514 check violation", () => {
    expect(mapSupabaseError({ code: PG_ERROR_CODES.CHECK_VIOLATION })).toBe(
      "요청한 값이 허용된 범위를 벗어납니다.",
    );
  });

  it("maps 42501 insufficient privilege to '권한이 없습니다'", () => {
    expect(
      mapSupabaseError({ code: PG_ERROR_CODES.INSUFFICIENT_PRIVILEGE }),
    ).toBe("권한이 없습니다.");
  });

  it("maps PGRST301 RLS-denied to the same '권한이 없습니다'", () => {
    expect(mapSupabaseError({ code: PGRST_ERROR_CODES.RLS_DENIED })).toBe(
      "권한이 없습니다.",
    );
  });

  it("maps PGRST116 no-rows", () => {
    expect(mapSupabaseError({ code: PGRST_ERROR_CODES.NO_ROWS })).toBe(
      "데이터를 찾을 수 없습니다.",
    );
  });
});

describe("mapSupabaseError — Supabase Auth message includes-match", () => {
  it("matches 'Invalid login credentials' case-insensitively", () => {
    expect(mapSupabaseError({ message: "Invalid login credentials" })).toBe(
      "이메일 또는 비밀번호가 일치하지 않습니다.",
    );
    expect(mapSupabaseError({ message: "INVALID LOGIN CREDENTIALS" })).toBe(
      "이메일 또는 비밀번호가 일치하지 않습니다.",
    );
  });

  it("matches 'Email not confirmed'", () => {
    expect(mapSupabaseError({ message: "Email not confirmed" })).toBe(
      "이메일 인증이 필요합니다. 메일함을 확인해주세요.",
    );
  });

  it("matches 'User already registered'", () => {
    expect(mapSupabaseError({ message: "User already registered" })).toBe(
      "이미 가입된 이메일입니다.",
    );
  });

  it("matches 'rate limit' substring", () => {
    expect(mapSupabaseError({ message: "Email rate limit exceeded" })).toBe(
      "요청이 너무 많습니다. 잠시 후 다시 시도해주세요.",
    );
  });

  it("collapses unknown Auth messages to generic — does not leak the raw text", () => {
    const out = mapSupabaseError({ message: "internal-only diagnostic xyz" });
    expect(out).toBe("요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.");
    expect(out).not.toContain("xyz");
    expect(out).not.toContain("diagnostic");
  });

  it("accepts Error instances (not just plain objects)", () => {
    expect(mapSupabaseError(new Error("Invalid login credentials"))).toBe(
      "이메일 또는 비밀번호가 일치하지 않습니다.",
    );
  });
});

describe("mapSupabaseError — non-leak logging contract", () => {
  let spy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    spy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    spy.mockRestore();
  });

  it("logs only { code, message } — not the raw error with hint/details", () => {
    mapSupabaseError({
      code: PG_ERROR_CODES.UNIQUE_VIOLATION,
      message: "duplicate key value violates unique constraint \"posts_pkey\"",
      // Recon-relevant fields that must NOT make it into the log payload:
      hint: "policy 'authors-own-posts' on table 'posts'",
      details: "Failing row contains (1, 'secret-title', 'admin')",
    });
    expect(spy).toHaveBeenCalledTimes(1);
    // Arity guard: pin exactly two args. A 3rd arg (e.g. the raw error passed
    // "for debugging") would satisfy every assertion below yet still ship
    // hint/details to the log sink — the exact leak this test exists to block.
    expect(spy.mock.calls[0]).toHaveLength(2);
    const [tag, payload] = spy.mock.calls[0];
    expect(tag).toBe("[supabase error]");
    expect(payload).toEqual({
      code: "23505",
      message:
        "duplicate key value violates unique constraint \"posts_pkey\"",
    });
    // Defense-in-depth: no `hint` / `details` keys leaked.
    expect(payload).not.toHaveProperty("hint");
    expect(payload).not.toHaveProperty("details");
  });

  it("truncates messages longer than 200 chars, keeping the HEAD with an ellipsis", () => {
    // Distinct HEAD/TAIL markers so the test proves we keep the *leading* 200
    // chars, not the tail. Postgres appends CONTEXT/policy names at the END of
    // long messages — keeping the tail would leak exactly what this truncation
    // is meant to suppress.
    const long = "HEAD" + "x".repeat(500) + "TAIL";
    mapSupabaseError({ message: long });
    expect(spy).toHaveBeenCalledTimes(1);
    const [, payload] = spy.mock.calls[0];
    expect(payload.message).toHaveLength(201); // 200 head chars + "…"
    expect(payload.message.startsWith("HEAD")).toBe(true);
    expect(payload.message.endsWith("…")).toBe(true);
    expect(payload.message).not.toContain("TAIL");
  });

  it("leaves messages 200 chars or shorter untouched", () => {
    const short = "y".repeat(200);
    mapSupabaseError({ message: short });
    expect(spy).toHaveBeenCalledTimes(1);
    const [, payload] = spy.mock.calls[0];
    expect(payload.message).toBe(short);
    expect(payload.message.endsWith("…")).toBe(false);
  });
});
