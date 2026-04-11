// Centralized error → user-facing message mapping.
//
// Funnels Supabase / PostgREST errors through one surface before they reach
// the client. Raw Supabase messages leak schema and policy names ("new row
// violates row-level security policy for table \"posts\""), which doubles as
// UX noise and attacker reconnaissance.

// Postgres SQLSTATE codes we care about.
export const PG_ERROR_CODES = {
  UNIQUE_VIOLATION: "23505",
  FOREIGN_KEY_VIOLATION: "23503",
  CHECK_VIOLATION: "23514",
  INSUFFICIENT_PRIVILEGE: "42501",
} as const;

// PostgREST status codes surfaced by @supabase/supabase-js.
export const PGRST_ERROR_CODES = {
  RLS_DENIED: "PGRST301",
  NO_ROWS: "PGRST116",
} as const;

type MaybeCoded = {
  code?: string | number | null;
  message?: string | null;
};

function extractCode(error: unknown): string | null {
  if (typeof error !== "object" || error === null) return null;
  const code = (error as MaybeCoded).code;
  if (code === null || code === undefined) return null;
  return String(code);
}

function extractMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null) {
    const msg = (error as MaybeCoded).message;
    if (typeof msg === "string") return msg;
  }
  return "";
}

export function mapSupabaseError(error: unknown): string {
  if (error) console.error("[supabase error]", error);

  const code = extractCode(error);
  const message = extractMessage(error).toLowerCase();

  switch (code) {
    case PG_ERROR_CODES.UNIQUE_VIOLATION:
      return "이미 존재하는 데이터입니다.";
    case PG_ERROR_CODES.FOREIGN_KEY_VIOLATION:
      return "참조된 데이터가 존재하지 않습니다.";
    case PG_ERROR_CODES.CHECK_VIOLATION:
      return "요청한 값이 허용된 범위를 벗어납니다.";
    case PG_ERROR_CODES.INSUFFICIENT_PRIVILEGE:
    case PGRST_ERROR_CODES.RLS_DENIED:
      return "권한이 없습니다.";
    case PGRST_ERROR_CODES.NO_ROWS:
      return "데이터를 찾을 수 없습니다.";
  }

  // Supabase Auth errors carry no SQLSTATE. Whitelist the handful that are
  // safe to surface (translated); everything else collapses to the generic
  // fallback so internals stay hidden.
  if (message.includes("invalid login credentials")) {
    return "이메일 또는 비밀번호가 일치하지 않습니다.";
  }
  if (message.includes("email not confirmed")) {
    return "이메일 인증이 필요합니다. 메일함을 확인해주세요.";
  }
  if (message.includes("user already registered")) {
    return "이미 가입된 이메일입니다.";
  }
  if (message.includes("password should be at least")) {
    return "비밀번호는 최소 8자 이상이어야 합니다.";
  }
  if (message.includes("rate limit")) {
    return "요청이 너무 많습니다. 잠시 후 다시 시도해주세요.";
  }

  return "요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.";
}
